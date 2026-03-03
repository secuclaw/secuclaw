---
summary: "SecuClaw中的记忆和上下文管理。"
read_when:
  - 了解记忆系统
  - 配置上下文保留
title: "记忆"
---

# 记忆

SecuClaw使用混合记忆系统进行知识检索和上下文管理。

## 概述

```
┌─────────────────────────────────────────┐
│           记忆系统                       │
├─────────────────────────────────────────┤
│  向量存储        │  全文搜索              │
│  (ChromaDB)     │  (BM25)               │
├─────────────────────────────────────────┤
│         混合排名引擎                     │
└─────────────────────────────────────────┘
```

## 配置

```json5
{
  memory: {
    enabled: true,
    vectorStore: {
      provider: "chromadb",
      dimension: 1536,
    },
    bm25: {
      enabled: true,
      k1: 1.5,
      b: 0.75,
    },
    topK: 10,
    minScore: 0.7,
  },
}
```

## 记忆类型

### 短期记忆

会话内的对话上下文。

- 基于会话的隔离
- 会话结束时自动清理

### 长期记忆

存储在向量数据库中的持久化知识。

- 安全事件模式
- IOC数据库
- 漏洞知识

## 使用方法

```bash
# 查询记忆
secuclaw memory query "previous SQL injection incidents"

# 添加到记忆
secuclaw memory add --type ioc --data "192.0.2.1 malware-c2"

# 清除记忆
secuclaw memory clear --session session-id
```

## 混合搜索

结合向量相似度和BM25以获得最佳结果：

1. 向量搜索查找语义相似的内容
2. BM25查找精确关键词匹配
3. 使用混合评分重新排名结果
