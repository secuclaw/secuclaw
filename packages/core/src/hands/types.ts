/**
 * Hand Framework - Core Type Definitions
 * 
 * Defines the types for SecuClaw's autonomous Hands system where
 * security operations (ThreatHunter, VulnScanner, etc.) run as autonomous units.
 */

// Hand categories
export type HandCategory =
  | "security"
  | "content"
  | "productivity"
  | "development"
  | "communication"
  | "data";

// Hand status
export type HandStatus = "idle" | "initializing" | "active" | "paused" | "completed" | "error";

// Schedule configuration for hands
export interface ScheduleConfig {
  enabled: boolean;
  cron?: string;
  intervalMs?: number;
  timezone?: string;
}

// Hand requirement for dependencies
export interface HandRequirement {
  key: string;
  label: string;
  requirementType: "binary" | "env-var" | "api-key";
  checkValue: string;
  description?: string;
  install?: HandInstallInfo;
}

// Installation info for requirements
export interface HandInstallInfo {
  kind: "brew" | "node" | "go" | "uv" | "download" | "pip";
  label?: string;
  formula?: string;
  package?: string;
  module?: string;
  url?: string;
  archive?: string;
  targetDir?: string;
  bins?: string[];
  os?: string[];
}

// Hand setting configuration
export interface HandSetting {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select" | "json";
  default: unknown;
  required: boolean;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Hand metric definition
export interface HandMetric {
  label: string;
  memoryKey: string;
  format: "number" | "duration" | "bytes" | "percentage";
}

// Hand definition - the static configuration for a Hand
export interface HandDefinition {
  id: string;
  name: string;
  description: string;
  category: HandCategory;
  version: string;
  author?: string;
  requirements: HandRequirement[];
  settings: HandSetting[];
  metrics: HandMetric[];
  schedule?: ScheduleConfig;
  tools: string[];
  systemPrompt: string;
  skillContent?: string;
}

// Hand instance - runtime state for an active Hand
export interface HandInstance {
  instanceId: string;
  handId: string;
  status: HandStatus;
  config: Record<string, unknown>;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  progress: number;
  error?: Error;
}
