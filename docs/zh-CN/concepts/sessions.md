---
summary: "会话管理和持久化。"
read_when:
  - 了解会话
  - 配置会话行为
title: "会话"
---

# 会话

SecuClaw使用持久化存储管理对话会话。

## 概述

会话维护安全分析的对话上下文和历史。

## 配置

```json5
{
  session: {
    persistence: {
      enabled: true,
      storage: "jsonl",  // jsonl | sqlite
      path: "~/.secuclaw/sessions",
    },
    dmScope: "per-channel-peer",
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    maxHistory: 100,
    compaction: {
      enabled: true,
      threshold: 50,
    },
  },
}
```

## 会话范围

| 范围 | 描述 |
|-------|-------------|
| `main` | 单一共享会话 |
| `per-peer` | 每个发送者身份 |
| `per-channel-peer` | 每个渠道+发送者 |
| `per-account-channel-peer` | 最细粒度 |

## 会话重置

```json5
{
  session: {
    reset: {
      mode: "daily",      // daily | weekly | never
      atHour: 4,
      idleMinutes: 120,
    },
  },
}
```

## 命令

```bash
# 列出会话
secuclaw sessions list

# 获取会话信息
secuclaw sessions info session-id

# 清除会话
secuclaw sessions clear session-id

# 导出会话
secuclaw sessions export session-id --output file.jsonl
```
