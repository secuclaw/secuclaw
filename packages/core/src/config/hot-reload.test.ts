import { describe, expect, it } from "vitest";
import { HotReloader } from "./hot-reload.js";

const baseConfig = {
  server: { host: "127.0.0.1", port: 3000, wsPort: 3001, cors: { origins: ["*"], credentials: true } },
  agents: { defaultModel: "x", maxTokens: 1024, temperature: 0.7, maxSteps: 5, timeout: 10_000 },
  session: {
    persistencePath: "./data",
    compactionThreshold: 100,
    maxMessages: 100,
    compaction: { enabled: true, preserveLastN: 10, summarizeOlder: true },
  },
  memory: {
    vectorEnabled: true,
    bm25Enabled: true,
    decayFactor: 0.95,
    diversityWeight: 0.3,
    embeddingProvider: "local",
    embeddingModel: "mini",
  },
  scheduler: { heartbeatEnabled: true, heartbeatInterval: 1000, wakeMergeWindow: 100, maxConcurrentTasks: 2 },
  sandbox: { enabled: true, dockerImage: "img", timeout: 1000, memoryLimit: "128m" },
  logging: { level: "info" as const, format: "json" as const, output: ["stdout" as const], filePath: "./log" },
};

describe("hot reloader", () => {
  it("applies valid config", async () => {
    const hot = new HotReloader();
    const next = { ...baseConfig, server: { ...baseConfig.server, port: 3002 } };
    const applied = await hot.reload(baseConfig, next);
    expect(applied.server.port).toBe(3002);
  });
});
