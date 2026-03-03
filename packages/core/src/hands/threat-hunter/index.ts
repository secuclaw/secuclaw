/**
 * ThreatHunter Hand - Implementation
 * 
 * Autonomous threat hunting implementation with IOC detection,
 * event correlation, and MITRE ATT&CK mapping.
 */

import { v4 as uuidv4 } from "uuid";
import { BaseHand } from "../base.js";
import type { HandContext } from "../context.js";
import type { HandResult } from "../result.js";
import { createSuccessResult, createErrorResult } from "../result.js";
import { ThreatHunterDefinition } from "./definition.js";
import type {
  Threat,
  IOC,
  SecurityEvent,
  CorrelatedGroup,
  MitreTechnique,
  ThreatHuntResult,
  ThreatSeverity,
  IOCType,
  ThreatReport,
} from "./types.js";

// ============================================================================
// IOC Detector
// ============================================================================

/**
 * IOC Detector - detects indicators of compromise in text/logs
 */
export class IOCDetector {
  // Regex patterns for IOC detection
  private static readonly PATTERNS = {
    ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    domain: /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g,
    md5: /\b[a-fA-F0-9]{32}\b/g,
    sha1: /\b[a-fA-F0-9]{40}\b/g,
    sha256: /\b[a-fA-F0-9]{64}\b/g,
    url: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  };

  /**
   * Detect all IOCs in text
   */
  detect(text: string, source?: string): IOC[] {
    const iocs: IOC[] = [];
    
    // Detect IPs
    const ips = text.match(IOCDetector.PATTERNS.ipv4) || [];
    for (const ip of ips) {
      if (!this.isPrivateIP(ip)) {
        iocs.push(this.createIOC("ip", ip, source));
      }
    }
    
    // Detect domains
    const domains = text.match(IOCDetector.PATTERNS.domain) || [];
    for (const domain of domains) {
      if (!this.isCommonDomain(domain)) {
        iocs.push(this.createIOC("domain", domain, source));
      }
    }
    
    // Detect hashes
    const md5Hashes = text.match(IOCDetector.PATTERNS.md5) || [];
    for (const hash of md5Hashes) {
      iocs.push(this.createIOC("hash", hash, source));
    }
    
    const sha1Hashes = text.match(IOCDetector.PATTERNS.sha1) || [];
    for (const hash of sha1Hashes) {
      iocs.push(this.createIOC("hash", hash, source));
    }
    
    const sha256Hashes = text.match(IOCDetector.PATTERNS.sha256) || [];
    for (const hash of sha256Hashes) {
      iocs.push(this.createIOC("hash", hash, source));
    }
    
    // Detect URLs
    const urls = text.match(IOCDetector.PATTERNS.url) || [];
    for (const url of urls) {
      iocs.push(this.createIOC("url", url, source));
    }
    
    // Detect emails
    const emails = text.match(IOCDetector.PATTERNS.email) || [];
    for (const email of emails) {
      iocs.push(this.createIOC("email", email, source));
    }
    
    return iocs;
  }

  /**
   * Create an IOC object
   */
  private createIOC(type: IOCType, value: string, source?: string): IOC {
    return {
      type,
      value,
      source,
      confidence: 0.8,
      tags: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
    };
  }

  /**
   * Check if IP is private
   */
  private isPrivateIP(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    return false;
  }

  /**
   * Check if domain is common/benign
   */
  private isCommonDomain(domain: string): boolean {
    const commonDomains = [
      "google.com", "microsoft.com", "amazon.com", "github.com",
      "cloudflare.com", "akamai.com", "example.com", "localhost",
    ];
    return commonDomains.some(d => domain.toLowerCase().endsWith(d));
  }
}

// ============================================================================
// Event Correlator
// ============================================================================

/**
 * Correlates security events to identify attack patterns
 */
