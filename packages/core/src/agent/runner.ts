import type {
  AgentConfig,
  AgentContext,
  AgentLogger,
  AgentResult,
  CompactionResult,
  FailoverAction,
  Message,
  ModelConfig,
} from "./types.js";
import { createAgentContext, addUserMessage, addSystemMessage, buildSystemPrompt } from "./context.js";
import { emitAgentEvent } from "./events.js";
import { runOuterLoop, type LoopCallbacks, type ModelExecutor, type ToolExecutor } from "./loop.js";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultLogger(): AgentLogger {
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}`;
    if (data) {
      console.log(logLine, JSON.stringify(data));
    } else {
      console.log(logLine);
    }
  };

  return {
    info: (message: string, data?: Record<string, unknown>) => log("INFO", message, data),
    warn: (message: string, data?: Record<string, unknown>) => log("WARN", message, data),
    error: (message: string, data?: Record<string, unknown>) => log("ERROR", message, data),
    debug: (message: string, data?: Record<string, unknown>) => log("DEBUG", message, data),
  };
}

export interface RunnerOptions {
  sessionId?: string;
  runId?: string;
  workspaceDir?: string;
  modelFallbacks?: ModelConfig[];
  profileFallbacks?: Array<{ profileId: string; config: ModelConfig }>;
  enableCompaction?: boolean;
  maxCompactionAttempts?: number;
  maxRetries?: number;
  timeoutMs?: number;
  logger?: AgentLogger;
}

export interface RunnerCallbacks {
  onAttemptStart?: (attemptNumber: number) => void;
  onAttemptEnd?: (result: unknown) => void;
  onToolCall?: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: unknown) => void;
  onCompaction?: (result: CompactionResult) => void;
  onFailover?: (action: FailoverAction) => void;
  onAgentEvent?: (event: { type: string; data: Record<string, unknown> }) => void;
  shouldContinue?: () => boolean;
}

export interface RunnerDependencies {
  modelExecutor: ModelExecutor;
  toolExecutor: ToolExecutor;
  compactionHandler?: (context: AgentContext) => Promise<CompactionResult>;
  logger?: AgentLogger;
}

export async function runAgent(
  config: AgentConfig,
  prompt: string,
  deps: RunnerDependencies,
  options?: RunnerOptions,
  callbacks?: RunnerCallbacks,
): Promise<AgentResult> {
  const startTime = Date.now();
  const logger = deps.logger ?? createDefaultLogger();

  const sessionId = options?.sessionId ?? generateId();
  const runId = options?.runId ?? generateId();

  emitAgentEvent("lifecycle", runId, sessionId, {
    event: "agent_start",
    configId: config.id,
    roleCombination: config.roleCombination,
  });

  const context = createAgentContext(
    config,
    sessionId,
    runId,
    options?.workspaceDir,
  );

  const systemPrompt = buildSystemPrompt(context);
  addSystemMessage(context, systemPrompt);
  addUserMessage(context, prompt);

  const loopCallbacks: LoopCallbacks = {
    onAttemptStart: (attemptNumber: number) => {
      logger.info("Agent attempt started", { attemptNumber, sessionId });
      callbacks?.onAttemptStart?.(attemptNumber);
    },
    onAttemptEnd: (result: unknown) => {
      callbacks?.onAttemptEnd?.(result);
    },
    onToolCall: (toolName: string, input: Record<string, unknown>) => {
      logger.debug("Tool call", { toolName, input });
      callbacks?.onToolCall?.(toolName, input);
    },
    onToolResult: (toolName: string, result: unknown) => {
      logger.debug("Tool result", { toolName });
      callbacks?.onToolResult?.(toolName, result);
    },
    onCompaction: (result: CompactionResult) => {
      logger.info("Compaction performed", {
        compacted: result.compacted,
        messagesRemoved: result.messagesRemoved,
      });
      callbacks?.onCompaction?.(result);
    },
    shouldContinue: callbacks?.shouldContinue,
  };

  const maxRetries = options?.maxRetries ?? config.maxRetries ?? 3;
  const enableCompaction = options?.enableCompaction ?? config.enableCompaction ?? true;
  const maxCompactionAttempts = options?.maxCompactionAttempts ?? config.maxCompactionAttempts ?? 3;

  const effectiveConfig: AgentConfig = {
    ...config,
    maxRetries,
    enableCompaction,
    maxCompactionAttempts,
    timeoutMs: options?.timeoutMs ?? config.timeoutMs ?? 120000,
  };

  context.config = effectiveConfig;

  let modelFallbackIndex = 0;
  const modelFallbacks = options?.modelFallbacks ?? [];
  let profileFallbackIndex = 0;
  const profileFallbacks = options?.profileFallbacks ?? [];

  let lastError: unknown = null;
  let usedFallback = false;

  while (modelFallbackIndex <= modelFallbacks.length) {
    const currentModel =
      modelFallbackIndex === 0
        ? config.model
        : modelFallbacks[modelFallbackIndex - 1];

    const runWithModel = async (): Promise<AgentResult> => {
      const loopResult = await runOuterLoop(
        context,
        async (model, messages, tools) => {
          return deps.modelExecutor(model, messages, tools);
        },
        deps.toolExecutor,
        deps.compactionHandler ?? null,
        loopCallbacks,
        logger,
      );

      const lastAssistant = context.messages
        .slice()
        .reverse()
        .find((m) => m.role === "assistant");

      const totalUsage = calculateTotalUsage(context.messages);

      return {
        success: loopResult.success,
        messages: context.messages,
        finalMessage: lastAssistant,
        usage: totalUsage,
        error: loopResult.finalResult.error
          ? {
              kind: loopResult.finalResult.error.kind,
              message: loopResult.finalResult.error.message,
            }
          : undefined,
        durationMs: Date.now() - startTime,
        attempts: loopResult.attempts,
        compactionCount: loopResult.compactionCount,
      };
    };

    try {
      const result = await runWithModel();

      if (result.success) {
        emitAgentEvent("lifecycle", runId, sessionId, {
          event: "agent_success",
          attempts: result.attempts,
          compactionCount: result.compactionCount,
        });

        return result;
      }

      const errorMessage = result.error?.message ?? "Unknown error";
      const shouldFallbackModel = shouldTryModelFallback(errorMessage);

      if (shouldFallbackModel && modelFallbackIndex < modelFallbacks.length) {
        modelFallbackIndex++;
        usedFallback = true;

        const action: FailoverAction = {
          type: "fallback_model",
          reason: errorMessage,
          attemptNumber: modelFallbackIndex,
        };

        logger.warn("Model fallback triggered", {
          currentIndex: modelFallbackIndex,
          totalFallbacks: modelFallbacks.length,
          error: errorMessage,
        });

        callbacks?.onFailover?.(action);
        emitAgentEvent("error", runId, sessionId, {
          event: "model_fallback",
          fallbackIndex: modelFallbackIndex,
          error: errorMessage,
        });

        continue;
      }

      const shouldFallbackProfile =
        shouldTryProfileFallback(errorMessage) && profileFallbackIndex < profileFallbacks.length;

      if (shouldFallbackProfile) {
        profileFallbackIndex++;
        usedFallback = true;

        const action: FailoverAction = {
          type: "fallback_profile",
          reason: errorMessage,
          attemptNumber: profileFallbackIndex,
        };

        logger.warn("Profile fallback triggered", {
          currentIndex: profileFallbackIndex,
          totalFallbacks: profileFallbacks.length,
          error: errorMessage,
        });

        callbacks?.onFailover?.(action);
        emitAgentEvent("error", runId, sessionId, {
          event: "profile_fallback",
          fallbackIndex: profileFallbackIndex,
          error: errorMessage,
        });

        continue;
      }

      return result;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Agent execution error", { error: errorMessage });

      if (modelFallbackIndex < modelFallbacks.length) {
        modelFallbackIndex++;
        usedFallback = true;

        const action: FailoverAction = {
          type: "fallback_model",
          reason: errorMessage,
          attemptNumber: modelFallbackIndex,
        };

        callbacks?.onFailover?.(action);
        continue;
      }

      emitAgentEvent("error", runId, sessionId, {
        event: "agent_error",
        error: errorMessage,
        fallbackUsed: usedFallback,
      });

      return {
        success: false,
        messages: context.messages,
        error: {
          kind: "fatal",
          message: errorMessage,
        },
        durationMs: Date.now() - startTime,
        attempts: modelFallbackIndex + 1,
        compactionCount: 0,
      };
    }
  }

  return {
    success: false,
    messages: context.messages,
    error: {
      kind: "fatal",
      message: lastError instanceof Error ? lastError.message : String(lastError),
    },
    durationMs: Date.now() - startTime,
    attempts: modelFallbackIndex + 1,
    compactionCount: 0,
  };
}

function calculateTotalUsage(
  messages: Message[],
): { input: number; output: number; total: number } | undefined {
  let totalInput = 0;
  let totalOutput = 0;

  for (const msg of messages) {
    if (msg.role === "user") {
      totalInput += estimateTokens(msg);
    } else if (msg.role === "assistant") {
      totalOutput += estimateTokens(msg);
    }
  }

  if (totalInput === 0 && totalOutput === 0) {
    return undefined;
  }

  return {
    input: totalInput,
    output: totalOutput,
    total: totalInput + totalOutput,
  };
}

function estimateTokens(message: Message): number {
  const content = message.content;

  if (!Array.isArray(content)) {
    if (content.text && typeof content.text === "string") {
      return Math.ceil(content.text.length / 4);
    }
    return 0;
  }
  let tokens = 0;
  for (const block of content) {
    if ("text" in block && typeof block.text === "string") {
      tokens += Math.ceil(block.text.length / 4);
    }
  }
  return tokens;


}

function shouldTryModelFallback(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  const fallbackTriggers = [
    "rate limit",
    "quota",
    "billing",
    "model not found",
    "model unavailable",
    "invalid model",
  ];
  return fallbackTriggers.some((trigger) => lower.includes(trigger));
}

function shouldTryProfileFallback(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  const fallbackTriggers = [
    "authentication",
    "unauthorized",
    "api key",
    "invalid credentials",
  ];
  return fallbackTriggers.some((trigger) => lower.includes(trigger));
}

export { createAgentContext, addUserMessage, addSystemMessage, buildSystemPrompt } from "./context.js";
export { emitAgentEvent, onAgentEvent, onAgentEventGlobal, clearAgentEventListeners } from "./events.js";
