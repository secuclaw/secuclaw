import type { Message } from "../agent/types.js";
import { emitEvent } from "../events/stream.js";

export type LLMExecutor = (
  prompt: string,
  systemPrompt?: string,
) => Promise<string>;

export interface CompressionConfig {
  maxTokens: number;
  summaryMaxTokens: number;
  batchSize: number;
  preserveSystem: boolean;
  preserveTools: boolean;
  llmModel?: string;
}

export interface CompressionResult {
  originalCount: number;
  compressedCount: number;
  originalTokens: number;
  compressedTokens: number;
  summaryGenerated: boolean;
  messages: Message[];
  compressionRatio: number;
}

export interface BatchSummary {
  startIndex: number;
  endIndex: number;
  summary: string;
  originalTokens: number;
}

const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  maxTokens: 8000,
  summaryMaxTokens: 500,
  batchSize: 10,
  preserveSystem: true,
  preserveTools: false,
};

const SECURITY_SUMMARY_PROMPT = `You are a security context summarizer. Summarize the following conversation messages into a concise summary that preserves:
1. Key security findings and vulnerabilities discovered
2. Tools used and their results (briefly)
3. Decisions made and actions taken
4. Important context needed for continued analysis

Be concise but comprehensive. Focus on actionable information.`;

export class ContextCompressor {
  private llmExecutor: LLMExecutor | null = null;
  private config: CompressionConfig;
  private summaryCache: Map<string, string> = new Map();

  constructor(config?: Partial<CompressionConfig>) {
    this.config = { ...DEFAULT_COMPRESSION_CONFIG, ...config };
  }

  setLLMExecutor(executor: LLMExecutor): void {
    this.llmExecutor = executor;
  }

