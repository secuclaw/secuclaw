---
summary: "配置SecuClaw代理交互的通信渠道。"
read_when:
  - 设置Telegram机器人集成
  - 配置Discord机器人
  - 集成飞书/Lark
title: "通信渠道"
---

# 通信渠道

SecuClaw支持多种通信渠道与安全代理进行交互。

## 支持的渠道

- **Telegram**: 基于机器人的消息平台
- **Discord**: 基于服务器的社区平台
- **飞书/Lark**: 企业协作平台
- **Web**: 内置网页界面

## 配置

### Telegram

```json5
{
  channels: [
    {
      type: "telegram",
      enabled: true,
      token: "${TELEGRAM_BOT_TOKEN}",
    },
  ],
}
```

要求:
1. 通过 [@BotFather](https://t.me/botfather) 创建机器人
2. 获取机器人令牌
3. 设置 `TELEGRAM_BOT_TOKEN` 环境变量

### Discord

```json5
{
  channels: [
    {
      type: "discord",
      enabled: true,
      token: "${DISCORD_BOT_TOKEN}",
      guildId: "${DISCORD_GUILD_ID}",
    },
  ],
}
```

要求:
1. 在 [Discord开发者门户](https://discord.com/developers/applications) 创建机器人
2. 启用消息内容意图
3. 获取机器人令牌
4. 设置 `DISCORD_BOT_TOKEN` 环境变量

### 飞书/Lark

```json5
{
  channels: [
    {
      type: "feishu",
      enabled: true,
      appId: "${FEISHU_APP_ID}",
      appSecret: "${FEISHU_APP_SECRET}",
      domain: "feishu", // 或 "lark" 用于国际版
    },
  ],
}
```

要求:
1. 在 [飞书开放平台](https://open.feishu.cn/) 或 [Lark开发者](https://open.larksuite.com/) 创建应用
2. 启用机器人能力
3. 获取 App ID 和 App Secret
4. 设置环境变量

### Web

```json5
{
  channels: [
    {
      type: "web",
      enabled: true,
    },
  ],
}
```

Web渠道提供内置的网页界面用于代理交互。

## 渠道管理器

`ChannelManager` 处理所有渠道操作:

```typescript
import { createChannelManager } from '@secuclaw/core';

const manager = createChannelManager({
  channels: [
    { type: 'web', enabled: true },
    { type: 'telegram', enabled: true, token: 'bot-token' },
    { type: 'discord', enabled: true, token: 'bot-token' },
    { type: 'feishu', enabled: true, appId: 'app-id', appSecret: 'secret' },
  ],
  defaultChannel: 'web',
});

// 注册消息处理器
manager.onMessage((message) => {
  console.log('收到:', message.content);
});

// 获取渠道统计
const stats = manager.getStats();
```

## 消息格式

所有渠道使用统一的消息格式:

```typescript
interface ChannelMessage {
  id: string;
  channelId: string;
  channelType: 'telegram' | 'discord' | 'slack' | 'web' | 'cli' | 'feishu';
  userId: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  replyTo?: string;
  attachments?: ChannelAttachment[];
}
```

## 相关

- [网关配置](/gateway/configuration)

