import type {
  AgentAttemptResult,
  AgentConfig,
  AgentContext,
  AgentLogger,
  CompactionResult,
  Message,
  ModelConfig,
} from "./types.js";
import { emitAgentEvent } from "./events.js";
import { addToolMessage } from "./context.js";

export interface LoopCallbacks {
  onAttemptStart?: (attemptNumber: number) => void;
  onAttemptEnd?: (result: AgentAttemptResult) => void;
  onToolCall?: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: unknown) => void;
  onCompaction?: (result: CompactionResult) => void;
  shouldContinue?: () => boolean;
}

export interface LoopOptions {
  maxRetries: number;
  enableCompaction: boolean;
  maxCompactionAttempts: number;
  timeoutMs: number;
}

export type ModelExecutor = (
  model: ModelConfig,
  messages: Message[],
  tools?: unknown[],
) => Promise<{
  message: Message;
  usage?: { input: number; output: number; total: number };
}>;

export type ToolExecutor = (
  toolName: string,
  input: Record<string, unknown>,
) => Promise<unknown>;

export type CompactionHandler = (
  context: AgentContext,
) => Promise<CompactionResult>;

async function runInnerLoop(
  context: AgentContext,
  model: ModelConfig,
  executor: ModelExecutor,
  toolExecutor: ToolExecutor,
  callbacks: LoopCallbacks,
  options: LoopOptions,
  attemptNumber: number,
): Promise<AgentAttemptResult> {
  const startTime = Date.now();
  const { config } = context;

  emitAgentEvent(
    "lifecycle",
    context.runId,
    context.sessionId,
    { event: "attempt_start", attemptNumber },
  );

  callbacks.onAttemptStart?.(attemptNumber);

  try {
    const systemMessages = context.messages.filter((m) => m.role === "system");
    const historyMessages = context.messages.filter((m) => m.role !== "system");

    const toolDefs = config.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })) ?? [];

    const response = await executor(model, [...systemMessages, ...historyMessages], toolDefs);

    const assistantMessage = response.message;
    context.messages.push(assistantMessage);

    emitAgentEvent(
      "assistant",
      context.runId,
      context.sessionId,
      {
        attemptNumber,
        hasContent: Boolean(assistantMessage.content),
      },
    );

    const toolCalls = extractToolCalls(assistantMessage);

    for (const toolCall of toolCalls) {
      callbacks.onToolCall?.(toolCall.name, toolCall.input);

      emitAgentEvent(
        "tool",
        context.runId,
        context.sessionId,
        {
          event: "tool_call",
          toolName: toolCall.name,
          attemptNumber,
        },
      );

      try {
        const result = await toolExecutor(toolCall.name, toolCall.input);

        addToolMessage(context, toolCall.name, result, toolCall.id);
        callbacks.onToolResult?.(toolCall.name, result);

        emitAgentEvent(
          "tool",
          context.runId,
          context.sessionId,
          {
            event: "tool_result",
            toolName: toolCall.name,
            success: true,
            attemptNumber,
          },
        );
      } catch (toolError) {
        const errorResult = toolError instanceof Error ? toolError.message : String(toolError);

        addToolMessage(context, toolCall.name, { error: errorResult }, toolCall.id);

        emitAgentEvent(
          "error",
          context.runId,
          context.sessionId,
          {
            event: "tool_error",
            toolName: toolCall.name,
            error: errorResult,
            attemptNumber,
          },
        );
      }
    }

    const durationMs = Date.now() - startTime;

    emitAgentEvent(
      "lifecycle",
      context.runId,
      context.sessionId,
      { event: "attempt_end", attemptNumber, success: true, durationMs },
    );

    callbacks.onAttemptEnd?.({
      success: true,
      messages: context.messages,
      lastAssistant: assistantMessage,
      toolCalls,
      usage: response.usage,
      durationMs,
      attemptNumber,
    });

    return {
      success: true,
      messages: context.messages,
      lastAssistant: assistantMessage,
      toolCalls,
      usage: response.usage,
      durationMs,
      attemptNumber,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRecoverable = isRecoverableError(error);

    emitAgentEvent(
      "error",
      context.runId,
      context.sessionId,
      {
        event: "attempt_error",
        attemptNumber,
        error: errorMessage,
        recoverable: isRecoverable,
      },
    );

    const result: AgentAttemptResult = {
      success: false,
      messages: context.messages,
      error: {
        kind: isRecoverable ? "recoverable" : "fatal",
        message: errorMessage,
        recoverable: isRecoverable,
      },
      durationMs,
      attemptNumber,
    };

    callbacks.onAttemptEnd?.(result);

    return result;
  }
}

