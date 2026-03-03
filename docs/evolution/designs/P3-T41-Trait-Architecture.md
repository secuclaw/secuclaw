# 详细设计文档: P3-T41 Trait驱动架构

> **版本**: 1.0  
> **作者**: Architecture Team  
> **日期**: 2026-03-03  
> **状态**: 设计中

---

## 1. 概述

### 1.1 目标

将SecuClaw核心模块重构为Trait驱动架构，实现：
- 运行时模块切换
- 插件化扩展
- 配置驱动的行为
- 向后兼容

### 1.2 动机

当前SecuClaw的架构存在以下问题：
1. **硬编码依赖**: 模块之间直接依赖，难以替换
2. **配置不灵活**: 更改行为需要修改代码
3. **扩展困难**: 添加新功能需要修改核心代码
4. **测试困难**: 难以Mock依赖进行单元测试

Trait驱动架构可以解决这些问题，同时保持类型安全。

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Trait-Driven Architecture                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Application Layer                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Agent     │  │    API      │  │    CLI      │              │   │
│  │  │  Runtime    │  │  Handlers   │  │  Commands   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       Trait Registry                             │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  Provider │ Channel │ Tool │ Memory │ Storage │ Event  │    │   │
│  │  │  Trait    │ Trait   │ Trait│ Trait  │ Trait   │ Trait  │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Trait Implementations                       │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │                      Provider Impl                         │  │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │   │
│  │  │  │OpenAI  │ │Anthropic│ │ Azure │ │Bedrock │ │ Ollama │  │  │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │                      Channel Impl                          │  │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │   │
│  │  │  │Telegram│ │Discord │ │ Slack │ │WhatsApp│ │ Signal │  │  │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │                        Tool Impl                           │  │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │   │
│  │  │  │  Scan  │ │ Analyze│ │ Report│ │  Hunt  │ │Respond │  │  │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心概念

| 概念 | 描述 |
|------|------|
| **Trait** | 定义模块行为的接口 |
| **Implementation** | Trait的具体实现 |
| **Registry** | 管理Trait注册和查找 |
| **Factory** | 根据配置创建实现实例 |
| **Context** | 依赖注入容器 |

---

## 3. Trait定义

### 3.1 Provider Trait

```typescript
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

  // ============ 核心方法 ============
  
  /**
   * 聊天补全
   * @param messages 消息列表
   * @param options 补全选项
   * @returns 补全结果
   */
  chat(
    messages: ProviderMessage[],
    options?: ChatOptions
  ): Promise<ChatResult>;
  
  /**
   * 流式聊天补全
   * @param messages 消息列表
   * @param options 补全选项
   * @returns 补全结果流
   */
  chatStream(
    messages: ProviderMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk>;
  
  /**
   * 文本嵌入
   * @param text 输入文本
   * @param options 嵌入选项
   * @returns 嵌入向量
   */
  embed?(
    text: string,
    options?: EmbedOptions
  ): Promise<EmbedResult>;
  
  /**
   * 批量嵌入
   * @param texts 输入文本列表
   * @param options 嵌入选项
   * @returns 嵌入向量列表
   */
  embedBatch?(
    texts: string[],
    options?: EmbedOptions
  ): Promise<EmbedResult[]>;

  // ============ 生命周期 ============
  
  /**
   * 初始化提供商
   * @param config 配置
   */
  initialize?(config: ProviderConfig): Promise<void>;
  
  /**
   * 关闭提供商
   */
  dispose?(): Promise<void>;
  
  // ============ 健康检查 ============
  
  /**
   * 检查提供商健康状态
   */
  healthCheck?(): Promise<HealthStatus>;
  
  /**
   * 获取提供商指标
   */
  getMetrics?(): ProviderMetrics;
}

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
  metadata?: Record<string, any>;
}
```

### 3.2 Channel Trait

