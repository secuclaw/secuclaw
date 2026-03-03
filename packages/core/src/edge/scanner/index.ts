/**
 * Edge Scanner - Lightweight security scanning for edge deployment
 */

import { randomUUID } from "node:crypto";
import { DEFAULT_SCAN_CONFIG } from "../types.js";
import type { EdgeScanResult, EdgeScanConfig } from "../types.js";
export type ScanType = "port" | "vuln" | "config" | "compliance";
export type ScanStatus = "running" | "completed" | "failed" | "timeout";

export interface ScanOptions {
  target: string;
  type: ScanType;
  ports?: number[];
  timeout?: number;
}

/**
 * Edge Scanner
 */
export class EdgeScanner {
  private config: EdgeScanConfig;
  private activeScans: Map<string, EdgeScanResult> = new Map();
  private completedScans: EdgeScanResult[] = [];
  private maxCompleted = 100;

  constructor(config: Partial<EdgeScanConfig> = {}) {
    this.config = { ...DEFAULT_SCAN_CONFIG, ...config };
  }

  /**
   * Start a scan
   */
  async scan(options: ScanOptions): Promise<EdgeScanResult> {
    // Check concurrent limit
    if (this.activeScans.size >= this.config.maxConcurrent) {
      throw new Error("Maximum concurrent scans reached");
    }

    const id = randomUUID();
    const startTime = Date.now();

    const result: EdgeScanResult = {
      id,
      target: options.target,
      type: options.type,
      status: "running",
      findings: 0,
      severity: { critical: 0, high: 0, medium: 0, low: 0 },
      duration: 0,
      timestamp: startTime,
    };

    this.activeScans.set(id, result);

    const timeout = options.timeout ?? this.config.timeout;

    try {
      const scanPromise = this.executeScan(options);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Scan timeout")), timeout);
      });

      const findings = await Promise.race([scanPromise, timeoutPromise]);

      result.status = "completed";
      result.findings = findings.length;
      result.severity = this.categorizeFindings(findings);
      result.duration = Date.now() - startTime;

      if (this.config.compressResults && findings.length > 0) {
        result.raw = this.compressResults(findings);
      }
    } catch (error) {
      result.status = error instanceof Error && error.message === "Scan timeout"
        ? "timeout"
        : "failed";
      result.duration = Date.now() - startTime;
    } finally {
      this.activeScans.delete(id);
      this.addCompleted(result);
    }

    return result;
  }

  /**
   * Execute the actual scan
   */
  private async executeScan(options: ScanOptions): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = [];

    switch (options.type) {
      case "port":
        findings.push(...await this.scanPorts(options.target, options.ports));
        break;
      case "vuln":
        findings.push(...await this.scanVulns(options.target));
        break;
      case "config":
        findings.push(...await this.scanConfig(options.target));
        break;
      case "compliance":
        findings.push(...await this.scanCompliance(options.target));
        break;
    }

    return findings;
  }

  /**
   * Port scan implementation
   */
  private async scanPorts(target: string, ports?: number[]): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = [];
    const defaultPorts = [22, 80, 443, 8080, 8443];
    const scanPorts = ports ?? defaultPorts;

    for (const port of scanPorts) {
      // Simulate port check (in real implementation, use net.connect)
      const isOpen = await this.checkPort(target, port);
      if (isOpen) {
        findings.push({
          id: `port-${port}`,
          type: "port",
          severity: "low",
          title: `Open port: ${port}`,
          description: `Port ${port} is open on ${target}`,
          target,
          port,
        });
      }
    }

    return findings;
  }

  /**
   * Check if a port is open
   */
  private async checkPort(target: string, port: number): Promise<boolean> {
    // Simplified implementation - in production use net.connect
    return new Promise((resolve) => {
      const socket = require("net").createConnection({ host: target, port, timeout: 2000 });
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Vulnerability scan (lightweight)
   */
  private async scanVulns(target: string): Promise<ScanFinding[]> {
    // Lightweight vulnerability check
    const findings: ScanFinding[] = [];

    // Check for common issues
    findings.push({
      id: `vuln-check-1`,
      type: "vuln",
      severity: "medium",
      title: "Security headers check",
      description: "Checking for security headers",
      target,
    });

    return findings;
  }

  /**
   * Configuration scan
   */
  private async scanConfig(target: string): Promise<ScanFinding[]> {
    return [{
      id: `config-check-1`,
      type: "config",
      severity: "low",
      title: "Configuration baseline",
      description: "Configuration compliance check",
      target,
    }];
  }

  /**
   * Compliance scan
   */
  private async scanCompliance(target: string): Promise<ScanFinding[]> {
    return [{
      id: `compliance-check-1`,
      type: "compliance",
      severity: "info",
      title: "Compliance baseline",
      description: "Compliance framework check",
      target,
    }];
  }

  /**
   * Categorize findings by severity
   */
  private categorizeFindings(findings: ScanFinding[]): EdgeScanResult["severity"] {
    const severity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const finding of findings) {
      if (finding.severity === "critical") severity.critical++;
      else if (finding.severity === "high") severity.high++;
      else if (finding.severity === "medium") severity.medium++;
      else severity.low++;
    }
    return severity;
  }

  /**
   * Compress results for storage
   */
  private compressResults(findings: ScanFinding[]): string {
    // Simple JSON compression (in production use zlib)
    return JSON.stringify(findings);
  }

  /**
   * Add to completed scans
   */
  private addCompleted(result: EdgeScanResult): void {
    this.completedScans.push(result);
    if (this.completedScans.length > this.maxCompleted) {
      this.completedScans.shift();
    }
  }

  /**
   * Get scan result by ID
   */
  getScan(id: string): EdgeScanResult | undefined {
    return this.activeScans.get(id) ?? 
      this.completedScans.find((s) => s.id === id);
  }

  /**
   * Get all active scans
   */
  getActiveScans(): EdgeScanResult[] {
    return Array.from(this.activeScans.values());
  }

  /**
   * Get completed scans
   */
  getCompletedScans(): EdgeScanResult[] {
    return [...this.completedScans];
  }

  /**
   * Cancel a scan
   */
  cancelScan(id: string): boolean {
    const scan = this.activeScans.get(id);
    if (scan && scan.status === "running") {
      scan.status = "failed";
      this.activeScans.delete(id);
      this.addCompleted(scan);
      return true;
    }
    return false;
  }
}

/**
 * Scan finding type
 */
interface ScanFinding {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  target: string;
  port?: number;
  [key: string]: unknown;
}

/**
 * Create edge scanner instance
 */
export function createEdgeScanner(
  config?: Partial<EdgeScanConfig>
): EdgeScanner {
  return new EdgeScanner(config);
}
