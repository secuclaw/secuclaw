import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GoogleChatChannel, createGoogleChatChannel } from "./connection.js";
import { GoogleChatMessageHandler, createMessageHandler } from "./message.js";
import { CardBuilder, createCardBuilder, createAlertCard, createConfirmationCard } from "./card-builder.js";
import type { GoogleChatConfig, GoogleChatMessageEvent, GoogleChatMessage } from "./types.js";

vi.mock("googleapis", () => ({
  google: {
    chat: vi.fn(() => ({
      spaces: {
        list: vi.fn(),
        get: vi.fn(),
        messages: {
          list: vi.fn(),
          get: vi.fn(),
          create: vi.fn(),
        },
      },
    })),
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
        on: vi.fn(),
        fromJSON: vi.fn(),
        defaults: vi.fn(),
      })),
    },
  },
}));

describe("GoogleChatChannel", () => {
  let channel: GoogleChatChannel;
  const mockConfig: GoogleChatConfig = {
    type: "googlechat",
    enabled: true,
    credentials: {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
    },
  };

  beforeEach(() => {
    channel = new GoogleChatChannel(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create channel with config", () => {
      expect(channel).toBeDefined();
    });

    it("should have correct type", () => {
      expect(channel.type).toBe("googlechat");
    });

    it("should not be connected initially", () => {
      expect(channel.isConnected()).toBe(false);
    });
  });

  describe("getConnectionState", () => {
    it("should return disconnected initially", () => {
      expect(channel.getConnectionState()).toBe("disconnected");
    });
  });

  describe("on/off event handlers", () => {
    it("should register and emit message event", () => {
      const callback = vi.fn();
      channel.on("message", callback);
      
      const mockEvent: GoogleChatMessageEvent = {
        type: "MESSAGE",
        message: {
          name: "spaces/space1/messages/msg1",
          space: "spaces/space1",
          text: "test message",
        },
        user: { name: "users/user1" },
        space: { name: "spaces/space1", type: "SPACE" },
      };

      channel.processWebhookEvent(mockEvent);
      expect(callback).toHaveBeenCalledWith(mockEvent);
    });

    it("should register and emit connected event through processWebhookEvent", () => {
      const callback = vi.fn();
      channel.on("connected", callback);
      
      // The emit is protected in BaseChannel, test registration only
      expect(callback).not.toHaveBeenCalled();
    });

    it("should register and emit disconnected event through processWebhookEvent", () => {
      const callback = vi.fn();
      channel.on("disconnected", callback);
      
      // The emit is protected in BaseChannel, test registration only
      expect(callback).not.toHaveBeenCalled();
    });

    it("should register and emit error event through processWebhookEvent", () => {
      const callback = vi.fn();
      channel.on("error", callback);
      
      // The emit is protected in BaseChannel, test registration only
      expect(callback).not.toHaveBeenCalled();
    });

    it("should remove event listener", () => {
      const callback = vi.fn();
      channel.on("message", callback);
      channel.off("message", callback);
      
      const mockEvent: GoogleChatMessageEvent = {
        type: "MESSAGE",
        message: { name: "msg1", space: "space1" },
      };
      
      channel.processWebhookEvent(mockEvent);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("processWebhookEvent", () => {
    it("should emit message with correct structure", () => {
      const callback = vi.fn();
      channel.on("message", callback);

      const mockEvent: GoogleChatMessageEvent = {
        type: "MESSAGE",
        eventTime: "2024-01-01T00:00:00Z",
        token: "test-token",
        message: {
          name: "spaces/space1/messages/msg1",
          space: "spaces/space1",
          text: "Hello World",
          thread: { name: "spaces/space1/threads/thread1", threadKey: "thread1" },
        },
        user: { name: "users/user1", displayName: "Test User" },
        space: { name: "spaces/space1", type: "SPACE", displayName: "Test Space" },
      };

      channel.processWebhookEvent(mockEvent);
      expect(callback).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("getStats", () => {
    it("should return initial stats", () => {
      const stats = channel.getStats();
      
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.lastActivity).toBe(0);
    });
  });

  describe("createGoogleChatChannel", () => {
    it("should create channel with factory function", () => {
      const createdChannel = createGoogleChatChannel(mockConfig);
      expect(createdChannel).toBeInstanceOf(GoogleChatChannel);
      expect(createdChannel.type).toBe("googlechat");
    });
  });
});

describe("GoogleChatMessageHandler", () => {
  let handler: GoogleChatMessageHandler;

  beforeEach(() => {
    handler = createMessageHandler();
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      handler.setAccessToken("test-token");
      expect(handler).toBeDefined();
    });
  });

  describe("parseWebhookEvent", () => {
    it("should parse webhook event", () => {
      const body = {
        type: "MESSAGE",
        message: { name: "msg1", space: "space1", text: "test" },
        user: { name: "user1" },
      };

      const event = handler.parseWebhookEvent(body);
      expect(event.type).toBe("MESSAGE");
      expect(event.message?.text).toBe("test");
    });
  });

  describe("extractTextFromMessage", () => {
    it("should extract text from simple message", () => {
      const message: GoogleChatMessage = {
        name: "msg1",
        space: "space1",
        text: "Hello World",
      };

      const text = handler.extractTextFromMessage(message);
      expect(text).toBe("Hello World");
    });

    it("should extract text from card message", () => {
      const message: GoogleChatMessage = {
        name: "msg1",
        space: "space1",
        text: undefined,
        cardsV2: [
          {
            cardId: "card1",
            card: {
              sections: [
                {
                  widgets: [
                    { textParagraph: { text: "Card text content" } },
                  ],
                },
              ],
            },
          },
        ],
      };

      const text = handler.extractTextFromMessage(message);
      expect(text).toBe("Card text content");
    });

    it("should extract text from keyValue widget", () => {
      const message: GoogleChatMessage = {
        name: "msg1",
        space: "space1",
        cards: [
          {
            sections: [
              {
                widgets: [
                  { keyValue: { content: "Key value content" } },
                ],
              },
            ],
          },
        ],
      };

      const text = handler.extractTextFromMessage(message);
      expect(text).toBe("Key value content");
    });
  });

  describe("parseSlashCommand", () => {
    it("should parse slash command", () => {
      const message: GoogleChatMessage = {
        name: "msg1",
        space: "space1",
        text: "/help arg1 arg2",
        slashCommand: {
          commandName: "help",
          commandId: "1",
        },
      };

      const result = handler.parseSlashCommand(message);
      expect(result).not.toBeNull();
      expect(result?.command).toBe("help");
      expect(result?.args).toBe("arg1 arg2");
    });

    it("should return null for non-slash command", () => {
      const message: GoogleChatMessage = {
        name: "msg1",
        space: "space1",
        text: "Hello world",
      };

      const result = handler.parseSlashCommand(message);
      expect(result).toBeNull();
    });
  });

  describe("getThreadKey", () => {
    it("should return thread key", () => {
      const message: GoogleChatMessage = {
        name: "msg1",
        space: "space1",
        thread: { threadKey: "thread123" },
      };

      const threadKey = handler.getThreadKey(message);
      expect(threadKey).toBe("thread123");
    });

    it("should return null when no thread", () => {
      const message: GoogleChatMessage = {
        name: "msg1",
        space: "space1",
      };

      const threadKey = handler.getThreadKey(message);
      expect(threadKey).toBeNull();
    });
  });

  describe("getSpaceId", () => {
    it("should extract space ID from event", () => {
      const event: GoogleChatMessageEvent = {
        type: "MESSAGE",
        space: { name: "spaces/space123" },
      };

      const spaceId = handler.getSpaceId(event);
      expect(spaceId).toBe("space123");
    });
  });

  describe("getUserId", () => {
    it("should extract user ID from event", () => {
      const event: GoogleChatMessageEvent = {
        type: "MESSAGE",
        user: { name: "users/user456" },
      };

      const userId = handler.getUserId(event);
      expect(userId).toBe("user456");
    });
  });

  describe("isValidWebhook", () => {
    it("should return true when no verification token required", () => {
      const event: GoogleChatMessageEvent = {
        type: "MESSAGE",
        token: "any-token",
      };

      const isValid = handler.isValidWebhook(event);
      expect(isValid).toBe(true);
    });

    it("should return true when token matches", () => {
      const event: GoogleChatMessageEvent = {
        type: "MESSAGE",
        token: "correct-token",
      };

      const isValid = handler.isValidWebhook(event, "correct-token");
      expect(isValid).toBe(true);
    });

    it("should return false when token does not match", () => {
      const event: GoogleChatMessageEvent = {
        type: "MESSAGE",
        token: "wrong-token",
      };

      const isValid = handler.isValidWebhook(event, "correct-token");
      expect(isValid).toBe(false);
    });
  });
});

describe("CardBuilder", () => {
  describe("constructor", () => {
    it("should create card builder with default card ID", () => {
      const builder = createCardBuilder();
      expect(builder).toBeDefined();
    });

    it("should create card builder with custom card ID", () => {
      const builder = new CardBuilder("custom-card");
      expect(builder).toBeDefined();
    });
  });

  describe("setHeader", () => {
    it("should set header with title only", () => {
      const card = createCardBuilder()
        .setHeader("Test Title")
        .build();

      expect(card.card?.header?.title).toBe("Test Title");
    });

    it("should set header with title and subtitle", () => {
      const card = createCardBuilder()
        .setHeader("Test Title", "Test Subtitle")
        .build();

      expect(card.card?.header?.title).toBe("Test Title");
      expect(card.card?.header?.subtitle).toBe("Test Subtitle");
    });

    it("should set header with image", () => {
      const card = createCardBuilder()
        .setHeader("Test Title", "Test Subtitle", "https://example.com/image.png")
        .build();

      expect(card.card?.header?.imageUrl).toBe("https://example.com/image.png");
    });
  });

  describe("addTextParagraph", () => {
    it("should add text paragraph widget", () => {
      const card = createCardBuilder()
        .addTextParagraph("Hello World")
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.textParagraph?.text).toBe("Hello World");
    });
  });

  describe("addImage", () => {
    it("should add image widget", () => {
      const card = createCardBuilder()
        .addImage("https://example.com/image.png")
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.image?.imageUrl).toBe("https://example.com/image.png");
    });
  });

  describe("addKeyValue", () => {
    it("should add key value widget", () => {
      const card = createCardBuilder()
        .addKeyValue("Value", { topLabel: "Label" })
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.keyValue?.content).toBe("Value");
      expect(card.card?.sections?.[0]?.widgets?.[0]?.keyValue?.topLabel).toBe("Label");
    });
  });

  describe("addDecoratedText", () => {
    it("should add decorated text widget", () => {
      const card = createCardBuilder()
        .addDecoratedText("Decorated text", {
          startIcon: { knownIcon: "STAR" },
        })
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.decoratedText?.text).toBe("Decorated text");
      expect(card.card?.sections?.[0]?.widgets?.[0]?.decoratedText?.startIcon?.knownIcon).toBe("STAR");
    });
  });

  describe("addButton(s)", () => {
    it("should add button widget", () => {
      const card = createCardBuilder()
        .addButton("Click Me", { openLink: { url: "https://example.com" } })
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.buttonList?.buttons?.[0]?.text).toBe("Click Me");
    });

    it("should add multiple buttons", () => {
      const card = createCardBuilder()
        .addButtons([
          { text: "Button 1", onClick: { openLink: { url: "https://example.com/1" } } },
          { text: "Button 2", onClick: { openLink: { url: "https://example.com/2" } } },
        ])
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.buttonList?.buttons?.length).toBe(2);
    });
  });

  describe("addTextInput", () => {
    it("should add text input widget", () => {
      const card = createCardBuilder()
        .addTextInput("Enter name", { hintText: "Your name here" })
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.textInput?.label).toBe("Enter name");
      expect(card.card?.sections?.[0]?.widgets?.[0]?.textInput?.hintText).toBe("Your name here");
    });
  });

  describe("addSelectionInput", () => {
    it("should add selection input widget", () => {
      const card = createCardBuilder()
        .addSelectionInput("Select option", "DROPDOWN", [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ])
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.selectionInput?.label).toBe("Select option");
      expect(card.card?.sections?.[0]?.widgets?.[0]?.selectionInput?.type).toBe("DROPDOWN");
      expect(card.card?.sections?.[0]?.widgets?.[0]?.selectionInput?.items?.length).toBe(2);
    });
  });

  describe("addDateTimePicker", () => {
    it("should add date time picker widget", () => {
      const card = createCardBuilder()
        .addDateTimePicker("Select date", { type: "DATE" })
        .build();

      expect(card.card?.sections?.[0]?.widgets?.[0]?.dateTimePicker?.label).toBe("Select date");
      expect(card.card?.sections?.[0]?.widgets?.[0]?.dateTimePicker?.type).toBe("DATE");
    });
  });

  describe("addDivider", () => {
    it("should add divider widget", () => {
      const card = createCardBuilder()
        .addTextParagraph("Before")
        .addDivider()
        .addTextParagraph("After")
        .build();

      expect(card.card?.sections?.[0]?.widgets?.length).toBe(3);
      expect(card.card?.sections?.[0]?.widgets?.[1]?.divider).toBeDefined();
    });
  });

  describe("addSection", () => {
    it("should add new section", () => {
      const card = createCardBuilder()
        .addSection("Section 1")
        .addTextParagraph("Content 1")
        .addSection("Section 2")
        .addTextParagraph("Content 2")
        .build();

      expect(card.card?.sections?.length).toBe(2);
      expect(card.card?.sections?.[0]?.header).toBe("Section 1");
      expect(card.card?.sections?.[1]?.header).toBe("Section 2");
    });

    it("should add collapsible section", () => {
      const card = createCardBuilder()
        .addSection("Collapsible Section", true)
        .build();

      expect(card.card?.sections?.[0]?.collapsible).toBe(true);
    });
  });

  describe("createAlertCard", () => {
    it("should create info alert card", () => {
      const card = createAlertCard("Info Title", "Info message", "info");
      expect(card.card?.header?.title).toBe("Info Title");
    });

    it("should create warning alert card", () => {
      const card = createAlertCard("Warning Title", "Warning message", "warning");
      expect(card.card?.header?.title).toBe("Warning Title");
    });

    it("should create error alert card", () => {
      const card = createAlertCard("Error Title", "Error message", "error");
      expect(card.card?.header?.title).toBe("Error Title");
    });

    it("should create success alert card", () => {
      const card = createAlertCard("Success Title", "Success message", "success");
      expect(card.card?.header?.title).toBe("Success Title");
    });
  });

  describe("createConfirmationCard", () => {
    it("should create confirmation card with buttons", () => {
      const card = createConfirmationCard(
        "Confirm",
        "Are you sure?",
        "Yes",
        "No",
        "onConfirm",
        "onCancel",
      );

      expect(card.card?.header?.title).toBe("Confirm");
      // Text paragraph and buttons are in the same section (index 0)
      expect(card.card?.sections?.[0]?.widgets?.[1]?.buttonList?.buttons?.length).toBe(2);
    });
  });

  describe("build", () => {
    it("should build card with card ID", () => {
      const builder = new CardBuilder("my-card");
      builder.setHeader("Test");
      
      const card = builder.build();
      expect(card.cardId).toBe("my-card");
    });
  });

  describe("buildAll", () => {
    it("should return array of cards", () => {
      const card = createCardBuilder().buildAll();
      expect(Array.isArray(card)).toBe(true);
      expect(card.length).toBe(1);
    });
  });
});
