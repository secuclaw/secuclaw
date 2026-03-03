import { describe, it, expect, beforeEach } from "vitest";
import {
  BEDROCK_MODELS,
  createBedrockProvider,
  BedrockProvider,
} from "../bedrock.js";

describe("AWS Bedrock Provider", () => {
  let provider: BedrockProvider;

  beforeEach(() => {
    provider = createBedrockProvider({
      accessKeyId: "test-key-id",
      secretAccessKey: "test-secret-key",
      region: "us-east-1",
      defaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    }) as BedrockProvider;
  });

  describe("createBedrockProvider", () => {
    it("should create provider with config", () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe("bedrock");
    });

    it("should use default model if not specified", () => {
      const providerNoModel = createBedrockProvider({
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "us-east-1",
      });
      expect(providerNoModel.config.defaultModel).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    });

    it("should create provider even without credentials", () => {
      const providerNoCred = createBedrockProvider({
        region: "us-east-1",
      });
      expect(providerNoCred).toBeDefined();
    });
  });

  describe("BEDROCK_MODELS", () => {
    it("should have Claude 3.5 Sonnet model", () => {
      const sonnet = BEDROCK_MODELS.find((m) => 
        m.id.includes("claude-3-5-sonnet")
      );
      expect(sonnet).toBeDefined();
      expect(sonnet?.capabilities?.streaming).toBe(true);
      expect(sonnet?.capabilities?.tools).toBe(true);
    });

    it("should have Claude 3.5 Haiku model", () => {
      const haiku = BEDROCK_MODELS.find((m) => 
        m.id.includes("claude-3-5-haiku")
      );
      expect(haiku).toBeDefined();
      expect(haiku?.inputPricePer1M).toBe(0.8);
    });

    it("should have Llama models", () => {
      const llamaModels = BEDROCK_MODELS.filter((m) => 
        m.id.includes("llama")
      );
      expect(llamaModels.length).toBeGreaterThanOrEqual(3);
    });

    it("should have Mistral models", () => {
      const mistralModels = BEDROCK_MODELS.filter((m) => 
        m.id.includes("mistral")
      );
      expect(mistralModels.length).toBeGreaterThanOrEqual(2);
    });

    it("should have Amazon Titan models", () => {
      const titanModels = BEDROCK_MODELS.filter((m) => 
        m.id.includes("titan")
      );
      expect(titanModels.length).toBeGreaterThanOrEqual(1);
    });

    it("should have Cohere models", () => {
      const cohereModels = BEDROCK_MODELS.filter((m) => 
        m.id.includes("cohere")
      );
      expect(cohereModels.length).toBeGreaterThanOrEqual(1);
    });

    it("should support streaming on most models", () => {
      const streamingModels = BEDROCK_MODELS.filter(
        (m) => m.capabilities?.streaming
      );
      expect(streamingModels.length).toBeGreaterThan(5);
    });
  });

  describe("isAvailable", () => {
    it("should return true when credentials exist", () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it("should return false when accessKeyId is missing", () => {
      const providerNoCred = createBedrockProvider({
        accessKeyId: "",
        secretAccessKey: "test",
        region: "us-east-1",
      });
      expect(providerNoCred.isAvailable()).toBe(false);
    });

    it("should return false when secretAccessKey is missing", () => {
      const providerNoCred = createBedrockProvider({
        accessKeyId: "test",
        secretAccessKey: "",
        region: "us-east-1",
      });
      expect(providerNoCred.isAvailable()).toBe(false);
    });
  });

  describe("listModels", () => {
    it("should return all Bedrock models", () => {
      const models = provider.listModels?.();
      expect(models).toBeDefined();
      expect(models?.length).toBe(BEDROCK_MODELS.length);
    });
  });

  describe("getModel", () => {
    it("should find model by full id", () => {
      const model = provider.getModel?.("anthropic.claude-3-5-sonnet-20241022-v2:0");
      expect(model).toBeDefined();
      expect(model?.id).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    });

    it("should find model by alias", () => {
      const model = provider.getModel?.("claude-3.5-sonnet");
      expect(model).toBeDefined();
      expect(model?.id).toContain("claude-3-5-sonnet");
    });

    it("should find Llama by alias", () => {
      const model = provider.getModel?.("llama-70b");
      expect(model).toBeDefined();
      expect(model?.id).toContain("llama3-1-70b");
    });

    it("should return undefined for unknown model", () => {
      const model = provider.getModel?.("unknown-model");
      expect(model).toBeUndefined();
    });
  });

  describe("chat", () => {
    it("should have chat method", () => {
      expect(typeof provider.chat).toBe("function");
    });

    it("should have chatStream method for streaming", () => {
      expect(typeof provider.chatStream).toBe("function");
    });
  });

  describe("config", () => {
    it("should include AWS region", () => {
      expect(provider.config.extra?.region).toBe("us-east-1");
    });
  });

  describe("model families", () => {
    it("should have models for different use cases", () => {
      const reasoningModels = BEDROCK_MODELS.filter((m) =>
        m.recommendedFor?.includes("reasoning")
      );
      expect(reasoningModels.length).toBeGreaterThan(2);

      const chatModels = BEDROCK_MODELS.filter((m) =>
        m.recommendedFor?.includes("chat")
      );
      expect(chatModels.length).toBeGreaterThan(2);

      const codingModels = BEDROCK_MODELS.filter((m) =>
        m.recommendedFor?.includes("coding")
      );
      expect(codingModels.length).toBeGreaterThan(2);
    });

    it("should have models with vision support", () => {
      const visionModels = BEDROCK_MODELS.filter((m) =>
        m.capabilities?.vision
      );
      expect(visionModels.length).toBeGreaterThan(2);
    });
  });
});
