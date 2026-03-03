/**
 * Trait Registry - Trait注册表
 * 
 * 管理所有Trait的注册、查找和实例化
 * @version 2.0.0
 */

import type { TraitKind, TraitDescriptor, TraitInstance } from "./types.js";

// ============ 类型定义 ============

/**
 * Trait类型（扩展）
 */
export type TraitType = TraitKind | 'storage' | 'event' | 'logger' | 'agent';

/**
 * 实现工厂函数
 */
export type ImplementationFactory<T = unknown> = (config: unknown) => Promise<T> | T;

/**
 * 注册项
 */
export interface TraitRegistration<T = unknown> {
  /** Trait类型 */
  traitType: TraitType;
  /** 实现ID */
  implId: string;
  /** 工厂函数 */
  factory: ImplementationFactory<T>;
  /** 是否单例 */
  singleton?: boolean;
  /** 优先级 */
  priority?: number;
  /** 描述 */
  description?: string;
}

/**
 * 日志器接口
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * 控制台日志器
 */
export class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

/**
 * 静默日志器
 */
export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/**
 * 注册表配置
 */
export interface RegistryConfig {
  /** 日志器 */
  logger?: Logger;
  /** 是否单例模式（默认true） */
  singleton?: boolean;
  /** 默认实现 */
  defaults?: Partial<Record<TraitType, string>>;
  /** 实现配置 */
  implementations?: Partial<Record<TraitType, Record<string, unknown>>>;
  /** 预加载列表 */
  preload?: string[];
}

/**
 * 实现条目
 */
interface ImplementationEntry<T = unknown> {
  factory: ImplementationFactory<T>;
  config: unknown;
  singleton: boolean;
  priority: number;
  description?: string;
}

// ============ 错误类 ============

/**
 * 实现未找到错误
 */
export class ImplementationNotFoundError extends Error {
  constructor(
    public readonly traitType: TraitType,
    public readonly implId: string
  ) {
    super(`Implementation not found: ${traitType}:${implId}`);
    this.name = 'ImplementationNotFoundError';
  }
}

/**
 * 无默认实现错误
 */
export class NoDefaultImplementationError extends Error {
  constructor(public readonly traitType: TraitType) {
    super(`No default implementation for trait type: ${traitType}`);
    this.name = 'NoDefaultImplementationError';
  }
}

/**
 * 注册失败错误
 */
export class RegistrationError extends Error {
  constructor(
    public readonly traitType: TraitType,
    public readonly implId: string,
    public readonly cause: unknown
  ) {
    super(`Failed to register ${traitType}:${implId}: ${cause}`);
    this.name = 'RegistrationError';
  }
}

// ============ Trait注册表 ============

/**
 * Trait注册表
 * 
 * 管理所有Trait的注册、查找和实例化
 */
