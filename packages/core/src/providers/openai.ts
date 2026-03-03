/**
 * OpenAI Provider - 支持GPT-4o, GPT-4, o1, o3等模型
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

// OpenAI模型目录
export const OPENAI_MODELS: ModelConfig[] = [
  // GPT-4o系列
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
  // o1系列 (推理模型)
  { 
    id: "o1-preview", 
    contextWindow: 128000, 
    maxOutputTokens: 32768,
    capabilities: { streaming: true, thinking: true },
    inputPricePer1M: 15,
    outputPricePer1M: 60,
    recommendedFor: ["reasoning", "analysis"]
  },
  { 
    id: "o1-mini", 
    contextWindow: 128000, 
    maxOutputTokens: 65536,
    capabilities: { streaming: true, thinking: true },
    inputPricePer1M: 1.75,
    outputPricePer1M: 7,
    recommendedFor: ["reasoning", "coding"]
  },
  // o3系列 (最新推理)
  { 
    id: "o3-mini", 
    contextWindow: 200000, 
    maxOutputTokens: 100000,
    capabilities: { streaming: true, thinking: true, tools: true },
    inputPricePer1M: 1.1,
    outputPricePer1M: 4.4,
    recommendedFor: ["reasoning", "analysis", "coding"]
  },
];

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | OpenAIContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content?: string;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly api = "openai-completions" as const;
  readonly config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      name: "openai",
      api: "openai-completions",
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      defaultModel: config.defaultModel ?? "gpt-4o",
      models: OPENAI_MODELS,
      timeout: config.timeout ?? 60000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const messages = this.convertMessages(request.messages);
    
    const body: Record<string, unknown> = {
      model: request.model ?? this.config.defaultModel,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    };

    if (request.tools?.length) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice ?? "auto";
    }

    const response = await this.fetch("/chat/completions", body);
    const data = (await response.json()) as OpenAIResponse;

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
      model: request.model ?? this.config.defaultModel,
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
              toolCalls: delta?.tool_calls?.map((tc: OpenAIToolCall) => ({
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
    return this.config.models ?? OPENAI_MODELS;
  }

  getModel(modelId: string): ModelConfig | undefined {
    const models = this.listModels();
    return models.find(m => 
      m.id === modelId || m.alias?.includes(modelId)
    );
  }

  private convertMessages(messages: ChatMessage[]): OpenAIMessage[] {
    return messages.map(msg => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content,
          name: msg.name,
          tool_call_id: msg.toolCallId,
          tool_calls: msg.toolCalls as OpenAIToolCall[] | undefined,
        };
      }

      // 多模态消息
      const parts: OpenAIContentPart[] = msg.content.map(part => {
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
        tool_calls: msg.toolCalls as OpenAIToolCall[] | undefined,
      };
    });
  }

  private async fetch(path: string, body: unknown): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    
    let lastError: Error | undefined;
    const maxRetries = this.config.maxRetries ?? 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeout ?? 60000),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("OpenAI API request failed");
  }
}

// 工厂函数
export function createOpenAIProvider(config?: Partial<ProviderConfig>): LLMProvider {
  return new OpenAIProvider(config);
}
