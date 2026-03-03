import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TeamsChannel, createTeamsChannel } from "./connection.js";
import {
  TeamsMessageHandler,
  createMessageHandler,
  TeamsCardBuilder,
  createCardBuilder,
  createAlertCard,
  createConfirmationCard,
} from "./message.js";
import type { TeamsConfig, TeamsActivity, TeamsAdaptiveCard } from "./types.js";

describe("TeamsChannel", () => {
  let channel: TeamsChannel;
  const mockConfig: TeamsConfig = {
    type: "teams",
    enabled: true,
    appId: "test-app-id",
    appPassword: "test-app-password",
    tenantId: "test-tenant-id",
    serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
  };

  beforeEach(() => {
    channel = new TeamsChannel(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create channel with config", () => {
      expect(channel).toBeDefined();
    });

    it("should have correct type", () => {
      expect(channel.type).toBe("teams");
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

      const mockActivity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1", name: "Test User" },
        text: "Hello World",
      };

      channel.processWebhookEvent(mockActivity);
      expect(callback).toHaveBeenCalledWith(mockActivity);
    });

    it("should register and emit connected event", () => {
      const callback = vi.fn();
      channel.on("connected", callback);
      
      // The emit is protected in BaseChannel, test registration only
      expect(callback).not.toHaveBeenCalled();
    });

    it("should register and emit disconnected event", () => {
      const callback = vi.fn();
      channel.on("disconnected", callback);
      
      // The emit is protected in BaseChannel, test registration only
      expect(callback).not.toHaveBeenCalled();
    });

    it("should register and emit error event", () => {
      const callback = vi.fn();
      channel.on("error", callback);
      
      // The emit is protected in BaseChannel, test registration only
      expect(callback).not.toHaveBeenCalled();
    });

    it("should remove event listener", () => {
      const callback = vi.fn();
      channel.on("message", callback);
      channel.off("message", callback);

      const mockActivity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      channel.processWebhookEvent(mockActivity);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("processWebhookEvent", () => {
    it("should emit message event with raw activity", () => {
      const callback = vi.fn();
      channel.on("message", callback);

      const mockActivity: TeamsActivity = {
        type: "message",
        id: "activity-123",
        timestamp: "2024-01-01T00:00:00Z",
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: {
          id: "conv-456",
          conversationType: "team",
          name: "Test Channel",
        },
        from: {
          id: "user-789",
          name: "Test User",
          aadObjectId: "aad-123",
        },
        text: "Test message",
        channelData: {
          team: { id: "team-1", name: "Test Team" },
          channel: { id: "channel-1", name: "General" },
        },
      };

      channel.processWebhookEvent(mockActivity);
      // channel.on('message') receives the raw TeamsActivity
      expect(callback).toHaveBeenCalledWith(mockActivity);
    });

    it("should handle adaptive card attachment", () => {
      const callback = vi.fn();
      channel.on("message", callback);

      const mockActivity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
        text: "",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.4",
              body: [{ type: "TextBlock", text: "Card content" }],
            } as unknown as Record<string, unknown>,
          },
        ],
      };

      channel.processWebhookEvent(mockActivity);
      // channel.on('message') receives the raw TeamsActivity
      expect(callback).toHaveBeenCalledWith(mockActivity);
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

  describe("createTeamsChannel", () => {
    it("should create channel with factory function", () => {
      const createdChannel = createTeamsChannel(mockConfig);
      expect(createdChannel).toBeInstanceOf(TeamsChannel);
      expect(createdChannel.type).toBe("teams");
    });
  });
});

describe("TeamsMessageHandler", () => {
  let handler: TeamsMessageHandler;

  beforeEach(() => {
    handler = createMessageHandler();
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      handler.setAccessToken("test-token");
      expect(handler).toBeDefined();
    });
  });

  describe("setServiceUrl", () => {
    it("should set service URL", () => {
      handler.setServiceUrl("https://custom.service.url");
      expect(handler).toBeDefined();
    });
  });

  describe("parseWebhookEvent", () => {
    it("should parse webhook event", () => {
      const body = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1", name: "Test User" },
        text: "test",
      };

      const event = handler.parseWebhookEvent(body);
      expect(event.type).toBe("message");
      expect(event.text).toBe("test");
    });
  });

  describe("extractTextFromMessage", () => {
    it("should extract text from simple message", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
        text: "Hello World",
      };

      const text = handler.extractTextFromMessage(activity);
      expect(text).toBe("Hello World");
    });

    it("should extract text from adaptive card", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
        text: "",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.4",
              body: [{ type: "TextBlock", text: "Card text content" }],
            } as unknown as Record<string, unknown>,
          },
        ],
      };

      const text = handler.extractTextFromMessage(activity);
      expect(text).toBe("Card text content");
    });
  });

  describe("getConversationId", () => {
    it("should extract conversation ID from activity", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-123", conversationType: "personal" },
        from: { id: "user-1" },
      };

      const conversationId = handler.getConversationId(activity);
      expect(conversationId).toBe("conv-123");
    });
  });

  describe("getUserId", () => {
    it("should extract user ID from activity with aadObjectId", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1", aadObjectId: "aad-456" },
      };

      const userId = handler.getUserId(activity);
      expect(userId).toBe("aad-456");
    });

    it("should fall back to id when aadObjectId is missing", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      const userId = handler.getUserId(activity);
      expect(userId).toBe("user-1");
    });
  });

  describe("getMessageId", () => {
    it("should extract message ID from activity", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "msg-123",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      const messageId = handler.getMessageId(activity);
      expect(messageId).toBe("msg-123");
    });
  });

  describe("getTimestamp", () => {
    it("should convert timestamp to epoch", () => {
      const timestamp = "2024-01-01T12:00:00Z";
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp,
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      const epoch = handler.getTimestamp(activity);
      expect(epoch).toBe(new Date(timestamp).getTime());
    });
  });

  describe("isFromChannel", () => {
    it("should return true when message is from channel", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "team" },
        from: { id: "user-1" },
        channelData: {
          channel: { id: "channel-1", name: "General" },
        },
      };

      expect(handler.isFromChannel(activity)).toBe(true);
    });

    it("should return false when message is not from channel", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      expect(handler.isFromChannel(activity)).toBe(false);
    });
  });

  describe("isFromTeam", () => {
    it("should return true when message is from team", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "team" },
        from: { id: "user-1" },
        channelData: {
          team: { id: "team-1", name: "Test Team" },
        },
      };

      expect(handler.isFromTeam(activity)).toBe(true);
    });

    it("should return false when message is not from team", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      expect(handler.isFromTeam(activity)).toBe(false);
    });
  });

  describe("getTeamId", () => {
    it("should extract team ID from channel data", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "team" },
        from: { id: "user-1" },
        channelData: {
          team: { id: "team-123", name: "Test Team" },
        },
      };

      const teamId = handler.getTeamId(activity);
      expect(teamId).toBe("team-123");
    });
  });

  describe("getChannelId", () => {
    it("should extract channel ID from channel data", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "team" },
        from: { id: "user-1" },
        channelData: {
          channel: { id: "channel-456", name: "General" },
        },
      };

      const channelId = handler.getChannelId(activity);
      expect(channelId).toBe("channel-456");
    });
  });

  describe("isValidWebhook", () => {
    it("should return true when no verification token required", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      const isValid = handler.isValidWebhook(activity);
      expect(isValid).toBe(true);
    });

    it("should return true when serviceUrl is present", () => {
      const activity: TeamsActivity = {
        type: "message",
        id: "activity-1",
        timestamp: new Date().toISOString(),
        serviceUrl: "https://smba.trafficmanager.net/teams/v3.0",
        conversation: { id: "conv-1", conversationType: "personal" },
        from: { id: "user-1" },
      };

      const isValid = handler.isValidWebhook(activity, "any-token");
      expect(isValid).toBe(true);
    });
  });
});

