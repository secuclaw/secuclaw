/**
 * Memory Trait - 记忆系统接口
 * 
 * 所有记忆系统必须实现此接口
 * @version 2.0.0
 */

import type { MemoryEntry, SearchOptions, SearchResult } from "../memory/types.js";

// ============ 类型定义 ============

/**
 * 记忆系统类型
 */
export type MemoryType = 
  | 'in-memory'     // 内存存储
  | 'sqlite'        // SQLite数据库
  | 'postgres'      // PostgreSQL数据库
  | 'redis'         // Redis
  | 'vector-db';    // 向量数据库

/**
 * 记忆系统能力
 */
export type MemoryCapability = 
  | 'message-storage'  // 消息存储
  | 'vector-search'    // 向量搜索
  | 'keyword-search'   // 关键词搜索
  | 'hybrid-search'    // 混合搜索
  | 'key-value'        // 键值存储
  | 'persistence'      // 持久化
  | 'compression'      // 压缩
  | 'encryption';      // 加密

/**
 * 记忆能力描述
 */
export interface MemoryCapabilities {
  /** 向量搜索 */
  readonly vectorSearch: boolean;
  /** 关键词搜索 */
  readonly keywordSearch: boolean;
  /** 混合搜索 */
  readonly hybridSearch: boolean;
  /** 持久化 */
  readonly persistence: boolean;
  /** 嵌入支持 */
  readonly embeddings: boolean;
  /** 压缩支持 */
  readonly compaction: boolean;
  /** 最大条目数 */
  readonly maxEntries: number;
  /** 最大存储大小（MB） */
  readonly maxStorageMb: number;
}

/**
 * 消息查询选项
 */
export interface MessageQueryOptions {
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序字段 */
  orderBy?: 'timestamp' | 'relevance';
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc';
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 角色过滤 */
  role?: 'user' | 'assistant' | 'system';
  /** 包含元数据 */
  includeMetadata?: boolean;
}

/**
 * 向量搜索选项
 */
export interface VectorSearchOptions extends SearchOptions {
  /** 最小相似度 */
  minScore?: number;
  /** 嵌入向量（如果不提供则自动生成） */
  embedding?: number[];
  /** 返回相似度分数 */
  includeScore?: boolean;
  /** 过滤条件 */
  filter?: Record<string, unknown>;
}

/**
 * 向量搜索结果
 */
export interface VectorSearchResult extends SearchResult {
  /** 相似度分数 (0-1) */
  score: number;
  /** 嵌入向量 */
  embedding?: number[];
}

/**
 * 键值存储选项
 */
export interface KVStoreOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 命名空间 */
  namespace?: string;
  /** 是否覆盖 */
  overwrite?: boolean;
}

/**
 * 键值获取选项
 */
export interface KVGetOptions {
  /** 命名空间 */
  namespace?: string;
  /** 默认值 */
  defaultValue?: unknown;
}

/**
 * 记忆消息
 */
export interface MemoryMessage {
  /** 消息ID */
  id: string;
  /** 会话ID */
  sessionId: string;
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 嵌入向量 */
  embedding?: number[];
}

/**
 * 压缩结果
 */
export interface CompactionResult {
  /** 移除的条目数 */
  removed: number;
  /** 压缩前的条目数 */
  before: number;
  /** 压缩后的条目数 */
  after: number;
  /** 节省的空间（字节） */
  savedBytes?: number;
  /** 耗时（毫秒） */
  duration?: number;
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  /** 总条目数 */
  entries: number;
  /** 会话数 */
  sessions: number;
  /** 大约存储大小（MB） */
  approxStorageMb: number;
  /** 向量数 */
  vectors?: number;
  /** 键值对数 */
  keyValuePairs?: number;
  /** 最早的条目时间 */
  oldestEntry?: Date;
  /** 最新的条目时间 */
  newestEntry?: Date;
}

/**
 * 记忆配置
 */
export interface MemoryConfig {
  /** 存储路径 */
  path?: string;
  /** 数据库连接字符串 */
  connectionString?: string;
  /** 嵌入模型 */
  embeddingModel?: string;
  /** 嵌入维度 */
  embeddingDimensions?: number;
  /** 最大条目数 */
  maxEntries?: number;
  /** 自动压缩间隔（秒） */
  autoCompactInterval?: number;
  /** 压缩阈值（条目数） */
  compactThreshold?: number;
  /** 额外配置 */
  extra?: Record<string, unknown>;
}

/**
 * 嵌入提供者
 */
export interface EmbeddingProvider {
  /**
   * 生成文本嵌入
   * @param text 输入文本
   */
  embed(text: string): Promise<number[]>;
  
  /**
   * 批量生成嵌入
   * @param texts 输入文本列表
   */
  embedBatch(texts: string[]): Promise<number[][]>;
  
  /**
   * 获取嵌入维度
   */
  getDimension(): number;
}

// ============ Trait 接口 ============

/**
 * 记忆系统Trait
 * 
 * 所有记忆系统必须实现此接口
 */
export interface MemoryTrait {
  // ============ 元数据 ============
  
  /** 记忆系统ID */
  readonly id: string;
  
  /** 记忆系统名称 */
  readonly name: string;
  
  /** 记忆系统类型 */
  readonly type: MemoryType;
  
  /** 支持的功能 */
  readonly capabilities: readonly MemoryCapability[];
  
  /** 能力详情 */
  readonly capabilitiesDetail: MemoryCapabilities;
  
  /** 配置 */
  readonly config?: MemoryConfig;

