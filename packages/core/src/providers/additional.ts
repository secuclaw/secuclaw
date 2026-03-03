import type { LLMProvider, ProviderConfig, ChatRequest, ChatResponse, ChatMessage, ModelConfig, StreamChunk, ContentPart } from "./types.js";

export const BEDROCK_MODELS: ModelConfig[] = [
  { id: "anthropic.claude-3-5-sonnet-20241022-v2:0", alias: ["claude-3.5-sonnet"], contextWindow: 200000, maxOutputTokens: 8192, capabilities: { vision: true, tools: true, streaming: true } },
  { id: "anthropic.claude-3-5-haiku-20241022-v1:0", alias: ["claude-3.5-haiku"], contextWindow: 200000, maxOutputTokens: 8192, capabilities: { vision: true, tools: true, streaming: true } },
  { id: "anthropic.claude-3-opus-20240229-v1:0", alias: ["claude-3-opus"], contextWindow: 200000, maxOutputTokens: 4096, capabilities: { vision: true, tools: true, streaming: true } },
  { id: "amazon.nova-pro-v1:0", alias: ["nova-pro"], contextWindow: 300000, maxOutputTokens: 4096 },
  { id: "amazon.nova-lite-v1:0", alias: ["nova-lite"], contextWindow: 300000, maxOutputTokens: 4096 },
  { id: "amazon.titan-text-premier-v1:0", alias: ["titan"], contextWindow: 32000, maxOutputTokens: 4096 },
  { id: "meta.llama3-2-90b-instruct-v1:0", alias: ["llama3.2-90b"], contextWindow: 128000, maxOutputTokens: 4096 },
  { id: "meta.llama3-1-70b-instruct-v1:0", alias: ["llama3.1-70b"], contextWindow: 128000, maxOutputTokens: 4096 },
  { id: "mistral.mistral-large-2407-v1:0", alias: ["mistral-large"], contextWindow: 128000, maxOutputTokens: 8192 },
  { id: "cohere.command-r-plus-v1:0", alias: ["command-r-plus"], contextWindow: 128000, maxOutputTokens: 4096 },
];

export interface BedrockConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export class BedrockProvider implements LLMProvider {
  readonly name = "bedrock";
  readonly api = "bedrock-converse-stream" as const;
  readonly config: ProviderConfig;

  constructor(config: Partial<BedrockConfig> & Partial<ProviderConfig> = {}) {
    this.config = {
      name: "bedrock",
      api: "bedrock-converse-stream",
      baseUrl: `https://bedrock-runtime.${config.region ?? process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com`,
      defaultModel: config.defaultModel ?? "anthropic.claude-3-5-sonnet-20241022-v2:0",
      models: BEDROCK_MODELS,
      extra: {
        accessKeyId: config.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: config.sessionToken ?? process.env.AWS_SESSION_TOKEN,
        region: config.region ?? process.env.AWS_REGION ?? "us-east-1",
      },
    };
  }