export class EventCorrelator {
  /**
   * Correlate events by time window
   */
  correlateByTime(events: SecurityEvent[], windowMs: number): CorrelatedGroup[] {
    const groups: CorrelatedGroup[] = [];
    const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let currentGroup: SecurityEvent[] = [];
    let groupStart: Date | null = null;
    
    for (const event of sorted) {
      if (currentGroup.length === 0) {
        currentGroup.push(event);
        groupStart = event.timestamp;
      } else {
        const lastEvent = currentGroup[currentGroup.length - 1];
        const timeDiff = event.timestamp.getTime() - lastEvent.timestamp.getTime();
        
        if (timeDiff <= windowMs) {
          currentGroup.push(event);
        } else {
          if (currentGroup.length > 1) {
            groups.push(this.createGroup(currentGroup, groupStart!, event.timestamp));
          }
          currentGroup = [event];
          groupStart = event.timestamp;
        }
      }
    }
    
    // Don't forget the last group
    if (currentGroup.length > 1 && groupStart) {
      groups.push(this.createGroup(currentGroup, groupStart, currentGroup[currentGroup.length - 1].timestamp));
    }
    
    return groups;
  }

  /**
   * Calculate risk score for a correlated group
   */
  calculateRiskScore(group: CorrelatedGroup): number {
    let score = 0;
    
    // Base score from event count
    score += Math.min(group.events.length * 5, 25);
    
    // Severity contributions
    for (const event of group.events) {
      switch (event.severity) {
        case "critical": score += 25; break;
        case "high": score += 15; break;
        case "medium": score += 10; break;
        case "low": score += 5; break;
      }
    }
    
    // Technique contributions
    score += group.techniques.length * 10;
    
    return Math.min(score, 100);
  }

  /**
   * Create a correlated group
   */
  private createGroup(events: SecurityEvent[], start: Date, end: Date): CorrelatedGroup {
    const correlator = new EventCorrelator();
    return {
      id: uuidv4(),
      events,
      startTime: start,
      endTime: end,
      techniques: [],
      riskScore: correlator.calculateRiskScore({ events, techniques: [], riskScore: 0 } as unknown as CorrelatedGroup),
      description: `Correlated ${events.length} events`,
    };
  }
}

// ============================================================================
// MITRE Mapper
// ============================================================================

/**
 * Maps threats to MITRE ATT&CK techniques
 */
export class MitreMapper {
  // Simplified MITRE technique mappings based on IOC patterns
  private static readonly TECHNIQUE_MAPPINGS: Record<string, string[]> = {
    "suspicious-ip": ["T1059", "T1072"],
    "suspicious-domain": ["T1568", "T1102"],
    "malware-hash": ["T1588.001", "T1027"],
    "suspicious-url": ["T1566", "T1204"],
    "lateral-movement": ["T1021", "T1080"],
  };

  /**
   * Map IOCs to MITRE techniques
   */
  mapToTechniques(iocs: IOC[]): MitreTechnique[] {
    const techniques: MitreTechnique[] = [];
    const techniqueIds = new Set<string>();
    
    for (const ioc of iocs) {
      const mapped = MitreMapper.TECHNIQUE_MAPPINGS[ioc.type] || [];
      for (const techId of mapped) {
        if (!techniqueIds.has(techId)) {
          techniqueIds.add(techId);
          techniques.push(this.getTechnique(techId));
        }
      }
    }
    
    return techniques;
  }

