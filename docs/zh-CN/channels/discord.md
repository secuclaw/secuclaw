---
summary: "Discord 机器人支持状态、功能和配置"
read_when:
  - 使用 Discord 通道功能
title: "Discord"
---

# Discord (Bot API)

状态：通过官方 Discord 网关支持 DM 和公会频道。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Discord DM 默认为配对模式。
  </Card>
  <Card title="通道故障排除" icon="wrench" href="/help/troubleshooting">
    跨通道诊断和修复流程。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    核心网关设置、令牌和提供商配置。
  </Card>
</CardGroup>

## 快速设置

您需要创建一个带有机器人的新应用程序，将机器人添加到您的服务器，并将其配对到 SecuClaw。

<Steps>
  <Step title="创建 Discord 应用程序和机器人">
    转到 [Discord 开发者门户](https://discord.com/developers/applications) 并点击 **New Application**。将其命名为 "SecuClaw" 之类的名称。

    点击侧边栏中的 **Bot**。将 **Username** 设置为您调用 SecuClaw 代理的任何名称。

  </Step>

  <Step title="启用特权意图">
    仍在 **Bot** 页面上，向下滚动到 **Privileged Gateway Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色允许列表需要）
    - **Presence Intent**（可选；仅存在更新需要）

  </Step>

  <Step title="复制您的机器人令牌">
    向上滚动到 **Bot** 页面并点击 **Reset Token**。

    复制令牌并保存。这是您的 **Bot Token**，稍后您会需要它。

  </Step>

  <Step title="生成邀请 URL 并将机器人添加到您的服务器">
    点击侧边栏中的 **OAuth2**。您将生成具有正确权限的邀请 URL。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方会出现 **Bot Permissions** 部分。启用：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions（可选）

    复制生成的 URL，粘贴到浏览器中，选择您的服务器，然后点击 **Continue**。

  </Step>

  <Step title="启用开发者模式并收集您的 ID">
    回到 Discord 应用程序：

    1. 点击 **User Settings** → **Advanced** → 开启 **Developer Mode**
    2. 右键点击您的 **服务器图标** → **Copy Server ID**
    3. 右键点击您 **自己的头像** → **Copy User ID**

    将您的 **Server ID** 和 **User ID** 与 Bot Token 一起保存。

  </Step>

  <Step title="安全设置您的机器人令牌">

```bash
secuclaw config set channels.discord.token '"YOUR_BOT_TOKEN"' --json
secuclaw config set channels.discord.enabled true --json
secuclaw gateway
```

  </Step>

  <Step title="批准首次 DM 配对">
    在 Discord 中 DM 您的机器人。它将回复一个配对码。

```bash
secuclaw pairing list discord
secuclaw pairing approve discord <CODE>
```

    配对码 1 小时后过期。

  </Step>
</Steps>

## 运行时模型

- 网关拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站回复到 Discord。
- 默认情况下，直接聊天共享代理主会话。
- 公会频道是隔离的会话密钥。
- 群组 DM 默认被忽略。

## 访问控制和路由

<Tabs>
  <Tab title="DM 策略">
    `channels.discord.dmPolicy` 控制 DM 访问：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    DM 传递目标格式：

    - `user:<id>`
    - `<@id>` 提及

  </Tab>

  <Tab title="公会策略">
    公会处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    `allowlist` 行为：

    - 公会必须匹配 `channels.discord.guilds`
    - 可选发送者允许列表：`users`（ID 或名称）和 `roles`（仅角色 ID）
    - 如果公会配置了 `channels`，未列出的频道将被拒绝

    示例：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

  </Tab>

  <Tab title="提及和群组 DM">
    公会消息默认需要提及。

    提及检测包括：

    - 显式机器人提及
    - 配置的提及模式
    - 支持情况下的隐式回复机器人行为

    `requireMention` 按公会/频道配置。

    群组 DM：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 可选通过 `dm.groupChannels` 允许列表

  </Tab>
</Tabs>

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持代理输出中的回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`

  </Accordion>

  <Accordion title="历史、上下文和线程行为">
    公会历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - `0` 禁用

    线程行为：

    - Discord 线程作为频道会话路由
    - 线程配置继承父频道配置，除非存在特定于线程的条目

  </Accordion>

  <Accordion title="反应通知">
    每个公会的反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 在 SecuClaw 处理入站消息时发送确认表情符号。

    解析顺序：

    - `channels.discord.ackReaction`
    - 代理身份表情符号回退（默认："👀"）

  </Accordion>

  <Accordion title="网关代理">
    通过 HTTP(S) 代理路由 Discord 网关 WebSocket 流量：

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

  </Accordion>

  <Accordion title="状态配置">
    仅状态示例：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活动示例：

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    活动类型映射：

    - 0: Playing
    - 1: Streaming（需要 `activityUrl`）
    - 2: Listening
    - 3: Watching
    - 4: Custom
    - 5: Competing

  </Accordion>
</AccordionGroup>

## 工具和操作门

Discord 消息操作包括消息传递、频道管理、审核、状态和元数据操作。

核心示例：

- 消息传递：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反应：`react`、`reactions`、`emojiList`
- 审核：`timeout`、`kick`、`ban`
- 状态：`setPresence`

操作门位于 `channels.discord.actions.*`。

默认门行为：

| 操作组 | 默认 |
| --- | --- |
| reactions、messages、threads、pins、polls、search、memberInfo | enabled |
| roles | disabled |
| moderation | disabled |
| presence | disabled |

## 语音消息

Discord 语音消息显示波形预览，需要 OGG/Opus 音频加上元数据。SecuClaw 自动生成波形，但需要网关主机上可用 `ffmpeg` 和 `ffprobe`。

要求：

- 提供**本地文件路径**（URL 被拒绝）。
- 省略文本内容（Discord 不允许同一载荷中有文本 + 语音消息）。

## 故障排除

<AccordionGroup>
  <Accordion title="使用了不允许的意图或机器人看不到公会消息">

    - 启用 Message Content Intent
    - 依赖用户/成员解析时启用 Server Members Intent
    - 更改意图后重启网关

  </Accordion>

  <Accordion title="公会消息意外被阻止">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的公会允许列表
    - 如果公会 `channels` 映射存在，只允许列出的频道
    - 验证 `requireMention` 行为

```bash
secuclaw doctor
secuclaw channels status --probe
secuclaw logs --follow
```

  </Accordion>

  <Accordion title="requireMention false 但仍然被阻止">
    常见原因：

    - `groupPolicy="allowlist"` 没有匹配的公会/频道允许列表
    - `requireMention` 配置在错误的位置
    - 发送者被公会/频道 `users` 允许列表阻止

  </Accordion>

  <Accordion title="DM 和配对问题">

    - DM 禁用：`channels.discord.dm.enabled=false`
    - DM 策略禁用：`channels.discord.dmPolicy="disabled"`
    - `pairing` 模式下等待配对批准

  </Accordion>
</AccordionGroup>

## 配置参考指针

高信号 Discord 字段：

- 启动/认证：`enabled`、`token`、`accounts.*`、`allowBots`
- 策略：`groupPolicy`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 回复/历史：`replyToMode`、`historyLimit`、`dmHistoryLimit`
- 传递：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 媒体/重试：`mediaMaxMb`、`retry`
- 操作：`actions.*`
- 状态：`activity`、`status`、`activityType`、`activityUrl`

## 安全和操作

- 将机器人令牌视为机密（在受监管环境中首选 `DISCORD_BOT_TOKEN`）。
- 授予最低权限的 Discord 权限。
- 如果命令部署/状态陈旧，重启网关并使用 `secuclaw channels status --probe` 重新检查。

## 相关

- [通道通信](/channels/communication)
- [网关配置](/gateway/configuration)
- [故障排除](/help/troubleshooting)
