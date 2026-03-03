import type { SearchResult } from "./types.js";

export type TemporalDecayConfig = {
  enabled: boolean;
  halfLifeDays: number;
};

export const DEFAULT_TEMPORAL_DECAY_CONFIG: TemporalDecayConfig = {
  enabled: false,
  halfLifeDays: 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDecayLambda(halfLifeDays: number): number {
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) {
    return 0;
  }
  return Math.LN2 / halfLifeDays;
}

export function calculateTemporalDecayMultiplier(params: {
  ageInDays: number;
  halfLifeDays: number;
}): number {
  const lambda = toDecayLambda(params.halfLifeDays);
  const clampedAge = Math.max(0, params.ageInDays);
  if (lambda <= 0 || !Number.isFinite(clampedAge)) {
    return 1;
  }
  return Math.exp(-lambda * clampedAge);
}

export function applyTemporalDecayToScore(params: {
  score: number;
  ageInDays: number;
  halfLifeDays: number;
}): number {
  return params.score * calculateTemporalDecayMultiplier(params);
}

function ageInDays(timestamp: number, nowMs: number): number {
  const ageMs = Math.max(0, nowMs - timestamp);
  return ageMs / DAY_MS;
}

export function applyTemporalDecay(
  results: SearchResult[],
  config: TemporalDecayConfig,
  nowMs?: number,
): SearchResult[] {
  if (!config.enabled) {
    return results;
  }
  
  const currentTime = nowMs ?? Date.now();
  
  return results.map((result) => {
    const timestamp = result.entry.metadata.timestamp;
    const ageInDaysValue = ageInDays(timestamp, currentTime);
    
    const decayedScore = applyTemporalDecayToScore({
      score: result.score,
      ageInDays: ageInDaysValue,
      halfLifeDays: config.halfLifeDays,
    });
    
    return {
      ...result,
      score: decayedScore,
    };
  });
}