  isAvailable(): boolean {
    return !!(this.config.extra?.accessKeyId && this.config.extra?.secretAccessKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const modelId = request.model ?? this.config.defaultModel ?? BEDROCK_MODELS[0].id;
    
    const response = await fetch(
      `${this.config.baseUrl}/model/${modelId}/invoke`,
      {
        method: "POST",
        headers: await this.getHeaders(),
        body: JSON.stringify(this.convertRequest(request)),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bedrock error: ${response.status} - ${error}`);
    }

    const data = await response.json() as BedrockResponse;
    const latency = Date.now() - startTime;

    return {
      content: data.output?.message?.content?.[0]?.text ?? "",
      model: modelId,
      usage: data.usage ? {
        inputTokens: data.usage.inputTokens ?? 0,
        outputTokens: data.usage.outputTokens ?? 0,
      } : undefined,
      latency,
    };
  }

  listModels(): ModelConfig[] {
    return this.config.models ?? BEDROCK_MODELS;
  }

  getModel(modelId: string): ModelConfig | undefined {
    return this.listModels().find(m => m.id === modelId || m.alias?.includes(modelId));
  }

  private async getHeaders(): Promise<Record<string, string>> {
    return {
      "Content-Type": "application/json",
      "X-Amz-Date": new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""),
      "Authorization": `AWS4-HMAC-SHA256 Credential=${this.config.extra?.accessKeyId}/...`,
    };
  }

  private convertRequest(request: ChatRequest): BedrockRequest {
    const messages = request.messages.map((msg: ChatMessage) => {
      const content = typeof msg.content === "string" 
        ? [{ text: msg.content }]
        : msg.content.map((p: ContentPart) => ({ text: p.text ?? "" }));
      return { role: msg.role === "system" ? "user" : msg.role, content };
    });

    return {
      messages,
      inferenceConfig: {
        maxTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      },
    };
  }
}

interface BedrockRequest {
  messages: Array<{ role: string; content: Array<{ text: string }> }>;
  inferenceConfig?: { maxTokens?: number; temperature?: number };
}

interface BedrockResponse {
  output?: { message?: { content?: Array<{ text?: string }> } };
  usage?: { inputTokens?: number; outputTokens?: number };
}

export function createBedrockProvider(config?: Partial<BedrockConfig>): LLMProvider {
  return new BedrockProvider(config);
}

export const NVIDIA_MODELS: ModelConfig[] = [
  { id: "meta/llama-3.3-70b-instruct", alias: ["llama3.3-70b"], contextWindow: 128000 },
  { id: "meta/llama-3.1-405b-instruct", alias: ["llama3.1-405b"], contextWindow: 128000 },
  { id: "mistralai/mixtral-8x7b-instruct-v0.1", alias: ["mixtral-8x7b"], contextWindow: 32768 },
  { id: "google/gemma-2-27b", alias: ["gemma2-27b"], contextWindow: 8192 },
  { id: "microsoft/phi-3-medium-128k-instruct", alias: ["phi3-medium"], contextWindow: 128000 },
];

export class NVIDIAProvider implements LLMProvider {
  readonly name = "nvidia";
  readonly api = "openai-completions" as const;
  readonly config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      name: "nvidia",
      api: "openai-completions",
      baseUrl: config.baseUrl ?? "https://integrate.api.nvidia.com/v1",
      apiKey: config.apiKey ?? process.env.NVIDIA_API_KEY,
      defaultModel: config.defaultModel ?? "meta/llama-3.3-70b-instruct",
      models: NVIDIA_MODELS,
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model ?? this.config.defaultModel,
        messages: request.messages.map((m: ChatMessage) => ({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.map((p: ContentPart) => p.text).join("") })),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) throw new Error(`NVIDIA error: ${response.status}`);
    
    const data = await response.json() as { choices: Array<{ message: { content: string } }>; usage?: { prompt_tokens: number; completion_tokens: number } };
    return {
      content: data.choices[0]?.message?.content ?? "",
      model: request.model ?? this.config.defaultModel ?? "",
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }

  listModels(): ModelConfig[] { return this.config.models ?? NVIDIA_MODELS; }
  getModel(modelId: string): ModelConfig | undefined { return this.listModels().find(m => m.id === modelId || m.alias?.includes(modelId)); }
}

export const TOGETHER_MODELS: ModelConfig[] = [
  { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", alias: ["llama3.3-70b-turbo"], contextWindow: 128000 },
  { id: "deepseek-ai/DeepSeek-V3", alias: ["deepseek-v3"], contextWindow: 128000 },
  { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", alias: ["qwen2.5-72b"], contextWindow: 128000 },
  { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", alias: ["mixtral-8x7b"], contextWindow: 32768 },
];

export class TogetherProvider implements LLMProvider {
  readonly name = "together";
  readonly api = "openai-completions" as const;
  readonly config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      name: "together",
      api: "openai-completions",
      baseUrl: config.baseUrl ?? "https://api.together.xyz/v1",
      apiKey: config.apiKey ?? process.env.TOGETHER_API_KEY,
      defaultModel: config.defaultModel ?? "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      models: TOGETHER_MODELS,
    };
  }

  isAvailable(): boolean { return !!this.config.apiKey; }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: request.model ?? this.config.defaultModel,
        messages: request.messages.map((m: ChatMessage) => ({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.map((p: ContentPart) => p.text).join("") })),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) throw new Error(`Together error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return { content: data.choices[0]?.message?.content ?? "", model: request.model ?? this.config.defaultModel ?? "" };
  }

  listModels(): ModelConfig[] { return this.config.models ?? TOGETHER_MODELS; }
  getModel(modelId: string): ModelConfig | undefined { return this.listModels().find(m => m.id === modelId || m.alias?.includes(modelId)); }
}

export const GROQ_MODELS: ModelConfig[] = [
  { id: "llama-3.3-70b-versatile", alias: ["llama3.3-70b"], contextWindow: 128000 },
  { id: "llama-3.1-8b-instant", alias: ["llama3.1-8b"], contextWindow: 128000 },
  { id: "mixtral-8x7b-32768", alias: ["mixtral"], contextWindow: 32768 },
  { id: "gemma2-9b-it", alias: ["gemma2-9b"], contextWindow: 8196 },
];

export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  readonly api = "openai-completions" as const;
  readonly config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      name: "groq",
      api: "openai-completions",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: config.apiKey ?? process.env.GROQ_API_KEY,
      defaultModel: config.defaultModel ?? "llama-3.3-70b-versatile",
      models: GROQ_MODELS,
    };
  }

