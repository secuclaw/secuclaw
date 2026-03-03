/**
 * Azure OpenAI Provider - 支持Azure部署的GPT-4o, GPT-4等模型
 * 
 * Azure OpenAI使用与OpenAI相同的API格式，但需要：
 * - Azure端点URL (baseUrl)
 * - API Key认证
 * - Deployment名称作为模型ID
 */
import type { 
  LLMProvider, 
  ProviderConfig, 
  ChatRequest, 
  ChatResponse, 
  ChatMessage,
  StreamChunk,
  ModelConfig 
} from "./types.js";

// Azure OpenAI 常用部署模型配置
export const AZURE_MODELS: ModelConfig[] = [
  { 
    id: "gpt-4o", 
    alias: ["gpt4", "gpt-4"], 
    contextWindow: 128000, 
    maxOutputTokens: 16384,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 2.5,
    outputPricePer1M: 10,
    recommendedFor: ["reasoning", "analysis", "coding"]
  },
  { 
    id: "gpt-4o-mini", 
    alias: ["gpt4-mini"], 
    contextWindow: 128000, 
    maxOutputTokens: 16384,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
    recommendedFor: ["chat", "classification", "extraction"]
  },
  { 
    id: "gpt-4-turbo", 
    alias: ["gpt-4-turbo"], 
    contextWindow: 128000, 
    maxOutputTokens: 4096,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 10,
    outputPricePer1M: 30,
    recommendedFor: ["reasoning", "coding"]
  },
  { 
    id: "gpt-4", 
    contextWindow: 8192, 
    maxOutputTokens: 4096,
    capabilities: { tools: true, streaming: true },
    inputPricePer1M: 30,
    outputPricePer1M: 60,
    recommendedFor: ["reasoning", "analysis"]
  },
  { 
    id: "gpt-35-turbo", 
    alias: ["gpt-3.5-turbo", "gpt3.5"], 
    contextWindow: 16384, 
    maxOutputTokens: 4096,
    capabilities: { tools: true, streaming: true },
    inputPricePer1M: 0.5,
    outputPricePer1M: 1.5,
    recommendedFor: ["chat", "classification"]
  },
  { 
    id: "gpt-35-turbo-16k", 
    contextWindow: 16384, 
    maxOutputTokens: 4096,
    capabilities: { tools: true, streaming: true },
    inputPricePer1M: 3,
    outputPricePer1M: 4,
    recommendedFor: ["chat", "extraction"]
  },
];

interface AzureMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | AzureContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: AzureToolCall[];
}

interface AzureContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

interface AzureToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface AzureResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content?: string;
      tool_calls?: AzureToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AzureOpenAIConfig extends Partial<ProviderConfig> {
  /** Azure资源名称，如 "my-resource" */
  resourceName?: string;
  /** Azure部署名称，如 "gpt-4o-deployment" */
  deploymentName?: string;
  /** API版本，默认 "2024-02-15-preview" */
  apiVersion?: string;
}

/**
 * Azure OpenAI Provider
 * 
 * 使用示例：
 * ```typescript
 * const provider = new AzureOpenAIProvider({
 *   resourceName: "my-azure-resource",
 *   deploymentName: "gpt-4o-deployment",
 *   apiKey: process.env.AZURE_OPENAI_API_KEY,
 * });
 * ```
 */
export class AzureOpenAIProvider implements LLMProvider {
  readonly name = "azure";
  readonly api = "openai-completions" as const;
  readonly config: ProviderConfig;
  
  private resourceName: string;
  private deploymentName: string;
  private apiVersion: string;

  constructor(config: AzureOpenAIConfig = {}) {
    this.resourceName = config.resourceName ?? process.env.AZURE_OPENAI_RESOURCE_NAME ?? "";
    this.deploymentName = config.deploymentName ?? process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? "gpt-4o";
    this.apiVersion = config.apiVersion ?? "2024-02-15-preview";
    
    // 构建Azure端点URL
    const baseUrl = config.baseUrl ?? 
      (this.resourceName 
        ? `https://${this.resourceName}.openai.azure.com/openai/deployments/${this.deploymentName}`
        : "https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT");
    
    this.config = {
      name: "azure",
      api: "openai-completions",
      baseUrl,
      apiKey: config.apiKey ?? process.env.AZURE_OPENAI_API_KEY,
      defaultModel: config.defaultModel ?? this.deploymentName,
      models: AZURE_MODELS,
      timeout: config.timeout ?? 60000,
      maxRetries: config.maxRetries ?? 3,
      extra: {
        resourceName: this.resourceName,
        deploymentName: this.deploymentName,
        apiVersion: this.apiVersion,
      },
    };
  }