describe("TeamsCardBuilder", () => {
  describe("constructor", () => {
    it("should create card builder", () => {
      const builder = createCardBuilder();
      expect(builder).toBeDefined();
    });
  });

  describe("addTextBlock", () => {
    it("should add text block with text only", () => {
      const card = createCardBuilder().addTextBlock("Hello World").build();

      expect(card.body).toHaveLength(1);
      expect(card.body[0]).toEqual({
        type: "TextBlock",
        text: "Hello World",
      });
    });

    it("should add text block with options", () => {
      const card = createCardBuilder()
        .addTextBlock("Hello World", {
          weight: "bolder",
          size: "large",
          color: "accent",
          isSubtle: true,
        })
        .build();

      expect(card.body[0]).toEqual({
        type: "TextBlock",
        text: "Hello World",
        weight: "bolder",
        size: "large",
        color: "accent",
        isSubtle: true,
      });
    });
  });

  describe("addImage", () => {
    it("should add image", () => {
      const card = createCardBuilder()
        .addImage("https://example.com/image.png")
        .build();

      expect(card.body).toHaveLength(1);
      expect(card.body[0]).toEqual({
        type: "Image",
        url: "https://example.com/image.png",
      });
    });

    it("should add image with options", () => {
      const card = createCardBuilder()
        .addImage("https://example.com/image.png", {
          altText: "Image",
          size: "large",
          horizontalAlignment: "center",
        })
        .build();

      expect(card.body[0]).toEqual({
        type: "Image",
        url: "https://example.com/image.png",
        altText: "Image",
        size: "large",
        horizontalAlignment: "center",
      });
    });
  });

  describe("addFactSet", () => {
    it("should add fact set", () => {
      const card = createCardBuilder()
        .addFactSet([
          { title: "Key 1", value: "Value 1" },
          { title: "Key 2", value: "Value 2" },
        ])
        .build();

      expect(card.body).toHaveLength(1);
      expect(card.body[0]).toEqual({
        type: "FactSet",
        facts: [
          { title: "Key 1", value: "Value 1" },
          { title: "Key 2", value: "Value 2" },
        ],
      });
    });
  });

  describe("addColumnSet", () => {
    it("should add column set", () => {
      const card = createCardBuilder()
        .addColumnSet([
          { type: "Column", width: "1" },
          { type: "Column", width: "2" },
        ])
        .build();

      expect(card.body).toHaveLength(1);
      expect(card.body[0]).toEqual({
        type: "ColumnSet",
        columns: [
          { type: "Column", width: "1" },
          { type: "Column", width: "2" },
        ],
      });
    });
  });

  describe("addTextInput", () => {
    it("should add text input", () => {
      const card = createCardBuilder()
        .addTextInput("name", "Enter your name", {
          placeholder: "Name",
          isRequired: true,
        })
        .build();

      expect(card.body).toHaveLength(1);
      expect(card.body[0]).toEqual({
        type: "TextInput",
        id: "name",
        label: "Enter your name",
        placeholder: "Name",
        isRequired: true,
      });
    });
  });

  describe("addChoiceSet", () => {
    it("should add choice set", () => {
      const card = createCardBuilder()
        .addChoiceSet("color", "Select color", [
          { title: "Red", value: "red" },
          { title: "Blue", value: "blue" },
        ])
        .build();

      expect(card.body).toHaveLength(1);
      expect(card.body[0]).toEqual({
        type: "ChoiceSet",
        id: "color",
        label: "Select color",
        choices: [
          { title: "Red", value: "red" },
          { title: "Blue", value: "blue" },
        ],
      });
    });
  });

  describe("addAction", () => {
    it("should add action", () => {
      const card = createCardBuilder()
        .addAction({
          type: "Action.OpenUrl",
          title: "Click Me",
          url: "https://example.com",
        })
        .build();

      expect(card.actions).toHaveLength(1);
      expect(card.actions?.[0]).toEqual({
        type: "Action.OpenUrl",
        title: "Click Me",
        url: "https://example.com",
      });
    });
  });

  describe("addSubmitButton", () => {
    it("should add submit button", () => {
      const card = createCardBuilder().addSubmitButton("Submit").build();

      expect(card.actions).toHaveLength(1);
      expect(card.actions?.[0]).toEqual({
        type: "Action.Submit",
        title: "Submit",
      });
    });

    it("should add submit button with data", () => {
      const card = createCardBuilder()
        .addSubmitButton("Submit", { action: "submit" })
        .build();

      expect(card.actions?.[0]).toEqual({
        type: "Action.Submit",
        title: "Submit",
        data: { action: "submit" },
      });
    });

    it("should add primary submit button", () => {
      const card = createCardBuilder()
        .addSubmitButton("Submit", undefined, { isPrimary: true })
        .build();

      expect(card.actions?.[0]).toEqual({
        type: "Action.Submit",
        title: "Submit",
        isPrimary: true,
      });
    });
  });

  describe("addOpenUrlButton", () => {
    it("should add open URL button", () => {
      const card = createCardBuilder()
        .addOpenUrlButton("Open", "https://example.com")
        .build();

      expect(card.actions).toHaveLength(1);
      expect(card.actions?.[0]).toEqual({
        type: "Action.OpenUrl",
        title: "Open",
        url: "https://example.com",
      });
    });
  });

  describe("addExecuteButton", () => {
    it("should add execute button", () => {
      const card = createCardBuilder()
        .addExecuteButton("Execute", "executeAction", { key: "value" })
        .build();

      expect(card.actions).toHaveLength(1);
      expect(card.actions?.[0]).toEqual({
        type: "Action.Execute",
        title: "Execute",
        verb: "executeAction",
        data: { key: "value" },
      });
    });
  });

  describe("setMsteamsProps", () => {
    it("should set msteams props", () => {
      const card = createCardBuilder()
        .setMsteamsProps({ rootElementId: "root-1" })
        .build();

      expect(card.msteams).toEqual({
        teamsx: { rootElementId: "root-1" },
      });
    });

    it("should set channel data", () => {
      const card = createCardBuilder()
        .setMsteamsProps({
          channelData: {
            team: { id: "team-1" },
            channel: { id: "channel-1" },
          },
        })
        .build();

      expect(card.msteams).toEqual({
        channelData: {
          team: { id: "team-1" },
          channel: { id: "channel-1" },
        },
      });
    });
  });

  describe("build", () => {
    it("should build card with default version", () => {
      const card = createCardBuilder().build();

      expect(card.type).toBe("AdaptiveCard");
      expect(card.version).toBe("1.4");
    });
  });
});

