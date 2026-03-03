import { afterEach, describe, expect, it } from "vitest";
import { GatewayServer } from "./server.js";

const servers: GatewayServer[] = [];

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    if (server) {
      await server.stop();
    }
  }
});

describe("gateway websocket control plane", () => {
  it("supports method registration and non-throwing broadcast", async () => {
    const server = new GatewayServer({
      port: 0,
      bind: "loopback",
      runtime: { name: "test" },
    });
    servers.push(server);

    server.registerMethod("echo", async (params) => {
      return { echoed: params };
    });
    expect(() =>
      server.broadcast({
        type: "event",
        event: "health",
        data: { ok: true },
      }),
    ).not.toThrow();
    expect(server.getConnections()).toHaveLength(0);
  });

  it("starts server when sandbox allows listening", async () => {
    const server = new GatewayServer({
      port: 0,
      bind: "loopback",
      runtime: { name: "test" },
    });
    servers.push(server);
    try {
      await server.start();
      expect(server.port).toBeGreaterThan(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message.includes("EPERM")).toBe(true);
    }
  });
});
