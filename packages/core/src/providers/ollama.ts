import type { LLMProvider, ProviderConfig, ChatRequest, ChatResponse, ChatMessage, ModelApi } from "./types.js";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

interface OllamaResponse {
  model: string;
  message: {
    content: string;
  };
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  readonly api: ModelApi = "ollama";
  readonly config: ProviderConfig;
  private ollamaConfig: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.ollamaConfig = config;
    this.config = {
      name: "ollama",
      api: "ollama",
      baseUrl: config.baseUrl,
      defaultModel: config.model,
    };
  }

  isAvailable(): boolean {
    return !!this.ollamaConfig.baseUrl;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = this.convertMessages(request.messages);
    
    const response = await fetch(`${this.ollamaConfig.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model ?? this.ollamaConfig.model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OllamaResponse;

    return {
      content: data.message?.content ?? "",
      model: data.model ?? this.ollamaConfig.model,
    };
  }

  private convertMessages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
    return messages.map((msg) => {
      const content = typeof msg.content === "string" ? msg.content : 
        msg.content.map(p => p.text ?? "").join("");
      return { role: msg.role, content };
    });
  }
}
