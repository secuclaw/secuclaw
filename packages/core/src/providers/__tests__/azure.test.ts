import { describe, it, expect, beforeEach } from "vitest";
import {
  AZURE_MODELS,
  createAzureOpenAIProvider,
  AzureOpenAIProvider,
} from "../azure.js";

describe("Azure OpenAI Provider", () => {
  let provider: AzureOpenAIProvider;

  beforeEach(() => {
    provider = createAzureOpenAIProvider({
      apiKey: "test-api-key",
      resourceName: "test-resource",
      deploymentName: "gpt-4o-deployment",
      apiVersion: "2024-02-15-preview",
    }) as AzureOpenAIProvider;
  });

  describe("createAzureOpenAIProvider", () => {
    it("should create provider with config", () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe("azure");
    });

    it("should use default model if not specified", () => {
      const providerNoModel = createAzureOpenAIProvider({
        apiKey: "test-key",
        resourceName: "test",
      });
      expect(providerNoModel.config.defaultModel).toBe("gpt-4o");
    });

    it("should create provider even without apiKey", () => {
      const providerNoKey = createAzureOpenAIProvider({
        resourceName: "test",
      });
      expect(providerNoKey).toBeDefined();
    });

    it("should create provider even without resourceName", () => {
      const providerNoResource = createAzureOpenAIProvider({
        apiKey: "test-key",
      });
      expect(providerNoResource).toBeDefined();
    });
  });

  describe("AZURE_MODELS", () => {
    it("should have gpt-4o model", () => {
      const gpt4o = AZURE_MODELS.find((m) => m.id === "gpt-4o");
      expect(gpt4o).toBeDefined();
      expect(gpt4o?.capabilities?.streaming).toBe(true);
      expect(gpt4o?.capabilities?.tools).toBe(true);
    });

    it("should have gpt-4o-mini model", () => {
      const mini = AZURE_MODELS.find((m) => m.id === "gpt-4o-mini");
      expect(mini).toBeDefined();
      expect(mini?.inputPricePer1M).toBe(0.15);
    });

    it("should have gpt-35-turbo model", () => {
      const gpt35 = AZURE_MODELS.find((m) => m.id === "gpt-35-turbo");
      expect(gpt35).toBeDefined();
    });

    it("should support streaming on most models", () => {
      const streamingModels = AZURE_MODELS.filter(
        (m) => m.capabilities?.streaming
      );
      expect(streamingModels.length).toBeGreaterThan(3);
    });
  });

  describe("isAvailable", () => {
    it("should return true when apiKey and resourceName exist", () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it("should return false when apiKey is missing", () => {
      const providerNoKey = createAzureOpenAIProvider({
        apiKey: "",
        resourceName: "test",
      });
      expect(providerNoKey.isAvailable()).toBe(false);
    });

    it("should return false when resourceName is missing", () => {
      const providerNoResource = createAzureOpenAIProvider({
        apiKey: "test-key",
        resourceName: "",
      });
      expect(providerNoResource.isAvailable()).toBe(false);
    });
  });

  describe("listModels", () => {
    it("should return all Azure models", () => {
      const models = provider.listModels?.();
      expect(models).toBeDefined();
      expect(models?.length).toBe(AZURE_MODELS.length);
    });
  });

  describe("getModel", () => {
    it("should find model by id", () => {
      const model = provider.getModel?.("gpt-4o");
      expect(model).toBeDefined();
      expect(model?.id).toBe("gpt-4o");
    });

    it("should find model by alias", () => {
      const model = provider.getModel?.("gpt4");
      expect(model).toBeDefined();
      expect(model?.id).toBe("gpt-4o");
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
    it("should include deployment name in extra config", () => {
      expect(provider.config.extra?.deploymentName).toBe(
        "gpt-4o-deployment"
      );
    });

    it("should use custom api version when provided", () => {
      expect(provider.config.extra?.apiVersion).toBe(
        "2024-02-15-preview"
      );
    });

    it("should include resource name", () => {
      expect(provider.config.extra?.resourceName).toBe("test-resource");
    });
  });
});
