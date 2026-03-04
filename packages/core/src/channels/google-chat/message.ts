import type { chat_v1 } from "googleapis";
import type {
  GoogleChatMessageEvent,
  GoogleChatMessage,
  GoogleChatSendResult,
  GoogleChatMessageOptions,
  GoogleChatFormAction,
  GoogleChatActionReturnValue,
} from "./types.js";

export class GoogleChatMessageHandler {
  private accessToken: string | null = null;
  private baseUrl = "https://chat.googleapis.com/v1";

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  async sendText(
    spaceId: string,
    text: string,
    options?: GoogleChatMessageOptions,
  ): Promise<GoogleChatSendResult> {
    this.ensureAccessToken();

    const threadKey = options?.threadKey ?? "";
    const parent = threadKey 
      ? `spaces/${spaceId}/threads/${threadKey}` 
      : `spaces/${spaceId}`;

    const response = await fetch(`${this.baseUrl}/${parent}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        requestId: options?.requestId ?? this.generateId(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send message: ${error.error?.message ?? response.statusText}`);
    }

    const data = await response.json() as GoogleChatMessage;
    
    return {
      name: data.name ?? "",
      space: spaceId,
      thread: threadKey,
      createTime: data.createTime,
    };
  }

  async sendCard(
    spaceId: string,
    card: GoogleChatMessage["cardsV2"],
    options?: GoogleChatMessageOptions,
  ): Promise<GoogleChatSendResult> {
    this.ensureAccessToken();

    const parent = `spaces/${spaceId}`;

    const response = await fetch(`${this.baseUrl}/${parent}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cardsV2: card,
        requestId: options?.requestId ?? this.generateId(),
        ...(options?.threadKey && { threadKey: options.threadKey }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send card: ${error.error?.message ?? response.statusText}`);
    }

    const data = await response.json() as GoogleChatMessage;
    
    return {
      name: data.name ?? "",
      space: spaceId,
      thread: options?.threadKey,
      createTime: data.createTime,
    };
  }

  async sendReply(
    spaceId: string,
    threadKey: string,
    text: string,
    options?: GoogleChatMessageOptions,
  ): Promise<GoogleChatSendResult> {
    return this.sendText(spaceId, text, {
      ...options,
      threadKey,
    });
  }

  async deleteMessage(spaceId: string, messageId: string): Promise<void> {
    this.ensureAccessToken();

    const messageName = `spaces/${spaceId}/messages/${messageId}`;

    const response = await fetch(`${this.baseUrl}/${messageName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete message: ${error.error?.message ?? response.statusText}`);
    }
  }

  async getMessage(spaceId: string, messageId: string): Promise<GoogleChatMessage | null> {
    this.ensureAccessToken();

    const messageName = `spaces/${spaceId}/messages/${messageId}`;

    const response = await fetch(`${this.baseUrl}/${messageName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get message: ${error.error?.message ?? response.statusText}`);
    }

    return response.json() as Promise<GoogleChatMessage>;
  }

  parseWebhookEvent(body: Record<string, unknown>): GoogleChatMessageEvent {
    return body as unknown as GoogleChatMessageEvent;
  }

  parseActionCallback(action: GoogleChatFormAction): GoogleChatActionReturnValue {
    const returnValue: GoogleChatActionReturnValue = {
      parameter: action.parameters,
      formInputs: {},
    };

    return returnValue;
  }

  isValidWebhook(event: GoogleChatMessageEvent, verificationToken?: string): boolean {
    if (!verificationToken) {
      return true;
    }
    return event.token === verificationToken;
  }

  extractTextFromMessage(message: GoogleChatMessage): string {
    if (message.fallbackText) {
      return message.fallbackText;
    }

    // Check top-level text first, then nested message.text
    if (message.text) {
      return message.text;
    }

    if (message.message?.text) {
      return message.message.text;
    }

    if (message.cardsV2) {
      for (const card of message.cardsV2) {
        if (card.card?.sections) {
          for (const section of card.card.sections) {
            if (section.widgets) {
              for (const widget of section.widgets) {
                if ("textParagraph" in widget && widget.textParagraph) {
                  return widget.textParagraph.text;
                }
                if ("keyValue" in widget && widget.keyValue) {
                  return widget.keyValue.content;
                }
              }
            }
          }
        }
      }
    }

    // Check both message.cards and message.card (top-level)
    const cardsToCheck = message.cards ?? (message.card ? [message.card] : []);
    for (const card of cardsToCheck) {
      if (card.sections) {
        for (const section of card.sections) {
          if (section.widgets) {
            for (const widget of section.widgets) {
              if ("textParagraph" in widget && widget.textParagraph) {
                return widget.textParagraph.text;
              }
              if ("keyValue" in widget && widget.keyValue) {
                return widget.keyValue.content;
              }
            }
          }
        }
      }
    }

    return "";
  }

  parseSlashCommand(message: GoogleChatMessage): { command: string; args: string } | null {
    if (!message.slashCommand || !message.slashCommand.commandName) {
      return null;
    }

    const command = message.slashCommand.commandName;
    let args = "";

    // Check top-level text first, then fallbackText, then nested message.text
    const textContent = message.text ?? message.fallbackText ?? message.message?.text;
    if (textContent) {
      const parts = textContent.split(" ");
      if (parts.length > 1) {
        args = parts.slice(1).join(" ");
      }
    }

    return { command, args };
  }

  getThreadKey(message: GoogleChatMessage): string | null {
    return message.thread?.threadKey ?? null;
  }

  getSpaceId(event: GoogleChatMessageEvent): string {
    if (!event.space?.name) {
      return "";
    }
    return event.space.name.replace("spaces/", "");
  }

  getUserId(event: GoogleChatMessageEvent): string {
    if (!event.user?.name) {
      return event.user?.id ?? "unknown";
    }
    return event.user.name.replace("users/", "");
  }

  getMessageId(event: GoogleChatMessageEvent): string {
    return event.message?.name?.split("/").pop() ?? "";
  }

  private ensureAccessToken(): void {
    if (!this.accessToken) {
      throw new Error("Access token not set. Call setAccessToken first.");
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function createMessageHandler(): GoogleChatMessageHandler {
  return new GoogleChatMessageHandler();
}
