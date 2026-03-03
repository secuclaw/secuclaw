---
summary: "Feishu bot overview, features, and configuration"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Feishu bot

Feishu (Lark) is a team chat platform used by companies for messaging and collaboration. This channel connects SecuClaw to a Feishu/Lark bot using the platform's WebSocket event subscription so messages can be received without exposing a public webhook URL.

---

## Quickstart

There are two ways to add the Feishu channel:

### Method 1: onboarding wizard (recommended)

If you just installed SecuClaw, run the wizard:

```bash
secuclaw onboard
```

The wizard guides you through:

1. Creating a Feishu app and collecting credentials
2. Configuring app credentials in SecuClaw
3. Starting the gateway

### Method 2: CLI setup

If you already completed initial install, add the channel via CLI:

```bash
secuclaw channels add
```

Choose **Feishu**, then enter the App ID and App Secret.

---

## Step 1: Create a Feishu app

### 1. Open Feishu Open Platform

Visit [Feishu Open Platform](https://open.feishu.cn/app) and sign in.

Lark (global) tenants should use [https://open.larksuite.com/app](https://open.larksuite.com/app) and set `domain: "lark"` in the Feishu config.

### 2. Create an app

1. Click **Create enterprise app**
2. Fill in the app name + description
3. Choose an app icon

### 3. Copy credentials

From **Credentials & Basic Info**, copy:

- **App ID** (format: `cli_xxx`)
- **App Secret**

### 4. Configure permissions

On **Permissions**, click **Batch import** and paste:

```json
{
  "scopes": {
    "tenant": [
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ]
  }
}
```

### 5. Enable bot capability

In **App Capability** > **Bot**:

1. Enable bot capability
2. Set the bot name

### 6. Configure event subscription

In **Event Subscription**:

1. Choose **Use long connection to receive events** (WebSocket)
2. Add the event: `im.message.receive_v1`

### 7. Publish the app

1. Create a version in **Version Management & Release**
2. Submit for review and publish
3. Wait for admin approval (enterprise apps usually auto-approve)

---

## Step 2: Configure SecuClaw

### Configure with the wizard (recommended)

```bash
secuclaw channels add
```

Choose **Feishu** and paste your App ID + App Secret.

### Configure via config file

Edit `~/.secuclaw/config.json`:

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "My AI assistant",
        },
      },
    },
  },
}
```

### Configure via environment variables

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark (global) domain

If your tenant is on Lark (international), set the domain to `lark`:

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

---

## Step 3: Start + test

### 1. Start the gateway

```bash
secuclaw gateway
```

### 2. Send a test message

In Feishu, find your bot and send a message.

### 3. Approve pairing

By default, the bot replies with a pairing code. Approve it:

```bash
secuclaw pairing approve feishu <CODE>
```

After approval, you can chat normally.

---

## Overview

- **Feishu bot channel**: Feishu bot managed by the gateway
- **Deterministic routing**: replies always return to Feishu
- **Session isolation**: DMs share a main session; groups are isolated
- **WebSocket connection**: long connection via Feishu SDK, no public URL needed

---

## Access control

### Direct messages

- **Default**: `dmPolicy: "pairing"` (unknown users get a pairing code)
- **Approve pairing**:

  ```bash
  secuclaw pairing list feishu
  secuclaw pairing approve feishu <CODE>
  ```

- **Allowlist mode**: set `channels.feishu.allowFrom` with allowed Open IDs

### Group chats

**1. Group policy** (`channels.feishu.groupPolicy`):

- `"open"` = allow everyone in groups (default)
- `"allowlist"` = only allow `groupAllowFrom`
- `"disabled"` = disable group messages

**2. Mention requirement** (`channels.feishu.groups.<chat_id>.requireMention`):

- `true` = require @mention (default)
- `false` = respond without mentions

---

## Group configuration examples

### Allow all groups, require @mention (default)

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      // Default requireMention: true
    },
  },
}
```

### Allow all groups, no @mention required

```json5
{
  channels: {
    feishu: {
      groups: {
        oc_xxx: { requireMention: false },
      },
    },
  },
}
```