export class TraitRegistry {
  private implementations = new Map<TraitType, Map<string, ImplementationEntry>>();
  private instances = new Map<string, unknown>();
  private config: Required<Pick<RegistryConfig, 'logger' | 'singleton'>> & RegistryConfig;
  private initialized = false;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      logger: config.logger ?? new SilentLogger(),
      singleton: config.singleton ?? true,
      defaults: config.defaults,
      implementations: config.implementations,
      preload: config.preload,
    };
  }

  // ============ 注册 ============
  
  /**
   * 注册实现
   * @param traitType Trait类型
   * @param implId 实现ID
   * @param factory 工厂函数
   * @param options 选项
   */
  register<T>(
    traitType: TraitType,
    implId: string,
    factory: ImplementationFactory<T>,
    options?: { singleton?: boolean; priority?: number; description?: string }
  ): void {
    if (!this.implementations.has(traitType)) {
      this.implementations.set(traitType, new Map());
    }

    const config = this.config.implementations?.[traitType]?.[implId];
    
    const entry: ImplementationEntry<T> = {
      factory,
      config,
      singleton: options?.singleton ?? this.config.singleton,
      priority: options?.priority ?? 0,
      description: options?.description,
    };

    this.implementations.get(traitType)!.set(implId, entry);
    
    // 清除缓存的实例（如果已存在）
    this.instances.delete(`${traitType}:${implId}`);
    
    this.config.logger.info(`Registered ${traitType} implementation: ${implId}`);
  }

  /**
   * 批量注册
   * @param registrations 注册列表
   */
  registerAll(registrations: TraitRegistration[]): void {
    for (const reg of registrations) {
      this.register(reg.traitType, reg.implId, reg.factory, {
        singleton: reg.singleton,
        priority: reg.priority,
        description: reg.description,
      });
    }
  }

  /**
   * 取消注册
   * @param traitType Trait类型
   * @param implId 实现ID
   */
  unregister(traitType: TraitType, implId: string): boolean {
    const deleted = this.implementations.get(traitType)?.delete(implId) ?? false;
    if (deleted) {
      this.instances.delete(`${traitType}:${implId}`);
      this.config.logger.info(`Unregistered ${traitType} implementation: ${implId}`);
    }
    return deleted;
  }

  // ============ 获取 ============
  
  /**
   * 获取实现
   * @param traitType Trait类型
   * @param implId 实现ID
   * @returns 实现实例
   */
  async get<T>(traitType: TraitType, implId: string): Promise<T> {
    const instanceKey = `${traitType}:${implId}`;
    
    // 检查缓存
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey) as T;
    }
    
    // 获取实现条目
    const entry = this.implementations.get(traitType)?.get(implId);
    
    if (!entry) {
      throw new ImplementationNotFoundError(traitType, implId);
    }
    
    // 创建实例
    try {
      const instance = await entry.factory(entry.config);
      
      // 缓存实例（如果是单例）
      if (entry.singleton) {
        this.instances.set(instanceKey, instance);
      }
      
      return instance as T;
    } catch (error) {
      this.config.logger.error(`Failed to create instance ${instanceKey}:`, error);
      throw error;
    }
  }

  /**
   * 获取默认实现
   * @param traitType Trait类型
   * @returns 实现实例
   */
  async getDefault<T>(traitType: TraitType): Promise<T> {
    const defaultId = this.config.defaults?.[traitType];
    
    if (!defaultId) {
      throw new NoDefaultImplementationError(traitType);
    }
    
    return this.get<T>(traitType, defaultId);
  }

  /**
   * 同步获取（仅从缓存）
   * @param traitType Trait类型
   * @param implId 实现ID
   * @returns 实现实例或undefined
   */
  getSync<T>(traitType: TraitType, implId: string): T | undefined {
    return this.instances.get(`${traitType}:${implId}`) as T | undefined;
  }

  /**
   * 获取所有实现ID
   * @param traitType Trait类型
   * @returns 实现ID列表（按优先级排序）
   */
  getImplementationIds(traitType: TraitType): string[] {
    const impls = this.implementations.get(traitType);
    if (!impls) return [];
    
    return Array.from(impls.entries())
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([id]) => id);
  }

  /**
   * 获取所有Trait类型
   */
  getTraitTypes(): TraitType[] {
    return Array.from(this.implementations.keys());
  }

  /**
   * 检查实现是否存在
   * @param traitType Trait类型
   * @param implId 实现ID
   */
  has(traitType: TraitType, implId: string): boolean {
    return this.implementations.get(traitType)?.has(implId) ?? false;
  }

  /**
   * 检查是否有默认实现
   * @param traitType Trait类型
   */
  hasDefault(traitType: TraitType): boolean {
    const defaultId = this.config.defaults?.[traitType];
    return defaultId !== undefined && this.has(traitType, defaultId);
  }

  // ============ 生命周期 ============
  
  /**
   * 初始化所有实现
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      this.config.logger.warn('Registry already initialized');
      return;
    }

    const initPromises: Promise<void>[] = [];
    
    for (const [traitType, impls] of this.implementations) {
      for (const [implId] of impls) {
        const instance = await this.get(traitType, implId);
        
        if (instance && typeof (instance as { initialize?: () => Promise<void> }).initialize === 'function') {
          initPromises.push(
            (instance as { initialize: () => Promise<void> }).initialize()
              .catch(error => {
                this.config.logger.error(`Failed to initialize ${traitType}:${implId}:`, error);
                throw error;
              })
          );
        }
      }
    }
    
    await Promise.all(initPromises);
    this.initialized = true;
    
    this.config.logger.info('All implementations initialized');
  }

  /**
   * 预加载指定实现
   */
  async preload(): Promise<void> {
    if (!this.config.preload) return;
    
    for (const token of this.config.preload) {
      const [traitType, implId] = token.split(':') as [TraitType, string];
      await this.get(traitType, implId);
    }
    
    this.config.logger.info(`Preloaded ${this.config.preload.length} implementations`);
  }

  /**
   * 清理所有实例
   */
  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    
    for (const [key, instance] of this.instances) {
      if (instance && typeof (instance as { dispose?: () => Promise<void> }).dispose === 'function') {
        disposePromises.push(
          (instance as { dispose: () => Promise<void> }).dispose()
            .catch(error => {
              this.config.logger.error(`Failed to dispose ${key}:`, error);
            })
        );
      }
    }
    
    await Promise.all(disposePromises);
    this.instances.clear();
    this.initialized = false;
    
    this.config.logger.info('All instances disposed');
  }

  /**
   * 清理特定类型的实例
   * @param traitType Trait类型
   */
  async disposeType(traitType: TraitType): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    const keysToRemove: string[] = [];
    
    for (const [key, instance] of this.instances) {
      if (key.startsWith(`${traitType}:`)) {
        keysToRemove.push(key);
        if (instance && typeof (instance as { dispose?: () => Promise<void> }).dispose === 'function') {
          disposePromises.push(
            (instance as { dispose: () => Promise<void> }).dispose()
              .catch(error => {
                this.config.logger.error(`Failed to dispose ${key}:`, error);
              })
          );
        }
      }
    }
    
    await Promise.all(disposePromises);
    
    for (const key of keysToRemove) {
      this.instances.delete(key);
    }
    
    this.config.logger.info(`Disposed ${keysToRemove.length} ${traitType} instances`);
  }

  // ============ 配置 ============
  
  /**
   * 设置默认实现
   * @param traitType Trait类型
   * @param implId 实现ID
   */
  setDefault(traitType: TraitType, implId: string): void {
    if (!this.config.defaults) {
      this.config.defaults = {};
    }
    this.config.defaults[traitType] = implId;
  }

  /**
   * 获取默认实现ID
   * @param traitType Trait类型
   */
  getDefaultId(traitType: TraitType): string | undefined {
    return this.config.defaults?.[traitType];
  }

  /**
   * 更新实现配置
   * @param traitType Trait类型
   * @param implId 实现ID
   * @param config 新配置
   */
  updateConfig(traitType: TraitType, implId: string, config: unknown): void {
    const entry = this.implementations.get(traitType)?.get(implId);
    if (entry) {
      entry.config = config;
      // 清除缓存的实例以便下次获取时使用新配置
      this.instances.delete(`${traitType}:${implId}`);
    }
  }

  // ============ 统计 ============
  
  /**
   * 获取注册统计
   */
  getStats(): {
    traitTypes: number;
    implementations: number;
    instances: number;
    initialized: boolean;
  } {
    let implementations = 0;
    for (const impls of this.implementations.values()) {
      implementations += impls.size;
    }
    
    return {
      traitTypes: this.implementations.size,
      implementations,
      instances: this.instances.size,
      initialized: this.initialized,
    };
  }
}

// ============ 导出 ============

export type { TraitKind, TraitDescriptor, TraitInstance };
