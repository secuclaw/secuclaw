---
summary: "安全编排、自动化和响应(SOAR)能力。"
read_when:
  - 设置自动化响应
  - 创建剧本
title: "SOAR自动化"
---

# SOAR自动化

SecuClaw提供安全编排、自动化和响应(SOAR)能力，用于自动化安全运营。

## 剧本

### 钓鱼响应

```json5
{
  soar: {
    playbooks: {
      phishing: {
        name: "钓鱼调查",
        trigger: "alert.type = 'phishing'",
        steps: [
          { name: "提取IOC", action: "extract_indicators" },
          { name: "检查信誉", action: "query_threat_intel" },
          { name: "隔离", action: "quarantine_email", condition: "severity >= high" },
        ],
      },
    },
  },
}
```

### 恶意软件遏制

```json5
{
  soar: {
    playbooks: {
      malware: {
        name: "恶意软件遏制",
        trigger: "alert.type = 'malware'",
        steps: [
          { name: "隔离端点", action: "isolate_endpoint", condition: "severity = critical" },
          { name: "收集取证", action: "collect_evidence" },
        ],
      },
    },
  },
}
```

## 自动化操作

| 操作 | 描述 |
|--------|-------------|
| `isolate_endpoint` | 隔离受感染主机 |
| `block_ip` | 阻止恶意IP |
| `quarantine_file` | 隔离恶意文件 |
| `create_ticket` | 创建事件工单 |
| `notify` | 发送通知 |
| `collect_evidence` | 收集取证数据 |

## 配置

```json5
{
  soar: {
    enabled: true,
    maxConcurrentRuns: 5,
    timeout: "30m",
  },
}
```
