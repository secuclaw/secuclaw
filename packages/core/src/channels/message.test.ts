import { describe, expect, it } from "vitest";
import { AttachmentBuilder, AttachmentType } from "./attachment.js";
import { MessageBuilder } from "./message.js";

describe("channel message builders", () => {
  it("builds attachment and outgoing message", () => {
    const attachment = new AttachmentBuilder(AttachmentType.IMAGE)
      .withUrl("https://example.com/a.png")
      .withFilename("a.png")
      .build();

    const message = new MessageBuilder("chat-1")
      .withText("hello")
      .withAttachments([attachment])
      .build();

    expect(message.chatId).toBe("chat-1");
    expect(message.attachments?.[0].type).toBe(AttachmentType.IMAGE);
  });
});
