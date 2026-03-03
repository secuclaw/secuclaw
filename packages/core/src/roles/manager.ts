import type {
  RoleConfig,
  RoleContext,
  RoleSwitchEvent,
  RoleRecommendation,
  RoleManagerConfig,
  RoleStatistics,
  Capability,
} from "./types.js";
import {
  ROLE_DEFINITIONS,
  ROLE_MAP,
  getRoleById,
  getDefaultRole,
} from "./definitions.js";

const DEFAULT_CONFIG: RoleManagerConfig = {
  dataDir: "./data",
  enableAutoLearning: true,
  maxHistorySize: 1000,
  proficiencyThreshold: 3,
};

export class RoleManager {
  private config: RoleManagerConfig;
  private activeRole: RoleConfig;
  private context: RoleContext;
  private switchHistory: RoleSwitchEvent[] = [];
  private statistics: Map<string, RoleStatistics> = new Map();

  constructor(config: Partial<RoleManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeRole = getDefaultRole();
    this.context = {
      activeRole: this.activeRole,
      capabilityHistory: [],
      learningProgress: new Map(),
      recentTasks: [],
    };
    this.initStatistics();
  }

  private initStatistics(): void {
    for (const role of ROLE_DEFINITIONS) {
      this.statistics.set(role.id, {
        roleId: role.id,
        usageCount: 0,
        successRate: 0,
        avgTaskDuration: 0,
        topCapabilities: [],
        proficiencyGrowth: 0,
      });
    }
  }

  getActiveRole(): RoleConfig {
    return this.activeRole;
  }

  getAllRoles(): RoleConfig[] {
    return [...ROLE_DEFINITIONS];
  }

  switchRole(roleId: string, reason: string): boolean {
    const newRole = getRoleById(roleId);
    if (!newRole) {
      return false;
    }

    const switchEvent: RoleSwitchEvent = {
      id: `switch-${Date.now()}`,
      fromRole: this.activeRole.id,
      toRole: roleId,
      reason,
      timestamp: Date.now(),
    };

    this.switchHistory.push(switchEvent);
    if (this.switchHistory.length > this.config.maxHistorySize) {
      this.switchHistory.shift();
    }

    this.activeRole = newRole;
    this.context.activeRole = newRole;

    const stats = this.statistics.get(roleId);
    if (stats) {
      stats.usageCount++;
    }

    return true;
  }

