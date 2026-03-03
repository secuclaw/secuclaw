import type { ReasoningResult, ReasoningContext, ReasoningConfig } from '../reasoning/types.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  audio: boolean;
  maxContextLength: number;
  supportedModels: string[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  capabilities: ProviderCapabilities;
  defaultModel: string;
  pricing?: {
    inputPer1k: number;
    outputPer1k: number;
  };
}

export abstract class BaseLLMProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: ProviderCapabilities;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = config;
  }

  abstract chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse>;
  abstract listModels(): Promise<string[]>;

  async *chatStream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<ChatResponse> {
    yield await this.chat(messages, tools);
  }

  setConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  protected handleError(error: unknown, provider: string): never {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${provider} API error: ${message}`);
  }
}

export class AnthropicProvider extends BaseLLMProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: false,
    maxContextLength: 200000,
    supportedModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3.5-sonnet'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const response = await this.makeRequest(messages, tools);
    return response;
  }

  async *chatStream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<ChatResponse> {
    yield await this.makeRequest(messages, tools);
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }

  private async makeRequest(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'claude-3-sonnet';
    return {
      id: `claude-${Date.now()}`,
      content: `[Claude ${model}] Analysis complete. This is a simulated response for the security analysis request.`,
      model,
      usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
      finishReason: 'stop',
    };
  }
}

export class OpenAIProvider extends BaseLLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI GPT';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: true,
    maxContextLength: 128000,
    supportedModels: ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'gpt-4-turbo';
    return {
      id: `gpt-${Date.now()}`,
      content: `[GPT-4 ${model}] Analysis complete. Identified potential security concerns.`,
      model,
      usage: { promptTokens: 450, completionTokens: 180, totalTokens: 630 },
      finishReason: 'stop',
    };
  }

  async *chatStream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<ChatResponse> {
    yield await this.chat(messages, tools);
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}

export class QwenProvider extends BaseLLMProvider {
  readonly id = 'qwen';
  readonly name = 'Alibaba Qwen';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: false,
    maxContextLength: 32000,
    supportedModels: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-72b', 'qwen-coder'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'qwen-max';
    return {
      id: `qwen-${Date.now()}`,
      content: `[Qwen ${model}] Security analysis completed with code review focus.`,
      model,
      usage: { promptTokens: 400, completionTokens: 160, totalTokens: 560 },
      finishReason: 'stop',
    };
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}

export class DeepSeekProvider extends BaseLLMProvider {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: false,
    audio: false,
    maxContextLength: 64000,
    supportedModels: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'deepseek-chat';
    return {
      id: `deepseek-${Date.now()}`,
      content: `[DeepSeek ${model}] Code security analysis complete.`,
      model,
      usage: { promptTokens: 350, completionTokens: 140, totalTokens: 490 },
      finishReason: 'stop',
    };
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}

export class GLMProvider extends BaseLLMProvider {
  readonly id = 'glm';
  readonly name = '智谱 GLM';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: false,
    maxContextLength: 128000,
    supportedModels: ['glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4v'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'glm-4';
    return {
      id: `glm-${Date.now()}`,
      content: `[GLM ${model}] 长上下文安全分析完成。`,
      model,
      usage: { promptTokens: 380, completionTokens: 150, totalTokens: 530 },
      finishReason: 'stop',
    };
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}

export class GeminiProvider extends BaseLLMProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    audio: true,
    maxContextLength: 1000000,
    supportedModels: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'gemini-1.5-pro';
    return {
      id: `gemini-${Date.now()}`,
      content: `[Gemini ${model}] Multimodal security analysis complete.`,
      model,
      usage: { promptTokens: 420, completionTokens: 170, totalTokens: 590 },
      finishReason: 'stop',
    };
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}

export class GroqProvider extends BaseLLMProvider {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: false,
    audio: true,
    maxContextLength: 8192,
    supportedModels: ['llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b', 'gemma2-9b'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'llama-3.1-70b';
    return {
      id: `groq-${Date.now()}`,
      content: `[Groq ${model}] Low-latency security response.`,
      model,
      usage: { promptTokens: 300, completionTokens: 120, totalTokens: 420 },
      finishReason: 'stop',
    };
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}

export class LlamaLocalProvider extends BaseLLMProvider {
  readonly id = 'llama-local';
  readonly name = 'Llama (Local)';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    tools: false,
    vision: false,
    audio: false,
    maxContextLength: 8192,
    supportedModels: ['llama-3-8b', 'llama-3-70b', 'llama-2-7b', 'llama-2-13b'],
  };

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const model = this.config.model || 'llama-3-8b';
    return {
      id: `llama-local-${Date.now()}`,
      content: `[Llama ${model} Local] Privacy-first security analysis complete.`,
      model,
      usage: { promptTokens: 280, completionTokens: 110, totalTokens: 390 },
      finishReason: 'stop',
    };
  }

  async listModels(): Promise<string[]> {
    return this.capabilities.supportedModels;
  }
}

export const ALL_PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Advanced reasoning and analysis, ideal for complex security tasks',
    capabilities: { streaming: true, tools: true, vision: true, audio: false, maxContextLength: 200000, supportedModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
    defaultModel: 'claude-3-sonnet',
    pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    description: 'General-purpose LLM with strong tool support',
    capabilities: { streaming: true, tools: true, vision: true, audio: true, maxContextLength: 128000, supportedModels: ['gpt-4-turbo', 'gpt-4o'] },
    defaultModel: 'gpt-4-turbo',
    pricing: { inputPer1k: 0.01, outputPer1k: 0.03 },
  },
  {
    id: 'qwen',
    name: 'Alibaba Qwen',
    description: 'Strong code understanding and Chinese language support',
    capabilities: { streaming: true, tools: true, vision: true, audio: false, maxContextLength: 32000, supportedModels: ['qwen-max', 'qwen-coder'] },
    defaultModel: 'qwen-max',
    pricing: { inputPer1k: 0.002, outputPer1k: 0.006 },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Excellent for code security analysis',
    capabilities: { streaming: true, tools: true, vision: false, audio: false, maxContextLength: 64000, supportedModels: ['deepseek-chat', 'deepseek-coder'] },
    defaultModel: 'deepseek-coder',
    pricing: { inputPer1k: 0.001, outputPer1k: 0.002 },
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    description: 'Long context with Chinese expertise',
    capabilities: { streaming: true, tools: true, vision: true, audio: false, maxContextLength: 128000, supportedModels: ['glm-4', 'glm-4-plus'] },
    defaultModel: 'glm-4',
    pricing: { inputPer1k: 0.001, outputPer1k: 0.001 },
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Million-token context for comprehensive analysis',
    capabilities: { streaming: true, tools: true, vision: true, audio: true, maxContextLength: 1000000, supportedModels: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
    defaultModel: 'gemini-1.5-pro',
    pricing: { inputPer1k: 0.0025, outputPer1k: 0.0075 },
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference for real-time analysis',
    capabilities: { streaming: true, tools: true, vision: false, audio: true, maxContextLength: 8192, supportedModels: ['llama-3.1-70b', 'mixtral-8x7b'] },
    defaultModel: 'llama-3.1-70b',
    pricing: { inputPer1k: 0.00059, outputPer1k: 0.00079 },
  },
  {
    id: 'llama-local',
    name: 'Llama (Local)',
    description: 'Privacy-focused local deployment',
    capabilities: { streaming: true, tools: false, vision: false, audio: false, maxContextLength: 8192, supportedModels: ['llama-3-8b', 'llama-3-70b'] },
    defaultModel: 'llama-3-8b',
    pricing: { inputPer1k: 0, outputPer1k: 0 },
  },
];

export function createProvider(providerId: string, config?: ProviderConfig): BaseLLMProvider {
  switch (providerId) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'qwen':
      return new QwenProvider(config);
    case 'deepseek':
      return new DeepSeekProvider(config);
    case 'glm':
      return new GLMProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'groq':
      return new GroqProvider(config);
    case 'llama-local':
      return new LlamaLocalProvider(config);
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

export function getProviderInfo(providerId: string): ProviderInfo | undefined {
  return ALL_PROVIDERS.find(p => p.id === providerId);
}
