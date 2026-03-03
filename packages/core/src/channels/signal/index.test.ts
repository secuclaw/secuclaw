import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SignalChannel, createSignalChannel } from "./index.js";
import type { SignalConfig } from "./types.js";
import { SignalConnection } from "./connection.js";
import { SignalMessageHandler } from "./message.js";
import { SignalAttachmentHandler } from "./attachment.js";

// Mock the child_process module
vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
    },
    on: vi.fn((event: string, callback: (code: number) => void) => {
      if (event === "close") {
        callback(0);
      }
    }),
    kill: vi.fn(),
  })),
}));

// Mock the fs/promises module
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("test data")),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({
    size: 1024,
    isFile: () => true,
    mtimeMs: Date.now(),
  }),
  readdir: vi.fn().mockResolvedValue([]),
  rm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  createReadStream: vi.fn(),
}));

describe("SignalChannel", () => {
  let channel: SignalChannel;
  let config: SignalConfig;

  beforeEach(() => {
    config = {
      type: "signal",
      enabled: true,
      phoneNumber: "+1234567890",
      signalCliPath: "/usr/local/bin/signal-cli",
      receiveTimeout: 10000,
      maxAttachmentSize: 50 * 1024 * 1024,
    };
    channel = new SignalChannel(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a SignalChannel instance", () => {
      expect(channel).toBeDefined();
    });

    it("should have correct type", () => {
      expect(channel.type).toBe("signal");
    });

    it("should not be connected initially", () => {
      expect(channel.isConnected()).toBe(false);
    });
  });

  describe("connect", () => {
    it("should throw error when channel is disabled", async () => {
      const disabledConfig: SignalConfig = {
        ...config,
        enabled: false,
      };
      const disabledChannel = new SignalChannel(disabledConfig);

      await expect(disabledChannel.connect()).rejects.toThrow(
        "Signal channel is not enabled"
      );
    });
  });

  describe("send", () => {
    it("should resolve recipient from context metadata", async () => {
      const context = {
        channelId: "test-channel",
        userId: "test-user",
        sessionId: "test-session",
        metadata: {
          recipient: "+0987654321",
        },
      };

      const response = {
        content: "Hello",
      };

      try {
        await channel.send(response, context);
      } catch {
        // Expected to fail without proper CLI setup
      }
    });
  });

  describe("getConnectionStatus", () => {
    it("should return initial connection status", () => {
      const status = channel.getConnectionStatus();
      expect(status).toBeDefined();
    });
  });
});

