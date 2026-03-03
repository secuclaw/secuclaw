/**
 * 角色系统类型定义
 * 
 * 基于 SEC+LEG+IT+BIZ 四维度的8种角色组合
 */

/** 角色维度 */
export type RoleDimension = "SEC" | "LEG" | "IT" | "BIZ";

/** 能力面 - 光明面(防御) / 黑暗面(攻击) */
export type CapabilitySide = "light" | "dark";

/** 能力类别 */
export interface Capability {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  /** 能力面 */
  side: CapabilitySide;
  /** 来源维度 */
  sourceDimension: RoleDimension;
  /** 关联的MITRE ATT&CK技术 */
  mitreTechniques?: string[];
  /** 关联的SCF控制域 */
  scfDomains?: string[];
  /** 所需技能 */
  requiredSkills?: string[];
  /** 所需工具 */
  requiredTools?: string[];
  /** 熟练度等级 1-5 */
  proficiency?: number;
}

/** 角色配置 */
export interface RoleConfig {
  /** 角色ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色中文名 */
  nameZh: string;
  /** 角色描述 */
  description: string;
  /** 角色维度组合 */
  dimensions: RoleDimension[];
  /** 组合类型 */
  combinationType: "single" | "binary" | "ternary" | "quaternary";
  /** 光明面能力列表 */
  lightCapabilities: Capability[];
  /** 黑暗面能力列表 */
  darkCapabilities: Capability[];
  /** 默认优先级 */
  priority: number;
  /** 角色图标 */
  icon?: string;
  /** 角色标签 */
  tags?: string[];
}

/** 角色上下文 - 运行时角色状态 */
export interface RoleContext {
  /** 当前激活角色 */
  activeRole: RoleConfig;
  /** 能力使用历史 */
  capabilityHistory: Array<{
    capabilityId: string;
    timestamp: number;
    success: boolean;
    context: string;
  }>;
  /** 学习进度 */
  learningProgress: Map<string, number>;
  /** 最近任务 */
  recentTasks: Array<{
    taskId: string;
    role: string;
    completedAt: number;
    success: boolean;
  }>;
}

/** 角色切换事件 */
export interface RoleSwitchEvent {
  /** 事件ID */
  id: string;
  /** 从哪个角色 */
  fromRole: string;
  /** 到哪个角色 */
  toRole: string;
  /** 切换原因 */
  reason: string;
  /** 切换时间 */
  timestamp: number;
  /** 上下文快照 */
  contextSnapshot?: Record<string, unknown>;
}

/** 角色推荐结果 */
export interface RoleRecommendation {
  /** 推荐角色 */
  role: RoleConfig;
  /** 推荐分数 0-1 */
  score: number;
  /** 推荐理由 */
  reason: string;
  /** 匹配的能力 */
  matchedCapabilities: string[];
}

/** 角色管理器配置 */
export interface RoleManagerConfig {
  /** 数据目录 */
  dataDir: string;
  /** 是否启用自动学习 */
  enableAutoLearning: boolean;
  /** 最大历史记录数 */
  maxHistorySize: number;
  /** 能力熟练度阈值 */
  proficiencyThreshold: number;
}

/** 角色统计信息 */
export interface RoleStatistics {
  /** 角色ID */
  roleId: string;
  /** 使用次数 */
  usageCount: number;
  /** 成功率 */
  successRate: number;
  /** 平均任务时长 (ms) */
  avgTaskDuration: number;
  /** 最常用能力 Top5 */
  topCapabilities: Array<{
    capabilityId: string;
    count: number;
  }>;
  /** 熟练度提升 */
  proficiencyGrowth: number;
}
