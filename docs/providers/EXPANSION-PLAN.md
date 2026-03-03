# LLM Provider Expansion Plan

> **Version:** 1.0.0  
> **Last Updated:** 2026-02-23  
> **Status:** Planning Phase

---

## Current State

| Provider | Status | Implementation File |
|----------|--------|---------------------|
| Anthropic Claude | ✅ Complete | `providers/anthropic.ts` |
| OpenAI GPT | ✅ Complete | `providers/openai.ts` |
| Alibaba Qwen | ✅ Complete | `provider/index.ts` |
| DeepSeek | ✅ Complete | `provider/index.ts` |
| Zhipu GLM | ✅ Complete | `provider/index.ts` |
| Google Gemini | ✅ Complete | `provider/index.ts` |
| Groq | ✅ Complete | `provider/index.ts` |
| Llama (Local) | ✅ Complete | `provider/index.ts` |
| Ollama | ✅ Complete | `providers/ollama.ts` |

**Completion: 9 of 22+ providers (41%)**

---

## Phase 1: High Priority (Q2 2026)

### 1.1 Azure OpenAI

**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Use Case:** Enterprise Azure integration

```typescript
// packages/core/src/providers/azure.ts
import { BaseLLMProvider, ProviderCapabilities } from './types.js';

export class AzureOpenAIProvider extends BaseLLMProvider {
  readonly id = 'azure';
  readonly name = 'Azure OpenAI';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: true,
    maxContextLength: 128000,
    supportedModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
  };

  // Implementation details...
}
```

**Configuration:**
```env
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

### 1.2 AWS Bedrock

**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Use Case:** AWS ecosystem integration, multiple foundation models

```typescript
// packages/core/src/providers/bedrock.ts
import { BaseLLMProvider, ProviderCapabilities } from './types.js';

export class BedrockProvider extends BaseLLMProvider {
  readonly id = 'bedrock';
  readonly name = 'AWS Bedrock';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: false,
    maxContextLength: 200000,
    supportedModels: [
      'anthropic.claude-3-sonnet',
      'anthropic.claude-3-opus',
      'anthropic.claude-3-haiku',
      'amazon.titan-text-express',
      'meta.llama3-70b-instruct',
    ],
  };

  // Implementation details...
}
```

**Configuration:**
```env
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

---

## Phase 2: Medium Priority (Q3 2026)

### 2.1 Cohere

**Priority:** 🟡 Medium  
**Effort:** 1 day  
**Use Case:** Enterprise NLP, embeddings

```typescript
// packages/core/src/providers/cohere.ts
export class CohereProvider extends BaseLLMProvider {
  readonly id = 'cohere';
  readonly name = 'Cohere';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: false,
    audio: false,
    maxContextLength: 128000,
    supportedModels: ['command-r-plus', 'command-r', 'command'],
  };
}
```

### 2.2 Mistral AI

**Priority:** 🟡 Medium  
**Effort:** 1 day  
**Use Case:** European compliance, open models

```typescript
// packages/core/src/providers/mistral.ts
export class MistralProvider extends BaseLLMProvider {
  readonly id = 'mistral';
  readonly name = 'Mistral AI';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: false,
    audio: false,
    maxContextLength: 32000,
    supportedModels: ['mistral-large', 'mistral-medium', 'mistral-small', 'codestral'],
  };
}
```

### 2.3 Google Vertex AI

**Priority:** 🟡 Medium  
**Effort:** 2 days  
**Use Case:** GCP ecosystem, Gemini enterprise

```typescript
// packages/core/src/providers/vertex.ts
export class VertexAIProvider extends BaseLLMProvider {
  readonly id = 'vertex';
  readonly name = 'Google Vertex AI';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: true,
    maxContextLength: 1000000,
    supportedModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  };
}
```

---

## Phase 3: Low Priority (Q4 2026)

### 3.1 Replicate

```typescript
export class ReplicateProvider extends BaseLLMProvider {
  readonly id = 'replicate';
  readonly name = 'Replicate';
  // Support for open-source models via API
}
```

### 3.2 Together AI

