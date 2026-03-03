import type { LLMProvider, ChatRequest, ChatResponse, ProviderConfig, ModelApi } from "./types.js";

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel?: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private organization?: string;
  private defaultModel: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.organization = config.organization;
    this.defaultModel = config.defaultModel ?? "gpt-4o";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(this.organization ? { "OpenAI-Organization": this.organization } : {}),
      },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface GoogleConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class GoogleProvider implements LLMProvider {
  readonly name = "google";
  readonly api: ModelApi = "google-generative-ai";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: GoogleConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    this.defaultModel = config.defaultModel ?? "gemini-1.5-pro";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const contents = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    }));

    const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: request.maxTokens ?? 4096, temperature: request.temperature ?? 0.7 },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      model,
      usage: data.usageMetadata ? { inputTokens: data.usageMetadata.promptTokenCount ?? 0, outputTokens: data.usageMetadata.candidatesTokenCount ?? 0 } : undefined,
    };
  }
}

export interface MistralConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class MistralProvider implements LLMProvider {
  readonly name = "mistral";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: MistralConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.mistral.ai/v1";
    this.defaultModel = config.defaultModel ?? "mistral-large-latest";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface CohereConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class CohereProvider implements LLMProvider {
  readonly name = "cohere";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: CohereConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.cohere.ai/v1";
    this.defaultModel = config.defaultModel ?? "command-r-plus";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;
    const lastUserMsg = [...request.messages].reverse().find((m) => m.role === "user");
    const chatHistory = request.messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "CHATBOT" : "USER",
      message: m.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        message: lastUserMsg?.content ?? "",
        chat_history: chatHistory,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cohere API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { text?: string; meta?: { tokens?: { input_tokens?: number; output_tokens?: number } } };

    return {
      content: data.text ?? "",
      model,
      usage: data.meta?.tokens ? { inputTokens: data.meta.tokens.input_tokens ?? 0, outputTokens: data.meta.tokens.output_tokens ?? 0 } : undefined,
    };
  }
}

export interface GroqConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: GroqConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.groq.com/openai/v1";
    this.defaultModel = config.defaultModel ?? "llama-3.3-70b-versatile";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  apiVersion?: string;
}

export class AzureOpenAIProvider implements LLMProvider {
  readonly name = "azure";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private endpoint: string;
  private deploymentName: string;
  private apiVersion: string;

  constructor(config: AzureOpenAIConfig) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.deploymentName = config.deploymentName;
    this.apiVersion = config.apiVersion ?? "2024-02-15-preview";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.endpoint,
      apiKey: this.apiKey,
      defaultModel: this.deploymentName,
      extra: { apiVersion: this.apiVersion },
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.endpoint && this.deploymentName);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": this.apiKey },
      body: JSON.stringify({
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface HuggingFaceConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class HuggingFaceProvider implements LLMProvider {
  readonly name = "huggingface";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: HuggingFaceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api-inference.huggingface.co/models";
    this.defaultModel = config.defaultModel ?? "meta-llama/Llama-3.1-70B-Instruct";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;
    const prompt = request.messages.map((m) => `<|${m.role}|>\n${m.content}</s>`).join("\n");

    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: request.maxTokens ?? 1024, temperature: request.temperature ?? 0.7 } }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Array<{ generated_text?: string }>;

    return {
      content: data[0]?.generated_text ?? "",
      model,
    };
  }
}

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.deepseek.com/v1";
    this.defaultModel = config.defaultModel ?? "deepseek-chat";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface XAIConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class XAIProvider implements LLMProvider {
  readonly name = "xai";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: XAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.x.ai/v1";
    this.defaultModel = config.defaultModel ?? "grok-beta";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`xAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface PerplexityConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class PerplexityProvider implements LLMProvider {
  readonly name = "perplexity";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: PerplexityConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.perplexity.ai";
    this.defaultModel = config.defaultModel ?? "llama-3.1-sonar-large-128k-online";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface TogetherAIConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class TogetherAIProvider implements LLMProvider {
  readonly name = "together";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: TogetherAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.together.xyz/v1";
    this.defaultModel = config.defaultModel ?? "meta-llama/Llama-3-70b-chat-hf";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Together AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface FireworksAIConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class FireworksAIProvider implements LLMProvider {
  readonly name = "fireworks";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: FireworksAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.fireworks.ai/inference/v1";
    this.defaultModel = config.defaultModel ?? "accounts/fireworks/models/llama-v3p1-70b-instruct";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fireworks AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface AI21Config {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class AI21Provider implements LLMProvider {
  readonly name = "ai21";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: AI21Config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.ai21.com/studio/v1";
    this.defaultModel = config.defaultModel ?? "jamba-1-5-large";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI21 API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface ReplicateConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class ReplicateProvider implements LLMProvider {
  readonly name = "replicate";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: ReplicateConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.replicate.com/v1";
    this.defaultModel = config.defaultModel ?? "meta/llama-2-70b-chat";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const prompt = request.messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${this.apiKey}` },
      body: JSON.stringify({
        version: this.defaultModel,
        input: { prompt, max_tokens: request.maxTokens ?? 1024, temperature: request.temperature ?? 0.7 },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Replicate API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { output?: string[] | string };

    const content = Array.isArray(data.output) ? data.output.join("") : data.output ?? "";

    return { content, model: this.defaultModel };
  }
}

export interface CloudflareAIConfig {
  apiKey: string;
  accountId: string;
  defaultModel?: string;
}

export class CloudflareAIProvider implements LLMProvider {
  readonly name = "cloudflare";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private accountId: string;
  private defaultModel: string;

