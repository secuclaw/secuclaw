import type {
  NormalizedEvent,
  DataFusionResult,
  AssetInfo,
  VulnerabilityInfo,
  ThreatIntelligence,
} from "./types.js";

interface EntityCache {
  ips: Map<string, Set<string>>;
  hosts: Map<string, Set<string>>;
  users: Map<string, Set<string>>;
  hashes: Map<string, Set<string>>;
}

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  timeWindow: number;
  conditions: Array<{
    field: string;
    operator: "equals" | "contains" | "matches" | "exists";
    value?: string;
  }>;
  minMatches: number;
  riskBoost: number;
  tags: string[];
}

const DEFAULT_CORRELATION_RULES: CorrelationRule[] = [
  {
    id: "multiple-failed-logins",
    name: "Multiple Failed Logins",
    description: "Detect multiple failed login attempts from same source",
    timeWindow: 300000,
    conditions: [
      { field: "eventType", operator: "equals", value: "authentication" },
      { field: "description", operator: "contains", value: "failed" },
    ],
    minMatches: 5,
    riskBoost: 0.3,
    tags: ["brute-force", "T1110"],
  },
  {
    id: "port-scanning",
    name: "Port Scanning Activity",
    description: "Detect port scanning behavior",
    timeWindow: 60000,
    conditions: [
      { field: "eventType", operator: "equals", value: "network" },
      { field: "dstPort", operator: "exists" },
    ],
    minMatches: 10,
    riskBoost: 0.4,
    tags: ["reconnaissance", "T1046"],
  },
  {
    id: "malware-communication",
    name: "Malware C2 Communication",
    description: "Detect potential C2 communication patterns",
    timeWindow: 600000,
    conditions: [
      { field: "tags", operator: "contains", value: "suspicious" },
      { field: "dstPort", operator: "equals", value: "443" },
    ],
    minMatches: 3,
    riskBoost: 0.6,
    tags: ["c2", "T1071"],
  },
  {
    id: "privilege-escalation",
    name: "Privilege Escalation Attempt",
    description: "Detect privilege escalation attempts",
    timeWindow: 300000,
    conditions: [
      { field: "eventType", operator: "contains", value: "privilege" },
      { field: "severity", operator: "equals", value: "high" },
    ],
    minMatches: 1,
    riskBoost: 0.7,
    tags: ["privilege-escalation", "T1068"],
  },
  {
    id: "data-exfiltration",
    name: "Potential Data Exfiltration",
    description: "Detect large outbound data transfers",
    timeWindow: 600000,
    conditions: [
      { field: "eventType", operator: "equals", value: "network" },
      { field: "description", operator: "contains", value: "outbound" },
    ],
    minMatches: 3,
    riskBoost: 0.8,
    tags: ["exfiltration", "T1041"],
  },
];

export class DataFusionEngine {
  private events: Map<string, NormalizedEvent> = new Map();
  private assets: Map<string, AssetInfo> = new Map();
  private vulnerabilities: Map<string, VulnerabilityInfo> = new Map();
  private threatIntel: Map<string, ThreatIntelligence> = new Map();
  private entityCache: EntityCache = {
    ips: new Map(),
    hosts: new Map(),
    users: new Map(),
    hashes: new Map(),
  };
  private correlationRules: CorrelationRule[];
  private eventTTL: number;

  constructor(eventTTL = 3600000) {
    this.eventTTL = eventTTL;
    this.correlationRules = [...DEFAULT_CORRELATION_RULES];
  }

  addEvent(event: NormalizedEvent): void {
    this.events.set(event.id, event);
    this.updateEntityCache(event);
    this.pruneOldEvents();
  }

  addEvents(events: NormalizedEvent[]): void {
    for (const event of events) {
      this.addEvent(event);
    }
  }

  addAsset(asset: AssetInfo): void {
    this.assets.set(asset.id, asset);
  }

  addVulnerability(vuln: VulnerabilityInfo): void {
    this.vulnerabilities.set(vuln.id, vuln);
  }

  addThreatIntel(ti: ThreatIntelligence): void {
    this.threatIntel.set(ti.id, ti);
  }

