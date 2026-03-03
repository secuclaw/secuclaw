/**
 * DI Container - 依赖注入容器
 * 
 * 提供依赖注入和解析功能
 * @version 2.0.0
 */

import { TraitRegistry, type TraitType } from "./registry.js";

// Reflect metadata 类型声明
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Reflect {
    function getMetadata(key: string, target: unknown): unknown;
    function defineMetadata(key: string, value: unknown, target: unknown): void;
  }
}

// ============ 类型定义 ============

/**
 * 令牌类型
 */
export type Token = string | symbol | Function;

/**
 * 工厂函数
 */
export type FactoryFn<T = unknown> = (container: DIContainer) => T | Promise<T>;

/**
 * 提供者类型
 */
export type Provider<T = unknown> =
  | { useValue: T }
  | { useClass: new (...args: unknown[]) => T }
  | { useFactory: FactoryFn<T> }
  | { useToken: string };

/**
 * 依赖描述
 */
export interface DependencyDescriptor {
  token: Token;
  optional?: boolean;
}

/**
 * 注册选项
 */
export interface RegisterOptions {
  /** 是否单例 */
  singleton?: boolean;
  /** 覆盖现有注册 */
  override?: boolean;
}

// ============ 错误类 ============

/**
 * 依赖未找到错误
 */
