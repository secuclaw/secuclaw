import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "./registry.js";
import type { ILLMProvider } from "./trait.js";

const mockProvider: ILLMProvider = {
  id: "mock",
  name: "mock",
  capabilities: {
    streaming: true,
    tools: true,
    vision: false,
    audio: false,
    maxContextLength: 1024,
    supportedModels: ["mock-model"],
  },
  async chat() {
    return {
      content: "ok",
      model: "mock-model",
    };
  },
  async healthCheck() {
    return true;
  },
};

describe("provider registry", () => {
  it("registers and lists providers", () => {
    const registry = new ProviderRegistry();
    registry.register(mockProvider);

    expect(registry.getById("mock")).toBeDefined();
    expect(registry.list()).toHaveLength(1);
    expect(registry.getByCapability("streaming")).toHaveLength(1);
  });
});