  /**
   * Get technique details
   */
  private getTechnique(id: string): MitreTechnique {
    // Simplified technique database
    const database: Record<string, MitreTechnique> = {
      "T1059": {
        id: "T1059",
        name: "Command and Scripting Interpreter",
        tactic: "Execution",
        description: "Adversaries may abuse command and script interpreters to execute commands",
        detection: "Monitor process creation and command execution",
        mitigation: ["Mitelist", "Execution Prevention"],
      },
      "T1566": {
        id: "T1566",
        name: "Phishing",
        tactic: "Initial Access",
        description: "Adversaries may send phishing messages to gain access",
        detection: "Monitor email attachments and links",
        mitigation: ["Email Protection", "User Training"],
      },
      "T1027": {
        id: "T1027",
        name: "Obfuscated Files or Information",
        tactic: "Defense Evasion",
        description: "Adversaries may use obfuscation to hide payloads",
        detection: "Monitor file creation and process execution",
        mitigation: ["File Integrity", "Execution Prevention"],
      },
      "T1021": {
        id: "T1021",
        name: "Lateral Movement",
        tactic: "Lateral Movement",
        description: "Adversaries may use valid accounts to move laterally",
        detection: "Monitor remote service usage",
        mitigation: ["Credential Access", "Privileged Account Management"],
      },
      "T1102": {
        id: "T1102",
        name: "Web Service",
        tactic: "Command and Control",
        description: "Adversaries may use web services for C2",
        detection: "Monitor network connections to unknown IPs",
        mitigation: ["Network Intrusion Prevention"],
      },
    };
    
    return database[id] || {
      id,
      name: "Unknown Technique",
      tactic: "Unknown",
      description: "Technique not in database",
      detection: "N/A",
      mitigation: [],
    };
  }
}

// ============================================================================
// Report Generator
// ============================================================================

/**
 * Generates threat reports
 */
export class ReportGenerator {
  /**
   * Generate a markdown report
   */
  generateMarkdown(result: ThreatHuntResult): string {
    const lines: string[] = [
      "# Threat Hunt Report",
      "",
      `**Generated:** ${result.summary.timeRange.start.toISOString()}`,
      `**Duration:** ${result.duration}ms`,
      "",
      "## Summary",
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Threats | ${result.summary.totalThreats} |`,
      `| Total IOCs | ${result.summary.totalIOCs} |`,
      `| MITRE Techniques | ${result.summary.MitredTechniquesCount} |`,
      `| Overall Risk Score | ${result.summary.overallRiskScore} |`,
      "",
    ];
    
    // Severity breakdown
    lines.push("### Severity Breakdown", "");
    for (const [severity, count] of Object.entries(result.summary.bySeverity)) {
      lines.push(`- **${severity.toUpperCase()}**: ${count}`);
    }
    lines.push("");
    
    // IOCs
    if (result.iocs.length > 0) {
      lines.push("## Indicators of Compromise", "");
      lines.push("| Type | Value | Confidence |");
      lines.push("|------|-------|------------|");
      for (const ioc of result.iocs) {
        lines.push(`| ${ioc.type} | \`${ioc.value}\` | ${(ioc.confidence * 100).toFixed(0)}% |`);
      }
      lines.push("");
    }
    
    // MITRE techniques
    if (result.MitredTechniques.length > 0) {
      lines.push("## MITRE ATT&CK Techniques", "");
      lines.push("| ID | Name | Tactic |");
      lines.push("|----|------|--------|");
      for (const tech of result.MitredTechniques) {
        lines.push(`| ${tech.id} | ${tech.name} | ${tech.tactic} |`);
      }
      lines.push("");
    }
    
    return lines.join("\n");
  }

  /**
   * Generate JSON report
   */
  generateJSON(result: ThreatHuntResult): ThreatReport {
    return {
      id: uuidv4(),
      generatedAt: new Date(),
      summary: result.summary,
      threats: result.threats,
      iocs: result.iocs,
      MitredTechniques: result.MitredTechniques,
      recommendations: this.generateRecommendations(result),
    };
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(result: ThreatHuntResult): string[] {
    const recommendations: string[] = [];
    
    if (result.summary.bySeverity.critical > 0) {
      recommendations.push("URGENT: Critical threats detected - immediate investigation required");
    }
    
    if (result.summary.bySeverity.high > 0) {
      recommendations.push("High priority threats detected - schedule investigation within 24 hours");
    }
    
    if (result.MitredTechniques.length > 0) {
      recommendations.push("Review MITRE ATT&CK techniques for detection rule updates");
    }
    
    if (result.iocs.length > 0) {
      recommendations.push("Block identified IOCs at perimeter security devices");
    }
    
    return recommendations;
  }
}

// ============================================================================
// ThreatHunter Hand
// ============================================================================

/**
 * ThreatHunter Hand - Autonomous threat hunting
 */