export class DependencyNotFoundError extends Error {
  constructor(public readonly token: Token) {
    super(`Dependency not found: ${String(token)}`);
    this.name = 'DependencyNotFoundError';
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends Error {
  constructor(public readonly chain: Token[]) {
    super(`Circular dependency detected: ${chain.map(String).join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

// ============ DI容器 ============

/**
 * 依赖注入容器
 */
export class DIContainer {
  private registry: TraitRegistry;
  private cache = new Map<Token, unknown>();
  private providers = new Map<Token, Provider>();
  private resolving = new Set<Token>();
  private parent?: DIContainer;

  constructor(registry: TraitRegistry, parent?: DIContainer) {
    this.registry = registry;
    this.parent = parent;
  }

  // ============ 注册 ============
  
  /**
   * 注册值
   * @param token 令牌
   * @param value 值
   */
  registerValue<T>(token: Token, value: T, options?: RegisterOptions): this {
    if (!options?.override && this.cache.has(token)) {
      throw new Error(`Token ${String(token)} already registered`);
    }
    this.cache.set(token, value);
    return this;
  }

  /**
   * 注册类
   * @param token 令牌
   * @param constructor 类构造函数
   */
  registerClass<T>(
    token: Token,
    constructor: new (...args: unknown[]) => T,
    options?: RegisterOptions
  ): this {
    if (!options?.override && this.providers.has(token)) {
      throw new Error(`Token ${String(token)} already registered`);
    }
    this.providers.set(token, { useClass: constructor });
    return this;
  }

  /**
   * 注册工厂
   * @param token 令牌
   * @param factory 工厂函数
   */
  registerFactory<T>(
    token: Token,
    factory: FactoryFn<T>,
    options?: RegisterOptions
  ): this {
    if (!options?.override && this.providers.has(token)) {
      throw new Error(`Token ${String(token)} already registered`);
    }
    this.providers.set(token, { useFactory: factory });
    return this;
  }

  /**
   * 注册别名
   * @param token 令牌
   * @param targetToken 目标令牌
   */
  registerAlias(token: Token, targetToken: string, options?: RegisterOptions): this {
    if (!options?.override && this.providers.has(token)) {
      throw new Error(`Token ${String(token)} already registered`);
    }
    this.providers.set(token, { useToken: targetToken });
    return this;
  }

  /**
   * 通用注册
   * @param token 令牌
   * @param provider 提供者
   */
  register<T>(token: Token, provider: Provider<T>, options?: RegisterOptions): this {
    if (!options?.override && this.providers.has(token)) {
      throw new Error(`Token ${String(token)} already registered`);
    }
    this.providers.set(token, provider);
    return this;
  }

  /**
   * 批量注册
   * @param registrations 注册列表
   */
  registerAll(
    registrations: Array<{ token: Token; provider: Provider }>
  ): this {
    for (const { token, provider } of registrations) {
      this.register(token, provider);
    }
    return this;
  }

  /**
   * 取消注册
   * @param token 令牌
   */
  unregister(token: Token): boolean {
    this.cache.delete(token);
    return this.providers.delete(token);
  }

  // ============ 解析 ============
  
  /**
   * 解析依赖
   * @param token 令牌
   * @returns 依赖实例
   */
  async resolve<T>(token: Token): Promise<T> {
    // 检查循环依赖
    if (this.resolving.has(token)) {
      throw new CircularDependencyError([...this.resolving, token]);
    }

    // 检查缓存
    if (this.cache.has(token)) {
      return this.cache.get(token) as T;
    }

    // 检查父容器
    if (this.parent && this.parent.cache.has(token)) {
      return this.parent.cache.get(token) as T;
    }

    // 解析 Trait 令牌（格式: "traitType:implId" 或 "traitType"）
    if (typeof token === 'string') {
      const traitResult = await this.resolveTraitToken<T>(token);
      if (traitResult !== undefined) {
        return traitResult;
      }
    }

    // 获取提供者
    const provider = this.providers.get(token);
    if (!provider) {
      // 检查父容器
      if (this.parent) {
        return this.parent.resolve<T>(token);
      }
      throw new DependencyNotFoundError(token);
    }

    // 标记正在解析
    this.resolving.add(token);

    try {
      let instance: T;

      if ('useValue' in provider) {
        instance = provider.useValue as T;
      } else if ('useClass' in provider) {
        instance = await this.instantiateClass(provider.useClass) as T;
      } else if ('useFactory' in provider) {
        instance = await provider.useFactory(this) as T;
      } else if ('useToken' in provider) {
        instance = await this.resolve<T>(provider.useToken);
      } else {
        throw new Error(`Invalid provider for token ${String(token)}`);
      }

      // 缓存实例
      this.cache.set(token, instance);

      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * 解析 Trait 令牌
   */
  private async resolveTraitToken<T>(token: string): Promise<T | undefined> {
    const [traitType, implId] = token.split(':') as [TraitType | undefined, string | undefined];
    
    if (!traitType) return undefined;
    
    try {
      if (implId) {
        return await this.registry.get<T>(traitType, implId);
      } else {
        return await this.registry.getDefault<T>(traitType);
      }
    } catch {
      // 如果从 registry 解析失败，返回 undefined 让调用者继续处理
      return undefined;
    }
  }

  /**
   * 同步解析（仅从缓存）
   * @param token 令牌
   */
  resolveSync<T>(token: Token): T | undefined {
    if (this.cache.has(token)) {
      return this.cache.get(token) as T;
    }
    if (this.parent?.cache.has(token)) {
      return this.parent.cache.get(token) as T;
    }
    return undefined;
  }

  /**
   * 尝试解析（不抛出错误）
   * @param token 令牌
   */
  async tryResolve<T>(token: Token): Promise<T | undefined> {
    try {
      return await this.resolve<T>(token);
    } catch {
      return undefined;
    }
  }

  // ============ 类实例化 ============
  
  /**
   * 实例化类
   */
  private async instantiateClass<T>(
    constructor: new (...args: unknown[]) => T
  ): Promise<T> {
    // 获取构造函数参数类型
    const paramTypes = this.getParamTypes(constructor);
    
    // 解析依赖
    const args: unknown[] = [];
    if (paramTypes) {
      for (const paramType of paramTypes) {
        const dep = await this.resolve(paramType);
        args.push(dep);
      }
    }

    return new constructor(...args);
  }

  /**
   * 获取参数类型（需要 reflect-metadata）
   */
  private getParamTypes(
    constructor: new (...args: unknown[]) => unknown
  ): Token[] | undefined {
    // 检查是否有 reflect-metadata
    if (typeof Reflect !== 'undefined' && typeof Reflect.getMetadata === 'function') {
      return Reflect.getMetadata('design:paramtypes', constructor) as Token[] | undefined;
    }
    return undefined;
  }

  // ============ 容器管理 ============
  
  /**
   * 创建子容器
   */
  createChild(): DIContainer {
    return new DIContainer(this.registry, this);
  }

  /**
   * 检查是否已注册
   * @param token 令牌
   */
  isRegistered(token: Token): boolean {
    return (
      this.cache.has(token) ||
      this.providers.has(token) ||
      (this.parent?.isRegistered(token) ?? false)
    );
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取所有已注册的令牌
   */
  getRegisteredTokens(): Token[] {
    const tokens = new Set<Token>();
    
    for (const token of this.cache.keys()) {
      tokens.add(token);
    }
    for (const token of this.providers.keys()) {
      tokens.add(token);
    }
    
    if (this.parent) {
      for (const token of this.parent.getRegisteredTokens()) {
        tokens.add(token);
      }
    }
    
    return Array.from(tokens);
  }

  // ============ 生命周期 ============
  
  /**
   * 释放容器
   */
  async dispose(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    
    for (const instance of this.cache.values()) {
      if (instance && typeof (instance as { dispose?: () => Promise<void> }).dispose === 'function') {
        disposePromises.push(
          (instance as { dispose: () => Promise<void> }).dispose()
        );
      }
    }
    
    await Promise.all(disposePromises);
    this.cache.clear();
    this.providers.clear();
  }
}

// ============ 装饰器（可选，需要 reflect-metadata） ============

/**
 * 注入装饰器
 */
export function Inject(token: Token): ParameterDecorator & PropertyDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) {
    if (typeof Reflect !== 'undefined' && typeof Reflect.defineMetadata === 'function') {
      if (parameterIndex !== undefined) {
        // 参数装饰器
        const injections = (Reflect.getMetadata('injections', target) ?? {}) as Record<number, Token>;
        injections[parameterIndex] = token;
        Reflect.defineMetadata('injections', injections, target);
      } else if (propertyKey !== undefined) {
        // 属性装饰器
        const propInjections = (Reflect.getMetadata('propInjections', target.constructor) ?? {}) as Record<string | symbol, Token>;
        propInjections[propertyKey] = token;
        Reflect.defineMetadata('propInjections', propInjections, target.constructor);
      }
    }
  };
}

/**
 * 可注入装饰器
 */
export function Injectable(token?: string): ClassDecorator {
  return function <T extends Function>(target: T) {
    if (typeof Reflect !== 'undefined' && typeof Reflect.defineMetadata === 'function') {
      const traitToken = token ?? target.name;
      Reflect.defineMetadata('token', traitToken, target);
    }
    return target;
  };
}

/**
 * 单例装饰器
 */
export function Singleton(): ClassDecorator {
  return function <T extends Function>(target: T) {
    if (typeof Reflect !== 'undefined' && typeof Reflect.defineMetadata === 'function') {
      Reflect.defineMetadata('singleton', true, target);
    }
    return target;
  };
}

// ============ 辅助函数 ============

/**
 * 创建容器
 */
export function createContainer(registry: TraitRegistry): DIContainer {
  return new DIContainer(registry);
}

/**
 * 令牌辅助函数
 */
export const Token = {
  create: (name: string): string => name,
  createSymbol: (description: string): symbol => Symbol(description),
};
