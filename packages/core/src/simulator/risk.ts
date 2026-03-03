export interface RiskDomain {
  id: string;
  name: string;
  score: number;
  trend: "improving" | "stable" | "worsening";
  items: RiskItem[];
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  category: "operational" | "compliance" | "strategic" | "financial" | "reputational";
  likelihood: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  riskScore: number;
  status: "open" | "mitigating" | "accepted" | "transferred";
  owner?: string;
  mitigations?: string[];
  created: number;
  lastReview: number;
  nextReview: number;
}

export interface BusinessUnit {
  id: string;
  name: string;
  riskScore: number;
  controls: number;
  incidents: number;
  trend: number[];
}

export interface SupplyChainRisk {
  id: string;
  vendor: string;
  category: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  description: string;
  lastAssessment: number;
  nextAssessment: number;
  issues: string[];
}

const BUSINESS_UNITS = [
  "研发中心",
  "销售部门", 
  "运营部门",
  "数据中心",
  "财务部门",
  "人力资源",
  "法务部门",
  "客户服务",
];

const RISK_CATEGORIES = {
  operational: ["系统故障风险", "人员操作风险", "流程缺陷风险", "容量风险"],
  compliance: ["监管合规风险", "数据隐私风险", "合同风险", "许可风险"],
  strategic: ["市场竞争风险", "技术变革风险", "人才流失风险", "并购风险"],
  financial: ["信用风险", "流动性风险", "汇率风险", "投资风险"],
  reputational: ["品牌风险", "舆情风险", "客户投诉风险", "社会责任风险"],
};

const VENDORS = [
  { name: "AWS", category: "云服务商" },
  { name: "Microsoft Azure", category: "云服务商" },
  { name: "阿里云", category: "云服务商" },
  { name: "Splunk", category: "安全工具" },
  { name: "CrowdStrike", category: "端点安全" },
  { name: "Palo Alto", category: "网络安全" },
  { name: "某数据供应商", category: "数据服务" },
  { name: "某外包开发团队", category: "外包服务" },
];

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function daysFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function calculateRiskScore(likelihood: string, impact: string): number {
  const l = likelihood === "high" ? 3 : likelihood === "medium" ? 2 : 1;
  const i = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
  return Math.round((l * i / 9) * 100);
}

export class RiskSimulator {
  private domains: RiskDomain[] = [];
  private businessUnits: BusinessUnit[] = [];
  private supplyChainRisks: SupplyChainRisk[] = [];
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    this.generateDomains();
    this.generateBusinessUnits();
    this.generateSupplyChainRisks();

    this.initialized = true;
  }

  private generateDomains(): void {
    const domainNames = ["网络安全", "数据保护", "业务连续性", "供应链", "合规风险"];
    
    for (const name of domainNames) {
      const items: RiskItem[] = [];
      const category = randomChoice(Object.keys(RISK_CATEGORIES) as (keyof typeof RISK_CATEGORIES)[]);
      const templates = RISK_CATEGORIES[category];
      
      for (let i = 0; i < randomInt(3, 6); i++) {
        const likelihood = randomChoice(["high", "medium", "low"] as const);
        const impact = randomChoice(["high", "medium", "low"] as const);
        
        items.push({
          id: randomId(),
          title: randomChoice(templates),
          description: `${name}领域的风险项目描述`,
          category,
          likelihood,
          impact,
          riskScore: calculateRiskScore(likelihood, impact),
          status: randomChoice(["open", "mitigating", "accepted", "transferred"]),
          owner: Math.random() > 0.3 ? randomChoice(["张三", "李四", "王五"]) : undefined,
          mitigations: Math.random() > 0.5 ? ["控制措施1", "控制措施2"] : undefined,
          created: daysAgo(randomInt(7, 180)),
          lastReview: daysAgo(randomInt(1, 30)),
          nextReview: daysFromNow(randomInt(30, 90)),
        });
      }

      const avgScore = Math.round(items.reduce((s, i) => s + i.riskScore, 0) / items.length);
      
      this.domains.push({
        id: randomId(),
        name,
        score: avgScore,
        trend: avgScore > 60 ? "worsening" : avgScore < 40 ? "improving" : "stable",
        items,
      });
    }
  }

  private generateBusinessUnits(): void {
    for (const name of BUSINESS_UNITS) {
      const trend = Array.from({ length: 6 }, (_, i) => 
        randomInt(30, 80) + Math.round((i - 2.5) * randomInt(-5, 10))
      );
      
      this.businessUnits.push({
        id: randomId(),
        name,
        riskScore: trend[5],
        controls: randomInt(20, 50),
        incidents: randomInt(0, 12),
        trend,
      });
    }
  }

  private generateSupplyChainRisks(): void {
    for (const vendor of VENDORS) {
      const riskLevel = randomChoice(["critical", "high", "medium", "low"] as const);
      
      this.supplyChainRisks.push({
        id: randomId(),
        vendor: vendor.name,
        category: vendor.category,
        riskLevel,
        description: `${vendor.name}的供应链风险评估`,
        lastAssessment: daysAgo(randomInt(30, 180)),
        nextAssessment: daysFromNow(randomInt(30, 180)),
        issues: riskLevel === "critical" || riskLevel === "high" 
          ? ["存在已识别风险", "需要跟进整改"]
          : [],
      });
    }
  }

  getDomains(): RiskDomain[] {
    return this.domains;
  }

  getBusinessUnits(): BusinessUnit[] {
    return this.businessUnits;
  }

  getSupplyChainRisks(): SupplyChainRisk[] {
    return this.supplyChainRisks;
  }

  getTotalRiskScore(): number {
    const total = this.domains.reduce((sum, d) => sum + d.score, 0);
    return Math.round(total / this.domains.length);
  }

  getRiskTrend(): { month: string; risk: number; incidents: number }[] {
    const months = ["1月", "2月", "3月", "4月", "5月", "6月"];
    return months.map((month, i) => ({
      month,
      risk: 70 - i * randomInt(2, 5) + randomInt(-3, 3),
      incidents: randomInt(5, 20),
    }));
  }

  getStats() {
    return {
      totalRisk: this.getTotalRiskScore(),
      riskReduction: randomInt(5, 15),
      roi: randomInt(150, 300),
      budget: {
        allocated: 2500000,
        spent: randomInt(1200000, 2000000),
        remaining: 0,
      },
      domainCount: this.domains.length,
      highRisks: this.domains.flatMap(d => d.items).filter(i => i.riskScore > 66).length,
      openRisks: this.domains.flatMap(d => d.items).filter(i => i.status === "open").length,
      supplyChainRisks: this.supplyChainRisks.filter(s => s.riskLevel === "critical" || s.riskLevel === "high").length,
    };
  }

  refresh(): void {
    for (const bu of this.businessUnits) {
      const newScore = bu.riskScore + randomInt(-5, 5);
      bu.riskScore = Math.max(20, Math.min(90, newScore));
      bu.trend.push(bu.riskScore);
      bu.trend.shift();
    }
  }
}

export const riskSimulator = new RiskSimulator();
