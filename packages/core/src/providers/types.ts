export type ModelApi = 
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "google-generative-ai"
  | "bedrock-converse-stream"
  | "ollama"
  | "github-copilot"
  | "custom";

export interface ModelConfig {
  id: string;
  alias?: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: {
    vision?: boolean;
    tools?: boolean;
    streaming?: boolean;
    thinking?: boolean;
  };
  inputPricePer1M?: number;
  outputPricePer1M?: number;
  recommendedFor?: string[];
}

export interface ProviderConfig {
  name: string;
  api: ModelApi;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  models?: ModelConfig[];
  timeout?: number;
  maxRetries?: number;
  extra?: Record<string, unknown>;
}

export interface ContentPart {
  type: "text" | "image" | "image_url";
  text?: string;
  imageUrl?: { url: string; detail?: "auto" | "low" | "high" };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[];
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  model: string;
  finishReason?: "stop" | "length" | "tool_calls" | "content_filter";
  toolCalls?: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  };
  latency?: number;
}

export interface StreamChunk {
  delta: {
    content?: string;
    toolCalls?: Partial<ToolCall>[];
  };
  finishReason?: "stop" | "length" | "tool_calls" | "content_filter";
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  readonly name: string;
  readonly api: ModelApi;
  readonly config: ProviderConfig;
  isAvailable(): boolean;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream?(request: ChatRequest): AsyncIterable<StreamChunk>;
  listModels?(): ModelConfig[];
  getModel?(modelId: string): ModelConfig | undefined;
}

export type ProviderFactory = (config: Partial<ProviderConfig>) => LLMProvider;

export type TaskCategory = 
  | "reasoning" | "coding" | "analysis" | "translation" 
  | "summarization" | "classification" | "extraction" | "creative" | "chat";

export interface RoutingRule {
  category: TaskCategory;
  preferredProvider?: string;
  preferredModel?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  maxCost?: number;
  minQuality?: number;
}

export interface RoutingConfig {
  rules: RoutingRule[];
  defaultProvider: string;
  defaultModel: string;
  costOptimization: boolean;
  qualityThreshold: number;
}
