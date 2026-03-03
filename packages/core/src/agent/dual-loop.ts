import type {
  AgentAttemptResult,
  AgentConfig,
  AgentContext,
  AgentLogger,
  AgentResult,
  CompactionResult,
  Message,
  ModelConfig,
} from "./types.js";
import { emitAgentEvent } from "./events.js";
import { addUserMessage } from "./context.js";
import { runInnerLoopAttempt, type LoopCallbacks, type LoopOptions } from "./loop.js";

export interface FollowUpDecision {
  needsFollowUp: boolean;
  reason: string;
  suggestedAction?: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface OuterLoopState {
  iteration: number;
  maxIterations: number;
  lastFollowUp: FollowUpDecision | null;
  accumulatedResults: unknown[];
  completedTasks: string[];
  pendingTasks: string[];
}

export interface DualLoopCallbacks extends LoopCallbacks {
  onFollowUpDecision?: (decision: FollowUpDecision, state: OuterLoopState) => void;
  onIterationStart?: (iteration: number, state: OuterLoopState) => void;
  onIterationEnd?: (iteration: number, result: AgentAttemptResult, state: OuterLoopState) => void;
}

export interface DualLoopOptions extends LoopOptions {
  maxOuterIterations: number;
  followUpThreshold: number;
  enableAutoFollowUp: boolean;
  followUpPrompt?: string;
}

export type FollowUpAnalyzer = (
  context: AgentContext,
  lastResult: AgentAttemptResult,
) => Promise<FollowUpDecision>;

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

const FOLLOW_UP_INDICATORS = [
  "would you like me to",
  "shall i continue",
  "do you want me to",
  "next step",
  "further analysis",
  "additional investigation",
  "more details",
  "i can also",
];

const INCOMPLETE_INDICATORS = [
  "however",
  "but",
  "unfortunately",
  "not yet",
  "incomplete",
  "partial",
  "requires",
  "pending",
];

const SECURITY_TOOL_NAMES = ["nmap", "sqlmap", "nuclei", "subfinder"];

export function createDefaultFollowUpAnalyzer(
  modelExecutor: ModelExecutor,
  model: ModelConfig,
): FollowUpAnalyzer {
  return async (_context: AgentContext, lastResult: AgentAttemptResult): Promise<FollowUpDecision> => {
    if (!lastResult.success) {
      return { needsFollowUp: false, reason: "Last attempt failed", priority: "high" };
    }

    const lastMessage = lastResult.lastAssistant;
    if (!lastMessage) {
      return { needsFollowUp: false, reason: "No assistant message", priority: "low" };
    }

    let textContent = "";
    const content = lastMessage.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && block.text) {
          textContent += block.text + " ";
        }
      }
    } else if (content.type === "text" && content.text) {
      textContent = content.text;
    }

    const lowerContent = textContent.toLowerCase();

    if (FOLLOW_UP_INDICATORS.some((i) => lowerContent.includes(i))) {
      return {
        needsFollowUp: true,
        reason: "Assistant suggested follow-up actions",
        suggestedAction: "Continue with suggested action",
        priority: "medium",
      };
    }

    if (INCOMPLETE_INDICATORS.some((i) => lowerContent.includes(i))) {
      return {
        needsFollowUp: true,
        reason: "Task appears incomplete",
        suggestedAction: "Address incomplete aspects",
        priority: "high",
      };
    }

    const toolCalls = lastResult.toolCalls;
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name.toLowerCase();
        if (SECURITY_TOOL_NAMES.some((t) => toolName.includes(t))) {
          return {
            needsFollowUp: true,
            reason: `Security tool ${toolName} was used - may need result analysis`,
            suggestedAction: "Analyze tool results and take action",
            priority: "medium",
          };
        }
      }
    }

    return { needsFollowUp: false, reason: "Task appears complete", priority: "low" };
  };
}

