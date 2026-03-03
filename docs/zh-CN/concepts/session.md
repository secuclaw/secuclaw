---
summary: "会话管理规则、密钥和安全运营的持久化"
read_when:
  - 修改会话处理或存储
  - 理解安全代理会话
title: "会话管理"
---

# 会话管理

SecuClaw 将**每个代理一个直接聊天会话**作为主要模式。直接聊天合并为 `agent:<agentId>:<mainKey>`（默认 `main`），而群组/频道聊天获得自己的密钥。

使用 `session.dmScope` 控制**直接消息**的分组方式：

- `main`（默认）：所有直接消息共享主会话以保持连续性
- `per-peer`：按发送者 ID 跨频道隔离
- `per-channel-peer`：按频道 + 发送者隔离（推荐多用户收件箱使用）
- `per-account-channel-peer`：按账户 + 频道 + 发送者隔离

使用 `session.identityLinks` 将提供商前缀的发送者 ID 映射到规范身份，使同一用户跨频道共享直接消息会话。

## 安全直接消息模式（推荐多用户设置）

> **安全警告：** 如果您的代理可以接收**多人**的直接消息，强烈建议启用安全直接消息模式。否则，所有用户共享同一会话上下文，可能导致用户间的私密信息泄露。

**问题示例：**

- Alice 向您的代理发送关于私人安全事件的消息
- Bob 向您的代理询问"我们在聊什么？"
- 由于两个直接消息共享同一会话，模型可能使用 Alice 的先前上下文回答 Bob。

**解决方法：** 设置 `dmScope` 为每个用户隔离会话：

```json5
// ~/.secuclaw/secuclaw.json
{
  session: {
    dmScope: "per-channel-peer",
  },
}
```

## 网关是真相来源

所有会话状态由**网关**拥有。UI 客户端必须查询网关以获取会话列表和令牌计数。

在**远程模式**下，会话存储位于远程网关主机上。

## 状态存储位置

- **网关主机**上：
  - 存储文件：`~/.secuclaw/agents/<agentId>/sessions/sessions.json`（每个代理）
  -  transcript：`~/.secuclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

## 会话生命周期

- **重置策略**：会话重复使用直到过期
- **每日重置**：默认在网关主机当地时间**凌晨 4:00**
- **空闲重置**：`idleMinutes` 添加滑动空闲窗口
- **手动重置**：`/new` 或 `/reset` 命令启动新会话

## 配置

```json5
{
  session: {
    dmScope: "per-channel-peer",
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    store: "~/.secuclaw/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  },
}
```

## 检查

- `secuclaw status` — 显示存储路径和最近会话
- `secuclaw sessions --json` — 转储每个条目
- `/status` — 显示会话上下文使用情况
- `/context list` — 显示系统提示中的内容
- `/compact` — 总结较旧的上下文以释放窗口空间
