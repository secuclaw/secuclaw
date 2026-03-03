/**
 * Provider Trait - LLM提供商接口
 * 
 * 所有LLM提供商必须实现此接口
 * @version 2.0.0
 */

import type { ChatRequest, ChatResponse, StreamChunk } from "../providers/types.js";

// ============ 类型定义 ============

/**
 * 提供商类型
 */
export type ProviderType = 
  | 'openai-compatible'  // OpenAI兼容API
  | 'anthropic'          // Anthropic原生API
  | 'azure'              // Azure OpenAI
  | 'bedrock'            // AWS Bedrock
  | 'local';             // 本地模型

/**
 * 提供商能力
 */
export type ProviderCapability = 
  | 'chat'               // 聊天补全
  | 'streaming'          // 流式输出
  | 'embeddings'         // 文本嵌入
  | 'vision'             // 图像理解
  | 'function_calling'   // 函数调用
  | 'json_mode';         // JSON模式

/**
 * 工具定义
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * 工具调用
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * 提供商消息
 */
export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * 聊天选项
 */
export interface ChatOptions {
  /** 模型名称 */
  model: string;
  
  /** 温度 (0-2) */
  temperature?: number;
  
  /** 最大Token数 */
  maxTokens?: number;
  
  /** 停止词 */
  stop?: string[];
  
  /** 系统提示 */
  systemPrompt?: string;
  
  /** 工具定义 */
  tools?: ToolDefinition[];
  
  /** 工具选择策略 */
  toolChoice?: 'auto' | 'none' | 'required' | { name: string };
  
  /** 响应格式 */
  responseFormat?: { type: 'text' | 'json_object' };
  
  /** 频率惩罚 */
  frequencyPenalty?: number;
  
  /** 存在惩罚 */
  presencePenalty?: number;
  
  /** Top P */
  topP?: number;
  
  /** 种子 */
  seed?: number;
  
  /** 用户标识 */
  user?: string;
}

/**
 * 聊天结果
 */
export interface ChatResult {
  /** 补全ID */
  id: string;
  
  /** 补全文本 */
  content: string;
  
  /** 使用的模型 */
  model: string;
  
  /** 使用统计 */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /** 完成原因 */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  
  /** 工具调用 */
  toolCalls?: ToolCall[];
  
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 流式块
 */
export interface ChatStreamChunk {
  delta: {
    content?: string;
    toolCalls?: Partial<ToolCall>[];
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

/**
 * 嵌入选项
 */
export interface EmbedOptions {
  model?: string;
}

/**
 * 嵌入结果
 */
export interface EmbedResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * 提供商配置
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  retries?: number;
  extra?: Record<string, unknown>;
}

/**
 * 健康状态
 */
export interface HealthStatus {
  healthy: boolean;
  latency?: number;
  error?: string;
  lastCheck: Date;
}

/**
 * 提供商指标
 */
export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalTokensUsed: number;
  lastRequestTime?: Date;
}

// ============ Trait 接口 ============

/**
 * LLM提供商Trait
 * 
 * 所有LLM提供商必须实现此接口
 */
export interface ProviderTrait {
  // ============ 元数据 ============
  
  /** 提供商唯一标识 */
  readonly id: string;
  
  /** 提供商名称 */
  readonly name: string;
  
  /** 提供商类型 */
  readonly type: ProviderType;
  
  /** 支持的模型列表 */
  readonly models: readonly string[];
  
  /** 支持的功能 */
  readonly capabilities: readonly ProviderCapability[];
  
  /** 配置 */
  readonly config?: ProviderConfig;

  // ============ 核心方法 ============
  
  /**
   * 聊天补全
   * @param messages 消息列表
   * @param options 补全选项
   * @returns 补全结果
   */
  chat(
    messages: ProviderMessage[] | ChatRequest,
    options?: Partial<ChatOptions>
  ): Promise<ChatResult | ChatResponse>;
  
  /**
   * 流式聊天补全
   * @param messages 消息列表
   * @param options 补全选项
   * @returns 补全结果流
   */
  chatStream?(
    messages: ProviderMessage[] | ChatRequest,
    options?: Partial<ChatOptions>
  ): AsyncIterable<ChatStreamChunk | StreamChunk>;
  
  /**
   * 文本嵌入
   * @param text 输入文本
   * @param options 嵌入选项
   * @returns 嵌入向量
   */
  embed?(
    text: string,
    options?: EmbedOptions
  ): Promise<EmbedResult | number[]>;
  
  /**
   * 批量嵌入
   * @param texts 输入文本列表
   * @param options 嵌入选项
   * @returns 嵌入向量列表
   */
  embedBatch?(
    texts: string[],
    options?: EmbedOptions
  ): Promise<EmbedResult[] | number[][]>;

  // ============ 生命周期 ============
  
  /**
   * 初始化提供商
   * @param config 配置
   */
  initialize?(config?: ProviderConfig): Promise<void>;
  
  /**
   * 关闭提供商
   */
  dispose?(): Promise<void>;
  
  // ============ 健康检查 ============
  
  /**
   * 检查提供商健康状态
   */
  healthCheck(): Promise<HealthStatus | boolean>;
  
  /**
   * 获取提供商指标
   */
  getMetrics?(): ProviderMetrics;
  
  // ============ Token 计数 ============
  
  /**
   * 计算Token数量
   * @param text 输入文本
   */
  countTokens?(text: string): number;
}

// ============ 工厂接口 ============

/**
 * 提供商工厂
 */
export interface IProviderFactory {
  /**
   * 创建提供商实例
   * @param config 配置
   */
  create(config: ProviderConfig): ProviderTrait;
  
  /**
   * 验证配置
   * @param config 配置
   */
  validate(config: ProviderConfig): boolean;
  
  /**
   * 获取默认配置
   */
  getDefaultConfig?(): Partial<ProviderConfig>;
}

// ============ 兼容性导出 ============

// 保持与现有代码的兼容性
export type { ILLMProvider, IProviderCapabilities, IProviderConfig } from "../providers/trait.js";
