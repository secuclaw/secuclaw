import { describe, expect, it } from "vitest";
import {
  parseGatewayMessage,
  parseFrame,
  serializeGatewayMessage,
  serializeFrame,
  type GatewayMessage,
} from "./protocol.js";

describe("gateway protocol", () => {
  it("serializes and parses control-plane request frame", () => {
    const message: GatewayMessage = {
      type: "request",
      id: "req-1",
      method: "health.check",
      params: {},
    };
    const encoded = serializeGatewayMessage(message);
    const decoded = parseGatewayMessage(encoded);
    expect(decoded).toEqual(message);
  });

  it("parses legacy req/res/event frame", () => {
    const encoded = serializeFrame({
      type: "req",
      id: "legacy-1",
      method: "ping",
      params: { ok: true },
    });
    const decoded = parseFrame(encoded);
    expect(decoded?.type).toBe("req");
  });

  it("rejects invalid control-plane payload", () => {
    expect(parseGatewayMessage('{"type":"request","id":1}')).toBeNull();
  });
});