```typescript
export class TogetherProvider extends BaseLLMProvider {
  readonly id = 'together';
  readonly name = 'Together AI';
  // Cost-effective inference for open models
}
```

### 3.3 Fireworks AI

```typescript
export class FireworksProvider extends BaseLLMProvider {
  readonly id = 'fireworks';
  readonly name = 'Fireworks AI';
  // Fast inference for production
}
```

### 3.4 Perplexity

```typescript
export class PerplexityProvider extends BaseLLMProvider {
  readonly id = 'perplexity';
  readonly name = 'Perplexity';
  // Search-augmented generation
}
```

### 3.5 AI21

```typescript
export class AI21Provider extends BaseLLMProvider {
  readonly id = 'ai21';
  readonly name = 'AI21';
  // Jurassic models
}
```

### 3.6 Databricks

```typescript
export class DatabricksProvider extends BaseLLMProvider {
  readonly id = 'databricks';
  readonly name = 'Databricks';
  // DBRX and custom models
}
```

### 3.7 Grok (xAI)

```typescript
export class GrokProvider extends BaseLLMProvider {
  readonly id = 'grok';
  readonly name = 'Grok (xAI)';
  // xAI's models
}
```

### 3.8 Moonshot

```typescript
export class MoonshotProvider extends BaseLLMProvider {
  readonly id = 'moonshot';
  readonly name = 'Moonshot AI';
  // Kimi models
}
```

---

## Implementation Template

All providers should follow this template:

```typescript
// packages/core/src/providers/{provider-id}.ts

import { 
  BaseLLMProvider, 
  ProviderCapabilities, 
  ChatMessage, 
  ChatResponse,
  ToolDefinition 
} from './types.js';

export class {ProviderName}Provider extends BaseLLMProvider {
  readonly id = '{provider-id}';
  readonly name = '{Provider Display Name}';
  
  readonly capabilities: ProviderCapabilities = {
    streaming: boolean,
    tools: boolean,
    vision: boolean,
    audio: boolean,
    maxContextLength: number,
    supportedModels: string[],
  };

  constructor(config: ProviderConfig = {}) {
    super(config);
    // Initialize SDK client if needed
  }

  async chat(
    messages: ChatMessage[], 
    tools?: ToolDefinition[]
  ): Promise<ChatResponse> {
    // Implementation
  }

  async *chatStream(
    messages: ChatMessage[], 
    tools?: ToolDefinition[]
  ): AsyncIterable<ChatResponse> {
    // Streaming implementation
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}
```

---

## Provider Manager Integration

After implementing a new provider, register it in:

```typescript
// packages/core/src/providers/manager.ts

import { AzureOpenAIProvider } from './azure.js';
import { BedrockProvider } from './bedrock.js';
// ... other imports

const PROVIDER_FACTORIES: Record<string, ProviderFactory> = {
  anthropic: (config) => new AnthropicProvider(config),
  openai: (config) => new OpenAIProvider(config),
  azure: (config) => new AzureOpenAIProvider(config),
  bedrock: (config) => new BedrockProvider(config),
  // ... other providers
};
```

---

## Testing Requirements

Each provider implementation must include:

1. **Unit tests** for chat functionality
2. **Integration tests** with mock responses
3. **Streaming tests** for providers that support it
4. **Error handling tests** for rate limits, timeouts
5. **Tool calling tests** for providers with tool support

```typescript
// packages/core/src/providers/__tests__/azure.test.ts

describe('AzureOpenAIProvider', () => {
  it('should complete chat requests', async () => {
    // Test implementation
  });

  it('should handle streaming', async () => {
    // Test implementation
  });

  it('should handle rate limits', async () => {
    // Test implementation
  });
});
```

---

## Metrics

| Metric | Target |
|--------|--------|
| Total Providers | 22+ |
| Coverage (by request volume) | 95% |
| Average Response Time | <3s |
| Error Rate | <1% |

---

## Timeline

| Phase | Providers | Target Date |
|-------|-----------|-------------|
| Phase 1 | Azure, Bedrock | Q2 2026 |
| Phase 2 | Cohere, Mistral, Vertex | Q3 2026 |
| Phase 3 | 8 remaining | Q4 2026 |

---

*Next Review: 2026-03-01*
