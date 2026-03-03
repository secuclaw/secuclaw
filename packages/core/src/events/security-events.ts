import { EventEmitter } from "events";

export type SecurityEventType = 
  | "threat.detected"
  | "vulnerability.found"
  | "attack.started"
  | "attack.completed"
  | "defense.triggered"
  | "compliance.gap"
  | "incident.created"
  | "session.started"
  | "session.ended"
  | "user.login"
  | "user.logout"
  | "risk.changed"
  | "alert.critical"
  | "alert.high"
  | "alert.medium"
  | "alert.low"
  | "system.status"
  | "tick"
  | "*";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: Date;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: string;
  target?: string;
  message: string;
  data?: Record<string, unknown>;
  acknowledged?: boolean;
}

export interface EventSubscriber {
  id: string;
  events: SecurityEventType[];
  callback: (event: SecurityEvent) => void;
  filter?: (event: SecurityEvent) => boolean;
}

class SecurityEventBus extends EventEmitter {
  private subscribers: Map<string, EventSubscriber> = new Map();
  private eventHistory: SecurityEvent[] = [];
  private maxHistory: number = 1000;
  private eventCounter: number = 0;

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${++this.eventCounter}`;
  }

  emit(event: string, data: Omit<SecurityEvent, "id" | "timestamp">): boolean {
    const fullEvent: SecurityEvent = {
      ...data,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }

    super.emit(event, fullEvent);
    const wildcardResult = super.emit("*", fullEvent);
    return wildcardResult || true;
  }

  subscribe(subscriber: Omit<EventSubscriber, "id">): string {
    const id = "sub-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const fullSubscriber: EventSubscriber = {
      ...subscriber,
      id,
    };

    this.subscribers.set(id, fullSubscriber);

    for (const eventType of subscriber.events) {
      if (eventType !== "*") {
        this.on(eventType, subscriber.callback);
      }
    }

    return id;
  }

  unsubscribe(subscriberId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return false;

    for (const eventType of subscriber.events) {
      if (eventType !== "*") {
        this.off(eventType, subscriber.callback);
      }
    }

    this.subscribers.delete(subscriberId);
    return true;
  }

  getSubscribers(): EventSubscriber[] {
    return Array.from(this.subscribers.values());
  }

  getHistory(
    options?: {
      type?: SecurityEventType;
      severity?: SecurityEvent["severity"];
      since?: Date;
      limit?: number;
    }
  ): SecurityEvent[] {
    let events = [...this.eventHistory];

    if (options?.type) {
      events = events.filter((e) => e.type === options.type);
    }

    if (options?.severity) {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      events = events.filter((e) => severityOrder[e.severity] <= severityOrder[options.severity!]);
    }

    if (options?.since) {
      events = events.filter((e) => e.timestamp >= options.since!);
    }

    if (options?.limit) {
      events = events.slice(-options.limit);
    }

    return events.reverse();
  }

  getStats(): {
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    subscriberCount: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const event of this.eventHistory) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    }

    return {
      totalEvents: this.eventHistory.length,
      byType,
      bySeverity,
      subscriberCount: this.subscribers.size,
    };
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  broadcastToGateway(event: SecurityEvent): void {
    console.log(`[SECURITY EVENT] ${event.severity.toUpperCase()} ${event.type}: ${event.message}`);
  }
}

const securityEventBus = new SecurityEventBus();

securityEventBus.on("*", (event: SecurityEvent) => {
  securityEventBus.broadcastToGateway(event);
});

export { SecurityEventBus, securityEventBus };

export function createSecurityEvent(
  type: SecurityEventType,
  message: string,
  severity: SecurityEvent["severity"],
  source: string,
  options?: {
    target?: string;
    data?: Record<string, unknown>;
  }
): void {
  securityEventBus.emit(type, {
    type,
    severity,
    source,
    message,
    ...options,
  });
}

export function getSecurityEvents(
  options?: {
    type?: SecurityEventType;
    severity?: SecurityEvent["severity"];
    limit?: number;
  }
): SecurityEvent[] {
  return securityEventBus.getHistory(options);
}

export function subscribeToSecurityEvents(
  events: SecurityEventType[],
  callback: (event: SecurityEvent) => void,
  filter?: (event: SecurityEvent) => boolean
): string {
  return securityEventBus.subscribe({ events, callback, filter });
}

export function unsubscribeFromSecurityEvents(subscriberId: string): boolean {
  return securityEventBus.unsubscribe(subscriberId);
}

export function getSecurityEventStats() {
  return securityEventBus.getStats();
}
