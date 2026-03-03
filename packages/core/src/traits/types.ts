/**
 * Trait Types - 类型定义
 * 
 * @version 2.0.0
 */

// ============ 基础类型 ============

/**
 * Trait 类型
 */
export type TraitKind = 
  | 'provider' 
  | 'channel' 
  | 'tool' 
  | 'memory' 
  | 'agent'
  | 'storage'
  | 'event'
  | 'logger';

/**
 * Trait 描述符
 */
export interface TraitDescriptor {
  /** Trait 类型 */
  kind: TraitKind;
  /** 唯一标识 */
  id: string;
  /** 名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 标签 */
  tags?: string[];
  /** 作者 */
  author?: string;
  /** 依赖 */
  dependencies?: TraitDependency[];
}

/**
 * Trait 依赖
 */
export interface TraitDependency {
  /** 依赖的 Trait 类型 */
  kind: TraitKind;
  /** 依赖的 ID（可选，不提供则使用默认） */
  id?: string;
  /** 是否可选 */
  optional?: boolean;
}

/**
 * Trait 实例包装
 */
export interface TraitInstance<T = unknown> {
  /** 描述符 */
  descriptor: TraitDescriptor;
  /** 实现 */
  implementation: T;
}

// ============ 生命周期 ============

/**
 * 可初始化
 */
export interface Initializable {
  initialize(): Promise<void>;
}

/**
 * 可释放
 */
export interface Disposable {
  dispose(): Promise<void>;
}

/**
 * 可健康检查
 */
export interface HealthCheckable {
  healthCheck(): Promise<boolean | { healthy: boolean; error?: string }>;
}

/**
 * 完整生命周期
 */
export type Lifecycle = Initializable & Disposable & HealthCheckable;

// ============ 通用类型 ============

/**
 * 结果类型
 */
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * 分页选项
 */
export interface PaginationOptions {
  /** 页码（从1开始） */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 是否有更多 */
  hasMore: boolean;
}

/**
 * 排序选项
 */
export interface SortOptions {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/**
 * 过滤选项
 */
export interface FilterOptions {
  /** 字段 */
  field: string;
  /** 操作符 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'starts' | 'ends';
  /** 值 */
  value: unknown;
}

// ============ 事件类型 ============

/**
 * 事件类型
 */
export type EventType = string;

/**
 * 事件数据
 */
export interface Event<T = unknown> {
  /** 事件类型 */
  type: EventType;
  /** 事件数据 */
  data: T;
  /** 时间戳 */
  timestamp: Date;
  /** 来源 */
  source?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (event: Event<T>) => Promise<void> | void;

// ============ 配置类型 ============

/**
 * 基础配置
 */
export interface BaseConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 调试模式 */
  debug?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 额外配置 */
  extra?: Record<string, unknown>;
}

// ============ 工厂类型 ============

/**
 * 工厂接口
 */
export interface IFactory<T, C = unknown> {
  /** 创建实例 */
  create(config?: C): T | Promise<T>;
  /** 验证配置 */
  validate?(config: C): boolean;
  /** 获取默认配置 */
  getDefaultConfig?(): Partial<C>;
}

// ============ 导出 ============

export type {
  TraitKind as TraitType,
};
