/**
 * Channel Trait - 消息渠道接口
 * 
 * 所有消息渠道必须实现此接口
 * @version 2.0.0
 */

import type { ChannelContext, ChannelMessage, ChannelResponse } from "../channels/types.js";

// ============ 类型定义 ============

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
 * 渠道事件类型
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

/**
 * 消息处理器
 */
export type MessageHandler = (message: ChannelMessage) => Promise<void> | void;

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (data: T) => Promise<void> | void;

/**
 * 错误处理器
 */
export type ErrorHandler = (error: ChannelError) => void;

/**
 * 渠道错误
 */
export interface ChannelError {
  code: string;
  message: string;
  cause?: unknown;
  recoverable?: boolean;
}

/**
 * 发送选项
 */
export interface SendOptions {
  /** 是否解析Markdown */
  parseMarkdown?: boolean;
  /** 是否静默发送（不通知） */
  silent?: boolean;
  /** 回复的消息ID */
  replyTo?: string;
  /** 线程ID */
  threadId?: string;
}

/**
 * 文件内容
 */
export interface FileContent {
  /** 文件名 */
  filename: string;
  /** MIME类型 */
  mimeType: string;
  /** 文件数据 */
  data: Buffer | ArrayBuffer | ReadableStream;
  /** 文件大小（字节） */
  size?: number;
}

/**
 * 文件发送选项
 */
export interface FileSendOptions extends SendOptions {
  /** 标题 */
  caption?: string;
  /** 是否作为文档发送 */
  asDocument?: boolean;
}

/**
 * 聊天/群组信息
 */
export interface Chat {
  id: string;
  type: 'private' | 'group' | 'channel' | 'supergroup';
  title?: string;
  username?: string;
  description?: string;
  memberCount?: number;
  createdAt?: Date;
}

/**
 * 聊天成员
 */
export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt?: Date;
  nickname?: string;
}

/**
 * 用户信息
 */
export interface User {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  isBot?: boolean;
}

/**
 * 渠道配置
 */
export interface ChannelConfig {
  /** 机器人令牌 */
  botToken?: string;
  /** 应用令牌 */
  appToken?: string;
  /** Webhook URL */
  webhookUrl?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 额外配置 */
  extra?: Record<string, unknown>;
}

/**
 * 消息结果
 */
export interface MessageResult {
  /** 消息ID */
  messageId: string;
  /** 聊天ID */
  chatId: string;
  /** 发送时间 */
  timestamp: Date;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

// ============ Trait 接口 ============

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
  
  /** 配置 */
  readonly config?: ChannelConfig;

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
   * @param context 上下文
   * @param options 发送选项
   * @returns 消息ID
   */
  send(
    message: ChannelResponse | string,
    context?: ChannelContext,
    options?: SendOptions
  ): Promise<MessageResult | void>;
  
  /**
   * 编辑消息
   * @param chatId 聊天ID
   * @param messageId 消息ID
   * @param content 新内容
   */
  edit?(chatId: string, messageId: string, content: string): Promise<void>;
  
  /**
   * 删除消息
   * @param chatId 聊天ID
   * @param messageId 消息ID
   */
  delete?(chatId: string, messageId: string): Promise<void>;
  
  /**
   * 回复消息
   * @param messageId 原消息ID
   * @param content 回复内容
   */
  reply?(chatId: string, messageId: string, content: string): Promise<MessageResult>;
  
  /**
   * 标记已读
   * @param chatId 聊天ID
   * @param messageId 消息ID
   */
  markAsRead?(chatId: string, messageId: string): Promise<void>;
  
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
  ): Promise<MessageResult>;
  
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
  on<T = unknown>(event: ChannelEvent, handler: EventHandler<T>): void;
  
  /**
   * 移除事件处理器
   * @param event 事件类型
   * @param handler 事件处理函数
   */
  off<T = unknown>(event: ChannelEvent, handler: EventHandler<T>): void;
  
  /**
   * 注册错误处理器
   * @param handler 错误处理函数
   */
  onError(handler: ErrorHandler): void;

  // ============ 群组管理 ============
  
  /**
   * 获取聊天列表
   */
  getChats?(): Promise<Chat[]>;
  
  /**
   * 获取聊天信息
   * @param chatId 聊天ID
   */
  getChatInfo?(chatId: string): Promise<Chat>;
  
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
  
  /**
   * 获取成员信息
   * @param chatId 聊天ID
   * @param userId 用户ID
   */
  getMemberInfo?(chatId: string, userId: string): Promise<ChatMember>;

  // ============ 生命周期 ============
  
  /**
   * 初始化渠道
   * @param config 配置
   */
  initialize?(config?: ChannelConfig): Promise<void>;
  
  /**
   * 关闭渠道
   */
  dispose?(): Promise<void>;
}

// ============ 工厂接口 ============

/**
 * 渠道工厂
 */
export interface IChannelFactory {
  /**
   * 创建渠道实例
   * @param config 配置
   */
  create(config: ChannelConfig): ChannelTrait;
  
  /**
   * 验证配置
   * @param config 配置
   */
  validate(config: ChannelConfig): boolean;
  
  /**
   * 获取默认配置
   */
  getDefaultConfig?(): Partial<ChannelConfig>;
}

// ============ 兼容性导出 ============

// 保持与现有代码的兼容性
export type { IMessageChannel, IChannelCapabilities } from "../channels/trait.js";
