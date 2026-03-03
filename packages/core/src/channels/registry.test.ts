import { describe, expect, it } from "vitest";
import { ChannelRegistry } from "./registry.js";
import { BaseChannel } from "./base.js";
import type { IMessageChannel } from "./trait.js";
import type { ChannelConfig, ChannelContext, ChannelResponse } from "./types.js";

const mockChannel: IMessageChannel = {
  id: "mock",
  name: "mock",
  capabilities: {
    text: true,
    markdown: true,
    attachments: true,
    buttons: false,
    carousel: false,
    typing: true,
    reply: true,
    edit: true,
    delete: true,
    maxAttachmentSize: 1024,
    supportedFormats: ["png"],
  },
  async connect() {},
  async disconnect() {},
  isConnected() { return true; },
  async send(message) { return { messageId: "1", chatId: message.chatId, sentAt: Date.now() }; },
  async sendTyping() {},
  onMessage() {},
  onError() {},
  async edit() {},
  async delete() {},
  async getChatInfo(chatId) { return { chatId }; },
  async getMemberInfo(chatId, userId) { return { chatId, userId }; },
};

describe("channel registry", () => {
  it("registers channels", () => {
    const registry = new ChannelRegistry();
    registry.register(mockChannel);
    expect(registry.get("mock")).toBeDefined();
    expect(registry.getByCapability("typing")).toHaveLength(1);
  });

  it("registers and creates channel factories", () => {
    class MockBaseChannel extends BaseChannel {
      type = "web" as const;
      async connect() {}
      async disconnect() {}
      async send(_message: ChannelResponse, _context: ChannelContext) {}
    }

    const registry = new ChannelRegistry();
    registry.registerFactory("web", (config: ChannelConfig) => new MockBaseChannel(config));
    const channel = registry.create("web", { type: "web", enabled: true });
    expect(channel.type).toBe("web");
    expect(registry.getSupportedTypes()).toContain("web");
    expect(registry.getFactory("web")).toBeDefined();
  });
});