export class ThreatHunterHand extends BaseHand {
  private iocDetector?: IOCDetector;
  private correlator?: EventCorrelator;
  private mitreMapper?: MitreMapper;
  private reportGenerator?: ReportGenerator;

  constructor() {
    super(ThreatHunterDefinition);
  }

  /**
   * Get the Hand's definition
   */
  static getDefinition() {
    return ThreatHunterDefinition;
  }

  /**
   * Initialize the Hand
   */
  async initialize(): Promise<void> {
    this.reportProgress(0, "Initializing ThreatHunter...");
    
    // Initialize components
    this.iocDetector = new IOCDetector();
    this.correlator = new EventCorrelator();
    this.mitreMapper = new MitreMapper();
    this.reportGenerator = new ReportGenerator();
    
    this.reportProgress(100, "ThreatHunter initialized");
  }

  /**
   * Execute threat hunting
   */
  async execute(context: HandContext): Promise<HandResult> {
    const startTime = Date.now();
    const config = context.config as Record<string, unknown>;
    const severityThreshold = (config["severity-threshold"] as ThreatSeverity) || "medium";
    const correlationWindowHours = (config["correlation-window"] as number) || 24;
    const mitreEnabled = config["mitre-enabled"] !== false;
    
    try {
      this.reportProgress(10, "Collecting security logs...");
      
      // Collect sample logs (in real implementation, would query actual logs)
      const logs = await this.collectLogs(context);
      
      this.reportProgress(30, "Detecting indicators of compromise...");
      const iocs: IOC[] = [];
      for (const log of logs) {
        const detected = this.iocDetector!.detect(log, "security-logs");
        iocs.push(...detected);
      }
      
      // Deduplicate IOCs
      const uniqueIOCs = this.deduplicateIOCs(iocs);
      
      this.reportProgress(50, "Correlating security events...");
      
      // Create events from logs
      const events = this.createEventsFromLogs(logs);
      
      // Correlate events
      const windowMs = correlationWindowHours * 60 * 60 * 1000;
      const correlatedGroups = this.correlator!.correlateByTime(events, windowMs);
      
      this.reportProgress(70, "Mapping to MITRE ATT&CK...");
      
      // Map to MITRE techniques
      let mitreTechniques: MitreTechnique[] = [];
      if (mitreEnabled) {
        mitreTechniques = this.mitreMapper!.mapToTechniques(uniqueIOCs);
      }
      
      // Calculate risk scores
      for (const group of correlatedGroups) {
        group.riskScore = this.correlator!.calculateRiskScore(group);
        group.techniques = mitreTechniques;
      }
      
      this.reportProgress(85, "Generating threat report...");
      
      // Create threats from correlated groups
      const threats = this.createThreats(correlatedGroups, severityThreshold);
      
      // Generate summary
      const summary = this.generateSummary(threats, uniqueIOCs, mitreTechniques, logs);
      
      // Generate reports
      const result: ThreatHuntResult = {
        success: true,
        threats,
        iocs: uniqueIOCs,
        correlatedGroups,
        MitredTechniques: mitreTechniques,
        summary,
        duration: Date.now() - startTime,
      };
      
      const markdownReport = this.reportGenerator!.generateMarkdown(result);
      const jsonReport = this.reportGenerator!.generateJSON(result);
      
      this.reportProgress(100, `Threat hunt complete: ${threats.length} threats, ${uniqueIOCs.length} IOCs`);
      
      return createSuccessResult(result, Date.now() - startTime, {
        threats_detected: threats.length,
        iocs_found: uniqueIOCs.length,
        mitre_techniques: mitreTechniques.length,
        risk_score: summary.overallRiskScore,
      }, [
        {
          type: "report",
          name: "threat-report.md",
          content: markdownReport,
        },
        {
          type: "report",
          name: "threat-report.json",
          content: JSON.stringify(jsonReport, null, 2),
        },
      ]);
    } catch (error) {
      context.logger.error("ThreatHunter execution failed", { error: String(error) });
      return createErrorResult(
        {
          code: "EXECUTION_ERROR",
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
        Date.now() - startTime
      );
    }
  }

  /**
   * Terminate the Hand
   */
  async terminate(): Promise<void> {
    this.iocDetector = undefined;
    this.correlator = undefined;
    this.mitreMapper = undefined;
    this.reportGenerator = undefined;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Collect logs (placeholder - would integrate with actual log sources)
   */
  private async collectLogs(context: HandContext): Promise<string[]> {
    // In a real implementation, this would query log aggregation systems
    // For now, return sample data for demonstration
    return [
      "Connection from 192.168.1.100 to suspicious-domain.com",
      "Failed login attempt from 10.0.0.55",
      "Malware hash detected: a1b2c3d4e5f678901234567890123456",
      "PowerShell execution from unknown process",
      " Lateral movement detected from 172.16.0.50",
    ];
  }

  /**
   * Deduplicate IOCs
   */
  private deduplicateIOCs(iocs: IOC[]): IOC[] {
    const seen = new Map<string, IOC>();
    for (const ioc of iocs) {
      const key = `${ioc.type}:${ioc.value}`;
      if (!seen.has(key)) {
        seen.set(key, ioc);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Create events from logs (simplified)
   */
  private createEventsFromLogs(logs: string[]): SecurityEvent[] {
    return logs.map((log, index) => ({
      id: uuidv4(),
      timestamp: new Date(Date.now() - index * 3600000),
      source: "security-logs",
      eventType: "unknown",
      severity: this.inferSeverity(log),
      rawData: { log },
      iocs: this.iocDetector?.detect(log) || [],
    }));
  }

  /**
   * Infer severity from log content
   */
  private inferSeverity(log: string): ThreatSeverity {
    const lowerLog = log.toLowerCase();
    if (lowerLog.includes("malware") || lowerLog.includes("critical")) return "critical";
    if (lowerLog.includes("lateral") || lowerLog.includes("suspicious")) return "high";
    if (lowerLog.includes("failed") || lowerLog.includes("error")) return "medium";
    return "low";
  }

  /**
   * Create threats from correlated groups
   */
  private createThreats(groups: CorrelatedGroup[], threshold: ThreatSeverity): Threat[] {
    const severityOrder: ThreatSeverity[] = ["low", "medium", "high", "critical"];
    const thresholdIndex = severityOrder.indexOf(threshold);
    
    return groups
      .filter(g => severityOrder.indexOf(this.getGroupSeverity(g)) >= thresholdIndex)
      .map(group => ({
        id: group.id,
        title: `Threat Group: ${group.description}`,
        description: `${group.events.length} correlated events with risk score ${group.riskScore}`,
        severity: this.getGroupSeverity(group),
        iocs: group.events.flatMap(e => e.iocs),
        techniques: group.techniques.map(t => t.id),
        timeline: group.events.map(e => ({
          timestamp: e.timestamp,
          event: e.eventType,
          source: e.source,
        })),
        status: "new" as const,
      }));
  }

  /**
   * Get severity from group
   */
  private getGroupSeverity(group: CorrelatedGroup): ThreatSeverity {
    if (group.riskScore >= 75) return "critical";
    if (group.riskScore >= 50) return "high";
    if (group.riskScore >= 25) return "medium";
    return "low";
  }

  /**
   * Generate summary
   */
  private generateSummary(
    threats: Threat[],
    iocs: IOC[],
    techniques: MitreTechnique[],
    logs: string[]
  ) {
    const bySeverity: Record<ThreatSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    
    for (const threat of threats) {
      bySeverity[threat.severity]++;
    }
    
    const riskScore = threats.reduce((sum, t) => {
      switch (t.severity) {
        case "critical": return sum + 40;
        case "high": return sum + 25;
        case "medium": return sum + 10;
        default: return sum + 5;
      }
    }, 0);
    
    return {
      totalThreats: threats.length,
      bySeverity,
      totalIOCs: iocs.length,
      MitredTechniquesCount: techniques.length,
      overallRiskScore: Math.min(riskScore, 100),
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };
  }
}

export default ThreatHunterHand;