  isAvailable(): boolean {
    return !!(this.config.apiKey && this.resourceName);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const messages = this.convertMessages(request.messages);
    
    const body: Record<string, unknown> = {
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    };

    if (request.tools?.length) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice ?? "auto";
    }

    const response = await this.fetch("/chat/completions", body);
    const data = (await response.json()) as AzureResponse;

    const choice = data.choices[0];
    const latency = Date.now() - startTime;

    return {
      content: choice.message.content ?? "",
      model: data.model,
      finishReason: choice.finish_reason as ChatResponse["finishReason"],
      toolCalls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: tc.function,
      })),
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      latency,
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const messages = this.convertMessages(request.messages);
    
    const body: Record<string, unknown> = {
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      stream: true,
    };

    const response = await this.fetch("/chat/completions", body);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const finishReason = parsed.choices?.[0]?.finish_reason;

          yield {
            delta: {
              content: delta?.content,
              toolCalls: delta?.tool_calls?.map((tc: AzureToolCall) => ({
                id: tc.id,
                type: "function" as const,
                function: tc.function,
              })),
            },
            finishReason,
            usage: parsed.usage ? {
              inputTokens: parsed.usage.prompt_tokens,
              outputTokens: parsed.usage.completion_tokens,
            } : undefined,
          };
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  listModels(): ModelConfig[] {
    return this.config.models ?? AZURE_MODELS;
  }

  getModel(modelId: string): ModelConfig | undefined {
    const models = this.listModels();
    return models.find(m => 
      m.id === modelId || m.alias?.includes(modelId)
    );
  }

  /**
   * 获取Azure端点URL
   */
  getEndpoint(): string {
    return `https://${this.resourceName}.openai.azure.com`;
  }

  /**
   * 获取部署名称
   */
  getDeploymentName(): string {
    return this.deploymentName;
  }

  private convertMessages(messages: ChatMessage[]): AzureMessage[] {
    return messages.map(msg => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content,
          name: msg.name,
          tool_call_id: msg.toolCallId,
          tool_calls: msg.toolCalls as AzureToolCall[] | undefined,
        };
      }

      // 多模态消息
      const parts: AzureContentPart[] = msg.content.map(part => {
        if (part.type === "text") {
          return { type: "text" as const, text: part.text };
        }
        return {
          type: "image_url" as const,
          image_url: { url: part.imageUrl?.url ?? "" },
        };
      });

      return {
        role: msg.role,
        content: parts,
        name: msg.name,
        tool_call_id: msg.toolCallId,
        tool_calls: msg.toolCalls as AzureToolCall[] | undefined,
      };
    });
  }

  private async fetch(path: string, body: unknown): Promise<Response> {
    // Azure OpenAI API URL格式: 
    // https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version={api-version}
    const url = `${this.config.baseUrl}${path}?api-version=${this.apiVersion}`;
    
    let lastError: Error | undefined;
    const maxRetries = this.config.maxRetries ?? 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": this.config.apiKey ?? "",  // Azure使用api-key头而不是Authorization
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeout ?? 60000),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("Azure OpenAI API request failed");
  }
}

// 工厂函数
export function createAzureOpenAIProvider(config?: AzureOpenAIConfig): LLMProvider {
  return new AzureOpenAIProvider(config);
}

/**
 * 创建多个Azure部署的Provider
 * 用于支持一个Azure资源下的多个部署
 */
export function createAzureProviders(configs: Array<AzureOpenAIConfig & { name: string }>): Map<string, LLMProvider> {
  const providers = new Map<string, LLMProvider>();
  for (const cfg of configs) {
    const { name, ...azureConfig } = cfg;
    providers.set(name, new AzureOpenAIProvider(azureConfig));
  }
  return providers;
}
