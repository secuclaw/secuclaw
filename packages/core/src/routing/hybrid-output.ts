import type { LLMProvider } from "../providers/types.js";

export interface HybridOutputOptions {
  mode: "parallel" | "sequential" | "consensus" | "voting" | "best";
  providers?: string[];
  maxConcurrent?: number;
  timeout?: number;
  minResponses?: number;
}

export interface HybridResponse {
  outputs: Array<{
    provider: string;
    content: string;
    model: string;
    latency: number;
    confidence?: number;
  }>;
  merged: string;
  method: string;
  timestamp: number;
  consensusScore?: number;
}

export interface VoteResult {
  content: string;
  votes: number;
  providers: string[];
  confidence: number;
}

export class HybridOutputEngine {
  private providerManager: { chat: (messages: Array<{ role: string; content: string }>, provider?: string) => Promise<{ content: string; model: string }>; listAvailable: () => string[] };

  constructor(providerManager: { chat: (messages: Array<{ role: string; content: string }>, provider?: string) => Promise<{ content: string; model: string }>; listAvailable: () => string[] }) {
    this.providerManager = providerManager;
  }

  async promptMultiple(
    messages: Array<{ role: string; content: string }>,
    providers: string[],
    options?: { timeout?: number }
  ): Promise<Array<{ provider: string; content: string; model: string; latency: number }>> {
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        const start = Date.now();
        try {
          const response = await Promise.race([
            this.providerManager.chat(messages, provider),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), options?.timeout ?? 30000)
            ),
          ]);
          return {
            provider,
            content: response.content,
            model: response.model,
            latency: Date.now() - start,
          };
        } catch (err) {
          return {
            provider,
            content: "",
            model: "",
            latency: Date.now() - start,
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<{ provider: string; content: string; model: string; latency: number }> =>
        r.status === "fulfilled" && r.value.content.length > 0
      )
      .map((r) => r.value);
  }

  mergeOutputs(outputs: Array<{ provider: string; content: string }>, method: string): string {
    switch (method) {
      case "first":
        return outputs[0]?.content || "";
      case "last":
        return outputs[outputs.length - 1]?.content || "";
      case "longest":
        return outputs.sort((a, b) => b.content.length - a.content.length)[0]?.content || "";
      case "shortest":
        return outputs.sort((a, b) => a.content.length - b.content.length)[0]?.content || "";
      case "concat":
        return outputs.map((o) => o.content).join("\n\n---\n\n");
      default:
        return outputs[0]?.content || "";
    }
  }

  async consensus(
    messages: Array<{ role: string; content: string }>,
    providers: string[]
  ): Promise<HybridResponse> {
    const outputs = await this.promptMultiple(messages, providers);
    
    if (outputs.length === 0) {
      return {
        outputs: [],
        merged: "",
        method: "consensus",
        timestamp: Date.now(),
        consensusScore: 0,
      };
    }

    if (outputs.length === 1) {
      return {
        outputs: [outputs[0]],
        merged: outputs[0].content,
        method: "consensus",
        timestamp: Date.now(),
        consensusScore: 1,
      };
    }

    const sentences = this.extractKeySentences(outputs.map((o) => o.content));
    const voteResults = this.voteOnSentences(sentences, outputs.map((o) => o.content));
    
    const winner = voteResults.sort((a, b) => b.votes - a.votes)[0];
    const consensusScore = winner ? winner.votes / outputs.length : 0;

    return {
      outputs,
      merged: winner?.content || outputs[0].content,
      method: "consensus",
      timestamp: Date.now(),
      consensusScore,
    };
  }

  private extractKeySentences(contents: string[]): string[] {
    const sentences = new Set<string>();
    
    for (const content of contents) {
      const matches = content.match(/[^.!?]+[.!?]+/g) || [];
      for (const match of matches) {
        const trimmed = match.trim();
        if (trimmed.length > 10 && trimmed.length < 500) {
          sentences.add(trimmed);
        }
      }
    }

    return Array.from(sentences);
  }

  private voteOnSentences(sentences: string[], contents: string[]): VoteResult[] {
    const votes: Map<string, VoteResult> = new Map();

    for (const sentence of sentences) {
      for (const content of contents) {
        if (content.includes(sentence)) {
          const existing = votes.get(sentence);
          if (existing) {
            existing.votes++;
            if (!existing.providers.includes("unknown")) {
              existing.providers.push("unknown");
            }
          } else {
            votes.set(sentence, {
              content: sentence,
              votes: 1,
              providers: ["unknown"],
              confidence: 0,
            });
          }
        }
      }
    }

    const results = Array.from(votes.values());
    for (const result of results) {
      result.confidence = result.votes / contents.length;
    }

    return results;
  }

  async voting(
    messages: Array<{ role: string; content: string }>,
    providers: string[]
  ): Promise<HybridResponse> {
    const outputs = await this.promptMultiple(messages, providers);
    
    if (outputs.length === 0) {
      return {
        outputs: [],
        merged: "",
        method: "voting",
        timestamp: Date.now(),
        consensusScore: 0,
      };
    }

    const sentences = this.extractKeySentences(outputs.map((o) => o.content));
    const voteResults = this.voteOnSentences(sentences, outputs.map((o) => o.content));

    return {
      outputs,
      merged: voteResults
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map((r) => r.content)
        .join("\n\n"),
      method: "voting",
      timestamp: Date.now(),
      consensusScore: voteResults[0]?.confidence ?? 0,
    };
  }

  async bestResponse(
    messages: Array<{ role: string; content: string }>,
    providers: string[]
  ): Promise<HybridResponse> {
    const outputs = await this.promptMultiple(messages, providers);

    if (outputs.length === 0) {
      return {
        outputs: [],
        merged: "",
        method: "best",
        timestamp: Date.now(),
        consensusScore: 0,
      };
    }

    const scored = outputs.map((o) => ({
      ...o,
      score: this.calculateScore(o),
    }));

    scored.sort((a, b) => b.score - a.score);

    return {
      outputs,
      merged: scored[0].content,
      method: "best",
      timestamp: Date.now(),
      consensusScore: scored[0].score / 100,
    };
  }

  private calculateScore(output: { content: string; latency: number }): number {
    let score = 100;

    const contentLength = output.content.length;
    if (contentLength < 50) score -= 30;
    else if (contentLength < 100) score -= 15;

    if (output.content.toLowerCase().includes("error")) score -= 20;
    if (output.content.toLowerCase().includes("unknown")) score -= 10;
    if (output.content.toLowerCase().includes("cannot")) score -= 10;

    if (output.latency < 2000) score += 10;
    else if (output.latency > 10000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  async execute(
    messages: Array<{ role: string; content: string }>,
    options: HybridOutputOptions
  ): Promise<HybridResponse> {
    const providers = options.providers ?? this.providerManager.listAvailable().slice(0, 3);

    switch (options.mode) {
      case "parallel":
        const parallelOutputs = await this.promptMultiple(messages, providers);
        return {
          outputs: parallelOutputs,
          merged: this.mergeOutputs(parallelOutputs, "concat"),
          method: "parallel",
          timestamp: Date.now(),
        };

      case "sequential":
        const sequentialOutputs: Array<{ provider: string; content: string; model: string; latency: number }> = [];
        for (const provider of providers) {
          const result = await this.promptMultiple(messages, [provider]);
          sequentialOutputs.push(...result);
        }
        return {
          outputs: sequentialOutputs,
          merged: this.mergeOutputs(sequentialOutputs, "last"),
          method: "sequential",
          timestamp: Date.now(),
        };

      case "consensus":
        return this.consensus(messages, providers);

      case "voting":
        return this.voting(messages, providers);

      case "best":
        return this.bestResponse(messages, providers);

      default:
        const defaultOutputs = await this.promptMultiple(messages, providers);
        return {
          outputs: defaultOutputs,
          merged: defaultOutputs[0]?.content || "",
          method: "default",
          timestamp: Date.now(),
        };
    }
  }
}
