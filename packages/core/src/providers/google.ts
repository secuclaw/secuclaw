/**
 * Google Gemini Provider - 支持Gemini 2.0, 1.5 Pro/Flash等模型
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

// Google模型目录
export const GOOGLE_MODELS: ModelConfig[] = [
  // Gemini 2.0系列
  { 
    id: "gemini-2.0-flash", 
    alias: ["gemini-2-flash"], 
    contextWindow: 1000000, 
    maxOutputTokens: 8192,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.4,
    recommendedFor: ["chat", "analysis", "classification"]
  },
  { 
    id: "gemini-2.0-pro", 
    alias: ["gemini-2-pro"], 
    contextWindow: 2000000, 
    maxOutputTokens: 8192,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 0.35,
    outputPricePer1M: 1.05,
    recommendedFor: ["reasoning", "analysis", "coding"]
  },
  // Gemini 1.5系列
  { 
    id: "gemini-1.5-pro", 
    alias: ["gemini-pro"], 
    contextWindow: 2000000, 
    maxOutputTokens: 8192,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 1.25,
    outputPricePer1M: 5,
    recommendedFor: ["reasoning", "analysis", "coding"]
  },
  { 
    id: "gemini-1.5-flash", 
    alias: ["gemini-flash"], 
    contextWindow: 1000000, 
    maxOutputTokens: 8192,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.3,
    recommendedFor: ["chat", "extraction", "summarization"]
  },
];

interface GeminiContent {
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  role?: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
  };
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    }>;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }>;
      role: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GoogleProvider implements LLMProvider {
  readonly name = "google";
  readonly api = "google-generative-ai" as const;
  readonly config: ProviderConfig;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = {
      name: "google",
      api: "google-generative-ai",
      baseUrl: config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta",
      apiKey: config.apiKey ?? process.env.GOOGLE_API_KEY,
      defaultModel: config.defaultModel ?? "gemini-2.0-flash",
      models: GOOGLE_MODELS,
      timeout: config.timeout ?? 60000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const geminiRequest = this.convertRequest(request);
    const model = request.model ?? this.config.defaultModel ?? "gemini-2.0-flash";
    
    const response = await fetch(
      `${this.config.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiRequest),
        signal: AbortSignal.timeout(this.config.timeout ?? 60000),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const candidate = data.candidates[0];
    const latency = Date.now() - startTime;

    // 提取文本内容
    let content = "";
    const toolCalls: ChatResponse["toolCalls"] = [];

    for (const part of candidate.content.parts) {
      if (part.text) {
        content += part.text;
      }
      if (part.functionCall) {
        toolCalls?.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type: "function",
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args),
          },
        });
      }
    }

    return {
      content,
      model,
      finishReason: candidate.finishReason?.toLowerCase() as ChatResponse["finishReason"],
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      usage: data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount,
        outputTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined,
      latency,
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const geminiRequest = this.convertRequest(request);
    const model = request.model ?? this.config.defaultModel ?? "gemini-2.0-flash";

    const response = await fetch(
      `${this.config.baseUrl}/models/${model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...geminiRequest, generationConfig: { ...geminiRequest.generationConfig } }),
        signal: AbortSignal.timeout(this.config.timeout ?? 120000),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

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
        try {
          const parsed = JSON.parse(data) as GeminiResponse;
          const candidate = parsed.candidates?.[0];
          if (!candidate) continue;

          const parts = candidate.content.parts;
          let content = "";
          for (const part of parts) {
            if (part.text) content += part.text;
          }

          yield {
            delta: { content: content || undefined },
            finishReason: candidate.finishReason?.toLowerCase() as StreamChunk["finishReason"],
            usage: parsed.usageMetadata ? {
              inputTokens: parsed.usageMetadata.promptTokenCount,
              outputTokens: parsed.usageMetadata.candidatesTokenCount,
            } : undefined,
          };
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  listModels(): ModelConfig[] {
    return this.config.models ?? GOOGLE_MODELS;
  }

  getModel(modelId: string): ModelConfig | undefined {
    const models = this.listModels();
    return models.find(m => 
      m.id === modelId || m.alias?.includes(modelId)
    );
  }

  private convertRequest(request: ChatRequest): GeminiRequest {
    const contents: GeminiContent[] = [];
    let systemInstruction: { parts: Array<{ text: string }> } | undefined;

    // 分离system消息
    for (const msg of request.messages) {
      if (msg.role === "system") {
        systemInstruction = {
          parts: [{ text: typeof msg.content === "string" ? msg.content : "" }],
        };
        continue;
      }

      const parts: GeminiContent["parts"] = [];
      if (typeof msg.content === "string") {
        parts.push({ text: msg.content });
      } else {
        for (const part of msg.content) {
          if (part.type === "text") {
            parts.push({ text: part.text ?? "" });
          } else if (part.type === "image_url" && part.imageUrl) {
            // 假设是base64图片
            const [header, data] = part.imageUrl.url.split(",");
            const mimeType = header?.match(/data:([^;]+)/)?.[1] ?? "image/png";
            parts.push({ inlineData: { mimeType, data: data ?? "" } });
          }
        }
      }

      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      });
    }

    const geminiRequest: GeminiRequest = {
      contents,
      systemInstruction,
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 8192,
        temperature: request.temperature ?? 0.7,
        topP: request.topP,
      },
    };

    // 转换工具
    if (request.tools?.length) {
      geminiRequest.tools = [{
        functionDeclarations: request.tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        })),
      }];
    }

    return geminiRequest;
  }
}

// 工厂函数
export function createGoogleProvider(config?: Partial<ProviderConfig>): LLMProvider {
  return new GoogleProvider(config);
}
