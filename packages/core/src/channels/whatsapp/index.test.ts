import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventEmitter } from "node:events";

// Mock @whiskeysockets/baileys
const mockSocket = {
  end: vi.fn(),
  ev: new EventEmitter(),
  sendMessage: vi.fn(),
  readMessages: vi.fn(),
  loadMessageFromWA: vi.fn(),
  fetchMessagesFromWA: vi.fn(),
  sendPresenceUpdate: vi.fn(),
  user: {
    id: "test-user@s.whatsapp.net",
  },
};

const mockAuthState = {
  state: {
    creds: {},
    keys: {},
  },
  saveCreds: vi.fn(),
};

vi.mock("@whiskeysockets/baileys", () => ({
  makeWASocket: vi.fn(() => mockSocket),
  useMultiFileAuthState: vi.fn(() => Promise.resolve(mockAuthState)),
  DisconnectReason: {
    loggedOut: 401,
    connectionClosed: 428,
    badSession: 500,
    connectionReplaced: 440,
    serviceUnavailable: 503,
  },
  downloadMediaMessage: vi.fn(() => Promise.resolve(Buffer.from("test"))),
}));

import { WhatsAppChannel, createWhatsAppChannel } from "./connection.js";
import { WhatsAppMessageHandler, createMessageHandler } from "./message.js";
import { WhatsAppAttachmentHandler, createAttachmentHandler } from "./attachment.js";
import type { WhatsAppConfig } from "./types.js";

describe("WhatsAppChannel", () => {
  let channel: WhatsAppChannel;
  const testConfig: WhatsAppConfig = {
    type: "whatsapp",
    enabled: true,
    authPath: "/tmp/test-whatsapp-auth",
    qrCodeTimeout: 30000,
    retryAttempts: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    channel = new WhatsAppChannel(testConfig);
  });

  describe("constructor", () => {
    it("should create channel with config", () => {
      expect(channel).toBeDefined();
      expect(channel.type).toBe("whatsapp");
    });

    it("should have initial disconnected state", () => {
      expect(channel.isConnected()).toBe(false);
      expect(channel.getConnectionState()).toBe("disconnected");
    });
  });

  describe("getQRCode", () => {
    it("should return null initially", () => {
      expect(channel.getQRCode()).toBeNull();
    });
  });

  describe("getCurrentJid", () => {
    it("should return null initially", () => {
      expect(channel.getCurrentJid()).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return initial stats", () => {
      const stats = channel.getStats();
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });
});

describe("createWhatsAppChannel", () => {
  it("should create WhatsApp channel with config", () => {
    const config: WhatsAppConfig = {
      type: "whatsapp",
      enabled: true,
      authPath: "/tmp/test-auth",
    };
    const channel = createWhatsAppChannel(config);
    expect(channel).toBeInstanceOf(WhatsAppChannel);
  });
});

describe("WhatsAppMessageHandler", () => {
  let handler: WhatsAppMessageHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createMessageHandler();
  });

  describe("sendText", () => {
    it("should throw error when socket not set", async () => {
      await expect(handler.sendText("1234567890", "Hello")).rejects.toThrow(
        "Socket not initialized",
      );
    });
  });

  describe("parseMessage", () => {
    it("should parse basic text message", () => {
      const rawMessage = {
        key: {
          id: "msg-123",
          remoteJid: "1234567890@s.whatsapp.net",
          fromMe: false,
        },
        message: {
          conversation: "Hello, world!",
        },
        messageTimestamp: 1234567890,
      };
      const result = handler.parseMessage(rawMessage, "1234567890@s.whatsapp.net");
      expect(result.id).toBe("msg-123");
      expect(result.content).toBe("Hello, world!");
      expect(result.isGroup).toBe(false);
    });
  });
});

describe("WhatsAppAttachmentHandler", () => {
  let handler: WhatsAppAttachmentHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createAttachmentHandler();
  });

  describe("getMediaType", () => {
    it("should identify image message", () => {
      const message = { imageMessage: {} };
      expect(handler.getMediaType(message)).toBe("image");
    });

    it("should identify video message", () => {
      const message = { videoMessage: {} };
      expect(handler.getMediaType(message)).toBe("video");
    });

    it("should identify audio message", () => {
      const message = { audioMessage: {} };
      expect(handler.getMediaType(message)).toBe("audio");
    });

    it("should return null for unknown type", () => {
      const message = { conversation: "test" };
      expect(handler.getMediaType(message)).toBeNull();
    });
  });

  describe("getMediaInfo", () => {
    it("should extract image info", () => {
      const message = {
        imageMessage: {
          url: "https://example.com/image.jpg",
          mimetype: "image/jpeg",
          caption: "A beautiful image",
          fileLength: "1024000",
        },
      };
      const result = handler.getMediaInfo(message);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("image");
    });

    it("should return null for non-media message", () => {
      const message = { conversation: "Just text" };
      const result = handler.getMediaInfo(message);
      expect(result).toBeNull();
    });
  });

  describe("validateMediaSize", () => {
    it("should validate image size under limit", () => {
      expect(handler.validateMediaSize("image", 10 * 1024 * 1024)).toBe(true);
    });

    it("should reject image size over limit", () => {
      expect(handler.validateMediaSize("image", 20 * 1024 * 1024)).toBe(false);
    });
  });

  describe("getMaxMediaSize", () => {
    it("should return correct max size for images", () => {
      expect(handler.getMaxMediaSize("image")).toBe(16 * 1024 * 1024);
    });
  });
});

describe("WhatsApp Types", () => {
  it("should export all required runtime exports", async () => {
    // Verify runtime exports (classes and functions)
    const module = await import("./index.js");

    expect(module.WhatsAppChannel).toBeDefined();
    expect(module.createWhatsAppChannel).toBeDefined();
    expect(module.WhatsAppMessageHandler).toBeDefined();
    expect(module.createMessageHandler).toBeDefined();
    expect(module.WhatsAppAttachmentHandler).toBeDefined();
    expect(module.createAttachmentHandler).toBeDefined();

    // Note: Type-only exports (WhatsAppConfig, WhatsAppMessage, etc.) are erased at runtime
    // and cannot be asserted with toBeDefined(). They are verified at compile-time by TypeScript.
  });
});