  isAvailable(): boolean { return !!this.config.apiKey; }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: request.model ?? this.config.defaultModel,
        messages: request.messages.map((m: ChatMessage) => ({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.map((p: ContentPart) => p.text).join("") })),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return { content: data.choices[0]?.message?.content ?? "", model: request.model ?? this.config.defaultModel ?? "" };
  }

  listModels(): ModelConfig[] { return this.config.models ?? GROQ_MODELS; }
  getModel(modelId: string): ModelConfig | undefined { return this.listModels().find(m => m.id === modelId || m.alias?.includes(modelId)); }
}

export const CLOUDFLARE_MODELS: ModelConfig[] = [
  { id: "@cf/meta/llama-3.3-70b-instruct", alias: ["llama3.3-70b-cf"], contextWindow: 8192 },
  { id: "@cf/mistral/mistral-7b-instruct-v0.1", alias: ["mistral-7b-cf"], contextWindow: 8192 },
  { id: "@cf/qwen/qwen1.5-14b-chat-awq", alias: ["qwen1.5-14b-cf"], contextWindow: 8192 },
];

export class CloudflareProvider implements LLMProvider {
  readonly name = "cloudflare";
  readonly api = "openai-completions" as const;
  readonly config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      name: "cloudflare",
      api: "openai-completions",
      baseUrl: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
      apiKey: config.apiKey ?? process.env.CLOUDFLARE_API_TOKEN,
      defaultModel: config.defaultModel ?? "@cf/meta/llama-3.3-70b-instruct",
      models: CLOUDFLARE_MODELS,
    };
  }

  isAvailable(): boolean { return !!this.config.apiKey && !!process.env.CLOUDFLARE_ACCOUNT_ID; }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: request.model ?? this.config.defaultModel,
        messages: request.messages.map((m: ChatMessage) => ({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.map((p: ContentPart) => p.text).join("") })),
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) throw new Error(`Cloudflare error: ${response.status}`);
    const data = await response.json() as { result?: { response?: string } };
    return { content: data.result?.response ?? "", model: request.model ?? this.config.defaultModel ?? "" };
  }

  listModels(): ModelConfig[] { return this.config.models ?? CLOUDFLARE_MODELS; }
  getModel(modelId: string): ModelConfig | undefined { return this.listModels().find(m => m.id === modelId || m.alias?.includes(modelId)); }
}

export const ADDITIONAL_PROVIDERS = {
  bedrock: { factory: createBedrockProvider, models: BEDROCK_MODELS },
  nvidia: { factory: () => new NVIDIAProvider(), models: NVIDIA_MODELS },
  together: { factory: () => new TogetherProvider(), models: TOGETHER_MODELS },
  groq: { factory: () => new GroqProvider(), models: GROQ_MODELS },
  cloudflare: { factory: () => new CloudflareProvider(), models: CLOUDFLARE_MODELS },
};