  private updateEntityCache(event: NormalizedEvent): void {
    if (event.srcIp) {
      if (!this.entityCache.ips.has(event.srcIp)) {
        this.entityCache.ips.set(event.srcIp, new Set());
      }
      this.entityCache.ips.get(event.srcIp)!.add(event.id);
    }

    if (event.dstIp) {
      if (!this.entityCache.ips.has(event.dstIp)) {
        this.entityCache.ips.set(event.dstIp, new Set());
      }
      this.entityCache.ips.get(event.dstIp)!.add(event.id);
    }

    if (event.hostname) {
      if (!this.entityCache.hosts.has(event.hostname)) {
        this.entityCache.hosts.set(event.hostname, new Set());
      }
      this.entityCache.hosts.get(event.hostname)!.add(event.id);
    }

    if (event.username) {
      if (!this.entityCache.users.has(event.username)) {
        this.entityCache.users.set(event.username, new Set());
      }
      this.entityCache.users.get(event.username)!.add(event.id);
    }

    if (event.hash) {
      if (!this.entityCache.hashes.has(event.hash)) {
        this.entityCache.hashes.set(event.hash, new Set());
      }
      this.entityCache.hashes.get(event.hash)!.add(event.id);
    }
  }

  private pruneOldEvents(): void {
    const now = Date.now();
    const cutoff = now - this.eventTTL;

    for (const [id, event] of this.events) {
      if (event.timestamp < cutoff) {
        this.events.delete(id);
      }
    }
  }

  enrichEvent(event: NormalizedEvent): NormalizedEvent {
    const enriched = { ...event, enrichedData: { ...event.enrichedData } };

    if (event.srcIp && this.threatIntel.size > 0) {
      for (const [_, ti] of this.threatIntel) {
        if (ti.type === "ip" && ti.value === event.srcIp) {
          enriched.enrichedData.threatIntel = {
            type: "source_ip",
            confidence: ti.confidence,
            threatType: ti.threatType,
            threatActor: ti.threatActor,
          };
          enriched.tags.push("threat-intel-match");
          break;
        }
      }
    }

    if (event.hostname) {
      for (const [_, asset] of this.assets) {
        if (
          asset.hostname === event.hostname ||
          asset.ipAddresses.includes(event.srcIp || "")
        ) {
          enriched.enrichedData.asset = {
            id: asset.id,
            type: asset.assetType,
            criticality: asset.criticality,
            owner: asset.owner,
          };
          break;
        }
      }
    }

    return enriched;
  }

  correlate(event: NormalizedEvent): DataFusionResult[] {
    const results: DataFusionResult[] = [];

    for (const rule of this.correlationRules) {
      const relatedEvents = this.findRelatedEvents(event, rule);

      if (relatedEvents.length >= rule.minMatches) {
        const correlationScore = Math.min(
          relatedEvents.length / rule.minMatches,
          1
        );
        const riskScore = this.calculateRiskScore(event, relatedEvents, rule);

        const entities = this.extractEntities(relatedEvents);
        const timeline = this.buildTimeline(relatedEvents);

        results.push({
          eventId: event.id,
          correlationScore,
          relatedEvents: relatedEvents.map((e) => e.id),
          entities,
          timeline,
          riskScore,
          riskFactors: this.identifyRiskFactors(event, relatedEvents, rule),
          recommendedActions: this.generateRecommendations(
            rule,
            riskScore,
            entities
          ),
        });
      }
    }

    return results;
  }

  private findRelatedEvents(
    event: NormalizedEvent,
    rule: CorrelationRule
  ): NormalizedEvent[] {
    const now = Date.now();
    const windowStart = now - rule.timeWindow;
    const related: NormalizedEvent[] = [];

    const searchKeys: string[] = [];
    if (event.srcIp) searchKeys.push(event.srcIp);
    if (event.dstIp) searchKeys.push(event.dstIp);
    if (event.username) searchKeys.push(event.username);

    for (const key of searchKeys) {
      const eventIds =
        this.entityCache.ips.get(key) ||
        this.entityCache.users.get(key) ||
        new Set();

      for (const eventId of eventIds) {
        const candidate = this.events.get(eventId);
        if (candidate && candidate.timestamp >= windowStart) {
          if (this.matchesConditions(candidate, rule.conditions)) {
            related.push(candidate);
          }
        }
      }
    }

    return related;
  }

