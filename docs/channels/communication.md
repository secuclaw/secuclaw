---
summary: "Configure communication channels for SecuClaw agent interactions."
read_when:
  - Setting up Telegram bot integration
  - Configuring Discord bot
  - Integrating Feishu/Lark
title: "Communication Channels"
---

# Communication Channels

SecuClaw supports multiple communication channels for interacting with security agents.

## Supported Channels

<Columns>
  <Card title="Telegram" href="#telegram" icon="message">
    Bot-based messaging platform.
  </Card>
  <Card title="Discord" href="#discord" icon="users">
    Server-based community platform.
  </Card>
  <Card title="Feishu/Lark" href="#feishu" icon="send">
    Enterprise collaboration platform.
  </Card>
  <Card title="Web" href="#web" icon="globe">
    Built-in web interface.
  </Card>
</Columns>

## Configuration

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

Requirements:
1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get the bot token
3. Set `TELEGRAM_BOT_TOKEN` environment variable

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

Requirements:
1. Create a bot in [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable Message Content Intent
3. Get the bot token
4. Set `DISCORD_BOT_TOKEN` environment variable

### Feishu/Lark

```json5
{
  channels: [
    {
      type: "feishu",
      enabled: true,
      appId: "${FEISHU_APP_ID}",
      appSecret: "${FEISHU_APP_SECRET}",
      domain: "feishu", // or "lark" for international version
    },
  ],
}
```

Requirements:
1. Create an app in [Feishu Open Platform](https://open.feishu.cn/) or [Lark Developer](https://open.larksuite.com/)
2. Enable bot capabilities
3. Get App ID and App Secret
4. Set environment variables

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

The web channel provides a built-in web interface for agent interactions.

## Channel Manager

The `ChannelManager` handles all channel operations:

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

// Register message handler
manager.onMessage((message) => {
  console.log('Received:', message.content);
});

// Get channel statistics
const stats = manager.getStats();
```

## Message Format

All channels use a unified message format:

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

## Related

- [Gateway Configuration](/gateway/configuration)