export async function runOuterLoopWithFollowUp(
  context: AgentContext,
  executor: ModelExecutor,
  toolExecutor: ToolExecutor,
  compactionHandler: CompactionHandler | null,
  followUpAnalyzer: FollowUpAnalyzer | null,
  callbacks: DualLoopCallbacks,
  logger: AgentLogger,
  options?: Partial<DualLoopOptions>,
): Promise<AgentResult> {
  const { config } = context;
  const startTime = Date.now();

  const defaultOptions: DualLoopOptions = {
    maxRetries: config.maxRetries ?? 3,
    maxOuterIterations: options?.maxOuterIterations ?? 5,
    enableCompaction: config.enableCompaction ?? true,
    maxCompactionAttempts: config.maxCompactionAttempts ?? 3,
    timeoutMs: config.timeoutMs ?? 120000,
    followUpThreshold: 0.7,
    enableAutoFollowUp: options?.enableAutoFollowUp ?? true,
  };

  const opts = { ...defaultOptions, ...options };

  const state: OuterLoopState = {
    iteration: 0,
    maxIterations: opts.maxOuterIterations,
    lastFollowUp: null,
    accumulatedResults: [],
    completedTasks: [],
    pendingTasks: [],
  };

  let compactionCount = 0;
  let totalAttempts = 0;
  let lastResult: AgentAttemptResult | null = null;

  emitAgentEvent(
    "lifecycle",
    context.runId,
    context.sessionId,
    { event: "outer_loop_start", maxIterations: opts.maxOuterIterations }
  );

  while (state.iteration < opts.maxOuterIterations) {
    state.iteration++;
    totalAttempts++;

    emitAgentEvent(
      "lifecycle",
      context.runId,
      context.sessionId,
      { event: "outer_iteration_start", iteration: state.iteration }
    );

    callbacks.onIterationStart?.(state.iteration, state);
    logger.info("Starting outer iteration", { iteration: state.iteration });

    const innerResult = await runInnerLoopAttempt(
      {
        context,
        model: config.model,
        executor,
        toolExecutor,
        callbacks,
        options: opts,
      },
      state.iteration,
    );

    lastResult = innerResult;
    state.accumulatedResults.push(innerResult);

    callbacks.onIterationEnd?.(state.iteration, innerResult, state);

    emitAgentEvent(
      "lifecycle",
      context.runId,
      context.sessionId,
      {
        event: "outer_iteration_end",
        iteration: state.iteration,
        success: innerResult.success,
      }
    );

    if (!innerResult.success) {
      logger.warn("Inner loop failed", {
        iteration: state.iteration,
        error: innerResult.error?.message,
      });

      if (
        opts.enableCompaction &&
        compactionHandler &&
        innerResult.error?.message?.toLowerCase().includes("context")
      ) {
        compactionCount++;
        logger.info("Attempting compaction after failure", { compactionCount });

        const compactionResult = await compactionHandler(context);
        callbacks.onCompaction?.(compactionResult);

        if (compactionResult.compacted) {
          continue;
        }
      }

      if (!innerResult.error?.recoverable) {
        break;
      }
    }

    if (opts.enableAutoFollowUp && followUpAnalyzer) {
      const followUpDecision = await followUpAnalyzer(context, innerResult);
      state.lastFollowUp = followUpDecision;

      callbacks.onFollowUpDecision?.(followUpDecision, state);

      emitAgentEvent(
        "lifecycle",
        context.runId,
        context.sessionId,
        {
          event: "follow_up_decision",
          needsFollowUp: followUpDecision.needsFollowUp,
          reason: followUpDecision.reason,
        }
      );

      if (!followUpDecision.needsFollowUp) {
        logger.info("No follow-up needed, completing", {
          iteration: state.iteration,
          reason: followUpDecision.reason,
        });
        break;
      }

      if (followUpDecision.suggestedAction && state.iteration < opts.maxOuterIterations) {
        logger.info("Adding follow-up prompt", {
          action: followUpDecision.suggestedAction,
          priority: followUpDecision.priority,
        });

        const followUpPrompt = opts.followUpPrompt ??
          `Based on your analysis, please ${followUpDecision.suggestedAction}. Focus on the most critical aspects first.`;

        addUserMessage(context, followUpPrompt);
        continue;
      }
    } else if (innerResult.success) {
      break;
    }
  }

  const lastAssistant = context.messages
    .slice()
    .reverse()
    .find((m) => m.role === "assistant");

  const totalUsage = calculateTotalUsage(context.messages);
  const durationMs = Date.now() - startTime;

  emitAgentEvent(
    "lifecycle",
    context.runId,
    context.sessionId,
    {
      event: "outer_loop_end",
      iterations: state.iteration,
      success: lastResult?.success ?? false,
      durationMs,
    }
  );

  return {
    success: lastResult?.success ?? false,
    messages: context.messages,
    finalMessage: lastAssistant,
    usage: totalUsage,
    error: lastResult?.error
      ? {
          kind: lastResult.error.kind,
          message: lastResult.error.message,
        }
      : undefined,
    durationMs,
    attempts: totalAttempts,
    compactionCount,
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

  if (Array.isArray(content)) {
    let tokens = 0;
    for (const block of content) {
      if ("text" in block && typeof block.text === "string") {
        tokens += Math.ceil(block.text.length / 4);
      }
    }
    return tokens;
  }

  if ("text" in content && typeof content.text === "string") {
    return Math.ceil(content.text.length / 4);
  }

  return 0;
}

export function createSecurityFollowUpAnalyzer(): FollowUpAnalyzer {
  return async (context: AgentContext, lastResult: AgentAttemptResult): Promise<FollowUpDecision> => {
    if (!lastResult.success || !lastResult.lastAssistant) {
      return { needsFollowUp: false, reason: "Last attempt failed", priority: "high" };
    }

    const toolCalls = lastResult.toolCalls;

    const lastToolMessages = context.messages.filter(
      (m) => m.role === "tool" && m.timestamp > Date.now() - 60000
    );

    for (const msg of lastToolMessages) {
      const content = msg.content;
      if (typeof content === "object" && !Array.isArray(content)) {
        const result = content.toolResult;
        if (result && typeof result === "object") {
          const resultStr = JSON.stringify(result).toLowerCase();

          if (
            resultStr.includes("vulnerability") ||
            resultStr.includes("cve") ||
            resultStr.includes("exploit") ||
            resultStr.includes("risk")
          ) {
            return {
              needsFollowUp: true,
              reason: "Security findings detected - need remediation advice",
              suggestedAction: "Provide remediation recommendations for the security findings",
              priority: "critical",
            };
          }
        }
      }
    }

    if (toolCalls) {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name.toLowerCase();

        if (toolName.includes("attack") || toolName.includes("exploit")) {
          return {
            needsFollowUp: true,
            reason: "Attack simulation performed - need defense analysis",
            suggestedAction: "Analyze attack results and suggest defensive measures",
            priority: "high",
          };
        }
      }
    }

    return { needsFollowUp: false, reason: "No security-specific follow-up needed", priority: "low" };
  };
}

export { runInnerLoopAttempt, type LoopCallbacks, type LoopOptions };
