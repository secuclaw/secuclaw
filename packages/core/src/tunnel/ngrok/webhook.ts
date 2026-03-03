import type { WebhookEvent } from "./types.js";

export type WebhookHandler = (event: WebhookEvent) => Promise<void> | void;

export class WebhookHandlerRegistry {
  private readonly handlers = new Map<string, WebhookHandler[]>();

  register(eventType: string, handler: WebhookHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  async handle(event: WebhookEvent): Promise<void> {
    const list = this.handlers.get(event.event) ?? [];
    for (const handler of list) {
      await handler(event);
    }
  }
}
