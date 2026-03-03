import type { Message, MessageContent } from "../agent/types.js";
import { emitEvent } from "../events/stream.js";

export type PruningLevel = "aggressive" | "moderate" | "conservative";

export interface PruningConfig {
  level: PruningLevel;
  maxTokens: number;
  keepFirstN: number;
  keepLastN: number;
  preserveSystem: boolean;
  preserveToolResults: boolean;
  maxToolResultLength: number;
  summarizeThreshold: number;
}

export interface PruningResult {
  originalCount: number;
  prunedCount: number;
  estimatedTokens: number;
  prunedTokens: number;
  summaryGenerated: boolean;
  messages: Message[];
}

export interface PruningStats {
  totalPrunes: number;
  totalMessagesRemoved: number;
  totalSummariesGenerated: number;
  avgCompressionRatio: number;
}

const DEFAULT_CONFIGS: Record<PruningLevel, PruningConfig> = {
  aggressive: {
    level: "aggressive",
    maxTokens: 4000,
    keepFirstN: 2,
    keepLastN: 4,
    preserveSystem: true,
    preserveToolResults: false,
    maxToolResultLength: 500,
    summarizeThreshold: 0.7,
  },
  moderate: {
    level: "moderate",
    maxTokens: 8000,
    keepFirstN: 3,
    keepLastN: 6,
    preserveSystem: true,
    preserveToolResults: true,
    maxToolResultLength: 1000,
    summarizeThreshold: 0.8,
  },
  conservative: {
    level: "conservative",
    maxTokens: 16000,
    keepFirstN: 5,
    keepLastN: 10,
    preserveSystem: true,
    preserveToolResults: true,
    maxToolResultLength: 2000,
    summarizeThreshold: 0.9,
  },
};

class ContextPruner {
  private stats: PruningStats = {
    totalPrunes: 0,
    totalMessagesRemoved: 0,
    totalSummariesGenerated: 0,
    avgCompressionRatio: 0,
  };

  estimateTokens(message: Message): number {
    let tokens = 4;

    const countContent = (content: MessageContent): number => {
      if (content.type === "text" && content.text) {
        return Math.ceil(content.text.length / 4);
      }
      if (content.type === "tool_result" && content.toolResult) {
        const str = JSON.stringify(content.toolResult);
        return Math.ceil(str.length / 4);
      }
      if (content.type === "tool_use") {
        return 20 + Math.ceil(JSON.stringify(content.toolInput || {}).length / 4);
      }
      return 10;
    };

    if (Array.isArray(message.content)) {
      tokens += message.content.reduce((sum, c) => sum + countContent(c), 0);
    } else {
      tokens += countContent(message.content);
    }

    return tokens;
  }

  estimateTotalTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + this.estimateTokens(m), 0);
  }

  needsPruning(messages: Message[], config: PruningConfig): boolean {
    const tokens = this.estimateTotalTokens(messages);
    return tokens > config.maxTokens;
  }

  prune(messages: Message[], config: PruningConfig, runId: string, sessionId: string): PruningResult {
    const originalCount = messages.length;
    const originalTokens = this.estimateTotalTokens(messages);

    if (!this.needsPruning(messages, config)) {
      return {
        originalCount,
        prunedCount: 0,
        estimatedTokens: originalTokens,
        prunedTokens: 0,
        summaryGenerated: false,
        messages,
      };
    }

    emitEvent("compaction", runId, sessionId, {
      action: "start",
      messageCount: originalCount,
      estimatedTokens: originalTokens,
      level: config.level,
    });

    const preservedFirst = messages.slice(0, config.keepFirstN);
    const preservedLast = messages.slice(-config.keepLastN);
    const middleMessages = messages.slice(config.keepFirstN, -config.keepLastN || undefined);

    const { toKeep, summarized } = this.selectMiddleMessages(middleMessages, config);

    const prunedMessages = [...preservedFirst, ...toKeep, ...preservedLast];
    const finalTokens = this.estimateTotalTokens(prunedMessages);

    this.stats.totalPrunes++;
    this.stats.totalMessagesRemoved += originalCount - prunedMessages.length;
    if (summarized) this.stats.totalSummariesGenerated++;
    
    const compressionRatio = finalTokens / originalTokens;
    this.stats.avgCompressionRatio = 
      (this.stats.avgCompressionRatio * (this.stats.totalPrunes - 1) + compressionRatio) / 
      this.stats.totalPrunes;

    emitEvent("compaction", runId, sessionId, {
      action: "complete",
      originalCount,
      prunedCount: originalCount - prunedMessages.length,
      originalTokens,
      finalTokens,
      compressionRatio,
    });

    return {
      originalCount,
      prunedCount: originalCount - prunedMessages.length,
      estimatedTokens: finalTokens,
      prunedTokens: originalTokens - finalTokens,
      summaryGenerated: summarized,
      messages: prunedMessages,
    };
  }

  private selectMiddleMessages(
    messages: Message[],
    config: PruningConfig
  ): { toKeep: Message[]; summarized: boolean } {
    if (messages.length === 0) {
      return { toKeep: [], summarized: false };
    }

    const toKeep: Message[] = [];
    let summarized = false;

    for (const message of messages) {
      if (config.preserveSystem && message.role === "system") {
        toKeep.push(message);
        continue;
      }

      if (config.preserveToolResults && this.isToolResultMessage(message)) {
        const truncated = this.truncateToolResult(message, config.maxToolResultLength);
        toKeep.push(truncated);
        continue;
      }

      if (this.isHighPriorityMessage(message)) {
        toKeep.push(message);
        continue;
      }

      summarized = true;
    }

    return { toKeep, summarized };
  }

  private isToolResultMessage(message: Message): boolean {
    if (Array.isArray(message.content)) {
      return message.content.some((c) => c.type === "tool_result");
    }
    return message.content.type === "tool_result";
  }

  private isHighPriorityMessage(message: Message): boolean {
    if (message.metadata?.priority === "high") return true;
    
    if (Array.isArray(message.content)) {
      return message.content.some(
        (c) => c.type === "tool_use" || (c.type === "text" && (c.text?.includes("重要") || c.text?.includes("critical")))
      );
    }
    
    return false;
  }

  private truncateToolResult(message: Message, maxLength: number): Message {
    if (!Array.isArray(message.content)) {
      if (message.content.type === "tool_result" && message.content.toolResult) {
        const str = JSON.stringify(message.content.toolResult);
        if (str.length > maxLength) {
          return {
            ...message,
            content: {
              ...message.content,
              toolResult: str.slice(0, maxLength) + "... [truncated]",
            },
          };
        }
      }
      return message;
    }

    const truncatedContent = message.content.map((c) => {
      if (c.type === "tool_result" && c.toolResult) {
        const str = JSON.stringify(c.toolResult);
        if (str.length > maxLength) {
          return { ...c, toolResult: str.slice(0, maxLength) + "... [truncated]" };
        }
      }
      return c;
    });

    return { ...message, content: truncatedContent };
  }

  pruneAdaptive(
    messages: Message[],
    targetTokens: number,
    runId: string,
    sessionId: string
  ): PruningResult {
    const currentTokens = this.estimateTotalTokens(messages);
    
    if (currentTokens <= targetTokens) {
      return {
        originalCount: messages.length,
        prunedCount: 0,
        estimatedTokens: currentTokens,
        prunedTokens: 0,
        summaryGenerated: false,
        messages,
      };
    }

    const ratio = targetTokens / currentTokens;
    let level: PruningLevel;
    
    if (ratio < 0.5) level = "aggressive";
    else if (ratio < 0.75) level = "moderate";
    else level = "conservative";

    return this.prune(messages, DEFAULT_CONFIGS[level], runId, sessionId);
  }

  getStats(): PruningStats {
    return { ...this.stats };
  }

  getConfig(level: PruningLevel): PruningConfig {
    return { ...DEFAULT_CONFIGS[level] };
  }
}

export const contextPruner = new ContextPruner();

export function pruneContext(
  messages: Message[],
  config: PruningConfig,
  runId: string,
  sessionId: string
): PruningResult {
  return contextPruner.prune(messages, config, runId, sessionId);
}

export function pruneContextAdaptive(
  messages: Message[],
  targetTokens: number,
  runId: string,
  sessionId: string
): PruningResult {
  return contextPruner.pruneAdaptive(messages, targetTokens, runId, sessionId);
}

export function estimateMessageTokens(message: Message): number {
  return contextPruner.estimateTokens(message);
}

export function getPruningStats(): PruningStats {
  return contextPruner.getStats();
}
