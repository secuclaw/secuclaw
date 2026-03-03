---
summary: "LLM provider configuration and supported models."
read_when:
  - Configuring AI models
  - Choosing LLM providers
title: "LLM Providers"
---

# LLM Providers

SecuClaw supports multiple LLM providers for security analysis and operations.

## Supported Providers

<Columns>
  <Card title="Anthropic" href="/providers/anthropic" icon="brain">
    Claude 3.5/4 - recommended for security analysis.
  </Card>
  <Card title="OpenAI" href="/providers/openai" icon="cpu">
    GPT-4o, GPT-4 Turbo models.
  </Card>
  <Card title="Google" href="/providers/gemini" icon="google">
    Gemini 1.5 Pro and Flash.
  </Card>
  <Card title="Alibaba" href="/providers/qwen" icon="zap">
    Qwen 2.5, Qwen-Max models.
  </Card>
  <Card title="DeepSeek" href="/providers/deepseek" icon="search">
    DeepSeek V3, R1 models.
  </Card>
  <Card title="Zhipu" href="/providers/glm" icon="zap">
    GLM-4, ChatGLM models.
  </Card>
  <Card title="Groq" href="/providers/groq" icon="zap">
    Fast inference - Llama, Mixtral.
  </Card>
  <Card title="Ollama" href="/providers/ollama" icon="server">
    Local LLM deployment.
  </Card>
</Columns>

## Configuration

### Anthropic (Recommended)

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

### Ollama (Local)

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

## Model Selection

| Use Case | Recommended Model | Notes |
|----------|------------------|-------|
| General Security Analysis | anthropic/claude-sonnet-4-20250514 | Best reasoning |
| Complex Threat Analysis | anthropic/claude-opus-4-20250514 | Deep analysis |
| Fast Analysis | groq/llama-3.3-70b-versatile | Low latency |
| Chinese Security Analysis | qwen/qwen-2.5-72b-instruct | Best Chinese |
| Cost-Effective Analysis | deepseek/deepseek-chat | Great value |
| Local/Private Deployment | ollama/llama3.2 | Offline |
| Multimodal Analysis | google/gemini-1.5-pro | Long context |

## Cost Management

Configure fallback models for cost optimization:

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

## Provider Configuration

All providers are configured in the `models.providers` section. See the examples above for configuration patterns.

---

_Related: [Configuration](/gateway/configuration)_
