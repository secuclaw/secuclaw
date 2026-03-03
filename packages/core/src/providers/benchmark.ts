/**
 * Provider Benchmark Module - Performance benchmarking for LLM providers
 * 
 * Tests:
 * - Latency (time to first token, total response time)
 * - Throughput (tokens per second)
 * - Cost estimation
 * - Quality metrics (if applicable)
 */
import type { LLMProvider, ChatRequest, ChatResponse, ModelConfig } from "./types.js";

export interface BenchmarkResult {
  provider: string;
  model: string;
  success: boolean;
  latency: {
    timeToFirstToken: number;
    totalResponseTime: number;
    tokensPerSecond: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
  };
  error?: string;
}

export interface BenchmarkOptions {
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  iterations?: number;
  warmup?: boolean;
}

const DEFAULT_OPTIONS: Required<BenchmarkOptions> = {
  prompt: "Explain what is SecuClaw in one sentence.",
  maxTokens: 256,
  temperature: 0.7,
  iterations: 3,
  warmup: true,
};

const DEFAULT_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4 },
  "gemini-2.0-flash": { input: 0, output: 0 },
  "gemini-2.0-flash-lite": { input: 0, output: 0 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): { input: number; output: number; total: number } {
  const prices = DEFAULT_PRICES[model] || { input: 0.5, output: 1.5 };
  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
  };
}

async function measureLatency(
  provider: LLMProvider,
  request: ChatRequest
): Promise<{ response: ChatResponse; timeToFirstToken: number }> {
  const startTime = performance.now();
  let timeToFirstToken = 0;
  
  // For streaming, measure time to first token
  if (provider.chatStream) {
    const stream = provider.chatStream(request);
    for await (const chunk of stream) {
      if (timeToFirstToken === 0 && chunk.delta.content) {
        timeToFirstToken = performance.now() - startTime;
      }
    }
  }
  
  // For non-streaming, measure total response time
  const response = await provider.chat(request);
  if (timeToFirstToken === 0) {
    timeToFirstToken = performance.now() - startTime;
  }
  
  return { response, timeToFirstToken };
}

export async function benchmarkProvider(
  provider: LLMProvider,
  options?: BenchmarkOptions
): Promise<BenchmarkResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: BenchmarkResult[] = [];
  
  // Warmup run
  if (opts.warmup) {
    try {
      await provider.chat({
        messages: [{ role: "user", content: "Hi" }],
        maxTokens: 10,
      });
    } catch {
      // Ignore warmup errors
    }
  }
  
  // Benchmark runs
  for (let i = 0; i < opts.iterations; i++) {
    const request: ChatRequest = {
      messages: [{ role: "user", content: opts.prompt }],
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
    };
    
    try {
      const { response, timeToFirstToken } = await measureLatency(provider, request);
      const totalTime = response.latency || timeToFirstToken;
      
      const inputTokens = response.usage?.inputTokens || 0;
      const outputTokens = response.usage?.outputTokens || 0;
      const totalTokens = response.usage?.totalTokens || inputTokens + outputTokens;
      
      const tokensPerSecond = outputTokens > 0 && totalTime > 0 
        ? (outputTokens / totalTime) * 1000 
        : 0;
      
      const model = response.model || provider.config.defaultModel || "unknown";
      const cost = estimateCost(model, inputTokens, outputTokens);
      
      results.push({
        provider: provider.name,
        model,
        success: true,
        latency: {
          timeToFirstToken,
          totalResponseTime: totalTime,
          tokensPerSecond,
        },
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
        },
        cost,
      });
    } catch (error) {
      results.push({
        provider: provider.name,
        model: provider.config.defaultModel || "unknown",
        success: false,
        latency: { timeToFirstToken: 0, totalResponseTime: 0, tokensPerSecond: 0 },
        tokens: { input: 0, output: 0, total: 0 },
        cost: { input: 0, output: 0, total: 0 },
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  return results;
}

export async function benchmarkAllProviders(
  providers: Map<string, LLMProvider>,
  options?: BenchmarkOptions
): Promise<Map<string, BenchmarkResult[]>> {
  const allResults = new Map<string, BenchmarkResult[]>();
  
  const promises = Array.from(providers.entries()).map(async ([name, provider]) => {
    if (!provider.isAvailable()) {
      return;
    }
    const results = await benchmarkProvider(provider, options);
    allResults.set(name, results);
  });
  
  await Promise.all(promises);
  return allResults;
}

export function summarizeBenchmark(results: Map<string, BenchmarkResult[]>): {
  provider: string;
  avgLatency: number;
  avgTokensPerSecond: number;
  avgCost: number;
  successRate: number;
}[] {
  const summaries: ReturnType<typeof summarizeBenchmark> = [];
  
  for (const [provider, providerResults] of results) {
    const successful = providerResults.filter(r => r.success);
    if (successful.length === 0) {
      summaries.push({
        provider,
        avgLatency: 0,
        avgTokensPerSecond: 0,
        avgCost: 0,
        successRate: 0,
      });
      continue;
    }
    
    const avgLatency = successful.reduce((sum, r) => sum + r.latency.totalResponseTime, 0) / successful.length;
    const avgTokensPerSecond = successful.reduce((sum, r) => sum + r.latency.tokensPerSecond, 0) / successful.length;
    const avgCost = successful.reduce((sum, r) => sum + r.cost.total, 0) / successful.length;
    const successRate = successful.length / providerResults.length;
    
    summaries.push({
      provider,
      avgLatency,
      avgTokensPerSecond,
      avgCost,
      successRate,
    });
  }
  
  return summaries.sort((a, b) => a.avgLatency - b.avgLatency);
}

export function printBenchmarkSummary(summaries: ReturnType<typeof summarizeBenchmark>): void {
  console.log("\n=== Provider Benchmark Summary ===\n");
  console.log("| Provider | Avg Latency (ms) | Tokens/sec | Avg Cost ($) | Success Rate |");
  console.log("|----------|-------------------|------------|---------------|--------------|");
  
  for (const s of summaries) {
    console.log(
      `| ${s.provider.padEnd(8)} | ${s.avgLatency.toFixed(2).padEnd(16)} | ${s.avgTokensPerSecond.toFixed(2).padEnd(10)} | ${s.avgCost.toFixed(6).padEnd(12)} | ${(s.successRate * 100).toFixed(1).padEnd(12)}% |`
    );
  }
  
  console.log("\n");
}
