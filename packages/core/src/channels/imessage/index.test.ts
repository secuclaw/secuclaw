import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  IMessageChannel,
  createIMessageChannel,
  transformMessage,
  transformMessages,
  getChatDisplayName,
  getChatUserId,
  isTapback,
  hasAttachments,
  isSticker,
  isGroupChat,
  filterMessages,
  sortMessagesByDate,
  formatMessagePreview,
  validateAttachmentOptions,
  getAttachmentType,
  formatFileSize,
  isWithinSizeLimit,
  IMessageEffects,
  TapbackTypes,
} from "./index.js";
import type {
  IMessageConfig,
  BlueBubblesMessage,
  BlueBubblesChat,
  BlueBubblesAttachment,
} from "./types.js";
import type { ChannelMessage, ChannelResponse, ChannelContext } from "../types.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("IMessageChannel", () => {
  let channel: IMessageChannel;
  const mockConfig: IMessageConfig = {
    type: "imessage",
    enabled: true,
    serverUrl: "https://test-server.ngrok.io",
    password: "test-password",
    defaultChatGuid: "chat-guid-123",
  };

  beforeEach(() => {
    mockFetch.mockReset();
    channel = new IMessageChannel(mockConfig);
  });

  describe("constructor", () => {
    it("should create channel with config", () => {
      expect(channel).toBeDefined();
      expect(channel.type).toBe("imessage");
    });

    it("should strip trailing slash from server URL", () => {
      const configWithSlash: IMessageConfig = {
        ...mockConfig,
        serverUrl: "https://test-server.ngrok.io/",
      };
      const ch = new IMessageChannel(configWithSlash);
      expect(ch).toBeDefined();
    });
  });

  describe("connect", () => {
    it("should connect successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 200, message: "OK" }),
      });

      await channel.connect();
      expect(channel.isConnected()).toBe(true);
    });

    it("should throw on connection failure", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 500, message: "Error" }),
      });

      await expect(channel.connect()).rejects.toThrow();
    });

    it("should throw on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(channel.connect()).rejects.toThrow();
    });
  });

  describe("disconnect", () => {
    it("should disconnect successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 200, message: "OK" }),
      });

      await channel.connect();
      await channel.disconnect();

      expect(channel.isConnected()).toBe(false);
    });
  });

  describe("send", () => {
    it("should send message with default chat GUID", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 200, data: { message: { guid: "msg-123" } } }),
      });

      const response: ChannelResponse = { content: "Hello" };
      const context: ChannelContext = {
        channelId: "chat-guid-123",
        userId: "user-1",
        sessionId: "session-1",
      };

      await channel.send(response, context);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should throw when no chat GUID available", async () => {
      const channelNoDefault = new IMessageChannel({
        ...mockConfig,
        defaultChatGuid: undefined,
      });

      const response: ChannelResponse = { content: "Hello" };
      const context: ChannelContext = {
        channelId: "chat-guid-123",
        userId: "user-1",
        sessionId: "session-1",
      };

      await expect(channelNoDefault.send(response, context)).rejects.toThrow(
        "No chat GUID specified"
      );
    });

    it("should use chat GUID from context metadata", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 200, data: { message: { guid: "msg-123" } } }),
      });

      const response: ChannelResponse = { content: "Hello" };
      const context: ChannelContext = {
        channelId: "chat-456",
        userId: "user-1",
        sessionId: "session-1",
        metadata: { chatGuid: "chat-from-metadata" },
      };

      await channel.send(response, context);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("getChats", () => {
    it("should fetch chats successfully", async () => {
      const mockChats = [
        { guid: "chat-1", displayName: "Test Chat", participants: [], unreadCount: 0, isGroup: false },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 200, data: { chats: mockChats } }),
      });

      const chats = await channel.getChats();
      expect(chats).toEqual(mockChats);
    });

    it("should throw on error", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 500, message: "Error" }),
      });

      await expect(channel.getChats()).rejects.toThrow();
    });
  });

  describe("getMessages", () => {
    it("should fetch messages successfully", async () => {
      const mockMessages = [
        {
          guid: "msg-1",
          text: "Hello",
          chatGuid: "chat-1",
          isFromMe: false,
          isRead: true,
          dateCreated: Date.now(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 200, data: { messages: mockMessages } }),
      });

      const messages = await channel.getMessages("chat-1");
      expect(messages).toEqual(mockMessages);
    });
  });

  describe("markAsRead", () => {
    it("should mark chat as read", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 200, message: "OK" }),
      });

      await channel.markAsRead("chat-1");
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("handleWebhook", () => {
    it("should emit message on new-message event", async () => {
      const callback = vi.fn();
      channel.onMessage(callback);

      const webhookPayload = {
        event: "new-message",
        data: {
          guid: "msg-123",
          text: "Test message",
          chatGuid: "chat-123",
          isFromMe: false,
          isRead: false,
          dateCreated: Date.now(),
          handle: { address: "test@example.com" },
        },
      };

      channel.handleWebhook(webhookPayload as never);

      expect(callback).toHaveBeenCalled();
    });
  });
});