  constructor(config: CloudflareAIConfig) {
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.defaultModel = config.defaultModel ?? "@cf/meta/llama-3.1-8b-instruct";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: "https://api.cloudflare.com/client/v4",
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
      extra: { accountId: this.accountId },
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.accountId);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;
    const prompt = request.messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ prompt, max_tokens: request.maxTokens ?? 1024 }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { result?: { response?: string } };

    return { content: data.result?.response ?? "", model };
  }
}

export interface ZhipuConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class ZhipuProvider implements LLMProvider {
  readonly name = "zhipu";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: ZhipuConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://open.bigmodel.cn/api/paas/v4";
    this.defaultModel = config.defaultModel ?? "glm-4";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zhipu API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface AlibabaConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class AlibabaProvider implements LLMProvider {
  readonly name = "alibaba";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: AlibabaConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.defaultModel = config.defaultModel ?? "qwen-turbo";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Alibaba API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface BaiduConfig {
  apiKey: string;
  secretKey: string;
  defaultModel?: string;
}

export class BaiduProvider implements LLMProvider {
  readonly name = "baidu";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private secretKey: string;
  private defaultModel: string;
  private accessToken?: string;

  constructor(config: BaiduConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.defaultModel = config.defaultModel ?? "ernie-4.0-8k";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: "https://aip.baidubce.com",
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.secretKey);
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`
    );

    const data = await response.json() as { access_token?: string };
    this.accessToken = data.access_token;
    return this.accessToken ?? "";
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const token = await this.getAccessToken();
    const model = request.model ?? this.defaultModel;
    const modelEndpoint = model.replace(/\./g, "_");

    const messages = request.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelEndpoint}?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, max_output_tokens: request.maxTokens ?? 1024, temperature: request.temperature ?? 0.7 }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Baidu API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { result?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } };

    return {
      content: data.result ?? "",
      model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens ?? 0, outputTokens: data.usage.completion_tokens ?? 0 } : undefined,
    };
  }
}

export interface ByteDanceConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class ByteDanceProvider implements LLMProvider {
  readonly name = "bytedance";
  readonly api: ModelApi = "openai-completions";
  readonly config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: ByteDanceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://ark.cn-beijing.volces.com/api/v3";
    this.defaultModel = config.defaultModel ?? "doubao-pro-32k";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ByteDance API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
    };
  }
}

export interface TencentConfig {
  apiKey: string;
  appId: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class TencentProvider implements LLMProvider {
  readonly name = "tencent";
  readonly api: ModelApi = "custom";
  readonly config: ProviderConfig;
  private apiKey: string;
  private appId: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: TencentConfig) {
    this.apiKey = config.apiKey;
    this.appId = config.appId;
    this.baseUrl = config.baseUrl ?? "https://hunyuan.tencentcloudapi.com";
    this.defaultModel = config.defaultModel ?? "hunyuan-lite";
    this.config = {
      name: this.name,
      api: this.api,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultModel: this.defaultModel,
      extra: { appId: this.appId },
    };
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.appId);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const prompt = request.messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TC-Action": "ChatCompletions",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        Model: this.defaultModel,
        Messages: request.messages.map((m) => ({ Role: m.role, Content: m.content })),
        MaxTokens: request.maxTokens ?? 1024,
        Temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tencent API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      Response?: { Choices?: Array<{ Message?: { Content?: string } }>; Usage?: { PromptTokens?: number; CompletionTokens?: number } };
    };

    return {
      content: data.Response?.Choices?.[0]?.Message?.Content ?? "",
      model: this.defaultModel,
      usage: data.Response?.Usage
        ? { inputTokens: data.Response.Usage.PromptTokens ?? 0, outputTokens: data.Response.Usage.CompletionTokens ?? 0 }
        : undefined,
    };
  }
}

export const PROVIDER_LIST = [
  { name: "openai", class: OpenAIProvider, description: "OpenAI GPT models" },
  { name: "google", class: GoogleProvider, description: "Google Gemini models" },
  { name: "mistral", class: MistralProvider, description: "Mistral AI models" },
  { name: "cohere", class: CohereProvider, description: "Cohere models" },
  { name: "groq", class: GroqProvider, description: "Groq fast inference" },
  { name: "azure", class: AzureOpenAIProvider, description: "Azure OpenAI" },
  { name: "huggingface", class: HuggingFaceProvider, description: "HuggingFace models" },
  { name: "deepseek", class: DeepSeekProvider, description: "DeepSeek models" },
  { name: "xai", class: XAIProvider, description: "xAI Grok models" },
  { name: "perplexity", class: PerplexityProvider, description: "Perplexity AI models" },
  { name: "together", class: TogetherAIProvider, description: "Together AI models" },
  { name: "fireworks", class: FireworksAIProvider, description: "Fireworks AI models" },
  { name: "ai21", class: AI21Provider, description: "AI21 Jurassic models" },
  { name: "replicate", class: ReplicateProvider, description: "Replicate models" },
  { name: "cloudflare", class: CloudflareAIProvider, description: "Cloudflare Workers AI" },
  { name: "zhipu", class: ZhipuProvider, description: "智谱 GLM models" },
  { name: "alibaba", class: AlibabaProvider, description: "阿里通义千问" },
  { name: "baidu", class: BaiduProvider, description: "百度文心一言" },
  { name: "bytedance", class: ByteDanceProvider, description: "字节豆包" },
  { name: "tencent", class: TencentProvider, description: "腾讯混元" },
];
