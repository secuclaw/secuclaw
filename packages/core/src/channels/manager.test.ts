import { describe, expect, it } from "vitest";
import { BaseChannel } from "./base.js";
import { ChannelManager } from "./manager.js";
import type { ChannelConfig, ChannelContext, ChannelResponse, UnifiedMessage } from "./types.js";

class TestChannel extends BaseChannel {
  type = "web" as const;

  constructor(config: ChannelConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async send(_message: ChannelResponse, _context: ChannelContext): Promise<void> {
    this.recordSend();
  }
}

describe("channel manager task coverage", () => {
  it("supports register/unregister/getByType", () => {
    const manager = new ChannelManager({ channels: [] });
    const channel = new TestChannel({ type: "web", enabled: true, channelId: "web-1" });
    manager.register(channel);
    expect(manager.get("web-1")).toBeDefined();
    expect(manager.getByType("web")).toHaveLength(1);
    manager.unregister("web-1");
    expect(manager.getByType("web")).toHaveLength(0);
  });

  it("supports broadcast and health checks", async () => {
    const manager = new ChannelManager({ channels: [] });
    const channel = new TestChannel({ type: "web", enabled: true, channelId: "web-1" });
    manager.register(channel);
    await channel.connect();

    const msg: UnifiedMessage = {
      id: "m-1",
      channelId: "web-1",
      channelType: "web",
      from: { id: "u-1" },
      content: "hi",
      timestamp: Date.now(),
    };

    await manager.broadcast(msg);
    const health = await manager.healthCheckAll();
    expect(health.get("web-1")?.ok).toBe(true);
  });
});