### Allow specific users in groups only

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["ou_xxx", "ou_yyy"],
    },
  },
}
```

---

## Get group/user IDs

### Group IDs (chat_id)

Group IDs look like `oc_xxx`.

**Method 1 (recommended)**

1. Start the gateway and @mention the bot in the group
2. Run `secuclaw logs --follow` and look for `chat_id`

### User IDs (open_id)

User IDs look like `ou_xxx`.

**Method 1 (recommended)**

1. Start the gateway and DM the bot
2. Run `secuclaw logs --follow` and look for `open_id`

---

## Common commands

| Command   | Description       |
| --------- | ----------------- |
| `/status` | Show bot status   |
| `/reset`  | Reset the session |
| `/model`  | Show/switch model |

> Note: Feishu does not support native command menus yet, so commands must be sent as text.

## Gateway management commands

| Command                    | Description                   |
| -------------------------- | ----------------------------- |
| `secuclaw gateway status`  | Show gateway status           |
| `secuclaw gateway restart` | Restart gateway service       |
| `secuclaw logs --follow`   | Tail gateway logs             |

---

## Troubleshooting

### Bot does not respond in group chats

1. Ensure the bot is added to the group
2. Ensure you @mention the bot (default behavior)
3. Check `groupPolicy` is not set to `"disabled"`
4. Check logs: `secuclaw logs --follow`

### Bot does not receive messages

1. Ensure the app is published and approved
2. Ensure event subscription includes `im.message.receive_v1`
3. Ensure **long connection** is enabled
4. Ensure app permissions are complete
5. Ensure the gateway is running: `secuclaw gateway status`
6. Check logs: `secuclaw logs --follow`

### App Secret leak

1. Reset the App Secret in Feishu Open Platform
2. Update the App Secret in your config
3. Restart the gateway

### Message send failures

1. Ensure the app has `im:message:send_as_bot` permission
2. Ensure the app is published
3. Check logs for detailed errors

---

## Advanced configuration

### Multiple accounts

```json5
{
  channels: {
    feishu: {
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "Primary bot",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          botName: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

### Message limits

- `textChunkLimit`: outbound text chunk size (default: 2000 chars)
- `mediaMaxMb`: media upload/download limit (default: 30MB)

### Streaming

Feishu supports streaming replies via interactive cards:

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default true)
      blockStreaming: true, // enable block-level streaming (default true)
    },
  },
}
```

---

## Configuration reference

Key options:

| Setting                                           | Description                     | Default          |
| ------------------------------------------------- | ------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Enable/disable channel          | `true`           |
| `channels.feishu.domain`                          | API domain (`feishu` or `lark`) | `feishu`         |
| `channels.feishu.connectionMode`                  | Event transport mode            | `websocket`      |
| `channels.feishu.accounts.<id>.appId`             | App ID                          | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                      | -                |
| `channels.feishu.dmPolicy`                        | DM policy                       | `pairing`        |
| `channels.feishu.allowFrom`                       | DM allowlist (open_id list)     | -                |
| `channels.feishu.groupPolicy`                     | Group policy                    | `open`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Require @mention                | `true`           |
| `channels.feishu.textChunkLimit`                  | Message chunk size              | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Media size limit                | `30`             |
| `channels.feishu.streaming`                       | Enable streaming card output    | `true`           |

---

## dmPolicy reference

| Value         | Behavior                                                        |
| ------------- | --------------------------------------------------------------- |
| `"pairing"`   | **Default.** Unknown users get a pairing code; must be approved |
| `"allowlist"` | Only users in `allowFrom` can chat                              |
| `"open"`      | Allow all users (requires `"*"` in allowFrom)                   |
| `"disabled"`  | Disable DMs                                                     |

---

## Supported message types

### Receive

- ✅ Text
- ✅ Rich text (post)
- ✅ Images
- ✅ Files
- ✅ Audio
- ✅ Video
- ✅ Stickers

### Send

- ✅ Text
- ✅ Images
- ✅ Files
- ✅ Audio
- ⚠️ Rich text (partial support)

## Related

- [Channel communication](/channels/communication)
- [Gateway configuration](/gateway/configuration)
- [Troubleshooting](/help/troubleshooting)
