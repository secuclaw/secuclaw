/**
 * Tool Trait - 工具接口
 * 
 * 所有工具必须实现此接口
 * @version 2.0.0
 */

import type { ToolContext, ToolResult, ToolSchema, ToolCategory as LegacyToolCategory } from "../tools/types.js";

// ============ 类型定义 ============

/**
 * 工具类别
 */
export type ToolCategory = 
  | 'security'      // 安全工具
  | 'analysis'      // 分析工具
  | 'communication' // 通信工具
  | 'file'          // 文件工具
  | 'network'       // 网络工具
  | 'system'        // 系统工具
  | 'data'          // 数据工具
  | 'utility';      // 通用工具

/**
 * 工具能力
 */
export interface ToolCapabilities {
  /** 是否破坏性操作 */
  readonly destructive: boolean;
  /** 是否需要网络访问 */
  readonly networkAccess: boolean;
  /** 是否需要文件系统访问 */
  readonly filesystemAccess: boolean;
  /** 是否需要审批 */
  readonly requiresApproval: boolean;
  /** 预估执行时间（毫秒） */
  readonly estimatedTime: number;
  /** 是否可中断 */
  readonly interruptible: boolean;
  /** 是否支持进度回调 */
  readonly supportsProgress: boolean;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors?: ValidationError[];
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 字段路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
}

/**
 * 工具示例
 */
export interface ToolExample {
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 参数 */
  params: Record<string, unknown>;
  /** 预期输出 */
  expectedOutput?: string;
}

/**
 * JSON Schema 定义
 */
export type JSONSchema = Record<string, unknown>;

/**
 * 工具上下文（扩展）
 */
export interface ToolExecutionContext extends ToolContext {
  /** 当前权限列表 */
  permissions: string[];
  /** 请求ID */
  requestId: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 进度回调 */
  onProgress?: (progress: number, message?: string) => void;
  /** 日志记录器 */
  logger?: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
}

/**
 * 工具执行结果（扩展）
 */
export interface ToolExecutionResult<T = unknown> extends ToolResult {
  /** 返回数据 */
  data?: T;
  /** 执行时长（毫秒） */
  duration?: number;
  /** 资源使用 */
  resourceUsage?: {
    memoryBytes?: number;
    cpuTimeMs?: number;
    networkBytes?: number;
  };
  /** 警告信息 */
  warnings?: string[];
  /** 后续建议 */
  suggestions?: string[];
}

/**
 * 工具配置
 */
export interface ToolConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 超时时间 */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 权限列表 */
  permissions?: string[];
  /** 额外配置 */
  extra?: Record<string, unknown>;
}

// ============ Trait 接口 ============

/**
 * 工具Trait
 * 
 * 所有工具必须实现此接口
 */
export interface ToolTrait<TParams = unknown, TResult = unknown> {
  // ============ 元数据 ============
  
  /** 工具唯一标识 */
  readonly id: string;
  
  /** 工具名称 */
  readonly name: string;
  
  /** 工具描述 */
  readonly description: string;
  
  /** 工具类别 */
  readonly category: ToolCategory;
  
  /** 工具标签 */
  readonly tags: readonly string[];
  
  /** 参数Schema (JSON Schema) */
  readonly parameters: JSONSchema;
  
  /** 所需权限 */
  readonly requiredPermissions: readonly string[];
  
  /** 工具能力 */
  readonly capabilities: ToolCapabilities;
  
  /** 是否危险操作 */
  readonly isDangerous: boolean;
  
  /** 版本号 */
  readonly version?: string;
  
  /** 作者 */
  readonly author?: string;

  // ============ 执行 ============
  
  /**
   * 执行工具
   * @param params 参数
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(
    params: TParams,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<TResult>>;
  
  /**
   * 验证参数
   * @param params 参数
   * @returns 验证结果
   */
  validate?(params: unknown): ValidationResult;
  
  /**
   * 获取执行预览（用于确认）
   * @param params 参数
   * @returns 预览信息
   */
  getPreview?(params: TParams): Promise<string>;
  
  /**
   * 估算执行时间
   * @param params 参数
   * @returns 预估时间（毫秒）
   */
  estimateTime?(params: TParams): number;

  // ============ 权限 ============
  