```typescript
/**
 * 消息渠道Trait
 * 
 * 所有消息渠道必须实现此接口
 */
export interface ChannelTrait {
  // ============ 元数据 ============
  
  /** 渠道唯一标识 */
  readonly id: string;
  
  /** 渠道名称 */
  readonly name: string;
  
  /** 渠道类型 */
  readonly type: ChannelType;
  
  /** 支持的功能 */
  readonly capabilities: readonly ChannelCapability[];

  // ============ 连接管理 ============
  
  /**
   * 连接到渠道
   */
  connect(): Promise<void>;
  
  /**
   * 断开连接
   */
  disconnect(): Promise<void>;
  
  /**
   * 检查连接状态
   */
  isConnected(): boolean;
  
  /**
   * 获取连接状态
   */
  getStatus(): ChannelStatus;

  // ============ 消息操作 ============
  
  /**
   * 发送消息
   * @param message 消息内容
   * @param options 发送选项
   * @returns 消息ID
   */
  send(message: ChannelMessage, options?: SendOptions): Promise<string>;
  
  /**
   * 编辑消息
   * @param messageId 消息ID
   * @param content 新内容
   */
  edit?(messageId: string, content: string): Promise<void>;
  
  /**
   * 删除消息
   * @param messageId 消息ID
   */
  delete?(messageId: string): Promise<void>;
  
  /**
   * 回复消息
   * @param messageId 原消息ID
   * @param content 回复内容
   */
  reply?(messageId: string, content: string): Promise<string>;
  
  /**
   * 标记已读
   * @param messageId 消息ID
   */
  markAsRead?(messageId: string): Promise<void>;
  
  /**
   * 打字指示
   * @param chatId 聊天ID
   */
  startTyping?(chatId: string): Promise<void>;
  
  /**
   * 停止打字指示
   * @param chatId 聊天ID
   */
  stopTyping?(chatId: string): Promise<void>;

  // ============ 附件操作 ============
  
  /**
   * 发送文件
   * @param chatId 聊天ID
   * @param file 文件内容
   * @param options 发送选项
   */
  sendFile?(
    chatId: string,
    file: FileContent,
    options?: FileSendOptions
  ): Promise<string>;
  
  /**
   * 下载文件
   * @param fileId 文件ID
   */
  downloadFile?(fileId: string): Promise<FileContent>;

  // ============ 事件处理 ============
  
  /**
   * 注册消息处理器
   * @param handler 消息处理函数
   */
  onMessage(handler: MessageHandler): void;
  
  /**
   * 移除消息处理器
   * @param handler 消息处理函数
   */
  offMessage(handler: MessageHandler): void;
  
  /**
   * 注册事件处理器
   * @param event 事件类型
   * @param handler 事件处理函数
   */
  on<T = any>(event: ChannelEvent, handler: EventHandler<T>): void;
  
  /**
   * 移除事件处理器
   * @param event 事件类型
   * @param handler 事件处理函数
   */
  off<T = any>(event: ChannelEvent, handler: EventHandler<T>): void;

  // ============ 群组管理 ============
  
  /**
   * 获取群组列表
   */
  getChats?(): Promise<Chat[]>;
  
  /**
   * 获取群组成员
   * @param chatId 群组ID
   */
  getChatMembers?(chatId: string): Promise<ChatMember[]>;
  
  /**
   * 获取用户信息
   * @param userId 用户ID
   */
  getUser?(userId: string): Promise<User>;
}

/**
 * 渠道类型
 */
export type ChannelType = 
  | 'messaging'    // 即时通讯
  | 'chat'         // 聊天室
  | 'email'        // 邮件
  | 'social'       // 社交媒体
  | 'voice';       // 语音

/**
 * 渠道能力
 */
export type ChannelCapability = 
  | 'text'         // 文本消息
  | 'markdown'     // Markdown格式
  | 'html'         // HTML格式
  | 'image'        // 图片
  | 'video'        // 视频
  | 'audio'        // 音频
  | 'file'         // 文件
  | 'reply'        // 回复
  | 'edit'         // 编辑
  | 'delete'       // 删除
  | 'typing'       // 打字指示
  | 'read_receipt' // 已读回执
  | 'reaction'     // 表情反应
  | 'thread'       // 话题/线程
  | 'poll'         // 投票
  | 'card';        // 卡片消息

/**
 * 渠道状态
 */
export type ChannelStatus = 
  | 'disconnected'  // 已断开
  | 'connecting'    // 连接中
  | 'connected'     // 已连接
  | 'error'         // 错误
  | 'reconnecting'; // 重连中

/**
 * 渠道事件
 */
export type ChannelEvent = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'message'
  | 'message_edited'
  | 'message_deleted'
  | 'typing_start'
  | 'typing_stop'
  | 'user_joined'
  | 'user_left'
  | 'reaction_added';
```

