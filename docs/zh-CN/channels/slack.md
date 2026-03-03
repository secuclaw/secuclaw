---
summary: "Slack 机器人支持状态、功能和配置"
read_when:
  - 使用 Slack 通道功能
  - 您想连接 Slack 机器人
title: "Slack"
---

# Slack (Bot API)

状态：通过官方 Slack API 支持 DM 和频道。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Slack DM 默认为配对模式。
  </Card>
  <Card title="通道故障排除" icon="wrench" href="/help/troubleshooting">
    跨通道诊断和修复流程。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    核心网关设置、令牌和提供商配置。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="创建 Slack App">
    转到 [Slack API: Applications](https://api.slack.com/apps) 页面并点击 **Create New App**。

    选择 **From scratch**，命名（如 "SecuClaw"），然后选择您的工作区。

  </Step>

  <Step title="配置 Bot Token Scopes">
    导航到侧边栏中的 **OAuth & Permissions**。

    在 **Bot Token Scopes** 下，添加这些范围：

    - `app_mentions:read` - 读取提及机器人的消息
    - `channels:history` - 读取公共频道中的消息
    - `chat:write` - 发送消息
    - `files:read` - 读取频道中共享的文件
    - `files:write` - 上传文件
    - `groups:history` - 读取私有频道中的消息
    - `im:history` - 读取直接消息
    - `im:read` - 查看直接消息频道
    - `im:write` - 启动直接消息
    - `mpim:history` - 读取群组 DM
    - `mpim:read` - 查看群组 DM
    - `mpim:write` - 启动群组 DM
    - `reactions:read` - 读取消息反应
    - `reactions:write` - 添加消息反应
    - `users:read` - 查看用户资料
    - `users:read.email` - 查看用户电子邮件地址

  </Step>

  <Step title="启用 Socket Mode">
    导航到侧边栏中的 **Socket Mode** 并启用它。

    生成具有 `connections:write` 范围的 App-Level Token。

  </Step>

  <Step title="订阅事件">
    导航到侧边栏中的 **Event Subscriptions** 并启用它。

    订阅这些机器人事件：

    - `message.channels` - 读取公共频道中的消息
    - `message.groups` - 读取私有频道中的消息
    - `message.im` - 读取直接消息
    - `message.mpim` - 读取群组 DM
    - `app_mention` - 读取提及

  </Step>

  <Step title="安装 App">
    导航到侧边栏中的 **Install App** 并将应用程序安装到您的工作区。

    复制 **Bot User OAuth Token**（以 `xoxb-` 开头）。

  </Step>

  <Step title="配置 SecuClaw">

```bash
secuclaw config set channels.slack.token '"xoxb-your-token"' --json
secuclaw config set channels.slack.enabled true --json
secuclaw gateway
```

  </Step>

  <Step title="批准首次 DM 配对">
    在 Slack 中 DM 您的机器人。它将回复一个配对码。

```bash
secuclaw pairing list slack
secuclaw pairing approve slack <CODE>
```

    配对码 1 小时后过期。

  </Step>
</Steps>

## 运行时模型

- 网关通过 Socket Mode 拥有 Slack 连接。
- 回复路由是确定性的：Slack 入站回复到 Slack。
- 默认情况下，直接聊天共享代理主会话。
- 公共和私有频道是隔离的会话密钥。

## 访问控制和路由

<Tabs>
  <Tab title="DM 策略">
    `channels.slack.dmPolicy` 控制 DM 访问：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.slack.allowFrom` 包含 `"*"`）
    - `disabled`

    `channels.slack.allowFrom` 接受 Slack 用户 ID。

  </Tab>

  <Tab title="频道策略">
    频道处理由 `channels.slack.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    `allowlist` 行为：

    - 频道必须匹配 `channels.slack.channels`
    - 可选发送者允许列表：`users`（用户 ID）

    示例：

```json5
{
  channels: {
    slack: {
      groupPolicy: "allowlist",
      channels: {
        "C1234567890": {
          requireMention: true,
          users: ["U1234567890"],
        },
      },
    },
  },
}
```

  </Tab>

  <Tab title="提及">
    频道消息默认需要提及。

    提及检测包括：

    - 显式机器人提及（`<@U1234567890>`）
    - 配置的提及模式

    `requireMention` 按频道配置。

  </Tab>
</Tabs>

## 功能详情

<AccordionGroup>
  <Accordion title="消息格式化">
    出站文本使用 Slack 的 mrkdwn 格式。

    - Markdown 转换为 Slack 兼容格式
    - 代码块被保留
    - 链接渲染为 Slack 链接

  </Accordion>

  <Accordion title="线程回复">
    Slack 支持线程回复。

    - 线程中的回复保持在同一线程中
    - `replyToMode` 控制线程行为：
      - `off`（默认）- 无线程
      - `first` - 回复第一条消息
      - `all` - 总是线程回复

  </Accordion>

  <Accordion title="反应">
    `ackReaction` 在 SecuClaw 处理入站消息时发送确认表情符号。

    解析顺序：

    - `channels.slack.ackReaction`
    - 代理身份表情符号回退（默认："eyes"）

  </Accordion>

  <Accordion title="文件附件">
    SecuClaw 可以发送和接收文件：

    - 图片内联显示
    - 文档作为附件上传
    - `mediaMaxMb` 控制最大文件大小（默认：30MB）

  </Accordion>

  <Accordion title="消息限制">
    - `textChunkLimit`：最大消息长度（默认：40000 字符）
    - Slack 的 API 限制是每条消息 40000 字符
    - 较长的消息自动拆分

  </Accordion>
</AccordionGroup>

## 工具和操作门

Slack 消息操作包括消息传递、反应和频道操作。

核心示例：

- 消息传递：`sendMessage`、`postMessage`、`updateMessage`、`deleteMessage`
- 反应：`addReaction`、`removeReaction`
- 频道：`createChannel`、`archiveChannel`、`inviteToChannel`

操作门位于 `channels.slack.actions.*`。

默认门行为：

| 操作组 | 默认 |
| --- | --- |
| messages、reactions、files | enabled |
| channels、admin | disabled |

## 故障排除

<AccordionGroup>
  <Accordion title="机器人不响应频道中的消息">

    - 验证机器人已添加到频道
    - 检查 `groupPolicy` 未设置为 `"disabled"`
    - 验证 `requireMention` 行为
    - 检查日志：`secuclaw logs --follow`

  </Accordion>

  <Accordion title="Socket Mode 连接问题">

    - 验证 Slack App 中启用了 Socket Mode
    - 验证 App-Level Token 具有 `connections:write` 范围
    - 重启网关
    - 检查网络连接

  </Accordion>

  <Accordion title="权限错误">

    - 验证添加了所有必需的机器人令牌范围
    - 重新安装应用程序到您的工作区
    - 检查机器人在频道中具有必要的权限

  </Accordion>

  <Accordion title="DM 和配对问题">

    - DM 禁用：`channels.slack.dm.enabled=false`
    - DM 策略禁用：`channels.slack.dmPolicy="disabled"`
    - 检查日志以获取配对码

  </Accordion>
</AccordionGroup>

## 配置参考

高信号 Slack 字段：

- `channels.slack.enabled`：启用/禁用通道启动
- `channels.slack.token`：Bot User OAuth Token（xoxb-）
- `channels.slack.appToken`：Socket Mode 的 App-Level Token（xapp-）
- `channels.slack.dmPolicy`：`pairing | allowlist | open | disabled`
- `channels.slack.allowFrom`：DM 允许列表（用户 ID）
- `channels.slack.groupPolicy`：`open | allowlist | disabled`
- `channels.slack.channels`：按频道配置
- `channels.slack.textChunkLimit`：最大消息长度
- `channels.slack.mediaMaxMb`：最大文件大小

## 环境变量

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

## 安全和操作

- 将机器人令牌视为机密。
- 授予最低权限的 Slack 范围。
- 如果连接陈旧，重启网关。

## 相关

- [通道通信](/channels/communication)
- [网关配置](/gateway/configuration)
- [故障排除](/help/troubleshooting)
