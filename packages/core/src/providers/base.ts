import type { ChatMessage, ChatRequest, ChatResponse, StreamChunk, ProviderConfig } from "./types.js";
import type { ILLMProvider, IProviderCapabilities } from "./trait.js";

function normalizeRequest(
  messagesOrRequest: ChatMessage[] | ChatRequest,
  options?: Partial<ChatRequest>,
): ChatRequest {
  if (Array.isArray(messagesOrRequest)) {
    return {
      messages: messagesOrRequest,
      ...options,
    };
  }
  return {
    ...messagesOrRequest,
    ...(options ?? {}),
  };
}

export abstract class BaseLLMProvider implements ILLMProvider {
  readonly config: ProviderConfig;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly capabilities: IProviderCapabilities,
    config: ProviderConfig,
  ) {
    this.config = config;
  }

  async chat(messages: ChatMessage[] | ChatRequest, options?: Partial<ChatRequest>): Promise<ChatResponse> {
    const request = normalizeRequest(messages, options);
    return this.withRetry(() => this.doChat(request));
  }

  chatStream?(
    messages: ChatMessage[] | ChatRequest,
    options?: Partial<ChatRequest>,
  ): AsyncIterable<StreamChunk> {
    const request = normalizeRequest(messages, options);
    return this.doChatStream(request);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.withTimeout(Promise.resolve(true), this.config.timeout ?? 5000);
      return true;
    } catch {
      return false;
    }
  }

  protected abstract doChat(request: ChatRequest): Promise<ChatResponse>;
  protected doChatStream(_request: ChatRequest): AsyncIterable<StreamChunk> {
    throw new Error(`${this.name} does not support streaming`);
  }

  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const retries = Math.max(0, this.config.maxRetries ?? 2);
    let lastError: unknown;

    for (let i = 0; i <= retries; i += 1) {
      try {
        return await this.withTimeout(fn(), this.config.timeout ?? 60_000);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`provider timeout: ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
