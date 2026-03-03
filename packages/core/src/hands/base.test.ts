/**
 * Hand Framework - Base Tests
 * 
 * Unit tests for the Hand framework base classes.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  BaseHand,
  createDefaultLogger,
  createDefaultStorage,
  createDefaultMemoryStore,
  createDefaultToolRegistry,
  HandRegistry,
  HandStateManager,
  RequirementChecker,
  createSuccessResult,
  createErrorResult,
  createArtifact,
  createInitialState,
  type HandDefinition,
  type HandContext,
  type HandResult,
} from "./index.js";

// Test Hand implementation for testing
class TestHand extends BaseHand {
  static definition: HandDefinition = {
    id: "test-hand",
    name: "Test Hand",
    description: "A test hand for unit testing",
    category: "security",
    version: "1.0.0",
    requirements: [],
    settings: [
      {
        key: "option1",
        label: "Option 1",
        type: "string",
        default: "default",
        required: false,
      },
    ],
    metrics: [
      {
        label: "Items Processed",
        memoryKey: "itemsProcessed",
        format: "number",
      },
    ],
    tools: [],
    systemPrompt: "You are a test hand",
  };

  async initialize(): Promise<void> {
    // Test initialization
  }

  async execute(context: HandContext): Promise<HandResult> {
    this.reportProgress(50, "Processing...");
    context.memory.set("itemsProcessed", 10);
    
    return createSuccessResult(
      { message: "Test completed" },
      100,
      { itemsProcessed: 10 }
    );
  }

  async terminate(): Promise<void> {
    this.markTerminated();
  }
}

// Simple Hand for error testing
class ErrorHand extends BaseHand {
  static definition: HandDefinition = {
    id: "error-hand",
    name: "Error Hand",
    description: "A hand that throws errors",
    category: "security",
    version: "1.0.0",
    requirements: [],
    settings: [],
    metrics: [],
    tools: [],
    systemPrompt: "Error hand",
  };

  async initialize(): Promise<void> {
    throw new Error("Init failed");
  }

  async execute(_context: HandContext): Promise<HandResult> {
    throw new Error("Execute failed");
  }

  async terminate(): Promise<void> {
    // No-op
  }
}

// Hand for retry testing
class RetryHand extends BaseHand {
  static definition: HandDefinition = {
    id: "retry-hand",
    name: "Retry Hand",
    description: "A hand for testing retry",
    category: "security",
    version: "1.0.0",
    requirements: [],
    settings: [],
    metrics: [],
    tools: [],
    systemPrompt: "Retry hand",
  };

  callCount = 0;

  async initialize(): Promise<void> {
    // No-op
  }

  async execute(_context: HandContext): Promise<HandResult> {
    this.callCount++;
    if (this.callCount < 3) {
      throw new Error(`Attempt ${this.callCount} failed`);
    }
    return createSuccessResult({ attempts: this.callCount }, 100);
  }

  async terminate(): Promise<void> {
    // No-op
  }
}

describe("BaseHand", () => {
  let hand: TestHand;
  let definition: HandDefinition;

  beforeEach(() => {
    definition = { ...TestHand.definition };
    hand = new TestHand(definition);
  });

  describe("constructor", () => {
    it("should initialize with correct default state", () => {
      expect(hand.getState().status).toBe("idle");
      expect(hand.getState().progress).toBe(0);
      expect(hand.getState().runCount).toBe(0);
      expect(hand.getState().successCount).toBe(0);
      expect(hand.getState().errorCount).toBe(0);
    });
  });

  describe("setInstanceId", () => {
    it("should set the instance ID in state", () => {
      hand.setInstanceId("test-instance-123");
      expect(hand.getState().instanceId).toBe("test-instance-123");
    });
  });

  describe("setState", () => {
    it("should update state partially", () => {
      hand.setState({ progress: 50, status: "active" });
      const state = hand.getState();
      expect(state.progress).toBe(50);
      expect(state.status).toBe("active");
      expect(state.instanceId).toBe("");
    });
  });

  describe("onProgress", () => {
    it("should register and call progress callback", () => {
      const callback = vi.fn();
      const unsubscribe = hand.onProgress(callback);
      
      hand.reportProgress(50, "Halfway done");
      
      expect(callback).toHaveBeenCalledWith(50, "Halfway done");
      
      unsubscribe();
      hand.reportProgress(100, "Done");
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("onError", () => {
    it("should register and call error callback", async () => {
      const callback = vi.fn();
      const unsubscribe = hand.onError(callback);
      
      const error = new Error("Test error");
      await hand.handleError(error);
      
      expect(callback).toHaveBeenCalledWith(error);
      expect(hand.getState().errorCount).toBe(1);
      
      unsubscribe();
    });
  });

  describe("retry", () => {
    it("should retry failed operations", async () => {
      const retryHand = new RetryHand(RetryHand.definition);
      retryHand.setInstanceId("retry-test");
      
      let attempt = 0;
      const fn = async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error(`Attempt ${attempt} failed`);
        }
        return "success";
      };
      
      const result = await retryHand.retry(fn, 3, 10);
      expect(result).toBe("success");
      expect(attempt).toBe(3);
    });

    it("should throw after all attempts fail", async () => {
      const fn = async () => {
        throw new Error("Always fails");
      };
      
      await expect(hand.retry(fn, 3, 1)).rejects.toThrow("Always fails");
    });
  });

  describe("getMetrics", () => {
    it("should return default metrics", () => {
      const metrics = hand.getMetrics();
      expect(metrics.runCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    it("should include custom metrics from memory", () => {
      const context = hand.createContext({
        instanceId: "test",
      });
      context.memory.set("itemsProcessed", 42);
      
      const metrics = hand.getMetrics();
      expect(metrics.itemsProcessed).toBe(42);
    });
  });

  describe("createContext", () => {
    it("should create context with default values", () => {
      const context = hand.createContext({
        instanceId: "test-instance",
      });
      
      expect(context.instanceId).toBe("test-instance");
      expect(context.timeout).toBe(300000);
      expect(context.maxRetries).toBe(3);
      expect(context.logger).toBeDefined();
      expect(context.storage).toBeDefined();
      expect(context.memory).toBeDefined();
      expect(context.tools).toBeDefined();
    });

    it("should create context with custom values", () => {
      const customLogger = createDefaultLogger("custom");
      const customStorage = createDefaultStorage();
      const customMemory = createDefaultMemoryStore();
      const customTools = createDefaultToolRegistry();
      
      const context = hand.createContext({
        instanceId: "custom-instance",
        timeout: 60000,
        maxRetries: 5,
        config: { key: "value" },
        logger: customLogger,
        storage: customStorage,
        memory: customMemory,
        tools: customTools,
      });
      
      expect(context.instanceId).toBe("custom-instance");
      expect(context.timeout).toBe(60000);
      expect(context.maxRetries).toBe(5);
      expect(context.config.key).toBe("value");
    });
  });

  describe("isTerminated", () => {
    it("should return false initially", () => {
      expect(hand.isTerminated()).toBe(false);
    });
  });

  describe("static getDefinition", () => {
    it("should return the Hand definition", () => {
      expect(TestHand.getDefinition()).toEqual(definition);
    });
  });

  describe("persistState", () => {
    it("should persist state to storage when available", async () => {
      const storage = createDefaultStorage();
      const context = hand.createContext({
        instanceId: "persist-test",
        storage,
      });
      
      hand.setState({ progress: 75 });
      await hand.persistState();
      
      const saved = await storage.get("hand_state_persist-test");
      expect(saved).toBeDefined();
    });
  });
});

describe("RequirementChecker", () => {
  describe("check - binary", () => {
    it("should handle binary check failure gracefully", async () => {
      // This test verifies the code path when binary is not found
      const requirement = {
        key: "test-binary",
        label: "Test Binary",
        requirementType: "binary" as const,
        checkValue: "nonexistent-binary-xyz",
      };
      
      const result = await RequirementChecker.check(requirement);
      expect(result.key).toBe("test-binary");
      expect(result.available).toBe(false);
    });
  });

  describe("check - env-var", () => {
    it("should return available when env var is set", async () => {
      // Set a test env var
      const originalValue = process.env.TEST_HAND_ENV_VAR;
      process.env.TEST_HAND_ENV_VAR = "test-value";
      
      const requirement = {
        key: "test-env",
        label: "Test Env",
        requirementType: "env-var" as const,
        checkValue: "TEST_HAND_ENV_VAR",
      };
      
      const result = await RequirementChecker.check(requirement);
      
      // Restore original value
      if (originalValue !== undefined) {
        process.env.TEST_HAND_ENV_VAR = originalValue;
      } else {
        delete process.env.TEST_HAND_ENV_VAR;
      }
      
      expect(result.available).toBe(true);
    });

    it("should return unavailable when env var is not set", async () => {
      const originalValue = process.env.UNSET_HAND_ENV_VAR_123;
      delete process.env.UNSET_HAND_ENV_VAR_123;
      
      const requirement = {
        key: "test-env",
        label: "Test Env",
        requirementType: "env-var" as const,
        checkValue: "UNSET_HAND_ENV_VAR_123",
      };
      
      const result = await RequirementChecker.check(requirement);
      
      if (originalValue !== undefined) {
        process.env.UNSET_HAND_ENV_VAR_123 = originalValue;
      }
      
      expect(result.available).toBe(false);
    });
  });

  describe("check - api-key", () => {
    it("should return available when API key is set", async () => {
      const originalValue = process.env.TEST_HAND_API_KEY;
      process.env.TEST_HAND_API_KEY = "sk-test12345678";
      
      const requirement = {
        key: "test-api",
        label: "Test API",
        requirementType: "api-key" as const,
        checkValue: "TEST_HAND_API_KEY",
      };
      
      const result = await RequirementChecker.check(requirement);
      
      if (originalValue !== undefined) {
        process.env.TEST_HAND_API_KEY = originalValue;
      } else {
        delete process.env.TEST_HAND_API_KEY;
      }
      
      expect(result.available).toBe(true);
    });

    it("should return unavailable when API key is placeholder", async () => {
      const originalValue = process.env.TEST_HAND_API_KEY;
      process.env.TEST_HAND_API_KEY = "YOUR_KEY_HERE";
      
      const requirement = {
        key: "test-api",
        label: "Test API",
        requirementType: "api-key" as const,
        checkValue: "TEST_HAND_API_KEY",
      };
      
      const result = await RequirementChecker.check(requirement);
      
      if (originalValue !== undefined) {
        process.env.TEST_HAND_API_KEY = originalValue;
      } else {
        delete process.env.TEST_HAND_API_KEY;
      }
      
      expect(result.available).toBe(false);
    });
  });

  describe("checkAll", () => {
    it("should check all requirements", async () => {
      const requirements = [
        {
          key: "req1",
          label: "Req 1",
          requirementType: "env-var" as const,
          checkValue: "NONEXISTENT_VAR_12345",
        },
        {
          key: "req2",
          label: "Req 2",
          requirementType: "env-var" as const,
          checkValue: "NONEXISTENT_VAR_67890",
        },
      ];
      
      const results = await RequirementChecker.checkAll(requirements);
      
      expect(results).toHaveLength(2);
      expect(results[0].key).toBe("req1");
      expect(results[1].key).toBe("req2");
    });
  });

  describe("getInstallInstructions", () => {
    it("should return brew instructions", () => {
      const instructions = RequirementChecker.getInstallInstructions({
        kind: "brew",
        formula: "jq",
      });
      expect(instructions).toContain("brew install");
    });

    it("should return npm instructions", () => {
      const instructions = RequirementChecker.getInstallInstructions({
        kind: "node",
        package: "typescript",
      });
      expect(instructions).toContain("npm install");
    });

    it("should return download instructions", () => {
      const instructions = RequirementChecker.getInstallInstructions({
        kind: "download",
        url: "https://example.com/tool",
      });
      expect(instructions).toContain("https://example.com/tool");
    });
  });
});

describe("HandStateManager", () => {
  let manager: HandStateManager;

  beforeEach(() => {
    manager = new HandStateManager();
  });

  describe("getState", () => {
    it("should return undefined for unknown instance", () => {
      expect(manager.getState("unknown")).toBeUndefined();
    });
  });

  describe("setState", () => {
    it("should set state for an instance", () => {
      manager.setState("test-instance", { progress: 50 });
      const state = manager.getState("test-instance");
      
      expect(state).toBeDefined();
      expect(state!.progress).toBe(50);
      expect(state!.status).toBe("idle");
    });

    it("should merge state updates", () => {
      manager.setState("test-instance", { progress: 50 });
      manager.setState("test-instance", { status: "active" });
      
      const state = manager.getState("test-instance");
      expect(state!.progress).toBe(50);
      expect(state!.status).toBe("active");
    });
  });

  describe("listInstanceIds", () => {
    it("should list all instance IDs", () => {
      manager.setState("instance-1", { progress: 10 });
      manager.setState("instance-2", { progress: 20 });
      
      const ids = manager.listInstanceIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain("instance-1");
      expect(ids).toContain("instance-2");
    });
  });

  describe("deleteState", () => {
    it("should delete state", () => {
      manager.setState("test-instance", { progress: 50 });
      manager.deleteState("test-instance");
      
      expect(manager.getState("test-instance")).toBeUndefined();
    });
  });

  describe("createInitialState", () => {
    it("should create initial state with correct defaults", () => {
      const state = createInitialState("test-id");
      
      expect(state.instanceId).toBe("test-id");
      expect(state.status).toBe("idle");
      expect(state.progress).toBe(0);
      expect(state.runCount).toBe(0);
      expect(state.successCount).toBe(0);
      expect(state.errorCount).toBe(0);
      expect(state.metadata).toEqual({});
    });
  });
});

describe("HandRegistry", () => {
  let registry: HandRegistry;

  beforeEach(() => {
    registry = new HandRegistry();
  });

  describe("register", () => {
    it("should register a Hand definition", () => {
      const definition: HandDefinition = {
        id: "registered-hand",
        name: "Registered Hand",
        description: "A registered hand",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      registry.register(definition);
      
      const retrieved = registry.getDefinition("registered-hand");
      expect(retrieved).toEqual(definition);
    });

    it("should overwrite existing registration", () => {
      const def1: HandDefinition = {
        id: "overwrite-hand",
        name: "Hand 1",
        description: "First",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      const def2: HandDefinition = {
        ...def1,
        name: "Hand 2",
      };
      
      registry.register(def1);
      registry.register(def2);
      
      const retrieved = registry.getDefinition("overwrite-hand");
      expect(retrieved!.name).toBe("Hand 2");
    });
  });

  describe("listDefinitions", () => {
    it("should list all registered definitions", () => {
      const def1: HandDefinition = {
        id: "hand-1",
        name: "Hand 1",
        description: "First hand",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      const def2: HandDefinition = {
        id: "hand-2",
        name: "Hand 2",
        description: "Second hand",
        category: "development",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      registry.register(def1);
      registry.register(def2);
      
      const list = registry.listDefinitions();
      expect(list).toHaveLength(2);
    });
  });

  describe("registerClass", () => {
    it("should register a Hand class", () => {
      registry.registerClass("test-hand", TestHand);
      
      // This is used internally by activate
      // We can't directly test it without calling activate
    });
  });

  describe("activate", () => {
    it("should activate a registered Hand", async () => {
      const definition: HandDefinition = {
        id: "activate-hand",
        name: "Activate Hand",
        description: "Hand to activate",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      registry.register(definition);
      registry.registerClass("activate-hand", TestHand);
      
      const instance = await registry.activate("activate-hand", { option1: "value" });
      
      expect(instance.handId).toBe("activate-hand");
      expect(instance.status).toBe("idle");
      expect(instance.config.option1).toBe("value");
      
      await registry.terminate(instance.instanceId);
    });

    it("should throw when definition not found", async () => {
      registry.registerClass("nonexistent", TestHand);
      
      await expect(registry.activate("nonexistent")).rejects.toThrow("not found");
    });

    it("should throw when class not registered", async () => {
      const definition: HandDefinition = {
        id: "no-class-hand",
        name: "No Class Hand",
        description: "Hand without class",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      registry.register(definition);
      
      await expect(registry.activate("no-class-hand")).rejects.toThrow("not registered");
    });
  });

  describe("getInstance", () => {
    it("should return undefined for unknown instance", () => {
      expect(registry.getInstance("unknown")).toBeUndefined();
    });
  });

  describe("listInstances", () => {
    it("should return empty array when no instances", () => {
      expect(registry.listInstances()).toEqual([]);
    });
  });

  describe("getActiveInstances", () => {
    it("should return empty array when no active instances", () => {
      expect(registry.getActiveInstances()).toEqual([]);
    });
  });

  describe("pause/resume", () => {
    it("should pause and resume an instance", async () => {
      const definition: HandDefinition = {
        id: "pause-hand",
        name: "Pause Hand",
        description: "Hand for pause testing",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      registry.register(definition);
      registry.registerClass("pause-hand", TestHand);
      
      const instance = await registry.activate("pause-hand");
      await registry.pause(instance.instanceId);
      
      let retrieved = registry.getInstance(instance.instanceId);
      expect(retrieved!.status).toBe("paused");
      
      await registry.resume(instance.instanceId);
      
      retrieved = registry.getInstance(instance.instanceId);
      expect(retrieved!.status).toBe("idle");
      
      await registry.terminate(instance.instanceId);
    });

    it("should throw when pausing unknown instance", async () => {
      await expect(registry.pause("unknown")).rejects.toThrow("not found");
    });
  });

  describe("terminate", () => {
    it("should terminate an instance", async () => {
      const definition: HandDefinition = {
        id: "terminate-hand",
        name: "Terminate Hand",
        description: "Hand for termination testing",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      registry.register(definition);
      registry.registerClass("terminate-hand", TestHand);
      
      const instance = await registry.activate("terminate-hand");
      await registry.terminate(instance.instanceId);
      
      expect(registry.getInstance(instance.instanceId)).toBeUndefined();
    });
  });

  describe("events", () => {
    it("should emit events", async () => {
      const events: string[] = [];
      
      registry.on("hand_registered", () => events.push("registered"));
      registry.on("hand_activated", () => events.push("activated"));
      registry.on("hand_completed", () => events.push("completed"));
      registry.on("*", () => events.push("any"));
      
      const definition: HandDefinition = {
        id: "event-hand",
        name: "Event Hand",
        description: "Hand for event testing",
        category: "security",
        version: "1.0.0",
        requirements: [],
        settings: [],
        metrics: [],
        tools: [],
        systemPrompt: "Test",
      };
      
      registry.register(definition);
      registry.registerClass("event-hand", TestHand);
      
      const instance = await registry.activate("event-hand");
      await registry.execute(instance.instanceId);
      await registry.terminate(instance.instanceId);
      
      expect(events).toContain("registered");
      expect(events).toContain("activated");
      expect(events).toContain("completed");
    });
  });
});

describe("Result factories", () => {
  describe("createSuccessResult", () => {
    it("should create a success result", () => {
      const result = createSuccessResult({ data: "test" }, 100, { metric: 1 });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: "test" });
      expect(result.duration).toBe(100);
      expect(result.metrics).toEqual({ metric: 1 });
      expect(result.error).toBeUndefined();
    });
  });

  describe("createErrorResult", () => {
    it("should create an error result", () => {
      const error = {
        code: "TEST_ERROR",
        message: "Test error",
        recoverable: true,
      };
      
      const result = createErrorResult(error, 50);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.duration).toBe(50);
    });
  });

  describe("createArtifact", () => {
    it("should create an artifact", () => {
      const artifact = createArtifact("report", "test-report", {
        path: "/path/to/report",
        metadata: { generatedAt: "2024-01-01" },
      });
      
      expect(artifact.type).toBe("report");
      expect(artifact.name).toBe("test-report");
      expect(artifact.path).toBe("/path/to/report");
      expect(artifact.metadata).toEqual({ generatedAt: "2024-01-01" });
    });
  });
});

describe("Default implementations", () => {
  describe("createDefaultLogger", () => {
    it("should create a logger", () => {
      const logger = createDefaultLogger("test");
      
      // These should not throw
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");
    });
  });

  describe("createDefaultStorage", () => {
    it("should create a storage with basic operations", async () => {
      const storage = createDefaultStorage();
      
      await storage.set("key1", "value1");
      const value = await storage.get("key1");
      expect(value).toBe("value1");
      
      const exists = await storage.exists("key1");
      expect(exists).toBe(true);
      
      const keys = await storage.list();
      expect(keys).toContain("key1");
      
      await storage.delete("key1");
      const deleted = await storage.get("key1");
      expect(deleted).toBeNull();
    });
  });

  describe("createDefaultMemoryStore", () => {
    it("should create a memory store with basic operations", () => {
      const store = createDefaultMemoryStore();
      
      store.set("key1", { nested: "value" });
      const value = store.get("key1");
      expect(value).toEqual({ nested: "value" });
      
      expect(store.has("key1")).toBe(true);
      
      const keys = store.keys();
      expect(keys).toContain("key1");
      
      store.delete("key1");
      expect(store.has("key1")).toBe(false);
      
      store.clear();
      expect(store.keys()).toHaveLength(0);
    });
  });

  describe("createDefaultToolRegistry", () => {
    it("should create a tool registry with basic operations", () => {
      const registry = createDefaultToolRegistry();
      
      // Should not have any tools initially
      expect(registry.list()).toHaveLength(0);
      expect(registry.has("test")).toBe(false);
      expect(registry.get("test")).toBeUndefined();
      
      // Register should work (cast to add register method)
      (registry as { register: (tool: { name: string; description: string; inputSchema: object }) => void }).register({
        name: "test-tool",
        description: "A test tool",
        inputSchema: {},
      });
      
      expect(registry.has("test-tool")).toBe(true);
      expect(registry.get("test-tool")?.name).toBe("test-tool");
    });
  });
});