### 3.3 Tool Trait

```typescript
/**
 * 工具Trait
 * 
 * 所有工具必须实现此接口
 */
export interface ToolTrait {
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
  
  /** 是否危险操作 */
  readonly isDangerous: boolean;

  // ============ 执行 ============
  
  /**
   * 执行工具
   * @param params 参数
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;
  
  /**
   * 验证参数
   * @param params 参数
   * @returns 验证结果
   */
  validate?(params: Record<string, any>): ValidationResult;
  
  /**
   * 获取执行预览（用于确认）
   * @param params 参数
   * @returns 预览信息
   */
  getPreview?(params: Record<string, any>): Promise<string>;

  // ============ 权限 ============
  
  /**
   * 检查权限
   * @param context 执行上下文
   * @returns 是否有权限
   */
  checkPermission?(context: ToolContext): Promise<boolean>;
  
  /**
   * 请求权限
   * @param context 执行上下文
   * @returns 用户是否授权
   */
  requestPermission?(context: ToolContext): Promise<boolean>;
}

/**
 * 工具类别
 */
export type ToolCategory = 
  | 'security'     // 安全工具
  | 'analysis'     // 分析工具
  | 'communication' // 通信工具
  | 'file'         // 文件工具
  | 'network'      // 网络工具
  | 'system'       // 系统工具
  | 'data'         // 数据工具
  | 'utility';     // 通用工具

/**
 * 工具结果
 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean;
  
  /** 结果数据 */
  data?: any;
  
  /** 错误信息 */
  error?: string;
  
  /** 输出内容（给用户看的） */
  output: string;
  
  /** 元数据 */
  metadata?: Record<string, any>;
}
```

### 3.4 Memory Trait

```typescript
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

  // ============ 消息存储 ============
  
  /**
   * 添加消息
   * @param message 消息
   */
  addMessage(message: MemoryMessage): Promise<void>;
  
  /**
   * 获取消息
   * @param sessionId 会话ID
   * @param options 查询选项
   * @returns 消息列表
   */
  getMessages(sessionId: string, options?: MessageQueryOptions): Promise<MemoryMessage[]>;
  
  /**
   * 清除消息
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
  addVector?(content: string, metadata?: Record<string, any>): Promise<string>;
  
  /**
   * 批量添加向量
   * @param items 内容列表
   * @returns 向量ID列表
   */
  addVectors?(items: { content: string; metadata?: Record<string, any> }[]): Promise<string[]>;
  
  /**
   * 向量搜索
   * @param query 查询文本
   * @param options 搜索选项
   * @returns 搜索结果
   */
  searchVector?(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  
  /**
   * 删除向量
   * @param id 向量ID
   */
  deleteVector?(id: string): Promise<void>;

  // ============ 键值存储 ============
  
  /**
   * 存储值
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒）
   */
  set?(key: string, value: any, ttl?: number): Promise<void>;
  
  /**
   * 获取值
   * @param key 键
   * @returns 值
   */
  get?(key: string): Promise<any>;
  
  /**
   * 删除值
   * @param key 键
   */
  delete?(key: string): Promise<void>;

  // ============ 管理 ============
  
  /**
   * 压缩历史
   * @param sessionId 会话ID
   */
  compact?(sessionId: string): Promise<void>;
  
  /**
   * 获取统计信息
   */
  getStats?(): Promise<MemoryStats>;
  
  /**
   * 清除所有数据
   */
  clearAll?(): Promise<void>;
}

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
  | 'key-value'        // 键值存储
  | 'persistence'      // 持久化
  | 'compression'      // 压缩
  | 'encryption';      // 加密
```

---

## 4. Trait注册表

### 4.1 Registry实现

