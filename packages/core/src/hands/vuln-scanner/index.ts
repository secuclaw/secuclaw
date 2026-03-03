/**
 * VulnScanner Hand - Implementation
 */

import { v4 as uuidv4 } from "uuid";
import { BaseHand } from "../base.js";
import type { HandContext } from "../context.js";
import type { HandResult } from "../result.js";
import { createSuccessResult, createErrorResult } from "../result.js";
import { VulnScannerDefinition } from "./definition.js";
import type {
  Vulnerability,
  Asset,
  Port,
  Service,
  ScanResult,
  VulnSeverity,
  ScanSummary,
} from "./types.js";

// ============================================================================
// CVE Matcher
// ============================================================================

/**
 * Matches services to known CVEs
 */
export class CVEMatcher {
  // Simplified CVE database
  private static readonly CVE_DATABASE: Record<string, { cve: string; severity: VulnSeverity; description: string }> = {
    "nginx/1.14": { cve: "CVE-2017-7529", severity: "medium", description: "nginx Integer Overflow" },
    "nginx/1.16": { cve: "CVE-2021-23017", severity: "high", description: "nginx Buffer Overflow" },
    "openssh/7.4": { cve: "CVE-2017-15906", severity: "medium", description: "OpenSSH File Overwrite" },
    "openssh/8.0": { cve: "CVE-2019-6109", severity: "medium", description: "OpenSSH UTF-8 Manipulation" },
    "apache/2.4.29": { cve: "CVE-2017-15710", severity: "medium", description: "Apache mod_auth Fixation" },
    "mysql/5.7": { cve: "CVE-2018-2562", severity: "medium", description: "MySQL Denial of Service" },
    "redis/4.0": { cve: "CVE-2018-11218", severity: "high", description: "Redis Heap Overflow" },
    "elasticsearch/6.0": { cve: "CVE-2018-17246", severity: "high", description: "Elasticsearch Script Injection" },
  };

  /**
   * Find CVEs for a service
   */
  match(service: Service): Vulnerability[] {
    const vulns: Vulnerability[] = [];
    const key = `${service.name}/${service.version}`;
    
    // Direct match
    if (CVEMatcher.CVE_DATABASE[key]) {
      const cve = CVEMatcher.CVE_DATABASE[key];
      vulns.push(this.createVulnerability(cve.cve, cve.description, cve.severity, service.name));
    }
    
    // Check product family
    for (const [pattern, info] of Object.entries(CVEMatcher.CVE_DATABASE)) {
      if (pattern.startsWith(service.name) && service.version?.startsWith(pattern.split("/")[1])) {
        if (!vulns.find(v => v.cve === info.cve)) {
          vulns.push(this.createVulnerability(info.cve, info.description, info.severity, service.name));
        }
      }
    }
    
    return vulns;
  }

  /**
   * Create vulnerability object
   */
  private createVulnerability(cveId: string, description: string, severity: VulnSeverity, component: string): Vulnerability {
    return {
      id: uuidv4(),
      cve: cveId,
      title: cveId,
      description,
      severity,
      status: "open",
      affectedComponent: component,
      cvss: this.getCVSS(severity),
      references: [`https://nvd.nist.gov/vuln/detail/${cveId}`],
    };
  }

  /**
   * Get CVSS score from severity
   */
  private getCVSS(severity: VulnSeverity): number {
    switch (severity) {
      case "critical": return 9.5;
      case "high": return 7.5;
      case "medium": return 5.0;
      case "low": return 3.0;
      default: return 0;
    }
  }
}

// ============================================================================
// Asset Discovery
// ============================================================================

/**
 * Discovers assets and services (simulated)
 */
export class AssetDiscovery {
  /**
   * Discover assets at target
   */
  async discover(target: string): Promise<Asset[]> {
    // Simulated discovery - would use nmap in production
    const assets: Asset[] = [];
    
    // Sample asset for demonstration
    const asset: Asset = {
      id: uuidv4(),
      host: target,
      hostname: target.includes(".") ? target : undefined,
      os: "Linux 5.4",
      ports: [
        { number: 22, protocol: "tcp", state: "open", service: "ssh", version: "OpenSSH 8.0" },
        { number: 80, protocol: "tcp", state: "open", service: "http", version: "nginx 1.14" },
        { number: 443, protocol: "tcp", state: "open", service: "http", version: "nginx 1.14" },
        { number: 3306, protocol: "tcp", state: "open", service: "mysql", version: "MySQL 5.7" },
        { number: 6379, protocol: "tcp", state: "open", service: "redis", version: "Redis 4.0" },
      ],
      services: [
        { name: "ssh", version: "8.0", product: "OpenSSH", vendor: "OpenBSD" },
        { name: "http", version: "1.14", product: "nginx", vendor: "nginx" },
        { name: "mysql", version: "5.7", product: "MySQL", vendor: "Oracle" },
        { name: "redis", version: "4.0", product: "Redis", vendor: "Redis Labs" },
      ],
      tags: ["production", "server"],
    };
    
    assets.push(asset);
    return assets;
  }
}

