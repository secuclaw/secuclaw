/**
 * Security Event Simulator
 * Generates realistic security events for demonstration purposes
 */

export interface SecurityEvent {
  id: string;
  type: "threat" | "attack" | "malware" | "intrusion" | "policy_violation" | "anomaly";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  source: string;
  timestamp: number;
  status: "new" | "investigating" | "contained" | "resolved" | "false_positive";
  assignee?: string;
  mitreTechnique?: string;
  mitreTactic?: string;
  iocs?: IOC[];
  affectedAssets?: string[];
  rawLog?: string;
}

export interface IOC {
  type: "ip" | "domain" | "hash" | "url" | "email";
  value: string;
  confidence: number;
  source: string;
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  type: "nation_state" | "cybercrime" | "hacktivist" | "insider" | "unknown";
  motivation: string[];
  sophistication: "advanced" | "expert" | "novice";
  lastSeen: number;
  activeCampaigns: number;
  targets: string[];
  techniques: string[];
}

export interface AttackChain {
  id: string;
  name: string;
  status: "active" | "blocked" | "detected" | "prevented";
  startTime: number;
  phases: AttackPhase[];
  sourceIp?: string;
  targetAssets: string[];
  threatActor?: string;
}

export interface AttackPhase {
  order: number;
  tactic: string;
  technique: string;
  status: "success" | "failed" | "attempted" | "prevented";
  timestamp: number;
  details: string;
}

const THREAT_ACTORS: Omit<ThreatActor, "id" | "lastSeen">[] = [
  {
    name: "APT29 (Cozy Bear)",
    aliases: ["The Dukes", "CozyDuke"],
    type: "nation_state",
    motivation: ["espionage", "intelligence"],
    sophistication: "advanced",
    activeCampaigns: 3,
    targets: ["Government", "Defense", "Think Tanks"],
    techniques: ["T1566", "T1078", "T1055", "T1059"],
  },
  {
    name: "LockBit",
    aliases: ["ABCD", "LockBit Black"],
    type: "cybercrime",
    motivation: ["financial"],
    sophistication: "expert",
    activeCampaigns: 12,
    targets: ["Healthcare", "Manufacturing", "Government"],
    techniques: ["T1486", "T1566", "T1027", "T1048"],
  },
  {
    name: "Lazarus Group",
    aliases: ["Hidden Cobra", "APT38"],
    type: "nation_state",
    motivation: ["financial", "espionage"],
    sophistication: "advanced",
    activeCampaigns: 5,
    targets: ["Financial", "Crypto", "Defense"],
    techniques: ["T1566", "T1027", "T1071", "T1078"],
  },
  {
    name: "Unknown Threat Actor",
    aliases: [],
    type: "unknown",
    motivation: ["unknown"],
    sophistication: "expert",
    activeCampaigns: 1,
    targets: ["Technology", "Finance"],
    techniques: ["T1566", "T1190", "T1059"],
  },
];

const MITRE_TACTICS = [
  { id: "TA0001", name: "Initial Access" },
  { id: "TA0002", name: "Execution" },
  { id: "TA0003", name: "Persistence" },
  { id: "TA0004", name: "Privilege Escalation" },
  { id: "TA0005", name: "Defense Evasion" },
  { id: "TA0006", name: "Credential Access" },
  { id: "TA0007", name: "Discovery" },
  { id: "TA0008", name: "Lateral Movement" },
  { id: "TA0009", name: "Collection" },
  { id: "TA0011", name: "Command and Control" },
  { id: "TA0010", name: "Exfiltration" },
  { id: "TA0040", name: "Impact" },
];

const MITRE_TECHNIQUES: Record<string, string[]> = {
  "TA0001": ["T1566", "T1190", "T1078", "T1091", "T1195"],
  "TA0002": ["T1059", "T1203", "T1559", "T1106", "T1129"],
  "TA0003": ["T1547", "T1053", "T1546", "T1078", "T1505"],
  "TA0004": ["T1068", "T1548", "T1134", "T1078", "T1484"],
  "TA0005": ["T1027", "T1070", "T1562", "T1036", "T1055"],
  "TA0006": ["T1003", "T1110", "T1558", "T1606", "T1056"],
  "TA0007": ["T1046", "T1018", "T1057", "T1087", "T1016"],
  "TA0008": ["T1021", "T1210", "T1563", "T1080", "T1072"],
  "TA0009": ["T1005", "T1074", "T1114", "T1119", "T1056"],
  "TA0011": ["T1071", "T1090", "T1095", "T1102", "T1573"],
  "TA0010": ["T1041", "T1048", "T1567", "T1537", "T1020"],
  "TA0040": ["T1486", "T1489", "T1490", "T1498", "T1499"],
};

