/**
 * Agent Trait - 智能体接口
 * 
 * 所有智能体必须实现此接口
 * @version 2.0.0
 */

// ============ 类型定义 ============

/**
 * 智能体能力
 */
export interface AgentCapabilities {
  /** 支持的任务类型 */
  readonly taskTypes: string[];
  /** 最大并发任务 */
  readonly maxConcurrency: number;
  /** 是否支持流式输出 */
  readonly streaming: boolean;
  /** 是否支持工具调用 */
  readonly toolUse: boolean;
  /** 是否支持多轮对话 */
  readonly multiTurn: boolean;
  /** 是否支持记忆 */
  readonly memory: boolean;
}

/**
 * 智能体状态
 */
export type AgentState = 
  | 'idle'        // 空闲
  | 'initializing' // 初始化中
  | 'running'     // 运行中
  | 'paused'      // 暂停
  | 'error'       // 错误
  | 'terminated'; // 已终止

/**
 * 智能体任务
 */
export interface AgentTask {
  /** 任务ID */
  id: string;
  /** 输入内容 */
  input: string;
  /** 任务类型 */
  type?: string;
  /** 优先级 */
  priority?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 父任务ID */
  parentId?: string;
  /** 创建时间 */
  createdAt?: Date;
}

/**
 * 智能体结果
 */
export interface AgentResult {
  /** 是否成功 */
  ok: boolean;
  /** 输出内容 */
  output: string;
  /** 错误信息 */
  error?: string;
  /** 任务ID */
  taskId?: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** 使用的工具 */
  toolsUsed?: string[];
  /** Token 使用统计 */
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 智能体消息
 */
export interface AgentMessage {
  /** 消息ID */
  id: string;
  /** 角色 */
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 工具调用 */
  toolCalls?: AgentToolCall[];
  /** 工具调用ID */
  toolCallId?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 工具调用
 */
export interface AgentToolCall {
  /** 调用ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 参数 */
  arguments: Record<string, unknown>;
}

/**
 * 智能体响应
 */
export interface AgentResponse {
  /** 响应内容 */
  content: string;
  /** 是否完成 */
  done: boolean;
  /** 工具调用 */
  toolCalls?: AgentToolCall[];
  /** 状态变更 */
  stateChange?: AgentState;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 智能体上下文
 */
export interface AgentContext {
  /** 会话ID */
  sessionId: string;
  /** 用户ID */
  userId?: string;
  /** 渠道ID */
  channelId?: string;
  /** 对话历史 */
  history?: AgentMessage[];
  /** 可用工具 */
  tools?: string[];
  /** 配置 */
  config?: AgentConfig;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 智能体配置
 */
export interface AgentConfig {
  /** 系统提示 */
  systemPrompt?: string;
  /** 最大轮次 */
  maxTurns?: number;
  /** 超时时间 */
  timeout?: number;
  /** 温度 */
  temperature?: number;
  /** 模型 */
  model?: string;
  /** 提供商 */
  provider?: string;
  /** 额外配置 */
  extra?: Record<string, unknown>;
}

// ============ Trait 接口 ============

/**
 * 智能体Trait
 * 
 * 所有智能体必须实现此接口
 */
export interface AgentTrait {
  // ============ 元数据 ============
  
  /** 智能体ID */
  readonly id: string;
  
  /** 智能体名称 */
  readonly name?: string;
  
  /** 智能体描述 */
  readonly description?: string;
  
  /** 智能体能力 */
  readonly capabilities?: AgentCapabilities;
  
  /** 智能体状态 */
  readonly state: AgentState;
  
  /** 配置 */
  readonly config?: AgentConfig;

  // ============ 生命周期 ============
  
  /**
   * 初始化智能体
   */
  initialize(): Promise<void>;
  
  /**
   * 终止智能体
   */
  terminate(): Promise<void>;
  
  /**
   * 暂停智能体
   */
  pause?(): Promise<void>;
  
  /**
   * 恢复智能体
   */
  resume?(): Promise<void>;

  // ============ 任务执行 ============
  
  /**
   * 执行任务
   * @param task 任务
   */
  execute(task: AgentTask): Promise<AgentResult>;
  
  /**
   * 执行任务（流式）
   * @param task 任务
   */
  executeStream?(task: AgentTask): AsyncIterable<AgentResponse>;
  
  /**
   * 取消任务
   * @param taskId 任务ID
   */
  cancel?(taskId: string): Promise<void>;

  // ============ 对话 ============
  
  /**
   * 发送消息
   * @param message 消息
   * @param context 上下文
   */
  chat?(message: string, context?: AgentContext): Promise<AgentResponse>;
  
  /**
   * 发送消息（流式）
   * @param message 消息
   * @param context 上下文
   */
  chatStream?(message: string, context?: AgentContext): AsyncIterable<AgentResponse>;

  // ============ 状态 ============
  
  /**
   * 获取状态
   */
  getState(): AgentState;
  
  /**
   * 健康检查
   */
  healthCheck?(): Promise<boolean>;
  
  /**
   * 获取统计信息
   */
  getStats?(): {
    tasksCompleted: number;
    tasksFailed: number;
    averageDuration: number;
    uptime: number;
  };
}

// ============ 工厂接口 ============

/**
 * 智能体工厂
 */
export interface IAgentFactory {
  /**
   * 创建智能体实例
   * @param config 配置
   */
  create(config?: AgentConfig): AgentTrait;
  
  /**
   * 验证配置
   * @param config 配置
   */
  validate?(config: AgentConfig): boolean;
  
  /**
   * 获取默认配置
   */
  getDefaultConfig?(): Partial<AgentConfig>;
}

// ============ 辅助类型 ============

/**
 * 智能体事件
 */
export type AgentEvent = 
  | { type: 'task_started'; taskId: string }
  | { type: 'task_completed'; taskId: string; result: AgentResult }
  | { type: 'task_failed'; taskId: string; error: string }
  | { type: 'state_changed'; from: AgentState; to: AgentState }
  | { type: 'tool_called'; toolName: string; args: Record<string, unknown> }
  | { type: 'message'; content: string };

/**
 * 智能体事件处理器
 */
export type AgentEventHandler = (event: AgentEvent) => Promise<void> | void;