function extractToolCalls(
  message: Message,
): Array<{ id: string; name: string; input: Record<string, unknown> }> {
  const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
  const content = message.content;

  if (!Array.isArray(content)) {
    return toolCalls;
  }

  for (const block of content) {
    if (block.type === "tool_use" && block.toolName && block.toolInput) {
      toolCalls.push({
        id: block.toolUseId ?? `call_${Date.now()}`,
        name: block.toolName,
        input: block.toolInput,
      });
    }
  }

  return toolCalls;
}

function isRecoverableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const recoverablePatterns = [
      "rate limit",
      "timeout",
      "temporary",
      "unavailable",
      "overloaded",
      "context overflow",
    ];
    return recoverablePatterns.some((p) => message.includes(p));
  }
  return false;
}

export interface RunInnerLoopParams {
  context: AgentContext;
  model: ModelConfig;
  executor: ModelExecutor;
  toolExecutor: ToolExecutor;
  callbacks?: LoopCallbacks;
  options?: Partial<LoopOptions>;
}

export async function runInnerLoopAttempt(
  params: RunInnerLoopParams,
  attemptNumber: number,
): Promise<AgentAttemptResult> {
  const {
    context,
    model,
    executor,
    toolExecutor,
    callbacks = {},
    options: userOptions = {},
  } = params;

  const config = context.config;
  const defaultOptions: LoopOptions = {
    maxRetries: config.maxRetries ?? 3,
    enableCompaction: config.enableCompaction ?? true,
    maxCompactionAttempts: config.maxCompactionAttempts ?? 3,
    timeoutMs: config.timeoutMs ?? 120000,
  };

  const options = { ...defaultOptions, ...userOptions };

  return runInnerLoop(
    context,
    model,
    executor,
    toolExecutor,
    callbacks,
    options,
    attemptNumber,
  );
}

export async function runOuterLoop(
  context: AgentContext,
  executor: ModelExecutor,
  toolExecutor: ToolExecutor,
  compactionHandler: CompactionHandler | null,
  callbacks: LoopCallbacks,
  logger: AgentLogger,
): Promise<{
  success: boolean;
  attempts: number;
  compactionCount: number;
  finalResult: AgentAttemptResult;
}> {
  const { config } = context;
  const maxRetries = config.maxRetries ?? 3;
  const maxCompactionAttempts = config.maxCompactionAttempts ?? 3;
  const enableCompaction = config.enableCompaction ?? true;

  let attemptNumber = 0;
  let compactionCount = 0;
  let lastResult: AgentAttemptResult | null = null;

  while (attemptNumber < maxRetries) {
    attemptNumber++;

    if (callbacks.shouldContinue?.() === false) {
      logger.info("Loop stopped by callback", { attemptNumber });
      break;
    }

    logger.info("Starting attempt", { attemptNumber, maxRetries });

    const result = await runInnerLoopAttempt(
      {
        context,
        model: config.model,
        executor,
        toolExecutor,
        callbacks,
      },
      attemptNumber,
    );

    lastResult = result;

    if (result.success) {
      logger.info("Attempt succeeded", {
        attemptNumber,
        durationMs: result.durationMs,
      });

      return {
        success: true,
        attempts: attemptNumber,
        compactionCount,
        finalResult: result,
      };
    }

    if (!result.error?.recoverable) {
      logger.error("Non-recoverable error", {
        attemptNumber,
        error: result.error?.message,
      });

      return {
        success: false,
        attempts: attemptNumber,
        compactionCount,
        finalResult: result,
      };
    }

    const needsCompaction =
      enableCompaction &&
      compactionHandler &&
      isContextOverflowError(result.error?.message ?? "");

    if (needsCompaction && compactionCount < maxCompactionAttempts) {
      compactionCount++;

      logger.warn("Attempting compaction", {
        attemptNumber,
        compactionCount,
        maxAttempts: maxCompactionAttempts,
      });

      emitAgentEvent(
        "compaction",
        context.runId,
        context.sessionId,
        { attemptNumber, compactionCount },
      );

      const compactionResult = await compactionHandler(context);

      callbacks.onCompaction?.(compactionResult);

      if (compactionResult.compacted) {
        logger.info("Compaction succeeded", {
          compactionCount,
          messagesRemoved: compactionResult.messagesRemoved,
        });
        continue;
      }

      logger.warn("Compaction failed", {
        compactionCount,
        reason: compactionResult.reason,
      });
    }

    logger.warn("Attempt failed, retrying", {
      attemptNumber,
      error: result.error?.message,
    });
  }

  return {
    success: lastResult?.success ?? false,
    attempts: attemptNumber,
    compactionCount,
    finalResult: lastResult!,
  };
}

function isContextOverflowError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes("context overflow") ||
    lowerMessage.includes("context window") ||
    lowerMessage.includes("too many tokens") ||
    lowerMessage.includes("maximum context")
  );
}