  private matchesConditions(
    event: NormalizedEvent,
    conditions: CorrelationRule["conditions"]
  ): boolean {
    return conditions.every((cond) => {
      const fieldValue = this.getNestedValue(event, cond.field);

      switch (cond.operator) {
        case "equals":
          return fieldValue === cond.value;
        case "contains":
          if (Array.isArray(fieldValue)) {
            return fieldValue.includes(cond.value);
          }
          return String(fieldValue).includes(cond.value || "");
        case "matches":
          return new RegExp(cond.value || "").test(String(fieldValue));
        case "exists":
          return fieldValue !== undefined && fieldValue !== null;
        default:
          return false;
      }
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current && typeof current === "object") {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private calculateRiskScore(
    event: NormalizedEvent,
    relatedEvents: NormalizedEvent[],
    rule: CorrelationRule
  ): number {
    let score = 0;

    const severityScores = {
      critical: 0.4,
      high: 0.3,
      medium: 0.2,
      low: 0.1,
      info: 0,
    };
    score += severityScores[event.severity] || 0;

    score += rule.riskBoost;

    const frequencyBoost = Math.min(relatedEvents.length * 0.05, 0.3);
    score += frequencyBoost;

    if (event.mitreTechniques && event.mitreTechniques.length > 0) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  private extractEntities(
    events: NormalizedEvent[]
  ): DataFusionResult["entities"] {
    const entityMap = new Map<string, DataFusionResult["entities"][0]>();

    for (const event of events) {
      if (event.srcIp && !entityMap.has(`ip:${event.srcIp}`)) {
        entityMap.set(`ip:${event.srcIp}`, {
          type: "ip",
          value: event.srcIp,
          confidence: 0.8,
        });
      }

      if (event.hostname && !entityMap.has(`host:${event.hostname}`)) {
        entityMap.set(`host:${event.hostname}`, {
          type: "host",
          value: event.hostname,
          confidence: 0.9,
        });
      }

      if (event.username && !entityMap.has(`user:${event.username}`)) {
        entityMap.set(`user:${event.username}`, {
          type: "user",
          value: event.username,
          confidence: 0.85,
        });
      }

      if (event.processName && !entityMap.has(`process:${event.processName}`)) {
        entityMap.set(`process:${event.processName}`, {
          type: "process",
          value: event.processName,
          confidence: 0.7,
        });
      }
    }

    return Array.from(entityMap.values());
  }

  private buildTimeline(
    events: NormalizedEvent[]
  ): DataFusionResult["timeline"] {
    return events
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((event) => ({
        timestamp: event.timestamp,
        event: event.eventType,
        description: event.description || event.title,
      }));
  }

  private identifyRiskFactors(
    event: NormalizedEvent,
    relatedEvents: NormalizedEvent[],
    rule: CorrelationRule
  ): string[] {
    const factors: string[] = [];

    if (event.severity === "critical" || event.severity === "high") {
      factors.push(`High severity event: ${event.severity}`);
    }

    if (relatedEvents.length > 5) {
      factors.push(`High frequency: ${relatedEvents.length} related events`);
    }

    if (event.mitreTechniques && event.mitreTechniques.length > 0) {
      factors.push(`MITRE ATT&CK: ${event.mitreTechniques.join(", ")}`);
    }

    if (rule.tags.length > 0) {
      factors.push(`Matched pattern: ${rule.name}`);
    }

    if (event.enrichedData.threatIntel) {
      factors.push("Threat intelligence match");
    }

    return factors;
  }

  private generateRecommendations(
    rule: CorrelationRule,
    riskScore: number,
    entities: DataFusionResult["entities"]
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 0.7) {
      recommendations.push("Immediate investigation required");
      recommendations.push("Consider isolating affected assets");
    } else if (riskScore >= 0.4) {
      recommendations.push("Review and investigate within 24 hours");
    }

    if (rule.tags.includes("brute-force")) {
      recommendations.push("Review authentication policies");
      recommendations.push("Consider blocking source IP");
    }

    if (rule.tags.includes("malware") || rule.tags.includes("c2")) {
      recommendations.push("Run full malware scan on affected systems");
      recommendations.push("Block associated C2 infrastructure");
    }

    if (rule.tags.includes("exfiltration")) {
      recommendations.push("Review data loss prevention policies");
      recommendations.push("Investigate data access patterns");
    }

    const ips = entities.filter((e) => e.type === "ip");
    if (ips.length > 0) {
      recommendations.push(`Investigate IP addresses: ${ips.map((e) => e.value).join(", ")}`);
    }

    return recommendations;
  }

  addCorrelationRule(rule: CorrelationRule): void {
    this.correlationRules.push(rule);
  }

  getCorrelationRules(): CorrelationRule[] {
    return [...this.correlationRules];
  }

  getStats(): {
    eventCount: number;
    assetCount: number;
    vulnCount: number;
    threatIntelCount: number;
    ruleCount: number;
  } {
    return {
      eventCount: this.events.size,
      assetCount: this.assets.size,
      vulnCount: this.vulnerabilities.size,
      threatIntelCount: this.threatIntel.size,
      ruleCount: this.correlationRules.length,
    };
  }
}
