import type { SkillMetadata } from "./types.js";

export interface MarketSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  category: string;
  homepage?: string;
  repository?: string;
  license?: string;
  installed?: boolean;
  installedVersion?: string;
  hasUpdate?: boolean;
  mitreCoverage?: string[];
  scfDomains?: string[];
  roleCombination?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  sortBy?: "downloads" | "rating" | "updated" | "name";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface MarketSearchResult {
  total: number;
  skills: MarketSkill[];
  query: string;
  page: number;
  hasMore: boolean;
}

export interface SkillInstallProgress {
  stage: "downloading" | "extracting" | "installing" | "validating" | "complete";
  progress: number;
  message: string;
  skillId: string;
}

export interface SkillPublishOptions {
  name: string;
  description: string;
  version: string;
  author: string;
  tags?: string[];
  category?: string;
  license?: string;
  homepage?: string;
  repository?: string;
}

export interface SkillReview {
  id: string;
  skillId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

export interface SkillDependency {
  skillId: string;
  versionRange: string;
  optional: boolean;
}

const CATEGORY_LIST = [
  "security",
  "compliance",
  "analysis",
  "automation",
  "red-team",
  "blue-team",
  "forensics",
  "threat-intel",
];

const SORT_FUNCTIONS: Record<string, (a: MarketSkill, b: MarketSkill) => number> = {
  downloads: (a, b) => b.downloads - a.downloads,
  rating: (a, b) => b.rating - a.rating,
  updated: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  name: (a, b) => a.name.localeCompare(b.name),
};

export class SkillMarketService {
  private skills: Map<string, MarketSkill> = new Map();
  private reviews: Map<string, SkillReview[]> = new Map();
  private dependencies: Map<string, SkillDependency[]> = new Map();

  constructor() {
    this.initializeDemoData();
  }