```typescript
/**
 * Trait注册表
 * 
 * 管理所有Trait的注册、查找和实例化
 */
export class TraitRegistry {
  private implementations = new Map<TraitType, Map<string, ImplementationFactory>>();
  private instances = new Map<string, any>();
  private config: RegistryConfig;
  
  constructor(config: RegistryConfig) {
    this.config = config;
  }
  
  // ============ 注册 ============
  
  /**
   * 注册实现
   * @param traitType Trait类型
   * @param implId 实现ID
   * @param factory 工厂函数
   */
  register<T>(
    traitType: TraitType,
    implId: string,
    factory: ImplementationFactory<T>
  ): void {
    if (!this.implementations.has(traitType)) {
      this.implementations.set(traitType, new Map());
    }
    
    this.implementations.get(traitType)!.set(implId, factory);
    
    this.config.logger.info(`Registered ${traitType} implementation: ${implId}`);
  }
  
  /**
   * 批量注册
   * @param registrations 注册列表
   */
  registerAll(registrations: TraitRegistration[]): void {
    for (const reg of registrations) {
      this.register(reg.traitType, reg.implId, reg.factory);
    }
  }
  
  /**
   * 取消注册
   * @param traitType Trait类型
   * @param implId 实现ID
   */
  unregister(traitType: TraitType, implId: string): void {
    this.implementations.get(traitType)?.delete(implId);
    this.instances.delete(`${traitType}:${implId}`);
  }

  // ============ 查找 ============
  
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
      return this.instances.get(instanceKey);
    }
    
    // 获取工厂
    const factory = this.implementations.get(traitType)?.get(implId);
    
    if (!factory) {
      throw new ImplementationNotFoundError(traitType, implId);
    }
    
    // 创建实例
    const config = this.config.implementations?.[traitType]?.[implId] || {};
    const instance = await factory(config);
    
    // 缓存实例（如果是单例）
    if (this.config.singleton !== false) {
      this.instances.set(instanceKey, instance);
    }
    
    return instance;
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
   * 获取所有实现ID
   * @param traitType Trait类型
   * @returns 实现ID列表
   */
  getImplementationIds(traitType: TraitType): string[] {
    return Array.from(this.implementations.get(traitType)?.keys() || []);
  }
  
  /**
   * 检查实现是否存在
   * @param traitType Trait类型
   * @param implId 实现ID
   */
  has(traitType: TraitType, implId: string): boolean {
    return this.implementations.get(traitType)?.has(implId) || false;
  }

  // ============ 生命周期 ============
  
  /**
   * 初始化所有实现
   */
  async initializeAll(): Promise<void> {
    const initPromises: Promise<void>[] = [];
    
    for (const [traitType, impls] of this.implementations) {
      for (const [implId] of impls) {
        const instance = await this.get(traitType, implId);
        
        if (instance.initialize) {
          initPromises.push(instance.initialize());
        }
      }
    }
    
    await Promise.all(initPromises);
  }
  
  /**
   * 清理所有实例
   */
  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    
    for (const [key, instance] of this.instances) {
      if (instance.dispose) {
        disposePromises.push(instance.dispose());
      }
    }
    
    await Promise.all(disposePromises);
    this.instances.clear();
  }
}

/**
 * Trait类型
 */
export type TraitType = 
  | 'provider'
  | 'channel'
  | 'tool'
  | 'memory'
  | 'storage'
  | 'event'
  | 'logger';

/**
 * 实现工厂
 */
export type ImplementationFactory<T = any> = (config: any) => Promise<T> | T;

/**
 * 注册表配置
 */
export interface RegistryConfig {
  /** 日志器 */
  logger: Logger;
  
  /** 是否单例模式 */
  singleton?: boolean;
  
  /** 默认实现 */
  defaults?: Partial<Record<TraitType, string>>;
  
  /** 实现配置 */
  implementations?: Partial<Record<TraitType, Record<string, any>>>;
}
```

---

## 5. 依赖注入

### 5.1 DI容器

