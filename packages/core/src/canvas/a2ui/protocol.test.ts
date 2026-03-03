import { describe, expect, it } from "vitest";
import { A2UIProtocolCodec } from "./protocol.js";
import { validateA2UIJsonl, validateA2UIMessage } from "./validator.js";
import type { A2UIMessage } from "./types.js";

describe("a2ui protocol", () => {
  it("encodes and decodes message", () => {
    const protocol = new A2UIProtocolCodec("v0.8");
    const message: A2UIMessage = {
      id: "m-1",
      version: "v0.8",
      action: "createSurface",
      payload: { surfaceId: "s-1" },
    };
    const encoded = protocol.encode(message);
    const decoded = protocol.decode(encoded);
    expect(decoded).toEqual(message);
  });

  it("supports legacy action-key payload decoding", () => {
    const protocol = new A2UIProtocolCodec("v0.8");
    const decoded = protocol.decode(
      JSON.stringify({
        version: "v0.8",
        id: "m-legacy",
        createSurface: { surfaceId: "legacy" },
      }),
    );
    expect(decoded.action).toBe("createSurface");
  });

  it("rejects mixed versions in jsonl", () => {
    const protocol = new A2UIProtocolCodec("v0.8");
    const first = JSON.stringify({
      id: "1",
      version: "v0.8",
      action: "createSurface",
      payload: {},
    });
    const second = JSON.stringify({
      id: "2",
      version: "v0.9",
      action: "createSurface",
      payload: {},
    });
    expect(() => protocol.decodeJsonl(`${first}\n${second}`)).toThrow();
  });

  it("validates message and jsonl", () => {
    const message: A2UIMessage = {
      id: "m-2",
      version: "v0.9",
      action: "surfaceUpdate",
      payload: { surfaceId: "s-1", operation: "delete", componentId: "c-1" },
    };
    expect(validateA2UIMessage(message).valid).toBe(true);
    const meta = validateA2UIJsonl(JSON.stringify(message));
    expect(meta.version).toBe("v0.9");
    expect(meta.messageCount).toBe(1);
  });
});
