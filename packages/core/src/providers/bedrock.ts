/**
 * AWS Bedrock Provider - 支持Claude, Llama, Titan, Mistral等模型
 * 
 * AWS Bedrock是AWS托管的生成式AI服务，支持多种基础模型。
 * 使用AWS SDK风格的认证（accessKeyId/secretAccessKey或IAM角色）。
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

export const BEDROCK_MODELS: ModelConfig[] = [
  {
    id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    alias: ["claude-3.5-sonnet", "claude-sonnet"],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    recommendedFor: ["reasoning", "analysis", "coding"]
  },
  {
    id: "anthropic.claude-3-5-haiku-20241022-v1:0",
    alias: ["claude-3.5-haiku", "claude-haiku"],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 0.8,
    outputPricePer1M: 4,
    recommendedFor: ["chat", "classification"]
  },
  {
    id: "anthropic.claude-3-opus-20240229-v1:0",
    alias: ["claude-3-opus", "claude-opus"],
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: { vision: true, tools: true, streaming: true },
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    recommendedFor: ["reasoning", "analysis"]
  },
  {
    id: "meta.llama3-1-405b-instruct-v1:0",
    alias: ["llama-405b", "llama3-405b"],
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true },
    inputPricePer1M: 2.4,
    outputPricePer1M: 2.4,
    recommendedFor: ["reasoning", "coding"]
  },
  {
    id: "meta.llama3-1-70b-instruct-v1:0",
    alias: ["llama-70b", "llama3-70b"],
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true },
    inputPricePer1M: 0.3,
    outputPricePer1M: 0.6,
    recommendedFor: ["chat", "classification"]
  },
  {
    id: "meta.llama3-1-8b-instruct-v1:0",
    alias: ["llama-8b", "llama3-8b"],
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true },
    inputPricePer1M: 0.03,
    outputPricePer1M: 0.06,
    recommendedFor: ["chat", "extraction"]
  },
  {
    id: "mistral.mistral-large-2402-v1:0",
    alias: ["mistral-large"],
    contextWindow: 32000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true },
    inputPricePer1M: 4,
    outputPricePer1M: 12,
    recommendedFor: ["reasoning", "coding"]
  },
  {
    id: "mistral.mistral-small-2402-v1:0",
    alias: ["mistral-small"],
    contextWindow: 32000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true },
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.2,
    recommendedFor: ["chat", "classification"]
  },
  {
    id: "amazon.titan-text-express-v1",
    alias: ["titan-express"],
    contextWindow: 8000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true },
    inputPricePer1M: 0.2,
    outputPricePer1M: 0.6,
    recommendedFor: ["chat", "summarization"]
  },
  {
    id: "cohere.command-r-v1:0",
    alias: ["command-r"],
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { tools: true, streaming: true },
    inputPricePer1M: 0.5,
    outputPricePer1M: 1.5,
    recommendedFor: ["reasoning", "tools"]
  },
];

export interface BedrockConfig extends Partial<ProviderConfig> {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

interface BedrockMessage {
  role: "user" | "assistant";
  content: Array<{ text?: string; image?: { format: string; source: { bytes: string } } }>;
}

interface BedrockToolConfig {
  tools: Array<{
    toolSpec: {
      name: string;
      description?: string;
      inputSchema: { json: Record<string, unknown> };
    };
  }>;
  toolChoice?: { auto: Record<string, never> } | { any: Record<string, never> } | { tool: { name: string } };
}

interface BedrockRequest {
  modelId: string;
  messages: BedrockMessage[];
  system?: Array<{ text: string }>;
  inferenceConfig?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
  toolConfig?: BedrockToolConfig;
}

interface BedrockResponse {
  output: {
    message: {
      role: string;
      content: Array<{
        text?: string;
        toolUse?: { toolUseId: string; name: string; input: Record<string, unknown> };
      }>;
    };
  };
  stopReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class BedrockProvider implements LLMProvider {
  readonly name = "bedrock";
  readonly api = "bedrock-converse-stream" as const;
  readonly config: ProviderConfig;
  
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken?: string;

  constructor(config: BedrockConfig = {}) {
    this.region = config.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
    this.accessKeyId = config.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID ?? "";
    this.secretAccessKey = config.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY ?? "";
    this.sessionToken = config.sessionToken ?? process.env.AWS_SESSION_TOKEN;

    this.config = {
      name: "bedrock",
      api: "bedrock-converse-stream",
      baseUrl: config.baseUrl ?? `https://bedrock-runtime.${this.region}.amazonaws.com`,
      apiKey: this.accessKeyId,
      defaultModel: config.defaultModel ?? "anthropic.claude-3-5-sonnet-20241022-v2:0",
      models: BEDROCK_MODELS,
      timeout: config.timeout ?? 120000,
      maxRetries: config.maxRetries ?? 3,
      extra: {
        region: this.region,
      },
    };
  }

  isAvailable(): boolean {
    return !!(this.accessKeyId && this.secretAccessKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const modelId = request.model ?? this.config.defaultModel ?? "";
    
    const systemMessages = request.messages.filter(m => m.role === "system");
    const chatMessages = request.messages.filter(m => m.role !== "system");
    
    const bedrockRequest: BedrockRequest = {
      modelId,
      messages: this.convertMessages(chatMessages),
      system: systemMessages.length > 0 ? [{ text: systemMessages.map(m => typeof m.content === "string" ? m.content : "").join("\n") }] : undefined,
      inferenceConfig: {
        maxTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        topP: request.topP,
      },
    };

    if (request.tools?.length) {
      bedrockRequest.toolConfig = {
        tools: request.tools.map(t => ({
          toolSpec: {
            name: t.function.name,
            description: t.function.description,
            inputSchema: { json: t.function.parameters ?? {} },
          },
        })),
        toolChoice: request.toolChoice === "required" 
          ? { any: {} } 
          : request.toolChoice === "none"
            ? undefined
            : { auto: {} },
      };
    }

    const response = await this.invokeModel(bedrockRequest);
    const latency = Date.now() - startTime;

    return {
      content: response.output.message.content.map(c => c.text ?? "").join(""),
      model: modelId,
      finishReason: this.mapStopReason(response.stopReason),
      toolCalls: response.output.message.content
        .filter(c => c.toolUse)
        .map(c => ({
          id: c.toolUse!.toolUseId,
          type: "function" as const,
          function: {
            name: c.toolUse!.name,
            arguments: JSON.stringify(c.toolUse!.input),
          },
        })),
      usage: response.usage ? {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      } : undefined,
      latency,
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const modelId = request.model ?? this.config.defaultModel ?? "";
    
    const systemMessages = request.messages.filter(m => m.role === "system");
    const chatMessages = request.messages.filter(m => m.role !== "system");
    
    const bedrockRequest: BedrockRequest = {
      modelId,
      messages: this.convertMessages(chatMessages),
      system: systemMessages.length > 0 ? [{ text: systemMessages.map(m => typeof m.content === "string" ? m.content : "").join("\n") }] : undefined,
      inferenceConfig: {
        maxTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      },
    };

    const response = await this.invokeModelStream(bedrockRequest);
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
        if (!line.trim()) continue;
        
        try {
          const event = JSON.parse(line);
          
          if (event.contentBlockDelta?.delta?.text) {
            yield {
              delta: { content: event.contentBlockDelta.delta.text },
            };
          }
          
          if (event.messageStop?.stopReason) {
            yield {
              delta: {},
              finishReason: this.mapStopReason(event.messageStop.stopReason),
            };
          }
          
          if (event.metadata?.usage) {
            yield {
              delta: {},
              usage: {
                inputTokens: event.metadata.usage.inputTokens,
                outputTokens: event.metadata.usage.outputTokens,
              },
            };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  listModels(): ModelConfig[] {
    return this.config.models ?? BEDROCK_MODELS;
  }

  getModel(modelId: string): ModelConfig | undefined {
    const models = this.listModels();
    return models.find(m => 
      m.id === modelId || m.alias?.includes(modelId)
    );
  }

  private convertMessages(messages: ChatMessage[]): BedrockMessage[] {
    return messages
      .filter(m => m.role !== "system")
      .map(msg => ({
        role: msg.role === "tool" ? "assistant" : msg.role as "user" | "assistant",
        content: this.convertContent(msg),
      }));
  }

  private convertContent(msg: ChatMessage): Array<{ text?: string }> {
    if (typeof msg.content === "string") {
      return [{ text: msg.content }];
    }
    
    return msg.content
      .filter(p => p.type === "text")
      .map(p => ({ text: p.text ?? "" }));
  }

  private mapStopReason(reason?: string): ChatResponse["finishReason"] {
    switch (reason) {
      case "end_turn":
        return "stop";
      case "max_tokens":
        return "length";
      case "tool_use":
        return "tool_calls";
      default:
        return "stop";
    }
  }

  private async signRequest(method: string, path: string, body: string): Promise<{ headers: Record<string, string>; url: string }> {
    const service = "bedrock";
    const algorithm = "AWS4-HMAC-SHA256";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const host = `bedrock-runtime.${this.region}.amazonaws.com`;
    const canonicalUri = path;
    const canonicalQuerystring = "";
    const payloadHash = await this.sha256(body);

    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\nx-amz-security-token:${this.sessionToken ?? ""}\n`;
    const signedHeaders = "host;x-amz-date;x-amz-security-token";

    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await this.sha256(`${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`)}`;

    const kSecret = new TextEncoder().encode(`AWS4${this.secretAccessKey}`);
    const kDate = await this.hmacSha256(kSecret, dateStamp);
    const kRegion = await this.hmacSha256(kDate, this.region);
    const kService = await this.hmacSha256(kRegion, service);
    const kSigning = await this.hmacSha256(kService, "aws4_request");
    const signature = await this.hmacSha256Hex(kSigning, stringToSign);

    const authorizationHeader = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      url: `https://${host}${path}`,
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Date": amzDate,
        "X-Amz-Security-Token": this.sessionToken ?? "",
        "Authorization": authorizationHeader,
      },
    };
  }

  private async invokeModel(request: BedrockRequest): Promise<BedrockResponse> {
    const path = `/model/${encodeURIComponent(request.modelId)}/converse`;
    const body = JSON.stringify(request);
    const { url, headers } = await this.signRequest("POST", path, body);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bedrock API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<BedrockResponse>;
  }

  private async invokeModelStream(request: BedrockRequest): Promise<Response> {
    const path = `/model/${encodeURIComponent(request.modelId)}/converse-stream`;
    const body = JSON.stringify(request);
    const { url, headers } = await this.signRequest("POST", path, body);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bedrock API error: ${response.status} - ${error}`);
    }

    return response;
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  private async hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBuffer);
    return new Uint8Array(signature);
  }

  private async hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
    const signature = await this.hmacSha256(key, message);
    return Array.from(signature).map(b => b.toString(16).padStart(2, "0")).join("");
  }
}

export function createBedrockProvider(config?: BedrockConfig): LLMProvider {
  return new BedrockProvider(config);
}
