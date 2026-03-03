import { describe, expect, it } from "vitest";
import { A2UIProtocolCodec } from "./protocol.js";
import { A2UIServer } from "./server.js";
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

describe("a2ui server", () => {
  it("manages surface lifecycle and component updates", async () => {
    const transport = new MockTransport();
    const server = new A2UIServer({ version: "v0.8", transport });
    await server.start();

    server.createSurface("surface-1");
    server.pushComponent("surface-1", {
      id: "text-1",
      component: { Text: { text: { literalString: "Hello" } } },
    });
    server.beginRendering("surface-1", "text-1");
    server.updateDataModel("surface-1", { score: 98 });

    const surface = server.getSurface("surface-1");
    expect(surface?.components.get("text-1")).toBeDefined();
    expect(surface?.root).toBe("text-1");
    expect(surface?.dataModel?.score).toBe(98);
    expect(transport.sent.length).toBeGreaterThan(0);
  });

  it("dispatches user actions from client messages", async () => {
    const transport = new MockTransport();
    const protocol = new A2UIProtocolCodec("v0.8");
    const server = new A2UIServer({ version: "v0.8", transport });
    await server.start();

    let called = false;
    server.onUserAction((action) => {
      called = action.name === "openAlert";
    });

    transport.emit(
      protocol.encode({
        id: "ua-1",
        version: "v0.8",
        action: "surfaceUpdate",
        payload: {
          type: "userAction",
          action: {
            id: "action-1",
            name: "openAlert",
            surfaceId: "surface-1",
            sourceComponentId: "button-1",
          },
        },
      }),
    );

    expect(called).toBe(true);
  });
});