  recommendRoles(query: string, context?: Record<string, unknown>): RoleRecommendation[] {
    const queryLower = query.toLowerCase();
    const recommendations: RoleRecommendation[] = [];

    for (const role of ROLE_DEFINITIONS) {
      let score = 0;
      const matchedCapabilities: string[] = [];

      const allCapabilities = [
        ...role.lightCapabilities,
        ...role.darkCapabilities,
      ];

      for (const cap of allCapabilities) {
        const capKeywords = [
          cap.name.toLowerCase(),
          cap.nameZh,
          cap.description.toLowerCase(),
          ...(cap.requiredSkills?.map((s) => s.toLowerCase()) || []),
          ...(cap.mitreTechniques || []),
          ...(cap.scfDomains || []),
        ];

        for (const keyword of capKeywords) {
          if (queryLower.includes(keyword) || keyword.includes(queryLower)) {
            score += 0.1;
            if (!matchedCapabilities.includes(cap.id)) {
              matchedCapabilities.push(cap.id);
            }
          }
        }
      }

      for (const tag of role.tags || []) {
        if (queryLower.includes(tag.toLowerCase())) {
          score += 0.15;
        }
      }

      if (role.nameZh.includes(query) || role.name.toLowerCase().includes(queryLower)) {
        score += 0.3;
      }

      const dimensionKeywords: Record<string, string[]> = {
        SEC: ["安全", "security", "攻击", "attack", "防御", "defense", "渗透", "penetration"],
        LEG: ["法律", "legal", "合规", "compliance", "隐私", "privacy", "gdpr"],
        IT: ["技术", "technology", "it", "架构", "architecture", "代码", "code", "云", "cloud"],
        BIZ: ["业务", "business", "供应链", "supply chain", "连续性", "continuity"],
      };

      for (const dim of role.dimensions) {
        const keywords = dimensionKeywords[dim] || [];
        for (const kw of keywords) {
          if (queryLower.includes(kw.toLowerCase())) {
            score += 0.1;
          }
        }
      }

      score = Math.min(score, 1);

      if (score > 0.05) {
        recommendations.push({
          role,
          score,
          reason: this.generateRecommendationReason(role, matchedCapabilities, score),
          matchedCapabilities,
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private generateRecommendationReason(
    role: RoleConfig,
    matchedCapabilities: string[],
    score: number
  ): string {
    const parts: string[] = [];

    if (score >= 0.7) {
      parts.push(`高度匹配`);
    } else if (score >= 0.4) {
      parts.push(`中等匹配`);
    } else {
      parts.push(`部分匹配`);
    }

    parts.push(`角色"${role.nameZh}"`);

    if (matchedCapabilities.length > 0) {
      parts.push(`具备${matchedCapabilities.length}项相关能力`);
    }

    const dimNames: Record<string, string> = {
      SEC: "安全",
      LEG: "法律",
      IT: "技术",
      BIZ: "业务",
    };
    const dims = role.dimensions.map((d) => dimNames[d]).join("+");
    parts.push(`(${dims}维度)`);

    return parts.join("，");
  }

  getCapabilityById(capabilityId: string): Capability | undefined {
    for (const role of ROLE_DEFINITIONS) {
      const allCapabilities = [
        ...role.lightCapabilities,
        ...role.darkCapabilities,
      ];
      const cap = allCapabilities.find((c) => c.id === capabilityId);
      if (cap) {
        return cap;
      }
    }
    return undefined;
  }

  recordCapabilityUsage(
    capabilityId: string,
    success: boolean,
    contextStr: string
  ): void {
    this.context.capabilityHistory.push({
      capabilityId,
      timestamp: Date.now(),
      success,
      context: contextStr,
    });

    if (this.context.capabilityHistory.length > this.config.maxHistorySize) {
      this.context.capabilityHistory.shift();
    }

    const stats = this.statistics.get(this.activeRole.id);
    if (stats) {
      const existing = stats.topCapabilities.find(
        (c) => c.capabilityId === capabilityId
      );
      if (existing) {
        existing.count++;
      } else {
        stats.topCapabilities.push({ capabilityId, count: 1 });
      }
      stats.topCapabilities.sort((a, b) => b.count - a.count);
      stats.topCapabilities = stats.topCapabilities.slice(0, 5);
    }
  }

  recordTaskCompletion(
    taskId: string,
    success: boolean,
    durationMs: number
  ): void {
    this.context.recentTasks.push({
      taskId,
      role: this.activeRole.id,
      completedAt: Date.now(),
      success,
    });

    if (this.context.recentTasks.length > 100) {
      this.context.recentTasks.shift();
    }

    const stats = this.statistics.get(this.activeRole.id);
    if (stats) {
      const totalTasks = stats.usageCount;
      const currentRate = stats.successRate;
      const newSuccess = success ? 1 : 0;
      stats.successRate =
        (currentRate * (totalTasks - 1) + newSuccess) / totalTasks;

      const prevAvg = stats.avgTaskDuration;
      stats.avgTaskDuration =
        (prevAvg * (totalTasks - 1) + durationMs) / totalTasks;
    }
  }

  getStatistics(roleId?: string): RoleStatistics | Map<string, RoleStatistics> {
    if (roleId) {
      return this.statistics.get(roleId) || this.statistics.get(this.activeRole.id)!;
    }
    return new Map(this.statistics);
  }

  getSwitchHistory(limit = 10): RoleSwitchEvent[] {
    return this.switchHistory.slice(-limit);
  }

  getLearningProgress(capabilityId: string): number {
    return this.context.learningProgress.get(capabilityId) || 0;
  }

  updateLearningProgress(capabilityId: string, progress: number): void {
    this.context.learningProgress.set(capabilityId, Math.min(progress, 100));

    const stats = this.statistics.get(this.activeRole.id);
    if (stats) {
      let totalProgress = 0;
      for (const p of this.context.learningProgress.values()) {
        totalProgress += p;
      }
      stats.proficiencyGrowth = totalProgress / this.context.learningProgress.size;
    }
  }

  getCapabilitiesBySide(side: "light" | "dark"): Capability[] {
    if (side === "light") {
      return [...this.activeRole.lightCapabilities];
    }
    return [...this.activeRole.darkCapabilities];
  }

  getCapabilitiesByDimension(dimension: string): Capability[] {
    return [
      ...this.activeRole.lightCapabilities.filter(
        (c) => c.sourceDimension === dimension
      ),
      ...this.activeRole.darkCapabilities.filter(
        (c) => c.sourceDimension === dimension
      ),
    ];
  }

  exportContext(): RoleContext {
    return {
      ...this.context,
      learningProgress: new Map(this.context.learningProgress),
      capabilityHistory: [...this.context.capabilityHistory],
      recentTasks: [...this.context.recentTasks],
    };
  }

  importContext(context: RoleContext): void {
    this.context = {
      ...context,
      learningProgress: new Map(context.learningProgress),
    };
    this.activeRole = context.activeRole;
  }
}

export function createRoleManager(config?: Partial<RoleManagerConfig>): RoleManager {
  return new RoleManager(config);
}