  /**
   * 检查权限
   * @param context 执行上下文
   * @returns 是否有权限
   */
  checkPermission?(context: ToolExecutionContext): Promise<boolean>;
  
  /**
   * 请求权限
   * @param context 执行上下文
   * @returns 用户是否授权
   */
  requestPermission?(context: ToolExecutionContext): Promise<boolean>;

  // ============ 生命周期 ============
  
  /**
   * 初始化工具
   * @param config 配置
   */
  initialize?(config?: ToolConfig): Promise<void>;
  
  /**
   * 关闭工具
   */
  dispose?(): Promise<void>;

  // ============ 帮助 ============
  
  /**
   * 获取帮助信息
   */
  getHelp(): string;
  
  /**
   * 获取使用示例
   */
  getExamples(): ToolExample[];
  
  /**
   * 获取参数Schema
   */
  getSchema(): ToolSchema;
}

// ============ 工厂接口 ============

/**
 * 工具工厂
 */
export interface IToolFactory {
  /**
   * 创建工具实例
   * @param config 配置
   */
  create(config?: ToolConfig): ToolTrait;
  
  /**
   * 验证配置
   * @param config 配置
   */
  validate?(config: ToolConfig): boolean;
  
  /**
   * 获取默认配置
   */
  getDefaultConfig?(): Partial<ToolConfig>;
}

// ============ 工具构建器 ============

/**
 * 工具构建器（用于简化工具创建）
 */
export class ToolBuilder<TParams = unknown, TResult = unknown> {
  private tool: {
    id?: string;
    name?: string;
    description?: string;
    category?: ToolCategory;
    tags: string[];
    parameters?: JSONSchema;
    requiredPermissions: string[];
    capabilities?: ToolCapabilities;
    isDangerous: boolean;
    execute?: ToolTrait<TParams, TResult>['execute'];
  } = {
    tags: [],
    requiredPermissions: [],
    isDangerous: false,
  };

  id(id: string): this {
    this.tool.id = id;
    return this;
  }

  name(name: string): this {
    this.tool.name = name;
    return this;
  }

  description(desc: string): this {
    this.tool.description = desc;
    return this;
  }

  category(cat: ToolCategory): this {
    this.tool.category = cat;
    return this;
  }

  tags(...tags: string[]): this {
    this.tool.tags = [...(this.tool.tags || []), ...tags];
    return this;
  }

  parameters(schema: JSONSchema): this {
    this.tool.parameters = schema;
    return this;
  }

  permissions(...perms: string[]): this {
    this.tool.requiredPermissions = [...(this.tool.requiredPermissions || []), ...perms];
    return this;
  }

  capabilities(caps: Partial<ToolCapabilities>): this {
    this.tool.capabilities = {
      destructive: false,
      networkAccess: false,
      filesystemAccess: false,
      requiresApproval: false,
      estimatedTime: 1000,
      interruptible: true,
      supportsProgress: false,
      ...caps,
    };
    return this;
  }

  dangerous(isDangerous = true): this {
    this.tool.isDangerous = isDangerous;
    return this;
  }

  execute(fn: ToolTrait<TParams, TResult>['execute']): this {
    this.tool.execute = fn;
    return this;
  }

  build(): ToolTrait<TParams, TResult> {
    if (!this.tool.id) throw new Error('Tool id is required');
    if (!this.tool.name) throw new Error('Tool name is required');
    if (!this.tool.description) throw new Error('Tool description is required');
    if (!this.tool.category) throw new Error('Tool category is required');
    if (!this.tool.parameters) throw new Error('Tool parameters schema is required');
    if (!this.tool.execute) throw new Error('Tool execute function is required');
    
    return {
      ...this.tool,
      getHelp: () => `${this.tool.name}: ${this.tool.description}`,
      getExamples: () => [],
      getSchema: () => ({
        name: this.tool.id!,
        description: this.tool.description!,
        parameters: {
          type: 'object' as const,
          properties: this.tool.parameters as Record<string, unknown>,
        },
      }) as ToolSchema,
    } as ToolTrait<TParams, TResult>;
  }
}

// ============ 兼容性导出 ============

// 保持与现有代码的兼容性
export type { ITool, IToolCapabilities, IToolContext, IToolResult, ToolExample as IToolExample } from "../tools/trait.js";
