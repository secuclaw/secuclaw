import type { LLMProvider, ChatRequest, ChatResponse } from "./types";
import { AnthropicProvider } from "./anthropic";
import { OllamaProvider } from "./ollama";

export class ProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string;

  constructor() {
    this.defaultProvider = process.env.LLM_DEFAULT_PROVIDER ?? "ollama";
    this.loadFromEnv();
  }

  private loadFromEnv(): void {
    if (process.env.OLLAMA_ENABLED === "true") {
      this.register("ollama", new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
        model: process.env.OLLAMA_MODEL ?? "qwen3:8b",
      }));
    }

    if (process.env.ZHIPU_API_KEY) {
      this.register("zhipu", new AnthropicProvider("zhipu", {
        apiKey: process.env.ZHIPU_API_KEY,
        baseUrl: process.env.ZHIPU_BASE_URL ?? "https://open.bigmodel.cn/api/anthropic",
        model: process.env.ZHIPU_MODEL ?? "glm-5",
      }));
    }

    if (process.env.MINIMAX_API_KEY) {
      this.register("minimax", new AnthropicProvider("minimax", {
        apiKey: process.env.MINIMAX_API_KEY,
        baseUrl: process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/anthropic",
        model: process.env.MINIMAX_MODEL ?? "MiniMax-M2.5",
      }));
    }

    if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "your_deepseek_api_key_here") {
      this.register("deepseek", new AnthropicProvider("deepseek", {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      }));
    }
  }

  register(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): LLMProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  listAvailable(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, p]) => p.isAvailable())
      .map(([name]) => name);
  }

  async chat(request: ChatRequest, provider?: string): Promise<ChatResponse> {
    const p = provider ? this.get(provider) : this.getDefault();
    if (!p) {
      throw new Error(`No LLM provider available. Configured: ${this.listAvailable().join(", ")}`);
    }
    return p.chat(request);
  }
}

let managerInstance: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
  if (!managerInstance) {
    managerInstance = new ProviderManager();
  }
  return managerInstance;
}