  // ============ 消息存储 ============
  
  /**
   * 添加消息
   * @param message 消息
   * @returns 消息ID
   */
  addMessage(message: MemoryMessage): Promise<string>;
  
  /**
   * 批量添加消息
   * @param messages 消息列表
   * @returns 消息ID列表
   */
  addMessages?(messages: MemoryMessage[]): Promise<string[]>;
  
  /**
   * 获取消息
   * @param sessionId 会话ID
   * @param options 查询选项
   * @returns 消息列表
   */
  getMessages(sessionId: string, options?: MessageQueryOptions): Promise<MemoryMessage[]>;
  
  /**
   * 获取单条消息
   * @param id 消息ID
   */
  getMessage?(id: string): Promise<MemoryMessage | null>;
  
  /**
   * 更新消息
   * @param id 消息ID
   * @param updates 更新内容
   */
  updateMessage?(id: string, updates: Partial<MemoryMessage>): Promise<void>;
  
  /**
   * 删除消息
   * @param id 消息ID
   */
  deleteMessage?(id: string): Promise<void>;
  
  /**
   * 清除会话消息
   * @param sessionId 会话ID
   */
  clearMessages(sessionId: string): Promise<void>;

  // ============ 向量搜索 ============
  
  /**
   * 添加到向量存储
   * @param content 内容
   * @param metadata 元数据
   * @returns 向量ID
   */
  addVector?(content: string, metadata?: Record<string, unknown>): Promise<string>;
  
  /**
   * 批量添加向量
   * @param items 内容列表
   * @returns 向量ID列表
   */
  addVectors?(items: { content: string; metadata?: Record<string, unknown> }[]): Promise<string[]>;
  
  /**
   * 向量搜索
   * @param query 查询文本
   * @param options 搜索选项
   * @returns 搜索结果
   */
  searchVector?(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  
  /**
   * 相似度搜索（使用嵌入向量）
   * @param embedding 嵌入向量
   * @param options 搜索选项
   * @returns 搜索结果
   */
  similaritySearch?(embedding: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  
  /**
   * 删除向量
   * @param id 向量ID
   */
  deleteVector?(id: string): Promise<void>;

  // ============ 关键词/混合搜索 ============
  
  /**
   * 关键词搜索
   * @param query 查询文本
   * @param options 搜索选项
   * @returns 搜索结果
   */
  keywordSearch?(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  
  /**
   * 混合搜索（向量+关键词）
   * @param query 查询文本
   * @param embedding 嵌入向量（可选）
   * @param options 搜索选项
   * @returns 搜索结果
   */
  hybridSearch?(query: string, embedding?: number[], options?: SearchOptions): Promise<SearchResult[]>;

  // ============ 键值存储 ============
  
  /**
   * 存储值
   * @param key 键
   * @param value 值
   * @param options 存储选项
   */
  set?(key: string, value: unknown, options?: KVStoreOptions): Promise<void>;
  
  /**
   * 批量存储
   * @param items 键值对列表
   * @param options 存储选项
   */
  setBatch?(items: { key: string; value: unknown }[], options?: KVStoreOptions): Promise<void>;
  
  /**
   * 获取值
   * @param key 键
   * @param options 获取选项
   * @returns 值
   */
  get?(key: string, options?: KVGetOptions): Promise<unknown>;
  
  /**
   * 批量获取
   * @param keys 键列表
   * @param options 获取选项
   * @returns 键值对
   */
  getBatch?(keys: string[], options?: KVGetOptions): Promise<Record<string, unknown>>;
  
  /**
   * 删除值
   * @param key 键
   */
  delete?(key: string): Promise<void>;
  
  /**
   * 检查键是否存在
   * @param key 键
   */
  has?(key: string): Promise<boolean>;
  
  /**
   * 列出键
   * @param pattern 键模式
   * @param options 选项
   */
  listKeys?(pattern?: string, options?: { namespace?: string; limit?: number }): Promise<string[]>;

  // ============ 管理 ============
  
  /**
   * 压缩历史
   * @param sessionId 会话ID（可选，不提供则压缩所有）
   */
  compact?(sessionId?: string): Promise<CompactionResult>;
  
  /**
   * 获取统计信息
   */
  getStats(): Promise<MemoryStats>;
  
  /**
   * 清除所有数据
   */
  clearAll(): Promise<void>;
  
  /**
   * 备份数据
   * @param path 备份路径
   */
  backup?(path: string): Promise<void>;
  
  /**
   * 恢复数据
   * @param path 备份路径
   */
  restore?(path: string): Promise<void>;

  // ============ 生命周期 ============
  
  /**
   * 初始化
   */
  initialize(): Promise<void>;
  
  /**
   * 关闭
   */
  dispose(): Promise<void>;
  
  /**
   * 健康检查
   */
  healthCheck?(): Promise<boolean>;
}

// ============ 工厂接口 ============

/**
 * 记忆系统工厂
 */
export interface IMemoryFactory {
  /**
   * 创建记忆系统实例
   * @param config 配置
   */
  create(config?: MemoryConfig): MemoryTrait;
  
  /**
   * 验证配置
   * @param config 配置
   */
  validate?(config: MemoryConfig): boolean;
  
  /**
   * 获取默认配置
   */
  getDefaultConfig?(): Partial<MemoryConfig>;
}

// ============ 兼容性导出 ============

// 保持与现有代码的兼容性
export type { IMemoryStore, IMemoryCapabilities, MemoryQuery, MemorySearchResult } from "../memory/trait.js";