```typescript
/**
 * 依赖注入容器
 */
export class DIContainer {
  private registry: TraitRegistry;
  private cache = new Map<string, any>();
  
  constructor(registry: TraitRegistry) {
    this.registry = registry;
  }
  
  /**
   * 解析依赖
   * @param token 依赖标识
   * @returns 依赖实例
   */
  async resolve<T>(token: string): Promise<T> {
    // 检查缓存
    if (this.cache.has(token)) {
      return this.cache.get(token);
    }
    
    // 解析token格式: "traitType:implId" 或 "traitType" (使用默认)
    const [traitType, implId] = token.split(':');
    
    const instance = implId
      ? await this.registry.get<T>(traitType as TraitType, implId)
      : await this.registry.getDefault<T>(traitType as TraitType);
    
    this.cache.set(token, instance);
    
    return instance;
  }
  
  /**
   * 注册值
   * @param token 标识
   * @param value 值
   */
  registerValue<T>(token: string, value: T): void {
    this.cache.set(token, value);
  }
  
  /**
   * 创建子容器
   */
  createChild(): DIContainer {
    const child = new DIContainer(this.registry);
    // 继承父容器缓存
    for (const [key, value] of this.cache) {
      child.cache.set(key, value);
    }
    return child;
  }
}
```

### 5.2 装饰器（可选）

```typescript
/**
 * 注入装饰器
 */
export function Inject(token: string) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const injections = Reflect.getMetadata('injections', target) || [];
    injections[parameterIndex] = token;
    Reflect.defineMetadata('injections', injections, target);
  };
}

/**
 * 可注入装饰器
 */
export function Injectable(token?: string) {
  return function <T extends { new (...args: any[]): any }>(constructor: T) {
    const className = constructor.name;
    const traitToken = token || className;
    
    Reflect.defineMetadata('token', traitToken, constructor);
    
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
      }
    };
  };
}
```

---

## 6. 配置驱动

### 6.1 配置格式

```yaml
# secuclaw.config.yaml

registry:
  defaults:
    provider: openai
    channel: telegram
    memory: sqlite
    storage: sqlite
  
  implementations:
    provider:
      openai:
        apiKey: ${OPENAI_API_KEY}
        model: gpt-4
      anthropic:
        apiKey: ${ANTHROPIC_API_KEY}
        model: claude-3-opus
      azure:
        endpoint: https://your-resource.openai.azure.com/
        apiKey: ${AZURE_OPENAI_KEY}
        deployment: gpt-4
    
    channel:
      telegram:
        botToken: ${TELEGRAM_BOT_TOKEN}
      discord:
        botToken: ${DISCORD_BOT_TOKEN}
      slack:
        botToken: ${SLACK_BOT_TOKEN}
        appToken: ${SLACK_APP_TOKEN}
    
    memory:
      sqlite:
        path: ./data/memory.db
      postgres:
        host: localhost
        port: 5432
        database: secuclaw
        user: secuclaw
        password: ${DB_PASSWORD}

# 运行时切换
runtime:
  provider:
    # 根据任务类型选择不同提供商
    routing:
      analysis: claude
      coding: gpt-4
      general: gpt-3.5-turbo
  
  channel:
    # 根据用户偏好选择渠道
    preferences:
      user_123: telegram
      user_456: discord
```

### 6.2 配置加载器

```typescript
/**
 * 配置加载器
 */
export class ConfigLoader {
  /**
   * 加载配置
   * @param path 配置文件路径
   */
  async load(path: string): Promise<RegistryConfig> {
    const content = await fs.readFile(path, 'utf-8');
    const raw = yaml.parse(content);
    
    // 解析环境变量
    const resolved = this.resolveEnvVars(raw);
    
    return {
      logger: new ConsoleLogger(),
      singleton: true,
      defaults: resolved.registry?.defaults,
      implementations: resolved.registry?.implementations,
    };
  }
  
  /**
   * 解析环境变量
   * @param obj 对象
   */
  private resolveEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      // 匹配 ${VAR} 或 ${VAR:-default}
      return obj.replace(/\$\{([^}]+)\}/g, (_, expr) => {
        const [varName, defaultValue] = expr.split(':-');
        return process.env[varName] || defaultValue || '';
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveEnvVars(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveEnvVars(value);
      }
      return result;
    }
    
    return obj;
  }
}
```

---

## 7. 迁移指南

### 7.1 从硬编码迁移

