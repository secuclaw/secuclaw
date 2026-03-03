export interface WasmConfig {
  fuel: number;
  epochTimeoutMs: number;
  memoryLimitBytes: number;
  allowNetwork: boolean;
  allowFs: boolean;
}

export interface SandboxExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
  fuelRemaining?: number;
}

export interface ResourceLimitConfig {
  memoryBytes: number;
  cpuMs: number;
  wallTimeMs: number;
  networkRequests: number;
}

export type SandboxPolicyPreset = "strict" | "balanced" | "permissive";