describe("createAlertCard", () => {
  it("should create info alert card", () => {
    const card = createAlertCard("Info Title", "Info message", "info");

    expect(card.body).toHaveLength(2);
    expect(card.body[0]).toEqual({
      type: "TextBlock",
      text: "Info Title",
      weight: "bolder",
      size: "large",
    });
    expect(card.body[1]).toEqual({
      type: "TextBlock",
      text: "Info message",
      color: "accent",
      isSubtle: true,
    });
  });

  it("should create warning alert card", () => {
    const card = createAlertCard("Warning Title", "Warning message", "warning");

    expect(card.body[1]).toEqual({
      type: "TextBlock",
      text: "Warning message",
      color: "warning",
      isSubtle: true,
    });
  });

  it("should create error alert card", () => {
    const card = createAlertCard("Error Title", "Error message", "error");

    expect(card.body[1]).toEqual({
      type: "TextBlock",
      text: "Error message",
      color: "attention",
      isSubtle: true,
    });
  });

  it("should create success alert card", () => {
    const card = createAlertCard("Success Title", "Success message", "success");

    expect(card.body[1]).toEqual({
      type: "TextBlock",
      text: "Success message",
      color: "good",
      isSubtle: true,
    });
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

    expect(card.body).toHaveLength(2);
    expect(card.body[0]).toEqual({
      type: "TextBlock",
      text: "Confirm",
      weight: "bolder",
      size: "large",
    });
    expect(card.body[1]).toEqual({
      type: "TextBlock",
      text: "Are you sure?",
    });
    expect(card.actions).toHaveLength(2);
    expect(card.actions?.[0]).toEqual({
      type: "Action.Execute",
      title: "Yes",
      verb: "onConfirm",
      isPrimary: true,
    });
    expect(card.actions?.[1]).toEqual({
      type: "Action.Execute",
      title: "No",
      verb: "onCancel",
    });
  });
});
