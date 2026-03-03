/**
 * Edge Alerter - Lightweight alert forwarding for edge deployment
 */

import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { DEFAULT_ALERTER_CONFIG } from "../types.js";
import type { EdgeAlert, EdgeAlerterConfig } from "../types.js";
import type { EdgeLogger } from "../logger/index.js";

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * Edge Alerter
 */
export class EdgeAlerter extends EventEmitter {
  private config: EdgeAlerterConfig;
  private alerts: EdgeAlert[] = [];
  private pendingQueue: EdgeAlert[] = [];
  private logger: EdgeLogger | null = null;
  private forwardTimer: ReturnType<typeof setInterval> | null = null;
  private isForwarding = false;

  constructor(config: Partial<EdgeAlerterConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ALERTER_CONFIG, ...config };

    if (this.config.forwardInterval > 0 && this.config.forwardEndpoint) {
      this.forwardTimer = setInterval(
        () => this.forwardPending(),
        this.config.forwardInterval
      );
    }
  }

  /**
   * Set logger for alert logging
   */
  setLogger(logger: EdgeLogger): void {
    this.logger = logger;
  }

  /**
   * Create an alert
   */
  alert(options: {
    severity: AlertSeverity;
    title: string;
    description: string;
    source: string;
    data?: Record<string, unknown>;
  }): EdgeAlert {
    const alert: EdgeAlert = {
      id: randomUUID(),
      severity: options.severity,
      title: options.title,
      description: options.description,
      source: options.source,
      timestamp: Date.now(),
      acknowledged: false,
      data: options.data,
    };

    this.addAlert(alert);
    return alert;
  }

  /**
   * Create critical alert
   */
  critical(title: string, description: string, source: string, data?: Record<string, unknown>): EdgeAlert {
    return this.alert({ severity: "critical", title, description, source, data });
  }

  /**
   * Create high severity alert
   */
  high(title: string, description: string, source: string, data?: Record<string, unknown>): EdgeAlert {
    return this.alert({ severity: "high", title, description, source, data });
  }

  /**
   * Create medium severity alert
   */
  medium(title: string, description: string, source: string, data?: Record<string, unknown>): EdgeAlert {
    return this.alert({ severity: "medium", title, description, source, data });
  }

  /**
   * Create low severity alert
   */
  low(title: string, description: string, source: string, data?: Record<string, unknown>): EdgeAlert {
    return this.alert({ severity: "low", title, description, source, data });
  }

  /**
   * Create info alert
   */
  info(title: string, description: string, source: string, data?: Record<string, unknown>): EdgeAlert {
    return this.alert({ severity: "info", title, description, source, data });
  }

  /**
   * Add alert to queue
   */
  private addAlert(alert: EdgeAlert): void {
    // Enforce max alerts
    if (this.alerts.length >= this.config.maxAlerts) {
      const removed = this.alerts.shift();
      if (removed) {
        this.emit("alert_evicted", removed);
      }
    }

    this.alerts.push(alert);
    this.pendingQueue.push(alert);

    // Log alert
    if (this.logger) {
      const logLevel = alert.severity === "critical" || alert.severity === "high" ? "error" : "warn";
      this.logger.log(logLevel, alert.title, {
        alertId: alert.id,
        severity: alert.severity,
        source: alert.source,
      });
    }

    // Immediate forward for critical alerts
    if (alert.severity === "critical" && this.config.forwardEndpoint) {
      this.forwardAlert(alert).catch(() => {});
    }

    this.emit("alert", alert);
  }

  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit("alert_acknowledged", alert);
      return true;
    }
    return false;
  }

  /**
   * Get alert by ID
   */
  get(alertId: string): EdgeAlert | undefined {
    return this.alerts.find((a) => a.id === alertId);
  }

  /**
   * Get all alerts
   */
  getAll(options?: {
    severity?: AlertSeverity;
    acknowledged?: boolean;
    since?: number;
  }): EdgeAlert[] {
    let alerts = [...this.alerts];

    if (options?.severity) {
      alerts = alerts.filter((a) => a.severity === options.severity);
    }

    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === options.acknowledged);
    }

    if (options?.since) {
      const since = options.since;
      alerts = alerts.filter((a) => a.timestamp >= since);
    }

    return alerts;
  }

  /**
   * Get alert counts
   */
  getCounts(): {
    total: number;
    pending: number;
    acknowledged: number;
    bySeverity: Record<AlertSeverity, number>;
  } {
    const bySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    let acknowledged = 0;
    for (const alert of this.alerts) {
      bySeverity[alert.severity]++;
      if (alert.acknowledged) acknowledged++;
    }

    return {
      total: this.alerts.length,
      pending: this.pendingQueue.length,
      acknowledged,
      bySeverity,
    };
  }

  /**
   * Forward pending alerts
   */
  async forwardPending(): Promise<void> {
    if (this.isForwarding || !this.config.forwardEndpoint) {
      return;
    }

    if (this.pendingQueue.length === 0) {
      return;
    }

    this.isForwarding = true;

    const alertsToForward = this.pendingQueue.splice(0);
    const failed: EdgeAlert[] = [];

    for (const alert of alertsToForward) {
      try {
        await this.forwardAlert(alert);
      } catch {
        failed.push(alert);
      }
    }

    // Re-queue failed alerts
    this.pendingQueue.unshift(...failed);

    this.isForwarding = false;
  }

  /**
   * Forward a single alert
   */
  private async forwardAlert(alert: EdgeAlert): Promise<void> {
    if (!this.config.forwardEndpoint) {
      return;
    }

    let attempts = 0;
    const maxAttempts = this.config.retryAttempts;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(this.config.forwardEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(alert),
        });

        if (response.ok) {
          this.emit("alert_forwarded", alert);
          return;
        }

        throw new Error(`Forward failed: ${response.status}`);
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          this.emit("alert_forward_failed", { alert, error });
          throw error;
        }
        // Wait before retry
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  /**
   * Clear acknowledged alerts
   */
  clearAcknowledged(): number {
    const before = this.alerts.length;
    this.alerts = this.alerts.filter((a) => !a.acknowledged);
    return before - this.alerts.length;
  }

  /**
   * Clear all alerts
   */
  clear(): void {
    this.alerts = [];
    this.pendingQueue = [];
  }

  /**
   * Shutdown alerter
   */
  shutdown(): void {
    if (this.forwardTimer) {
      clearInterval(this.forwardTimer);
      this.forwardTimer = null;
    }

    // Final forward attempt
    if (this.pendingQueue.length > 0 && this.config.forwardEndpoint) {
      this.forwardPending().catch(() => {});
    }
  }
}

/**
 * Create edge alerter instance
 */
export function createEdgeAlerter(
  config?: Partial<EdgeAlerterConfig>
): EdgeAlerter {
  return new EdgeAlerter(config);
}
