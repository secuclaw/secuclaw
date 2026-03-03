import type {
  ChatMessage,
  ChatResponse,
  ChatRequest,
  StreamChunk,
  ProviderConfig,
} from "./types.js";

export interface IProviderCapabilities {
  readonly streaming: boolean;
  readonly tools: boolean;
  readonly vision: boolean;
  readonly audio: boolean;
  readonly maxContextLength: number;
  readonly supportedModels: string[];
}

export interface IProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  retries?: number;
  extra?: Record<string, unknown>;
}

export interface ILLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: IProviderCapabilities;
  readonly config?: ProviderConfig;

  chat(messages: ChatMessage[] | ChatRequest, options?: Partial<ChatRequest>): Promise<ChatResponse>;
  chatStream?(messages: ChatMessage[] | ChatRequest, options?: Partial<ChatRequest>): AsyncIterable<StreamChunk>;
  embed?(text: string): Promise<number[]>;
  countTokens?(text: string): number;

  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface IProviderFactory {
  create(config: IProviderConfig): ILLMProvider;
  validate(config: IProviderConfig): boolean;
}
