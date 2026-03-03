---
summary: "LLM提供商配置和支持的模型。"
read_when:
  - 配置AI模型
  - 选择LLM提供商
title: "LLM提供商"
---

# LLM提供商

SecuClaw支持多个LLM提供商用于安全分析和运营。

## 支持的提供商

<Columns>
  <Card title="Anthropic" href="/zh-CN/providers/anthropic" icon="brain">
    Claude模型 - 推荐用于安全分析。
  </Card>
  <Card title="OpenAI" href="/zh-CN/providers/openai" icon="cpu">
    GPT-4和GPT-4o模型。
  </Card>
  <Card title="Ollama" href="/zh-CN/providers/ollama" icon="server">
    本地LLM部署。
  </Card>
  <Card title="Azure OpenAI" href="/zh-CN/providers/azure" icon="cloud">
    企业OpenAI部署。
  </Card>
</Columns>

## 配置

### Anthropic（推荐）

```json5
{
  models: {
    providers: {
      anthropic: {
        apiKey: "${ANTHROPIC_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
      },
    },
  },
}
```

### OpenAI

```json5
{
  models: {
    providers: {
      openai: {
        apiKey: "${OPENAI_API_KEY}",
      },
    },
  },
}
```

### Ollama（本地）

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://localhost:11434",
      },
    },
  },
}
```

## 模型选择

| 用例 | 推荐模型 |
|----------|------------------|
| 一般安全分析 | anthropic/claude-sonnet-4-5 |
| 复杂威胁分析 | anthropic/claude-opus-4-6 |
| 快速分析 | openai/gpt-4o |
| 本地部署 | ollama/llama2 |

## 成本管理

配置备用模型以优化成本：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: [
          { model: "openai/gpt-4o", maxTokens: 4000 },
        ],
      },
    },
  },
}
```

---

_相关链接：[配置](/zh-CN/gateway/configuration)_
