import type { ResourceLimitConfig } from "./types.js";

export class ResourceLimits {
  private config: ResourceLimitConfig = {
    memoryBytes: 64 * 1024 * 1024,
    cpuMs: 5_000,
    wallTimeMs: 5_000,
    networkRequests: 0,
  };

  setMemoryLimit(bytes: number): void {
    this.config.memoryBytes = Math.max(1024 * 1024, bytes);
  }

  setCpuLimit(ms: number): void {
    this.config.cpuMs = Math.max(1, ms);
  }

  setTimeLimit(ms: number): void {
    this.config.wallTimeMs = Math.max(1, ms);
  }

  setNetworkLimit(requests: number): void {
    this.config.networkRequests = Math.max(0, requests);
  }

  checkLimits(input: {
    memoryBytes?: number;
    cpuMs?: number;
    wallTimeMs?: number;
    networkRequests?: number;
  }): void {
    if ((input.memoryBytes ?? 0) > this.config.memoryBytes) {
      throw new Error("memory limit exceeded");
    }
    if ((input.cpuMs ?? 0) > this.config.cpuMs) {
      throw new Error("cpu limit exceeded");
    }
    if ((input.wallTimeMs ?? 0) > this.config.wallTimeMs) {
      throw new Error("time limit exceeded");
    }
    if ((input.networkRequests ?? 0) > this.config.networkRequests) {
      throw new Error("network limit exceeded");
    }
  }

  getConfig(): ResourceLimitConfig {
    return { ...this.config };
  }
}
