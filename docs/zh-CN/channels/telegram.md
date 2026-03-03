---
summary: "Telegram 机器人支持状态、功能和配置"
read_when:
  - 使用 Telegram 功能或 Webhook
title: "Telegram"
---

# Telegram (Bot API)

状态：生产就绪，支持机器人群聊和群组。长轮询是默认模式；Webhook 模式可选。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Telegram 默认 DM 策略为配对模式。
  </Card>
  <Card title="通道故障排除" icon="wrench" href="/help/troubleshooting">
    跨通道诊断和修复指南。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整的通道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="在 BotFather 创建机器人令牌">
    打开 Telegram 并与 **@BotFather** 对话（确认句柄准确为 `@BotFather`）。

    运行 `/newbot`，按提示操作，保存令牌。

  </Step>

  <Step title="配置令牌和 DM 策略">

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`（仅默认账户）。

  </Step>

  <Step title="启动网关并批准首次 DM">

```bash
secuclaw gateway
secuclaw pairing list telegram
secuclaw pairing approve telegram <CODE>
```

    配对码 1 小时后过期。

  </Step>

  <Step title="将机器人添加到群组">
    将机器人添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

## 访问控制和激活

<Tabs>
  <Tab title="DM 策略">
    `channels.telegram.dmPolicy` 控制直接消息访问：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。`telegram:` / `tg:` 前缀会被接受并规范化。

    ### 查找您的 Telegram 用户 ID

    安全方法（无需第三方机器人）：

    1. DM 您的机器人。
    2. 运行 `secuclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

  </Tab>

  <Tab title="群组策略和允许列表">
    有两个独立的控制：

    1. **允许哪些群组**（`channels.telegram.groups`）
       - 无 `groups` 配置：允许所有群组
       - 配置 `groups`：作为允许列表（显式 ID 或 `"*"`）

    2. **群组中允许哪些发送者**（`channels.telegram.groupPolicy`）
       - `open`
       - `allowlist`（默认）
       - `disabled`

    示例：允许特定群组中的所有成员：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

  </Tab>

  <Tab title="提及行为">
    群组回复默认需要提及。

    提及可以来自：

    - 原生 `@botusername` 提及，或
    - 配置中的提及模式

    会话级命令切换：

    - `/activation always`
    - `/activation mention`

    这些仅更新会话状态。使用配置进行持久化。

  </Tab>
</Tabs>

## 运行时行为

- Telegram 由网关进程拥有。
- 路由是确定性的：Telegram 入站回复到 Telegram（模型不选择通道）。
- 入站消息规范化为共享通道信封，包含回复元数据和媒体占位符。
- 群组会话按群组 ID 隔离。论坛主题附加 `:topic:<threadId>` 以保持主题隔离。
- 长轮询使用 Telegram Bot API 进行每聊天排序。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    SecuClaw 可以通过发送临时 Telegram 消息并在文本到达时编辑它来流式传输部分回复。

    要求：

    - `channels.telegram.streamMode` 不是 `"off"`（默认：`"partial"`）

    模式：

    - `off`：无实时预览
    - `partial`：来自部分文本的频繁预览更新
    - `block`：分块预览更新

  </Accordion>

  <Accordion title="格式化和 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - Markdown 风格文本渲染为 Telegram 安全的 HTML。
    - 原始模型 HTML 被转义以减少 Telegram 解析失败。
    - 如果 Telegram 拒绝解析的 HTML，SecuClaw 以纯文本重试。

    链接预览默认启用，可通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 音频消息

    Telegram 区分语音笔记和音频文件。

    - 默认：音频文件行为
    - 在代理回复中标记 `[[audio_as_voice]]` 以强制语音笔记发送

    ### 视频消息

    Telegram 区分视频文件和视频笔记。

    ### 贴纸

    入站贴纸处理：

    - 静态 WEBP：下载并处理（占位符 `<media:sticker>`）
    - 动画 TGS：跳过
    - 视频 WEBM：跳过

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 在 SecuClaw 处理入站消息时发送确认表情符号。

    解析顺序：

    - `channels.telegram.ackReaction`
    - 代理身份表情符号回退（默认："👀"）

  </Accordion>

  <Accordion title="长轮询 vs Webhook">
    默认：长轮询。

    Webhook 模式：

    - 设置 `channels.telegram.webhookUrl`
    - 设置 `channels.telegram.webhookSecret`（设置 webhook URL 时必需）
    - 可选 `channels.telegram.webhookPath`（默认 `/telegram-webhook`）
    - 可选 `channels.telegram.webhookHost`（默认 `127.0.0.1`）

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 优先在长度拆分之前使用段落边界。
    - `channels.telegram.mediaMaxMb`（默认 5）限制入站 Telegram 媒体下载/处理大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时。

    CLI 发送目标可以是数字聊天 ID 或用户名：

```bash
secuclaw message send --channel telegram --target 123456789 --message "hi"
secuclaw message send --channel telegram --target @name --message "hi"
```

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="机器人不响应非提及的群组消息">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见性。
      - BotFather：`/setprivacy` -> Disable
      - 然后移除 + 重新添加机器人到群组
    - `secuclaw channels status` 在配置期望未提及的群组消息时发出警告。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="机器人根本看不到群组消息">

    - 当 `channels.telegram.groups` 存在时，群组必须被列出（或包含 `"*"`）
    - 验证机器人在群组中的成员资格
    - 查看日志：`secuclaw logs --follow` 以获取跳过原因

  </Accordion>

  <Accordion title="命令部分工作或根本不工作">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略为 `open`，命令授权仍然适用

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - 某些主机首先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出口可能导致间歇性 Telegram API 失败。
    - 验证 DNS 答案：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

## Telegram 配置参考

主要参考：

- `channels.telegram.enabled`：启用/禁用通道启动。
- `channels.telegram.botToken`：机器人令牌（BotFather）。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.telegram.allowFrom`：DM 允许列表（数字 Telegram 用户 ID）。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.telegram.groups`：按群组默认值 + 允许列表。
- `channels.telegram.textChunkLimit`：出站块大小（字符）。
- `channels.telegram.streamMode`：`off | partial | block`（实时流预览）。
- `channels.telegram.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.telegram.webhookUrl`：启用 webhook 模式（需要 `webhookSecret`）。
- `channels.telegram.actions.reactions`：门控 Telegram 工具反应。

## 相关

- [通道通信](/channels/communication)
- [网关配置](/gateway/configuration)
- [故障排除](/help/troubleshooting)
