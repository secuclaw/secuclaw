/**
 * A/B Testing Module - Strategy Optimization Testing
 * 
 * Provides experiment management, statistical analysis, and strategy comparison
 * for optimizing security policies, LLM prompts, and decision strategies.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface ABVariant {
  id: string;
  name: string;
  config: Record<string, unknown>;
  weight: number;
}

export interface ABExperiment {
  id: string;
  name: string;
  description: string;
  status: "draft" | "running" | "paused" | "completed";
  startTime?: number;
  endTime?: number;
  variants: ABVariant[];
  targetMetric: string;
  primaryMetric: string;
  minimumSampleSize: number;
  confidenceLevel: number;
  results?: ABResults;
}

export interface ABResults {
  totalSamples: number;
  variantResults: Record<string, VariantResult>;
  winner?: string;
  isSignificant: boolean;
  pValue: number;
  recommendations: string[];
}

export interface VariantResult {
  name: string;
  samples: number;
  conversions: number;
  conversionRate: number;
  meanValue: number;
  stdDev: number;
  confidenceInterval: [number, number];
}

export interface ABEvent {
  id: string;
  experimentId: string;
  variantId: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  metrics: Record<string, number | string | boolean>;
  outcome?: number;
}

export interface ABConfig {
  dataDir: string;
  minSamplesForAnalysis: number;
  defaultConfidenceLevel: number;
  autoStopEnabled: boolean;
  retentionDays: number;
}

const DEFAULT_CONFIG: Omit<ABConfig, "dataDir"> = {
  minSamplesForAnalysis: 100,
  defaultConfidenceLevel: 0.95,
  autoStopEnabled: true,
  retentionDays: 90,
};

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function calculatePValue(z: number): number {
  return 2 * (1 - normalCDF(Math.abs(z)));
}

function calculateConfidenceInterval(
  mean: number,
  stdDev: number,
  n: number,
  confidenceLevel: number
): [number, number] {
  const z = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.96;
  const se = stdDev / Math.sqrt(n);
  return [mean - z * se, mean + z * se];
}

export class ABTestingEngine {
  private config: ABConfig;
  private experiments: Map<string, ABExperiment> = new Map();
  private events: Map<string, ABEvent[]> = new Map();
  private experimentsFile: string;
  private eventsDir: string;

  constructor(config: Partial<ABConfig> & { dataDir: string }) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    const dataDir = this.config.dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const abDir = path.join(dataDir, "ab-testing");
    if (!fs.existsSync(abDir)) {
      fs.mkdirSync(abDir, { recursive: true });
    }

    this.experimentsFile = path.join(abDir, "experiments.json");
    this.eventsDir = path.join(abDir, "events");
    if (!fs.existsSync(this.eventsDir)) {
      fs.mkdirSync(this.eventsDir, { recursive: true });
    }

    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (fs.existsSync(this.experimentsFile)) {
      try {
        const content = fs.readFileSync(this.experimentsFile, "utf-8");
        const experiments = JSON.parse(content) as ABExperiment[];
        for (const exp of experiments) {
          this.experiments.set(exp.id, exp);
        }
      } catch (e) {
        console.error("Failed to load experiments:", e);
      }
    }

    const files = fs.readdirSync(this.eventsDir);
    for (const file of files.slice(-10)) {
      try {
        const eventFile = path.join(this.eventsDir, file);
        const content = fs.readFileSync(eventFile, "utf-8");
        const events = JSON.parse(content) as ABEvent[];
        for (const event of events) {
          const expEvents = this.events.get(event.experimentId) || [];
          expEvents.push(event);
          this.events.set(event.experimentId, expEvents);
        }
      } catch {      }
    }
  }

  private saveExperimentsToDisk(): void {
    const experiments = Array.from(this.experiments.values());
    fs.writeFileSync(
      this.experimentsFile,
      JSON.stringify(experiments, null, 2),
      "utf-8"
    );
  }

  private saveEventsToDisk(experimentId: string): void {
    const events = this.events.get(experimentId) || [];
    const eventFile = path.join(this.eventsDir, `${experimentId}.json`);
    fs.writeFileSync(eventFile, JSON.stringify(events, null, 2), "utf-8");
  }

  /**
   * Create a new A/B experiment
   */
  createExperiment(
    config: Omit<ABExperiment, "id" | "status" | "results">
  ): ABExperiment {
    const experiment: ABExperiment = {
      ...config,
      id: generateId(),
      status: "draft",
    };

    this.experiments.set(experiment.id, experiment);
    this.events.set(experiment.id, []);
    this.saveExperimentsToDisk();

    return experiment;
  }

  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): ABExperiment | undefined {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return undefined;

    experiment.status = "running";
    experiment.startTime = Date.now();
    this.saveExperimentsToDisk();

    return experiment;
  }

  /**
   * Pause an experiment
   */
  pauseExperiment(experimentId: string): ABExperiment | undefined {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return undefined;

    experiment.status = "paused";
    this.saveExperimentsToDisk();

    return experiment;
  }

  completeExperiment(experimentId: string): ABExperiment | undefined {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return undefined;

    experiment.status = "completed";
    experiment.endTime = Date.now();
    experiment.results = this.calculateResults(experimentId);
    this.saveExperimentsToDisk();

    return experiment;
  }

  getVariant(experimentId: string, userId?: string, sessionId?: string): ABVariant | undefined {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== "running") return undefined;
    if (experiment.variants.length === 0) return undefined;

    const hashKey = userId || sessionId || generateId();
    let hash = 0;
    for (let i = 0; i < hashKey.length; i++) {
      hash = ((hash << 5) - hash + hashKey.charCodeAt(i)) | 0;
    }
    const normalized = Math.abs(hash) / 2147483647;

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (normalized <= cumulative) {
        return variant;
      }
    }

    return experiment.variants[experiment.variants.length - 1];
  }

  /**
   * Record an event for an experiment
   */
  recordEvent(
    experimentId: string,
    variantId: string,
    metrics: Record<string, number | string | boolean>,
    userId?: string,
    sessionId?: string
  ): ABEvent {
    const event: ABEvent = {
      id: generateId(),
      experimentId,
      variantId,
      userId,
      sessionId,
      timestamp: Date.now(),
      metrics,
    };

    const events = this.events.get(experimentId) || [];
    events.push(event);
    this.events.set(experimentId, events);
    this.saveEventsToDisk(experimentId);

    return event;
  }

  /**
   * Record an outcome/conversion for analysis
   */
  recordOutcome(eventId: string, outcome: number): void {
    for (const events of this.events.values()) {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        event.outcome = outcome;
        this.saveEventsToDisk(event.experimentId);
        break;
      }
    }
  }

  /**
   * Calculate statistical results for an experiment
   */
  private calculateResults(experimentId: string): ABResults {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const events = this.events.get(experimentId) || [];
    const variantResults: Record<string, VariantResult> = {};

    const variantEvents: Record<string, ABEvent[]> = {};
    for (const event of events) {
      if (!variantEvents[event.variantId]) {
        variantEvents[event.variantId] = [];
      }
      variantEvents[event.variantId].push(event);
    }

    for (const variant of experiment.variants) {
      const variantData = variantEvents[variant.id] || [];
      const outcomes = variantData
        .filter((e) => e.outcome !== undefined)
        .map((e) => e.outcome as number);

      const samples = variantData.length;
      const conversions = outcomes.filter((o) => o > 0).length;
      const conversionRate = samples > 0 ? conversions / samples : 0;

      let meanValue = 0;
      let stdDev = 0;
      if (outcomes.length > 0) {
        meanValue = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
        const variance =
          outcomes.reduce((sum, o) => sum + Math.pow(o - meanValue, 2), 0) /
          outcomes.length;
        stdDev = Math.sqrt(variance);
      }

      const confidenceInterval = calculateConfidenceInterval(
        meanValue,
        stdDev,
        outcomes.length,
        experiment.confidenceLevel
      );

      variantResults[variant.id] = {
        name: variant.name,
        samples,
        conversions,
        conversionRate,
        meanValue,
        stdDev,
        confidenceInterval,
      };
    }

    const variantIds = Object.keys(variantResults);
    let pValue = 1;
    let isSignificant = false;
    let winner: string | undefined;

    if (variantIds.length >= 2) {
      const v1 = variantResults[variantIds[0]];
      const v2 = variantResults[variantIds[1]];

      if (v1.samples > 0 && v2.samples > 0) {
        const pooled =
          (v1.conversions + v2.conversions) / (v1.samples + v2.samples);
        const se = Math.sqrt(
          pooled * (1 - pooled) * (1 / v1.samples + 1 / v2.samples)
        );
        const z =
          se > 0
            ? (v1.conversionRate - v2.conversionRate) / se
            : 0;
        pValue = calculatePValue(z);
        isSignificant = pValue < 1 - experiment.confidenceLevel;

        if (isSignificant) {
          winner =
            v1.conversionRate > v2.conversionRate
              ? variantIds[0]
              : variantIds[1];
        }
      }
    }

    const recommendations: string[] = [];
    if (isSignificant && winner) {
      const winningVariant = variantResults[winner];
      recommendations.push(
        `Variant "${winningVariant.name}" shows statistically significant improvement with ${(winningVariant.conversionRate * 100).toFixed(1)}% conversion rate`
      );
    } else if (events.length < experiment.minimumSampleSize) {
      recommendations.push(
        `Continue running experiment - need ${experiment.minimumSampleSize - events.length} more samples for significance`
      );
    } else {
      recommendations.push(
        "No statistically significant difference detected between variants"
      );
    }

    return {
      totalSamples: events.length,
      variantResults,
      winner,
      isSignificant,
      pValue,
      recommendations,
    };
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): ABExperiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * List all experiments
   */
  listExperiments(status?: ABExperiment["status"]): ABExperiment[] {
    let experiments = Array.from(this.experiments.values());
    if (status) {
      experiments = experiments.filter((e) => e.status === status);
    }
    return experiments.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  }

  /**
   * Get events for an experiment
   */
  getEvents(experimentId: string): ABEvent[] {
    return this.events.get(experimentId) || [];
  }

  /**
   * Get real-time stats for an experiment
   */
  getRealtimeStats(experimentId: string): {
    totalSamples: number;
    byVariant: Record<string, number>;
    conversionRates: Record<string, number>;
  } {
    const events = this.events.get(experimentId) || [];
    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      return { totalSamples: 0, byVariant: {}, conversionRates: {} };
    }

    const byVariant: Record<string, number> = {};
    const conversions: Record<string, number> = {};

    for (const event of events) {
      byVariant[event.variantId] = (byVariant[event.variantId] || 0) + 1;
      if (event.outcome && event.outcome > 0) {
        conversions[event.variantId] = (conversions[event.variantId] || 0) + 1;
      }
    }

    const conversionRates: Record<string, number> = {};
    for (const variant of experiment.variants) {
      const samples = byVariant[variant.id] || 0;
      const conv = conversions[variant.id] || 0;
      conversionRates[variant.id] = samples > 0 ? conv / samples : 0;
    }

    return {
      totalSamples: events.length,
      byVariant,
      conversionRates,
    };
  }

  /**
   * Delete old events (cleanup)
   */
  cleanup(): void {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(this.eventsDir);

    for (const file of files) {
      const eventFile = path.join(this.eventsDir, file);
      try {
        const content = fs.readFileSync(eventFile, "utf-8");
        const events = JSON.parse(content) as ABEvent[];
        const filtered = events.filter((e) => e.timestamp > cutoff);

        if (filtered.length === 0) {
          fs.unlinkSync(eventFile);
        } else {
          fs.writeFileSync(eventFile, JSON.stringify(filtered, null, 2), "utf-8");
        }
      } catch {      }
    }
  }
}

export const createABTestingEngine = (config: Partial<ABConfig> & { dataDir: string }) =>
  new ABTestingEngine(config);
