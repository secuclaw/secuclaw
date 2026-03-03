import type { SessionMessage, CompactionConfig } from "./types.js";

type CompactionLevel = "tool_result" | "assistant" | "recent";

interface CompactionResult {
  originalCount: number;
  compactedCount: number;
  removedCounts: Record<CompactionLevel, number>;
}

function categorizeMessage(message: SessionMessage): CompactionLevel {
  if (message.role === "tool") {
    return "tool_result";
  }
  if (message.role === "assistant") {
    return "assistant";
  }
  return "recent";
}

export function compactSessionMessages(
  messages: SessionMessage[],
  config: CompactionConfig,
): { messages: SessionMessage[]; result: CompactionResult } {
  const originalCount = messages.length;
  const removedCounts: Record<CompactionLevel, number> = {
    tool_result: 0,
    assistant: 0,
    recent: 0,
  };
  
  if (originalCount === 0) {
    return {
      messages: [],
      result: {
        originalCount: 0,
        compactedCount: 0,
        removedCounts: { tool_result: 0, assistant: 0, recent: 0 },
      },
    };
  }
  
  const categorized: Record<CompactionLevel, SessionMessage[]> = {
    tool_result: [],
    assistant: [],
    recent: [],
  };
  
  for (const message of messages) {
    const level = categorizeMessage(message);
    categorized[level].push(message);
  }
  
  const compacted: SessionMessage[] = [];
  
  const toolResults = categorized.tool_result;
  const toolKeepCount = Math.min(config.toolResultKeep, toolResults.length);
  compacted.push(...toolResults.slice(-toolKeepCount));
  removedCounts.tool_result = toolResults.length - toolKeepCount;
  
  const assistants = categorized.assistant;
  const assistantKeepCount = Math.min(config.assistantKeep, assistants.length);
  compacted.push(...assistants.slice(-assistantKeepCount));
  removedCounts.assistant = assistants.length - assistantKeepCount;
  
  const recents = categorized.recent;
  const recentKeepCount = Math.min(config.recentKeep, recents.length);
  compacted.push(...recents.slice(-recentKeepCount));
  removedCounts.recent = recents.length - recentKeepCount;
  
  compacted.sort((a, b) => a.timestamp - b.timestamp);
  
  return {
    messages: compacted,
    result: {
      originalCount,
      compactedCount: compacted.length,
      removedCounts,
    },
  };
}

export function estimateTokenCount(messages: SessionMessage[]): number {
  const tokensPerMessage = 4;
  const tokensPerWord = 1.3;
  
  let total = 0;
  
  for (const message of messages) {
    total += tokensPerMessage;
    
    for (const content of message.content) {
      if (content.type === "text" && content.text) {
        const wordCount = content.text.split(/\s+/).length;
        total += wordCount * tokensPerWord;
      }
    }
  }
  
  return Math.ceil(total);
}

export function needsCompaction(
  messages: SessionMessage[],
  maxMessages: number,
  maxTokens: number,
): boolean {
  if (messages.length > maxMessages) {
    return true;
  }
  
  const estimatedTokens = estimateTokenCount(messages);
  return estimatedTokens > maxTokens;
}

export function performCompaction(
  messages: SessionMessage[],
  config: CompactionConfig,
  maxMessages: number,
  maxTokens: number,
): { messages: SessionMessage[]; wasCompacted: boolean; result?: CompactionResult } {
  if (!needsCompaction(messages, maxMessages, maxTokens)) {
    return { messages, wasCompacted: false };
  }
  
  const { messages: compacted, result } = compactSessionMessages(messages, config);
  
  if (needsCompaction(compacted, maxMessages, maxTokens)) {
    const fallbackCount = Math.floor(maxMessages * 0.7);
    const fallback = compacted.slice(-fallbackCount);
    
    return {
      messages: fallback,
      wasCompacted: true,
      result: {
        originalCount: messages.length,
        compactedCount: fallback.length,
        removedCounts: {
          tool_result: result.removedCounts.tool_result,
          assistant: result.removedCounts.assistant + (compacted.length - fallback.length),
          recent: 0,
        },
      },
    };
  }
  
  return { messages: compacted, wasCompacted: true, result };
}