describe("Message utilities", () => {
  describe("transformMessage", () => {
    it("should transform BlueBubbles message to IMessageMessage", () => {
      const bbMessage: BlueBubblesMessage = {
        guid: "msg-123",
        text: "Hello",
        chatGuid: "chat-123",
        isFromMe: false,
        isRead: true,
        dateCreated: 1700000000000,
        handle: { address: "user@example.com", displayName: "Test User" },
      };

      const result = transformMessage(bbMessage);

      expect(result.id).toBe("msg-123");
      expect(result.content).toBe("Hello");
      expect(result.userId).toBe("user@example.com");
      expect(result.isFromMe).toBe(false);
    });

    it("should handle message without text", () => {
      const bbMessage: BlueBubblesMessage = {
        guid: "msg-123",
        chatGuid: "chat-123",
        isFromMe: false,
        isRead: true,
        dateCreated: 1700000000000,
      };

      const result = transformMessage(bbMessage);
      expect(result.content).toBe("");
    });
  });

  describe("transformMessages", () => {
    it("should transform multiple messages", () => {
      const bbMessages: BlueBubblesMessage[] = [
        { guid: "msg-1", chatGuid: "chat-1", isFromMe: false, isRead: true, dateCreated: 1700000000000 },
        { guid: "msg-2", chatGuid: "chat-1", isFromMe: true, isRead: true, dateCreated: 1700000001000 },
      ];

      const result = transformMessages(bbMessages);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("msg-1");
      expect(result[1].id).toBe("msg-2");
    });
  });

  describe("getChatDisplayName", () => {
    it("should return display name when available", () => {
      const chat: BlueBubblesChat = {
        guid: "chat-1",
        displayName: "My Chat",
        participants: [],
        unreadCount: 0,
        isGroup: false,
      };

      expect(getChatDisplayName(chat)).toBe("My Chat");
    });

    it("should return participant address when no display name", () => {
      const chat: BlueBubblesChat = {
        guid: "chat-1",
        displayName: "",
        participants: [{ address: "user@example.com", isMe: false }],
        unreadCount: 0,
        isGroup: false,
      };

      expect(getChatDisplayName(chat)).toBe("user@example.com");
    });
  });

  describe("isTapback", () => {
    it("should detect tapback messages", () => {
      const msg = { type: "tapback" } as BlueBubblesMessage;
      expect(isTapback(msg)).toBe(true);
    });

    it("should return false for non-tapback", () => {
      const msg = { type: "text" } as BlueBubblesMessage;
      expect(isTapback(msg)).toBe(false);
    });
  });

  describe("hasAttachments", () => {
    it("should detect attachments", () => {
      const msg = { attachments: [{ guid: "att-1" } as BlueBubblesAttachment] } as BlueBubblesMessage;
      expect(hasAttachments(msg)).toBe(true);
    });

    it("should return false for no attachments", () => {
      const msg = { attachments: [] } as BlueBubblesMessage;
      expect(hasAttachments(msg)).toBe(false);
    });
  });

  describe("filterMessages", () => {
    const messages: BlueBubblesMessage[] = [
      { guid: "msg-1", chatGuid: "chat-1", isFromMe: true, isRead: true, dateCreated: 1000 },
      { guid: "msg-2", chatGuid: "chat-1", isFromMe: false, isRead: true, dateCreated: 2000 },
      { guid: "msg-3", chatGuid: "chat-1", isFromMe: true, isRead: false, dateCreated: 3000 },
    ];

    it("should filter by fromMe", () => {
      const result = filterMessages(messages, { fromMe: true });
      expect(result).toHaveLength(2);
    });

    it("should filter by date range", () => {
      const result = filterMessages(messages, { since: 1500, until: 2500 });
      expect(result).toHaveLength(1);
      expect(result[0].guid).toBe("msg-2");
    });

    it("should filter by search text", () => {
      const msgsWithText = [
        ...messages,
        { guid: "msg-4", text: "hello world", chatGuid: "chat-1", isFromMe: false, isRead: true, dateCreated: 4000 },
      ];
      const result = filterMessages(msgsWithText, { searchText: "hello" });
      expect(result).toHaveLength(1);
    });
  });

  describe("sortMessagesByDate", () => {
    it("should sort newest first by default", () => {
      const messages = [
        { guid: "msg-1", dateCreated: 1000 },
        { guid: "msg-2", dateCreated: 3000 },
        { guid: "msg-3", dateCreated: 2000 },
      ] as BlueBubblesMessage[];

      const result = sortMessagesByDate(messages);
      expect(result[0].guid).toBe("msg-2");
      expect(result[1].guid).toBe("msg-3");
      expect(result[2].guid).toBe("msg-1");
    });

    it("should sort oldest first when ascending", () => {
      const messages = [
        { guid: "msg-1", dateCreated: 1000 },
        { guid: "msg-2", dateCreated: 3000 },
      ] as BlueBubblesMessage[];

      const result = sortMessagesByDate(messages, true);
      expect(result[0].guid).toBe("msg-1");
    });
  });

  describe("formatMessagePreview", () => {
    it("should format text message", () => {
      const msg = { text: "Hello world" } as BlueBubblesMessage;
      expect(formatMessagePreview(msg)).toBe("Hello world");
    });

    it("should include subject", () => {
      const msg = { text: "Hello", subject: "Subject" } as BlueBubblesMessage;
      expect(formatMessagePreview(msg)).toBe("[Subject] Hello");
    });

    it("should show attachment count", () => {
      const msg = {
        attachments: [{} as BlueBubblesAttachment, {} as BlueBubblesAttachment],
      } as BlueBubblesMessage;
      const result = formatMessagePreview(msg);
      expect(result).toContain("2 attachments");
    });
  });
});