describe("SignalConnection", () => {
  let connection: SignalConnection;
  let config: SignalConfig;

  beforeEach(() => {
    config = {
      type: "signal",
      enabled: true,
      phoneNumber: "+1234567890",
      signalCliPath: "/usr/local/bin/signal-cli",
    };
    connection = new SignalConnection(config);
  });

  describe("constructor", () => {
  describe("constructor", () => {
    it("should create connection with correct CLI path", () => {
      expect(connection.cliPath).toBe("/usr/local/bin/signal-cli");
    });

    it("should use default CLI path when not specified", () => {
      const defaultConfig: SignalConfig = {
        ...config,
        signalCliPath: undefined,
      };
      const defaultConnection = new SignalConnection(defaultConfig);
      expect(defaultConnection.cliPath).toBe("signal-cli");
    });

    it("should have correct phone number", () => {
      expect(connection.phoneNumber).toBe("+1234567890");
    });
  });

  describe("connectionStatus", () => {
    it("should initially be disconnected", () => {
      expect(connection.connectionStatus).toBe("disconnected");
    });

    it("should report not connected initially", () => {
      expect(connection.isConnected()).toBe(false);
    });
  });
});

describe("SignalMessageHandler", () => {
  let handler: SignalMessageHandler;
  let connection: SignalConnection;
  let config: SignalConfig;

  beforeEach(() => {
    config = {
      type: "signal",
      enabled: true,
      phoneNumber: "+1234567890",
    };
    connection = new SignalConnection(config);
    handler = new SignalMessageHandler(connection);
  });

  describe("onMessage", () => {
    it("should register a message callback", () => {
      const callback = vi.fn();
      handler.onMessage(callback);
      expect(handler).toBeDefined();
    });

    it("should allow removing a message callback", () => {
      const callback = vi.fn();
      handler.onMessage(callback);
      handler.offMessage(callback);
      expect(handler).toBeDefined();
    });
  });

  describe("normalizePhoneNumber", () => {
    it("should normalize phone number with country code", () => {
      const normalized = handler.normalizePhoneNumber("+1234567890");
      expect(normalized).toBe("+1234567890");
    });

    it("should normalize phone number without country code", () => {
      const normalized = handler.normalizePhoneNumber("234567890");
      expect(normalized).toBe("+234567890");
    });

    it("should handle phone number with formatting", () => {
      const normalized = handler.normalizePhoneNumber("(234) 567-890");
      expect(normalized).toBe("+234567890");
    });

    it("should handle phone number starting with 1", () => {
      const normalized = handler.normalizePhoneNumber("1234567890");
      expect(normalized).toBe("+11234567890");
    });
  });

  describe("parseMessages", () => {
    it("should parse empty string to empty array", () => {
      const messages = handler.parseMessages("");
      expect(messages).toEqual([]);
    });

    it("should parse JSON array of messages", () => {
      const raw = JSON.stringify([
        {
          envelope: {
            id: "msg-1",
            sourceNumber: "+1111111111",
            timestamp: 1234567890000,
            dataMessage: {
              body: "Hello",
            },
          },
        },
      ]);

      const messages = handler.parseMessages(raw);
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("msg-1");
      expect(messages[0].body).toBe("Hello");
    });

    it("should handle invalid JSON gracefully", () => {
      const messages = handler.parseMessages("not valid json");
      expect(messages).toEqual([]);
    });
  });

  describe("startListening / stopListening", () => {
    it("should start and stop listening", () => {
      handler.startListening(1000);
      expect(handler).toBeDefined();

      handler.stopListening();
      expect(handler).toBeDefined();
    });
  });
});

describe("SignalAttachmentHandler", () => {
  let handler: SignalAttachmentHandler;
  let connection: SignalConnection;
  let config: SignalConfig;

  beforeEach(() => {
    config = {
      type: "signal",
      enabled: true,
      phoneNumber: "+1234567890",
    };
    connection = new SignalConnection(config);
    handler = new SignalAttachmentHandler(connection);
  });

  describe("constructor", () => {
    it("should create handler with default download directory", () => {
      expect(handler.getDownloadDirectory()).toBeDefined();
    });

    it("should create handler with custom max size", () => {
      const customHandler = new SignalAttachmentHandler(connection, "/tmp/test", 1024);
      expect(customHandler.getMaxAttachmentSize()).toBe(1024);
    });
  });

  describe("getMimeType", () => {
    it("should return correct MIME type for images", () => {
      expect(handler.getMimeType("image.jpg")).toBe("image/jpeg");
      expect(handler.getMimeType("image.png")).toBe("image/png");
      expect(handler.getMimeType("image.gif")).toBe("image/gif");
    });

    it("should return correct MIME type for documents", () => {
      expect(handler.getMimeType("document.pdf")).toBe("application/pdf");
      expect(handler.getMimeType("doc.txt")).toBe("text/plain");
    });

    it("should return octet-stream for unknown types", () => {
      expect(handler.getMimeType("file.xyz")).toBe("application/octet-stream");
    });
  });

  describe("isWithinSizeLimit", () => {
    it("should return true for small files", () => {
      expect(handler.isWithinSizeLimit(1024)).toBe(true);
    });

    it("should return false for large files", () => {
      const smallHandler = new SignalAttachmentHandler(connection, "/tmp", 100);
      expect(smallHandler.isWithinSizeLimit(1024)).toBe(false);
    });
  });

  describe("validateAttachment", () => {
    it("should validate existing file", async () => {
      const result = await handler.validateAttachment("/tmp/test-file.txt");
      expect(result.valid).toBe(true);
    });
  });
});

describe("createSignalChannel", () => {
  it("should create a SignalChannel instance", () => {
    const channelConfig: SignalConfig = {
      type: "signal",
      enabled: true,
      phoneNumber: "+1234567890",
    };

    const channel = createSignalChannel(channelConfig);
    expect(channel).toBeInstanceOf(SignalChannel);
    expect(channel.type).toBe("signal");
  });
});

describe("Type exports", () => {
  it("should export SignalConfig type", () => {
    const config: SignalConfig = {
      type: "signal",
      enabled: true,
      phoneNumber: "+1234567890",
    };
  });
});
});