  estimateTokens(message: Message): number {
    let tokens = 4;
    const content = message.content;

    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && block.text) {
          tokens += Math.ceil(block.text.length / 4);
        } else if (block.type === "tool_result" && block.toolResult) {
          tokens += Math.ceil(JSON.stringify(block.toolResult).length / 4);
        } else if (block.type === "tool_use") {
          tokens += 20 + Math.ceil(JSON.stringify(block.toolInput || {}).length / 4);
        }
      }
    } else {
      if (content.type === "text" && content.text) {
        tokens += Math.ceil(content.text.length / 4);
      } else if (content.type === "tool_result" && content.toolResult) {
        tokens += Math.ceil(JSON.stringify(content.toolResult).length / 4);
      }
    }

    return tokens;
  }

  estimateTotalTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + this.estimateTokens(m), 0);
  }

  async compress(
    messages: Message[],
    runId: string,
    sessionId: string,
  ): Promise<CompressionResult> {
    const originalCount = messages.length;
    const originalTokens = this.estimateTotalTokens(messages);

    if (originalTokens <= this.config.maxTokens) {
      return {
        originalCount,
        compressedCount: originalCount,
        originalTokens,
        compressedTokens: originalTokens,
        summaryGenerated: false,
        messages,
        compressionRatio: 1,
      };
    }

    emitEvent("compaction", runId, sessionId, {
      action: "compress_start",
      messageCount: originalCount,
      estimatedTokens: originalTokens,
    });

    const preservedMessages: Message[] = [];
    const toCompress: Message[] = [];

    for (const msg of messages) {
      if (this.config.preserveSystem && msg.role === "system") {
        preservedMessages.push(msg);
      } else if (this.config.preserveTools && this.isToolMessage(msg)) {
        preservedMessages.push(msg);
      } else {
        toCompress.push(msg);
      }
    }

    let compressedMessages: Message[];

    if (this.llmExecutor && toCompress.length > this.config.batchSize) {
      compressedMessages = await this.compressWithLLM(toCompress, runId, sessionId);
    } else {
      compressedMessages = this.compressWithoutLLM(toCompress);
    }

    const finalMessages = [...preservedMessages, ...compressedMessages];
    const compressedTokens = this.estimateTotalTokens(finalMessages);
    const compressionRatio = compressedTokens / originalTokens;

    emitEvent("compaction", runId, sessionId, {
      action: "compress_complete",
      originalCount,
      compressedCount: finalMessages.length,
      originalTokens,
      compressedTokens,
      compressionRatio,
    });

    return {
      originalCount,
      compressedCount: finalMessages.length,
      originalTokens,
      compressedTokens,
      summaryGenerated: this.llmExecutor !== null,
      messages: finalMessages,
      compressionRatio,
    };
  }

  private async compressWithLLM(
    messages: Message[],
    runId: string,
    sessionId: string,
  ): Promise<Message[]> {
    if (!this.llmExecutor) {
      return this.compressWithoutLLM(messages);
    }

    const batches: Message[][] = [];
    for (let i = 0; i < messages.length; i += this.config.batchSize) {
      batches.push(messages.slice(i, i + this.config.batchSize));
    }

    const summaries: BatchSummary[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchText = this.messagesToText(batch);
      const cacheKey = this.hashText(batchText);

      let summary: string;

      if (this.summaryCache.has(cacheKey)) {
        summary = this.summaryCache.get(cacheKey)!;
      } else {
        try {
          summary = await this.llmExecutor(batchText, SECURITY_SUMMARY_PROMPT);
          if (summary.length > this.config.summaryMaxTokens * 4) {
            summary = summary.slice(0, this.config.summaryMaxTokens * 4) + "...";
          }
          this.summaryCache.set(cacheKey, summary);
        } catch {
          summary = this.createBasicSummary(batch);
        }
      }

      summaries.push({
        startIndex: i * this.config.batchSize,
        endIndex: Math.min((i + 1) * this.config.batchSize, messages.length),
        summary,
        originalTokens: this.estimateTotalTokens(batch),
      });

      emitEvent("compaction", runId, sessionId, {
        action: "batch_summarized",
        batchIndex: i,
        totalBatches: batches.length,
      });
    }

    const summaryMessages: Message[] = summaries.map((s, i) => ({
      id: `summary-${i}`,
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `[Context Summary ${i + 1}/${summaries.length}]\n${s.summary}`,
      },
      timestamp: Date.now() - (summaries.length - i) * 1000,
      metadata: {
        compressed: true,
        originalRange: [s.startIndex, s.endIndex],
        originalTokens: s.originalTokens,
      },
    }));

    return summaryMessages;
  }

  private compressWithoutLLM(messages: Message[]): Message[] {
    const result: Message[] = [];
    const keepRatio = this.config.maxTokens / this.estimateTotalTokens(messages);

    for (const msg of messages) {
      if (msg.role === "system") {
        result.push(msg);
        continue;
      }

      if (msg.role === "user") {
        result.push(msg);
        continue;
      }

      if (this.isHighValueMessage(msg)) {
        result.push(msg);
        continue;
      }

      if (Math.random() < keepRatio) {
        result.push(this.truncateMessage(msg));
      }
    }

    return result;
  }

  private messagesToText(messages: Message[]): string {
    return messages
      .map((m) => {
        const role = m.role.toUpperCase();
        let content = "";

        if (Array.isArray(m.content)) {
          for (const block of m.content) {
            if (block.type === "text" && block.text) {
              content += block.text + " ";
            } else if (block.type === "tool_result" && block.toolResult) {
              content += JSON.stringify(block.toolResult).slice(0, 500) + " ";
            } else if (block.type === "tool_use") {
              content += `[Tool: ${block.toolName}] `;
            }
          }
        } else {
          if (m.content.type === "text" && m.content.text) {
            content = m.content.text;
          }
        }

        return `${role}: ${content.trim()}`;
      })
      .join("\n\n");
  }

  private createBasicSummary(messages: Message[]): string {
    const roleCounts: Record<string, number> = {};
    const toolsUsed: Set<string> = new Set();

    for (const msg of messages) {
      roleCounts[msg.role] = (roleCounts[msg.role] || 0) + 1;

      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "tool_use" && block.toolName) {
            toolsUsed.add(block.toolName);
          }
        }
      }
    }

    const parts: string[] = [];
    parts.push(`Messages: ${messages.length}`);
    parts.push(`Roles: ${Object.entries(roleCounts).map(([r, c]) => `${r}(${c})`).join(", ")}`);
    if (toolsUsed.size > 0) {
      parts.push(`Tools used: ${Array.from(toolsUsed).join(", ")}`);
    }

    return parts.join(". ");
  }

  private isToolMessage(message: Message): boolean {
    if (Array.isArray(message.content)) {
      return message.content.some((c) => c.type === "tool_use" || c.type === "tool_result");
    }
    return message.content.type === "tool_use" || message.content.type === "tool_result";
  }

  private isHighValueMessage(message: Message): boolean {
    if (message.metadata?.priority === "high") return true;

    const content = Array.isArray(message.content) ? message.content : [message.content];

    for (const block of content) {
      if (block.type === "text" && block.text) {
        const text = block.text.toLowerCase();
        if (
          text.includes("critical") ||
          text.includes("vulnerability") ||
          text.includes("cve") ||
          text.includes("exploit") ||
          text.includes("重要") ||
          text.includes("关键")
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private truncateMessage(message: Message): Message {
    const maxTokens = 200;
    const maxChars = maxTokens * 4;

    if (Array.isArray(message.content)) {
      const truncatedContent = message.content.map((block) => {
        if (block.type === "text" && block.text && block.text.length > maxChars) {
          return { ...block, text: block.text.slice(0, maxChars) + "... [truncated]" };
        }
        if (block.type === "tool_result" && block.toolResult) {
          const str = JSON.stringify(block.toolResult);
          if (str.length > maxChars) {
            return { ...block, toolResult: str.slice(0, maxChars) + "... [truncated]" };
          }
        }
        return block;
      });
      return { ...message, content: truncatedContent };
    }

    const content = message.content;
    if (content.type === "text" && content.text && content.text.length > maxChars) {
      return { ...message, content: { ...content, text: content.text.slice(0, maxChars) + "... [truncated]" } };
    }
    if (content.type === "tool_result" && content.toolResult) {
      const str = JSON.stringify(content.toolResult);
      if (str.length > maxChars) {
        return { ...message, content: { ...content, toolResult: str.slice(0, maxChars) + "... [truncated]" } };
      }
    }

    return message;
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  clearCache(): void {
    this.summaryCache.clear();
  }
}

export const contextCompressor = new ContextCompressor();

export function setCompressorLLM(executor: LLMExecutor): void {
  contextCompressor.setLLMExecutor(executor);
}

export async function compressContext(
  messages: Message[],
  runId: string,
  sessionId: string,
): Promise<CompressionResult> {
  return contextCompressor.compress(messages, runId, sessionId);
}