  private initializeDemoData(): void {
    const demoSkills: MarketSkill[] = [
      {
        id: "threat-intel",
        name: "Threat Intelligence",
        description: "Query threat intelligence feeds and correlate with MITRE ATT&CK framework. Supports multiple threat feeds including MISP, OTX, and custom sources.",
        version: "1.2.0",
        author: "ESC Team",
        downloads: 1542,
        rating: 4.8,
        ratingCount: 45,
        tags: ["threat", "intelligence", "mitre", "misp", "otx"],
        category: "threat-intel",
        mitreCoverage: ["T1566", "T1190", "T1078"],
        roleCombination: "SEC",
        createdAt: "2025-01-15T00:00:00Z",
        updatedAt: "2026-02-10T00:00:00Z",
      },
      {
        id: "vuln-scanner",
        name: "Vulnerability Scanner",
        description: "Comprehensive vulnerability scanning using nmap, nuclei, and other tools. Includes CVE correlation and risk scoring.",
        version: "2.0.1",
        author: "Security Labs",
        downloads: 3210,
        rating: 4.5,
        ratingCount: 89,
        tags: ["vulnerability", "scanner", "nmap", "nuclei", "cve"],
        category: "security",
        mitreCoverage: ["T1595", "T1046"],
        scfDomains: ["VPM", "NET"],
        roleCombination: "SEC+IT",
        createdAt: "2024-12-01T00:00:00Z",
        updatedAt: "2026-02-15T00:00:00Z",
      },
      {
        id: "compliance-nist",
        name: "NIST CSF Compliance",
        description: "Audit systems against NIST Cybersecurity Framework controls. Generate compliance reports and gap analysis.",
        version: "1.0.0",
        author: "ESC Team",
        downloads: 876,
        rating: 4.2,
        ratingCount: 23,
        tags: ["compliance", "nist", "audit", "csf"],
        category: "compliance",
        scfDomains: ["GOV", "RSK", "CPL"],
        roleCombination: "SEC+LEG",
        createdAt: "2025-06-20T00:00:00Z",
        updatedAt: "2026-01-30T00:00:00Z",
      },
      {
        id: "phishing-sim",
        name: "Phishing Simulator",
        description: "Simulate phishing attacks for security awareness training. Includes email templates and tracking.",
        version: "1.5.0",
        author: "Red Team Tools",
        downloads: 2100,
        rating: 4.6,
        ratingCount: 67,
        tags: ["phishing", "simulation", "training", "awareness"],
        category: "red-team",
        mitreCoverage: ["T1566"],
        roleCombination: "SEC",
        createdAt: "2025-03-10T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
      {
        id: "incident-response",
        name: "Incident Response",
        description: "Automated incident response workflows and playbooks. Integrates with SIEM and ticketing systems.",
        version: "3.0.0",
        author: "Blue Team",
        downloads: 4500,
        rating: 4.9,
        ratingCount: 156,
        tags: ["incident", "response", "playbook", "siem", "soar"],
        category: "blue-team",
        mitreCoverage: ["T1595", "T1078", "T1485"],
        scfDomains: ["IR", "MON"],
        roleCombination: "SEC+IT+BIZ",
        createdAt: "2024-10-05T00:00:00Z",
        updatedAt: "2026-02-18T00:00:00Z",
      },
      {
        id: "forensic-analyzer",
        name: "Forensic Analyzer",
        description: "Digital forensics toolkit for memory, disk, and network analysis. Supports multiple evidence formats.",
        version: "2.1.0",
        author: "Forensics Team",
        downloads: 980,
        rating: 4.4,
        ratingCount: 31,
        tags: ["forensics", "memory", "disk", "network", "evidence"],
        category: "forensics",
        roleCombination: "SEC",
        createdAt: "2025-04-15T00:00:00Z",
        updatedAt: "2026-02-12T00:00:00Z",
      },
      {
        id: "supply-chain",
        name: "Supply Chain Security",
        description: "Monitor and assess third-party vendor security risks. Includes SBOM analysis and vulnerability tracking.",
        version: "1.3.0",
        author: "ESC Team",
        downloads: 650,
        rating: 4.3,
        ratingCount: 18,
        tags: ["supply-chain", "vendor", "sbom", "third-party"],
        category: "security",
        scfDomains: ["TPM", "RSK"],
        roleCombination: "SEC+LEG+BIZ",
        createdAt: "2025-08-01T00:00:00Z",
        updatedAt: "2026-02-08T00:00:00Z",
      },
      {
        id: "pentest-automation",
        name: "Pentest Automation",
        description: "Automated penetration testing workflows using Metasploit, Burp, and custom tools.",
        version: "2.5.0",
        author: "Red Team Tools",
        downloads: 1890,
        rating: 4.7,
        ratingCount: 72,
        tags: ["pentest", "metasploit", "burp", "automation"],
        category: "red-team",
        mitreCoverage: ["T1190", "T1133", "T1210"],
        roleCombination: "SEC+IT",
        createdAt: "2024-11-20T00:00:00Z",
        updatedAt: "2026-02-16T00:00:00Z",
      },
      // 系统内置技能
      {
        id: "dashboard",
        name: "仪表盘",
        description: "安全运营仪表盘，展示全局安全态势、威胁统计和关键指标",
        version: "1.0.0",
        author: "SecuClaw",
        downloads: 10000,
        rating: 5.0,
        ratingCount: 100,
        tags: ["dashboard", "态势", "仪表盘", "统计"],
        category: "dashboard",
        mitreCoverage: [],
        scfDomains: ["GOV", "RSK"],
        roleCombination: "SEC+BIZ",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
      {
        id: "threatIntel",
        name: "威胁情报",
        description: "威胁情报收集、分析与关联，集成MISP、OTX等情报源",
        version: "1.0.0",
        author: "SecuClaw",
        downloads: 8000,
        rating: 4.9,
        ratingCount: 80,
        tags: ["threat", "intelligence", "威胁情报", "MISP"],
        category: "threat-intel",
        mitreCoverage: ["T1566", "T1190", "T1078"],
        scfDomains: ["MON", "INT"],
        roleCombination: "SEC",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
      {
        id: "compliance",
        name: "合规报告",
        description: "生成合规报告，支持ISO 27001、SOC 2、PCI-DSS等框架",
        version: "1.0.0",
        author: "SecuClaw",
        downloads: 7500,
        rating: 4.8,
        ratingCount: 75,
        tags: ["compliance", "audit", "合规", "报告"],
        category: "compliance",
        mitreCoverage: [],
        scfDomains: ["CPL", "GOV"],
        roleCombination: "SEC+LEG",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
      {
        id: "warroom",
        name: "作战室",
        description: "安全事件指挥作战室，协同响应重大安全事件",
        version: "1.0.0",
        author: "SecuClaw",
        downloads: 6000,
        rating: 4.7,
        ratingCount: 60,
        tags: ["warroom", "incident", "作战室", "事件响应"],
        category: "blue-team",
        mitreCoverage: ["T1485", "T1486"],
        scfDomains: ["IR", "MON"],
        roleCombination: "SEC+IT+BIZ",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
      {
        id: "remediation",
        name: "修复任务",
        description: "漏洞修复任务管理，跟踪和推动安全问题的解决",
        version: "1.0.0",
        author: "SecuClaw",
        downloads: 7000,
        rating: 4.8,
        ratingCount: 70,
        tags: ["remediation", "vulnerability", "修复", "任务"],
        category: "security",
        mitreCoverage: [],
        scfDomains: ["VPM", "RSK"],
        roleCombination: "SEC+IT",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
      {
        id: "auditor",
        name: "审计",
        description: "安全审计工具，支持日志分析、合规检查和风险评估",
        version: "1.0.0",
        author: "SecuClaw",
        downloads: 6500,
        rating: 4.7,
        ratingCount: 65,
        tags: ["audit", "审计", "日志", "合规"],
        category: "audit",
        mitreCoverage: [],
        scfDomains: ["CPL", "MON"],
        roleCombination: "SEC+LEG",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
      {
        id: "risk",
        name: "风险",
        description: "风险管理平台，评估和跟踪企业安全风险",
        version: "1.0.0",
        author: "SecuClaw",
        downloads: 7200,
        rating: 4.8,
        ratingCount: 72,
        tags: ["risk", "风险管理", "评估", "CVE"],
        category: "risk",
        mitreCoverage: [],
        scfDomains: ["RSK", "GOV"],
        roleCombination: "SEC+BIZ",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-02-20T00:00:00Z",
      },
    ];

    for (const skill of demoSkills) {
      this.skills.set(skill.id, skill);
    }
  }

  async search(options: MarketSearchOptions = {}): Promise<MarketSearchResult> {
    let results = Array.from(this.skills.values());

    if (options.query) {
      const queryLower = options.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(queryLower) ||
          s.description.toLowerCase().includes(queryLower) ||
          s.tags.some((t) => t.toLowerCase().includes(queryLower))
      );
    }

    if (options.category) {
      results = results.filter((s) => s.category === options.category);
    }

    if (options.tags && options.tags.length > 0) {
      const tagsLower = options.tags.map((t) => t.toLowerCase());
      results = results.filter((s) => s.tags.some((t) => tagsLower.includes(t.toLowerCase())));
    }

    if (options.author) {
      const authorLower = options.author.toLowerCase();
      results = results.filter((s) => s.author.toLowerCase().includes(authorLower));
    }

    if (options.sortBy) {
      const sortFn = SORT_FUNCTIONS[options.sortBy] ?? SORT_FUNCTIONS.downloads;
      results.sort(sortFn);
      if (options.sortOrder === "desc") {
        results.reverse();
      }
    }

    const total = results.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    const hasMore = offset + limit < total;

    results = results.slice(offset, offset + limit);

    return {
      total,
      skills: results,
      query: options.query ?? "",
      page: Math.floor(offset / limit) + 1,
      hasMore,
    };
  }

  async getSkill(skillId: string): Promise<MarketSkill | null> {
    return this.skills.get(skillId) ?? null;
  }

  async getReviews(skillId: string): Promise<SkillReview[]> {
    return this.reviews.get(skillId) ?? [];
  }

  async getSkillWithDetails(skillId: string): Promise<{
    skill: MarketSkill | null;
    reviews: SkillReview[];
    dependencies: SkillDependency[];
  }> {
    const skill = await this.getSkill(skillId);
    return {
      skill,
      reviews: this.reviews.get(skillId) ?? [],
      dependencies: this.dependencies.get(skillId) ?? [],
    };
  }

  async install(skillId: string): Promise<{ success: boolean; message: string }> {
    const skill = await this.getSkill(skillId);
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillId}` };
    }

    skill.downloads++;
    skill.installed = true;
    skill.installedVersion = skill.version;

    return {
      success: true,
      message: `Successfully installed ${skill.name} v${skill.version}`,
    };
  }

  async uninstall(skillId: string): Promise<{ success: boolean; message: string }> {
    const skill = await this.getSkill(skillId);
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillId}` };
    }

    skill.installed = false;
    skill.installedVersion = undefined;

    return {
      success: true,
      message: `Successfully uninstalled ${skill.name}`,
    };
  }

  async update(skillId: string): Promise<{ success: boolean; message: string }> {
    const skill = await this.getSkill(skillId);
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillId}` };
    }

    if (!skill.installed) {
      return { success: false, message: `Skill not installed: ${skillId}` };
    }

    skill.installedVersion = skill.version;
    skill.hasUpdate = false;

    return {
      success: true,
      message: `Successfully updated ${skill.name} to v${skill.version}`,
    };
  }

  async publish(options: SkillPublishOptions): Promise<{ success: boolean; skillId: string; message: string }> {
    const skillId = options.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const existing = this.skills.get(skillId);
    if (existing) {
      return {
        success: false,
        skillId,
        message: `Skill already exists: ${skillId}. Use update instead.`,
      };
    }

    const newSkill: MarketSkill = {
      id: skillId,
      name: options.name,
      description: options.description,
      version: options.version,
      author: options.author,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      tags: options.tags ?? [],
      category: options.category ?? "security",
      license: options.license,
      homepage: options.homepage,
      repository: options.repository,
      installed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.skills.set(skillId, newSkill);

    return {
      success: true,
      skillId,
      message: `Successfully published ${options.name} v${options.version}`,
    };
  }

  async addReview(skillId: string, review: Omit<SkillReview, "id" | "skillId" | "createdAt" | "helpful">): Promise<{ success: boolean; message: string }> {
    const skill = await this.getSkill(skillId);
    if (!skill) {
      return { success: false, message: `Skill not found: ${skillId}` };
    }

    const newReview: SkillReview = {
      id: `review-${Date.now()}`,
      skillId,
      ...review,
      createdAt: new Date().toISOString(),
      helpful: 0,
    };

    const reviews = this.reviews.get(skillId) ?? [];
    reviews.push(newReview);
    this.reviews.set(skillId, reviews);

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    skill.rating = totalRating / reviews.length;
    skill.ratingCount = reviews.length;

    return {
      success: true,
      message: `Review added successfully`,
    };
  }

  async markReviewHelpful(skillId: string, reviewId: string): Promise<{ success: boolean }> {
    const reviews = this.reviews.get(skillId);
    if (!reviews) {
      return { success: false };
    }

    const review = reviews.find((r) => r.id === reviewId);
    if (!review) {
      return { success: false };
    }

    review.helpful++;
    return { success: true };
  }

  listCategories(): string[] {
    return CATEGORY_LIST;
  }

  listTopSkills(limit: number = 10): MarketSkill[] {
    return Array.from(this.skills.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  listRecentSkills(limit: number = 10): MarketSkill[] {
    return Array.from(this.skills.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  listInstalledSkills(): MarketSkill[] {
    return Array.from(this.skills.values()).filter((s) => s.installed);
  }

  checkForUpdates(): MarketSkill[] {
    const updatesAvailable: MarketSkill[] = [];

    for (const skill of this.skills.values()) {
      if (skill.installed && skill.installedVersion !== skill.version) {
        skill.hasUpdate = true;
        updatesAvailable.push(skill);
      }
    }

    return updatesAvailable;
  }

  getStats(): {
    totalSkills: number;
    totalDownloads: number;
    totalAuthors: number;
    averageRating: number;
    categories: Record<string, number>;
  } {
    const skills = Array.from(this.skills.values());
    const authors = new Set(skills.map((s) => s.author));
    const categories: Record<string, number> = {};

    for (const skill of skills) {
      categories[skill.category] = (categories[skill.category] ?? 0) + 1;
    }

    return {
      totalSkills: skills.length,
      totalDownloads: skills.reduce((sum, s) => sum + s.downloads, 0),
      totalAuthors: authors.size,
      averageRating: skills.reduce((sum, s) => sum + s.rating, 0) / skills.length,
      categories,
    };
  }
}

export const skillMarketService = new SkillMarketService();

export function searchSkills(options?: MarketSearchOptions): Promise<MarketSearchResult> {
  return skillMarketService.search(options);
}

export function getSkill(skillId: string): Promise<MarketSkill | null> {
  return skillMarketService.getSkill(skillId);
}

export function installSkill(skillId: string): Promise<{ success: boolean; message: string }> {
  return skillMarketService.install(skillId);
}