**Before (硬编码):**
```typescript
import { OpenAIProvider } from './providers/openai';

class Agent {
  private provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
  
  async chat(message: string) {
    return this.provider.chat([{ role: 'user', content: message }]);
  }
}
```

**After (Trait驱动):**
```typescript
class Agent {
  constructor(private container: DIContainer) {}
  
  async chat(message: string) {
    const provider = await this.container.resolve<ProviderTrait>('provider');
    return provider.chat([{ role: 'user', content: message }]);
  }
}
```

### 7.2 运行时切换

```typescript
// 切换提供商
container.registerValue('provider:openai', openaiProvider);
container.registerValue('provider:anthropic', anthropicProvider);

// 根据配置动态选择
const providerId = config.routing[taskType]; // 'openai' 或 'anthropic'
const provider = await container.resolve<ProviderTrait>(`provider:${providerId}`);
```

---

## 8. 测试策略

### 8.1 Mock Trait

```typescript
/**
 * Mock Provider
 */
export class MockProvider implements ProviderTrait {
  readonly id = 'mock';
  readonly name = 'Mock Provider';
  readonly type = 'openai-compatible' as const;
  readonly models = ['mock-model'];
  readonly capabilities = ['chat', 'streaming'] as const;
  
  private responses: string[] = [];
  private callCount = 0;
  
  setResponses(responses: string[]): void {
    this.responses = responses;
  }
  
  async chat(messages: ProviderMessage[], options?: ChatOptions): Promise<ChatResult> {
    const content = this.responses[this.callCount % this.responses.length] || 'Mock response';
    this.callCount++;
    
    return {
      id: `mock-${Date.now()}`,
      content,
      model: options?.model || 'mock-model',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
    };
  }
  
  async *chatStream(messages: ProviderMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk> {
    const content = this.responses[this.callCount % this.responses.length] || 'Mock response';
    this.callCount++;
    
    for (const char of content) {
      yield { delta: { content: char }, finishReason: null };
    }
    
    yield { delta: {}, finishReason: 'stop' };
  }
}

// 测试中使用
describe('Agent', () => {
  it('should use provider', async () => {
    const registry = new TraitRegistry({ logger: new MockLogger() });
    const mockProvider = new MockProvider();
    
    registry.register('provider', 'mock', () => mockProvider);
    
    const container = new DIContainer(registry);
    const agent = new Agent(container);
    
    mockProvider.setResponses(['Hello!']);
    
    const result = await agent.chat('Hi');
    expect(result).toBe('Hello!');
  });
});
```

---

## 9. 性能考虑

### 9.1 实例缓存

- 默认使用单例模式
- 缓存键: `${traitType}:${implId}`
- 可配置为每次创建新实例

### 9.2 懒加载

- 实现只在首次请求时实例化
- 配置预加载关键实现

```typescript
// 预加载配置
registryConfig.preload = ['provider:openai', 'channel:telegram'];
```

---

## 10. 附录

### 10.1 完整示例

```typescript
// main.ts
import { TraitRegistry, DIContainer, ConfigLoader } from './core';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { TelegramChannel } from './channels/telegram';
import { SQLiteMemory } from './memory/sqlite';

async function main() {
  // 加载配置
  const configLoader = new ConfigLoader();
  const config = await configLoader.load('./secuclaw.config.yaml');
  
  // 创建注册表
  const registry = new TraitRegistry(config);
  
  // 注册实现
  registry.register('provider', 'openai', (cfg) => new OpenAIProvider(cfg));
  registry.register('provider', 'anthropic', (cfg) => new AnthropicProvider(cfg));
  registry.register('channel', 'telegram', (cfg) => new TelegramChannel(cfg));
  registry.register('memory', 'sqlite', (cfg) => new SQLiteMemory(cfg));
  
  // 初始化
  await registry.initializeAll();
  
  // 创建DI容器
  const container = new DIContainer(registry);
  
  // 使用
  const provider = await container.resolve<ProviderTrait>('provider');
  const channel = await container.resolve<ChannelTrait>('channel');
  
  // 运行应用
  const agent = new Agent(container);
  await agent.start();
}

main().catch(console.error);
```

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| 1.0 | 2026-03-03 | Architecture Team | 初始版本 |

