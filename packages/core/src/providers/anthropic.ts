import type { LLMProvider, ProviderConfig, ChatRequest, ChatResponse, ChatMessage, ModelApi } from "./types.js";

export interface AnthropicConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  defaultMaxTokens?: number;
}

interface AnthropicResponse {
  content: Array<{ text?: string }>;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements LLMProvider {
  readonly name: string;
  readonly api: ModelApi = "anthropic-messages";
  readonly config: ProviderConfig;
  private anthropicConfig: AnthropicConfig;

  constructor(name: string, config: AnthropicConfig) {
    this.name = name;
    this.anthropicConfig = {
      ...config,
      defaultMaxTokens: config.defaultMaxTokens ?? 4096,
    };
    this.config = {
      name,
      api: "anthropic-messages",
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      defaultModel: config.model,
    };
  }

  isAvailable(): boolean {
    return !!this.anthropicConfig.apiKey && !!this.anthropicConfig.baseUrl;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = this.convertMessages(request.messages);
    
    const response = await fetch(`${this.anthropicConfig.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.anthropicConfig.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: request.model ?? this.anthropicConfig.model,
        max_tokens: request.maxTokens ?? this.anthropicConfig.defaultMaxTokens,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    
    return {
      content: data.content[0]?.text ?? "",
      model: data.model ?? this.anthropicConfig.model,
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      } : undefined,
    };
  }

  private convertMessages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
    return messages.map((msg) => {
      const content = typeof msg.content === "string" ? msg.content : 
        msg.content.map(p => p.text ?? "").join("");
      return {
        role: msg.role === "system" ? "user" : msg.role,
        content,
      };
    });
  }
}