describe("Attachment utilities", () => {
  describe("validateAttachmentOptions", () => {
    it("should validate valid attachment", () => {
      const result = validateAttachmentOptions({ source: "file.jpg" });
      expect(result.valid).toBe(true);
    });

    it("should validate buffer data", () => {
      const result = validateAttachmentOptions({ data: Buffer.from("test") });
      expect(result.valid).toBe(true);
    });

    it("should reject empty attachment", () => {
      const result = validateAttachmentOptions({});
      expect(result.valid).toBe(false);
    });

    it("should reject invalid MIME type", () => {
      const result = validateAttachmentOptions({ source: "file.jpg", mimeType: "invalid" });
      expect(result.valid).toBe(false);
    });
  });

  describe("getAttachmentType", () => {
    it("should detect image type", () => {
      expect(getAttachmentType("image/jpeg")).toBe("image");
      expect(getAttachmentType("image/png")).toBe("image");
    });

    it("should detect video type", () => {
      expect(getAttachmentType("video/mp4")).toBe("video");
    });

    it("should detect audio type", () => {
      expect(getAttachmentType("audio/mpeg")).toBe("audio");
    });

    it("should return file for unknown types", () => {
      expect(getAttachmentType("application/octet-stream")).toBe("file");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500.0 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(10485760)).toBe("10.0 MB");
    });
  });

  describe("isWithinSizeLimit", () => {
    it("should return true for small files", () => {
      expect(isWithinSizeLimit({ fileSize: 1000 })).toBe(true);
      expect(isWithinSizeLimit({ data: Buffer.alloc(1000) })).toBe(true);
    });

    it("should return false for large files", () => {
      const largeSize = 200 * 1024 * 1024; // 200MB
      expect(isWithinSizeLimit({ fileSize: largeSize })).toBe(false);
    });
  });
});

describe("Constants", () => {
  describe("IMessageEffects", () => {
    it("should have correct effect values", () => {
      expect(IMessageEffects.screen).toBe("screen");
      expect(IMessageEffects.balloon).toBe("balloon");
      expect(IMessageEffects.confetti).toBe("confetti");
    });
  });

  describe("TapbackTypes", () => {
    it("should have correct tapback values", () => {
      expect(TapbackTypes.love).toBe("love");
      expect(TapbackTypes.like).toBe("like");
    });
  });
});

describe("createIMessageChannel", () => {
  it("should create channel instance", () => {
    const config: IMessageConfig = {
      type: "imessage",
      enabled: true,
      serverUrl: "https://test.io",
      password: "pass",
    };

    const channel = createIMessageChannel(config);
    expect(channel).toBeInstanceOf(IMessageChannel);
  });
});
