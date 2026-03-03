import { BaseChannel } from "./base.js";
import type { ChannelConfig, ChannelMessage, ChannelResponse, ChannelContext, ChannelAttachment } from "./types.js";

export interface FeishuConfig extends ChannelConfig {
  type: "feishu";
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  domain?: "feishu" | "lark";
  connectionMode?: "websocket" | "webhook";
}

interface FeishuMessageEvent {
  sender: {
    sender_id: {
      open_id?: string;
      user_id?: string;
      union_id?: string;
    };
  };
  message: {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    chat_id: string;
    chat_type: "p2p" | "group" | "topic";
    message_type: string;
    content: string;
    create_time: string;
    mentions?: Array<{
      key: string;
      id: {
        open_id?: string;
        user_id?: string;
      };
      name: string;
    }>;
  };
}

interface FeishuTextContent {
  text: string;
}

interface FeishuPostContent {
  zh_cn?: {
    title: string;
    content: Array<Array<{
      tag: string;
      text?: string;
      href?: string;
    }>>;
  };
}

interface FeishuApiResponse {
  data?: {
    message_id?: string;
    items?: Array<{ chat_id?: string; create_time?: string }>;
  };
}

interface FeishuAccessToken {
  tenant_access_token: string;
  expire: number;
}

export class FeishuChannel extends BaseChannel {
  type = "feishu" as const;
  private appId: string;
  private appSecret: string;
  private domain: string;
  private accessToken: string | null = null;
  private tokenExpire: number = 0;
  private pollingInterval?: ReturnType<typeof setInterval>;

  constructor(config: FeishuConfig) {
    super(config);
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.domain = config.domain === "lark" 
      ? "https://open.larksuite.com" 
      : "https://open.feishu.cn";
  }

  async connect(): Promise<void> {
    if (!this.appId || !this.appSecret) {
      throw new Error("Feishu appId and appSecret are required");
    }

    // 获取access token
    await this.refreshAccessToken();

    // 验证应用信息
    try {
      await this.apiRequest("GET", "/auth/v3/app/app/res/list");
    } catch {
      throw new Error("Feishu connection failed: invalid credentials");
    }

    this.startPolling();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    this.connected = false;
  }

  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    const receiveId = (context.metadata?.chatId ?? context.metadata?.openId) as string;
    if (!receiveId) {
      throw new Error("No receive ID specified");
    }

    const receiveIdType = context.metadata?.chatId ? "chat_id" : "open_id";

    // 发送文本消息
    const body: Record<string, unknown> = {
      receive_id: receiveId,
      receive_id_type: receiveIdType,
      msg_type: "text",
      content: JSON.stringify({ text: message.content }),
    };

    const response = await this.apiRequest(
      "POST",
      "/im/v1/messages",
      body,
      true
    );

    if (!((response as FeishuApiResponse).data?.message_id)) {
      this.recordError();
      throw new Error("Feishu send failed");
    }

    this.recordSend();

    // 发送附件
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        await this.sendAttachment(attachment, receiveId, receiveIdType);
      }
    }
  }

  private async sendAttachment(
    attachment: ChannelAttachment,
    receiveId: string,
    receiveIdType: string,
  ): Promise<void> {
    let msgType: string;
    let content: Record<string, unknown>;

    if (attachment.type === "image" && attachment.url) {
      msgType = "image";
      content = { image_key: attachment.url };
    } else if (attachment.type === "file" && attachment.url) {
      msgType = "file";
      content = { file_key: attachment.url };
    } else {
      return;
    }

    await this.apiRequest(
      "POST",
      "/im/v1/messages",
      {
        receive_id: receiveId,
        receive_id_type: receiveIdType,
        msg_type: msgType,
        content: JSON.stringify(content),
      },
      true
    );
  }

  private startPolling(): void {
    // 注意: 生产环境应该使用WebSocket或Webhook
    // 这里使用简单的轮询作为示例
    let lastMessageTime = Date.now();

    this.pollingInterval = setInterval(async () => {
      try {
        // 获取私聊消息列表
        const response = await this.apiRequest(
          "GET",
          `/im/v1/chats?chat_type=p2p&page_size=50`,
          undefined,
          true
        );

        if (((response as FeishuApiResponse).data)?.items) {
          for (const chat of ((response as FeishuApiResponse).data)?.items || []) {
            const messages = await this.apiRequest(
              "GET",
              `/im/v1/chats/${chat.chat_id}/messages?page_size=20`,
              undefined,
              true
            );

            if (((messages as FeishuApiResponse).data)?.items) {
              for (const msg of ((messages as FeishuApiResponse).data)?.items || []) {
                const msgTime = parseInt(msg.create_time ?? '0', 10);
                if (msgTime > lastMessageTime) {
                  lastMessageTime = msgTime;
                  this.processMessage(msg as unknown as FeishuMessageEvent);
                }
              }
            }
          }
        }
      } catch {
        this.recordError();
      }
    }, 5000);
  }

  private processMessage(msg: FeishuMessageEvent): void {
    let content = "";
    
    try {
      if (msg.message.message_type === "text") {
        const textContent = JSON.parse(msg.message.content) as FeishuTextContent;
        content = textContent.text;
      } else if (msg.message.message_type === "post") {
        const postContent = JSON.parse(msg.message.content) as FeishuPostContent;
        content = postContent.zh_cn?.title || "";
      } else {
        content = `[${msg.message.message_type}]`;
      }
    } catch {
      content = msg.message.content;
    }

    this.emitMessage({
      id: msg.message.message_id,
      channelId: msg.message.chat_id,
      channelType: "feishu",
      userId: msg.sender.sender_id.open_id || msg.sender.sender_id.user_id || "unknown",
      content,
      timestamp: parseInt(msg.message.create_time, 10),
      metadata: {
        chatId: msg.message.chat_id,
        chatType: msg.message.chat_type,
        openId: msg.sender.sender_id.open_id,
        rootId: msg.message.root_id,
      },
    });
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch(`${this.domain}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });

    const data = await response.json() as FeishuAccessToken;
    
    if (!data.tenant_access_token) {
      throw new Error("Failed to get Feishu access token");
    }

    this.accessToken = data.tenant_access_token;
    this.tokenExpire = Date.now() + (data.expire - 60) * 1000; // 提前60秒过期
  }

  private async apiRequest(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    withToken = false,
  ): Promise<Record<string, unknown>> {
    // 检查token是否过期
    if (withToken && Date.now() >= this.tokenExpire) {
      await this.refreshAccessToken();
    }

    const url = `${this.domain}/open-apis${path}`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (withToken && this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    let requestUrl = url;
    if (method === "GET" && body) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      }
      requestUrl = `${url}?${params.toString()}`;
    }

    const response = await fetch(requestUrl, {
      method,
      headers,
      body: method === "POST" && body ? JSON.stringify(body) : undefined,
    });

    return response.json() as Promise<Record<string, unknown>>;
  }
}

export function createFeishuChannel(config: FeishuConfig): FeishuChannel {
  return new FeishuChannel(config);
}
