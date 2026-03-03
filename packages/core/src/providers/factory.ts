import type { LLMProvider, ProviderConfig, ProviderFactory, RoutingConfig, RoutingRule, TaskCategory, ChatRequest, ChatResponse } from "./types.js";
import { OpenAIProvider, createOpenAIProvider } from "./openai.js";
import { GoogleProvider, createGoogleProvider } from "./google.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";
import { createAzureOpenAIProvider } from "./azure.js";
import { createBedrockProvider } from "./bedrock.js";

const providerFactories = new Map<string, ProviderFactory>();

function registerFactory(name: string, factory: ProviderFactory): void {
  providerFactories.set(name, factory);
}

registerFactory("openai", createOpenAIProvider);
registerFactory("google", createGoogleProvider);

registerFactory("anthropic", (config) => new AnthropicProvider("anthropic", {
  apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "",
  baseUrl: config.baseUrl ?? "https://api.anthropic.com",
  model: config.defaultModel ?? "claude-3-5-sonnet-20241022",
}));

registerFactory("ollama", (config) => new OllamaProvider({
  baseUrl: config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  model: config.defaultModel ?? "qwen3:8b",
}));

registerFactory("azure", createAzureOpenAIProvider);
registerFactory("bedrock", createBedrockProvider);

const CHINA_PROVIDERS: Array<{ name: string; baseUrl: string; envKey: string; defaultModel: string }> = [
  { name: "minimax", baseUrl: "https://api.minimax.io/anthropic", envKey: "MINIMAX_API_KEY", defaultModel: "MiniMax-M2.5" },
  { name: "zhipu", baseUrl: "https://open.bigmodel.cn/api/anthropic", envKey: "ZHIPU_API_KEY", defaultModel: "glm-5" },
  { name: "deepseek", baseUrl: "https://api.deepseek.com", envKey: "DEEPSEEK_API_KEY", defaultModel: "deepseek-chat" },
  { name: "moonshot", baseUrl: "https://api.moonshot.ai/v1", envKey: "MOONSHOT_API_KEY", defaultModel: "moonshot-v1-8k" },
  { name: "qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", envKey: "QWEN_API_KEY", defaultModel: "qwen-turbo" },
  { name: "qianfan", baseUrl: "https://qianfan.baidubce.com/v2", envKey: "QIANFAN_API_KEY", defaultModel: "ernie-4.0-8k" },
  { name: "xiaomi", baseUrl: "https://api.xiaomimimo.com/anthropic", envKey: "XIAOMI_API_KEY", defaultModel: "mi-2.5" },
];

for (const provider of CHINA_PROVIDERS) {
  const envKey = provider.envKey;
  registerFactory(provider.name, (config) => {
    const apiKey = config.apiKey ?? (envKey in process.env ? process.env[envKey] : undefined) ?? "";
    return new AnthropicProvider(provider.name, {
      apiKey,
      baseUrl: config.baseUrl ?? provider.baseUrl,
      model: config.defaultModel ?? provider.defaultModel,
    });
  });
}

export class ProviderFactoryManager {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string;
  private routingConfig: RoutingConfig;

  constructor() {
    this.defaultProvider = process.env.ESC_DEFAULT_PROVIDER ?? "ollama";
    this.routingConfig = {
      rules: this.getDefaultRoutingRules(),
      defaultProvider: this.defaultProvider,
      defaultModel: "auto",
      costOptimization: true,
      qualityThreshold: 0.8,
    };
    this.loadFromEnv();
  }

  private loadFromEnv(): void {
    for (const [name, factory] of providerFactories) {
      try {
        const provider = factory({});
        if (provider.isAvailable()) {
          this.providers.set(name, provider);
        }
      } catch {
        continue;
      }
    }
  }

  private getDefaultRoutingRules(): RoutingRule[] {
    return [
      { category: "reasoning", preferredProvider: "openai", preferredModel: "o3-mini", fallbackProvider: "anthropic" },
      { category: "coding", preferredProvider: "anthropic", preferredModel: "claude-3-5-sonnet", fallbackProvider: "openai" },
      { category: "analysis", preferredProvider: "google", preferredModel: "gemini-2.0-flash", fallbackProvider: "openai" },
      { category: "translation", preferredProvider: "deepseek", fallbackProvider: "openai" },
      { category: "chat", preferredProvider: "ollama", fallbackProvider: "openai" },
    ];
  }

  create(name: string, config?: Partial<ProviderConfig>): LLMProvider | undefined {
    const factory = providerFactories.get(name);
    if (!factory) return undefined;
    return factory(config ?? {});
  }

  get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  register(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  listAvailable(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, p]) => p.isAvailable())
      .map(([name]) => name);
  }

  getDefault(): LLMProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not registered`);
    }
    this.defaultProvider = name;
  }

  getRoutingConfig(): RoutingConfig {
    return { ...this.routingConfig };
  }

  setRoutingConfig(config: Partial<RoutingConfig>): void {
    this.routingConfig = { ...this.routingConfig, ...config };
  }

  route(category: TaskCategory): { provider: string; model?: string } {
    const rule = this.routingConfig.rules.find(r => r.category === category);
    if (rule) {
      if (rule.preferredProvider && this.providers.get(rule.preferredProvider)?.isAvailable()) {
        return { provider: rule.preferredProvider, model: rule.preferredModel };
      }
      if (rule.fallbackProvider && this.providers.get(rule.fallbackProvider)?.isAvailable()) {
        return { provider: rule.fallbackProvider, model: rule.fallbackModel };
      }
    }
    return { provider: this.defaultProvider };
  }

  async chat(request: ChatRequest, provider?: string): Promise<ChatResponse> {
    const p = provider ? this.get(provider) : this.getDefault();
    if (!p) {
      const available = this.listAvailable();
      throw new Error(`No LLM provider available. Configured: ${available.join(", ") || "none"}`);
    }
    return p.chat(request);
  }

  getStats(): { total: number; available: number; providers: Array<{ name: string; available: boolean; models: number }> } {
    const providers = Array.from(this.providers.entries()).map(([name, p]) => ({
      name,
      available: p.isAvailable(),
      models: p.config.models?.length ?? 0,
    }));
    return {
      total: this.providers.size,
      available: providers.filter(p => p.available).length,
      providers,
    };
  }
}

let managerInstance: ProviderFactoryManager | null = null;

export function getProviderManager(): ProviderFactoryManager {
  if (!managerInstance) {
    managerInstance = new ProviderFactoryManager();
  }
  return managerInstance;
}

export function resetProviderManager(): void {
  managerInstance = null;
}

export function createProvider(name: string, config: Partial<ProviderConfig> = {}): LLMProvider {
  const factory = providerFactories.get(name);
  if (!factory) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return factory(config);
}

export function createProviderFromConfig(config: ProviderConfig): LLMProvider {
  return createProvider(config.name, config);
}

export function autoDetectProvider(): string {
  const preference = [
    ["OPENAI_API_KEY", "openai"],
    ["ANTHROPIC_API_KEY", "anthropic"],
    ["GOOGLE_API_KEY", "google"],
    ["OLLAMA_BASE_URL", "ollama"],
    ["DEEPSEEK_API_KEY", "deepseek"],
    ["ZHIPU_API_KEY", "zhipu"],
  ] as const;

  for (const [envKey, provider] of preference) {
    if (process.env[envKey]) {
      return provider;
    }
  }

  return "ollama";
}

export { providerFactories, CHINA_PROVIDERS };
