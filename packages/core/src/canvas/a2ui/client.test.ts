import { afterEach, describe, expect, it } from "vitest";
import { A2UIClient } from "./client.js";
import { A2UIProtocolCodec } from "./protocol.js";
import type { A2UITransport } from "./types.js";

class MockTransport implements A2UITransport {
  sent: string[] = [];
  private handler?: (data: string) => void;

  send(data: string): void {
    this.sent.push(data);
  }

  onMessage(handler: (data: string) => void): void {
    this.handler = handler;
  }

  emit(data: string): void {
    this.handler?.(data);
  }
}

describe("a2ui client", () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).openclawCanvasA2UIAction;
  });

  it("updates local surface state from incoming messages", async () => {
    const transport = new MockTransport();
    const protocol = new A2UIProtocolCodec("v0.8");
    const client = new A2UIClient({ version: "v0.8", transport });
    await client.connect();

    transport.emit(
      protocol.encode({
        id: "1",
        version: "v0.8",
        action: "createSurface",
        payload: { surfaceId: "surface-1" },
      }),
    );
    transport.emit(
      protocol.encode({
        id: "2",
        version: "v0.8",
        action: "surfaceUpdate",
        payload: {
          surfaceId: "surface-1",
          operation: "push",
          component: {
            id: "txt-1",
            component: { Text: { text: { literalString: "hello" } } },
          },
        },
      }),
    );

    const surface = client.getSurface("surface-1");
    expect(surface?.components.get("txt-1")).toBeDefined();
  });

  it("sends user action through transport if no bridge exists", async () => {
    const transport = new MockTransport();
    const client = new A2UIClient({ version: "v0.8", transport });
    await client.connect();

    const ok = client.sendUserAction({
      id: "ua-1",
      name: "click",
      surfaceId: "surface-1",
      sourceComponentId: "button-1",
    });

    expect(ok).toBe(true);
    expect(transport.sent.length).toBe(1);
  });

  it("uses android bridge when available", async () => {
    let bridgePayload = "";
    (globalThis as Record<string, unknown>).openclawCanvasA2UIAction = (payload: string) => {
      bridgePayload = payload;
    };

    const client = new A2UIClient({ version: "v0.8" });
    await client.connect();
    const ok = client.sendUserAction({
      id: "ua-2",
      name: "tap",
      surfaceId: "surface-2",
      sourceComponentId: "button-2",
    });

    expect(ok).toBe(true);
    expect(bridgePayload).toContain('"name":"tap"');
  });
});