const ATTACK_SOURCES = [
  "Perimeter Firewall",
  "Web Application Firewall",
  "IDS/IPS",
  "EDR Agent",
  "SIEM Correlation",
  "Threat Intelligence Feed",
  "Email Gateway",
  "DNS Security",
  "Network Traffic Analysis",
  "Endpoint Protection",
];

const ASSET_PREFIXES = ["SRV", "WS", "DB", "APP", "WEB", "API", "GW", "FW", "MAIL", "DC"];

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAssetId(): string {
  return `${randomChoice(ASSET_PREFIXES)}-${randomInt(100, 999)}.${randomChoice(["prod", "dmz", "internal", "cloud"])}.corp.local`;
}

function generateIP(): string {
  const type = Math.random();
  if (type < 0.3) {
    return `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  } else if (type < 0.6) {
    return `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  } else if (type < 0.8) {
    return `172.${randomInt(16, 31)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  } else {
    return `192.168.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  }
}

function generateHash(): string {
  const chars = "0123456789abcdef";
  return Array.from({ length: 64 }, () => randomChoice(chars.split(""))).join("");
}

function generateDomain(): string {
  const tlds = [".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".pw", ".cc"];
  const words = ["update", "secure", "login", "verify", "auth", "portal", "cdn", "api"];
  return `${randomChoice(words)}${randomInt(100, 999)}${randomChoice(tlds)}`;
}

function timeAgo(minutes: number): number {
  return Date.now() - minutes * 60 * 1000;
}

export class SecurityEventSimulator {
  private events: SecurityEvent[] = [];
  private threatActors: ThreatActor[] = [];
  private attackChains: AttackChain[] = [];
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    // Generate threat actors
    for (const actor of THREAT_ACTORS) {
      this.threatActors.push({
        ...actor,
        id: randomId(),
        lastSeen: timeAgo(randomInt(1, 1440)),
      });
    }

    // Generate initial events
    this.generateEvents(50);
    this.generateAttackChains(5);

    this.initialized = true;
  }

  private generateEvents(count: number): void {
    const eventTemplates = [
      {
        type: "threat" as const,
        title: "可疑网络连接",
        descriptions: [
          "检测到与已知C2服务器的通信尝试",
          "发现到恶意IP地址的异常连接",
          "识别出可疑的外部DNS查询",
        ],
      },
      {
        type: "attack" as const,
        title: "暴力破解尝试",
        descriptions: [
          "检测到针对SSH服务的暴力破解",
          "RDP服务遭受密码猜测攻击",
          "VPN入口发现大量登录失败",
        ],
      },
      {
        type: "malware" as const,
        title: "恶意软件检测",
        descriptions: [
          "端点检测到勒索软件行为",
          "发现特洛伊木马程序",
          "识别出挖矿恶意软件",
        ],
      },
      {
        type: "intrusion" as const,
        title: "入侵检测",
        descriptions: [
          "检测到横向移动尝试",
          "发现权限提升行为",
          "识别出持久化机制",
        ],
      },
      {
        type: "policy_violation" as const,
        title: "策略违规",
        descriptions: [
          "检测到数据外泄尝试",
          "发现未授权的云服务使用",
          "识别出违规的外部存储使用",
        ],
      },
      {
        type: "anomaly" as const,
        title: "异常行为",
        descriptions: [
          "检测到异常的用户登录模式",
          "发现异常的数据访问量",
          "识别出异常的网络流量峰值",
        ],
      },
    ];

    for (let i = 0; i < count; i++) {
      const template = randomChoice(eventTemplates);
      const severity = randomChoice(["critical", "high", "medium", "low", "info"] as const);
      const tactic = randomChoice(MITRE_TACTICS);
      const technique = randomChoice(MITRE_TECHNIQUES[tactic.id] || ["T0000"]);

      const event: SecurityEvent = {
        id: randomId(),
        type: template.type,
        severity,
        title: template.title,
        description: randomChoice(template.descriptions),
        source: randomChoice(ATTACK_SOURCES),
        timestamp: timeAgo(randomInt(1, 4320)), // Last 3 days
        status: randomChoice(["new", "investigating", "contained", "resolved", "false_positive"]),
        assignee: Math.random() > 0.3 ? randomChoice(["张三", "李四", "王五", "赵六"]) : undefined,
        mitreTactic: tactic.name,
        mitreTechnique: technique,
        affectedAssets: [generateAssetId(), ...(Math.random() > 0.5 ? [generateAssetId()] : [])],
        iocs: this.generateIOCs(severity === "critical" || severity === "high" ? 3 : 1),
      };

      this.events.push(event);
    }

    // Sort by timestamp
    this.events.sort((a, b) => b.timestamp - a.timestamp);
  }

  private generateIOCs(count: number): IOC[] {
    const iocs: IOC[] = [];
    for (let i = 0; i < count; i++) {
      const type = randomChoice(["ip", "domain", "hash", "url"] as const);
      let value: string;
      
      switch (type) {
        case "ip":
          value = generateIP();
          break;
        case "domain":
          value = generateDomain();
          break;
        case "hash":
          value = generateHash();
          break;
        case "url":
          value = `https://${generateDomain()}/${randomChoice(["api", "update", "verify"])}`;
          break;
      }

      iocs.push({
        type,
        value,
        confidence: randomInt(60, 99),
        source: randomChoice(["Threat Intel Feed", "Internal Analysis", "Community", "Vendor"]),
      });
    }
    return iocs;
  }

  private generateAttackChains(count: number): void {
    for (let i = 0; i < count; i++) {
      const actor = randomChoice(this.threatActors);
      const phases: AttackPhase[] = [];
      const selectedTactics = MITRE_TACTICS.slice(0, randomInt(3, 6));
      
      selectedTactics.forEach((tactic, index) => {
        const technique = randomChoice(MITRE_TECHNIQUES[tactic.id] || ["T0000"]);
        phases.push({
          order: index + 1,
          tactic: tactic.name,
          technique,
          status: randomChoice(["success", "failed", "attempted", "prevented"]),
          timestamp: timeAgo(randomInt(1, 1440)),
          details: `执行${tactic.name}阶段攻击`,
        });
      });

      this.attackChains.push({
        id: randomId(),
        name: `${actor.name}攻击链 #${i + 1}`,
        status: randomChoice(["active", "blocked", "detected", "prevented"]),
        startTime: timeAgo(randomInt(60, 2880)),
        phases,
        sourceIp: generateIP(),
        targetAssets: [generateAssetId(), generateAssetId()],
        threatActor: actor.id,
      });
    }
  }

  // Public API
  getEvents(limit = 50, filters?: {
    type?: SecurityEvent["type"];
    severity?: SecurityEvent["severity"];
    status?: SecurityEvent["status"];
  }): SecurityEvent[] {
    let result = [...this.events];
    
    if (filters) {
      if (filters.type) result = result.filter(e => e.type === filters.type);
      if (filters.severity) result = result.filter(e => e.severity === filters.severity);
      if (filters.status) result = result.filter(e => e.status === filters.status);
    }
    
    return result.slice(0, limit);
  }

  getThreatActors(): ThreatActor[] {
    return this.threatActors;
  }

  getAttackChains(): AttackChain[] {
    return this.attackChains;
  }

  getStats() {
    return {
      total: this.events.length,
      byType: {
        threat: this.events.filter(e => e.type === "threat").length,
        attack: this.events.filter(e => e.type === "attack").length,
        malware: this.events.filter(e => e.type === "malware").length,
        intrusion: this.events.filter(e => e.type === "intrusion").length,
        policy_violation: this.events.filter(e => e.type === "policy_violation").length,
        anomaly: this.events.filter(e => e.type === "anomaly").length,
      },
      bySeverity: {
        critical: this.events.filter(e => e.severity === "critical").length,
        high: this.events.filter(e => e.severity === "high").length,
        medium: this.events.filter(e => e.severity === "medium").length,
        low: this.events.filter(e => e.severity === "low").length,
        info: this.events.filter(e => e.severity === "info").length,
      },
      byStatus: {
        new: this.events.filter(e => e.status === "new").length,
        investigating: this.events.filter(e => e.status === "investigating").length,
        contained: this.events.filter(e => e.status === "contained").length,
        resolved: this.events.filter(e => e.status === "resolved").length,
        false_positive: this.events.filter(e => e.status === "false_positive").length,
      },
      activeThreatActors: this.threatActors.filter(a => a.activeCampaigns > 0).length,
      activeAttackChains: this.attackChains.filter(c => c.status === "active").length,
    };
  }

  addEvent(event: Partial<SecurityEvent>): SecurityEvent {
    const newEvent: SecurityEvent = {
      id: randomId(),
      type: event.type || "anomaly",
      severity: event.severity || "medium",
      title: event.title || "New Security Event",
      description: event.description || "",
      source: event.source || "Manual",
      timestamp: Date.now(),
      status: "new",
      ...event,
    };
    this.events.unshift(newEvent);
    return newEvent;
  }

  refresh(): void {
    // Add some new events
    this.generateEvents(randomInt(3, 8));
    // Update some existing events
    for (let i = 0; i < Math.min(5, this.events.length); i++) {
      if (this.events[i].status === "new" && Math.random() > 0.5) {
        this.events[i].status = randomChoice(["investigating", "contained", "resolved"]);
      }
    }
  }
}

export const securitySimulator = new SecurityEventSimulator();