// ============================================================================
// Report Generator
// ============================================================================

/**
 * Generates vulnerability reports
 */
export class ReportGenerator {
  generateMarkdown(result: ScanResult): string {
    const lines = [
      "# Vulnerability Scan Report",
      "",
      `**Target:** ${result.target}`,
      `**Scan Type:** ${result.scanType}`,
      `**Duration:** ${result.duration}ms`,
      "",
      "## Summary",
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Assets | ${result.summary.totalAssets} |`,
      `| Total Vulnerabilities | ${result.summary.totalVulns} |`,
      `| Critical | ${result.summary.bySeverity.critical || 0} |`,
      `| High | ${result.summary.bySeverity.high || 0} |`,
      "",
    ];
    
    if (result.vulnerabilities.length > 0) {
      lines.push("## Vulnerabilities", "");
      lines.push("| CVE | Severity | Component | Description |");
      lines.push("|-----|----------|-----------|-------------|");
      for (const vuln of result.vulnerabilities) {
        lines.push(`| ${vuln.cve || "N/A"} | ${vuln.severity} | ${vuln.affectedComponent} | ${vuln.description} |`);
      }
    }
    
    return lines.join("\n");
  }
}

// ============================================================================
// VulnScanner Hand
// ============================================================================

/**
 * VulnScanner Hand - Autonomous vulnerability scanning
 */
export class VulnScannerHand extends BaseHand {
  private cveMatcher?: CVEMatcher;
  private assetDiscovery?: AssetDiscovery;
  private reportGenerator?: ReportGenerator;

  constructor() {
    super(VulnScannerDefinition);
  }

  static getDefinition() {
    return VulnScannerDefinition;
  }

  async initialize(): Promise<void> {
    this.reportProgress(0, "Initializing VulnScanner...");
    this.cveMatcher = new CVEMatcher();
    this.assetDiscovery = new AssetDiscovery();
    this.reportGenerator = new ReportGenerator();
    this.reportProgress(100, "VulnScanner initialized");
  }

  async execute(context: HandContext): Promise<HandResult> {
    const startTime = Date.now();
    const config = context.config as Record<string, unknown>;
    const target = config["target"] as string;
    const scanType = (config["scan-type"] as string) || "full";
    const severityThreshold = (config["severity-threshold"] as VulnSeverity) || "medium";
    
    if (!target) {
      return createErrorResult(
        { code: "VALIDATION_ERROR", message: "Target is required", recoverable: false },
        0
      );
    }
    
    try {
      this.reportProgress(10, `Discovering assets at ${target}...`);
      
      // Discover assets
      const assets = await this.assetDiscovery!.discover(target);
      
      this.reportProgress(30, "Identifying vulnerabilities...");
      
      // Find vulnerabilities
      const vulnerabilities: Vulnerability[] = [];
      for (const asset of assets) {
        for (const service of asset.services) {
          const vulns = this.cveMatcher!.match(service);
          vulnerabilities.push(...vulns);
        }
      }
      
      this.reportProgress(70, "Generating report...");
      
      // Filter by severity
      const severityOrder: VulnSeverity[] = ["info", "low", "medium", "high", "critical"];
      const thresholdIndex = severityOrder.indexOf(severityThreshold);
      const filteredVulns = vulnerabilities.filter(v => severityOrder.indexOf(v.severity) >= thresholdIndex);
      
      // Generate summary
      const summary: ScanSummary = {
        totalAssets: assets.length,
        totalVulns: filteredVulns.length,
        bySeverity: {
          info: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        criticalVulns: filteredVulns.filter(v => v.severity === "critical"),
      };
      
      for (const vuln of filteredVulns) {
        summary.bySeverity[vuln.severity]++;
      }
      
      const result: ScanResult = {
        success: true,
        target,
        scanType,
        assets,
        vulnerabilities: filteredVulns,
        duration: Date.now() - startTime,
        summary,
      };
      
      const markdownReport = this.reportGenerator!.generateMarkdown(result);
      
      this.reportProgress(100, `Scan complete: ${filteredVulns.length} vulnerabilities found`);
      
      return createSuccessResult(result, Date.now() - startTime, {
        assets_found: assets.length,
        vulns_found: filteredVulns.length,
        critical_vulns: summary.criticalVulns.length,
      }, [
        { type: "report", name: "vuln-report.md", content: markdownReport },
      ]);
    } catch (error) {
      context.logger.error("VulnScanner execution failed", { error: String(error) });
      return createErrorResult(
        { code: "EXECUTION_ERROR", message: error instanceof Error ? error.message : String(error), recoverable: true },
        Date.now() - startTime
      );
    }
  }

  async terminate(): Promise<void> {
    this.cveMatcher = undefined;
    this.assetDiscovery = undefined;
    this.reportGenerator = undefined;
  }
}

export default VulnScannerHand;
