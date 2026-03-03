import type { SandboxExecutionResult, WasmConfig } from "./types.js";
import { ResourceLimits } from "./limits.js";
import { Watchdog } from "./watchdog.js";
import { SandboxPolicy } from "./policy.js";
import { WasmRuntime } from "./wasm/runtime.js";

export class SandboxExecutor {
  private readonly limits = new ResourceLimits();
  private readonly watchdog = new Watchdog();
  private readonly policy = new SandboxPolicy().applyPreset("strict");

  async execute(module: BufferSource, fn: string, args: number[], config: WasmConfig): Promise<SandboxExecutionResult> {
    const started = Date.now();
    let runtime: WasmRuntime | null = null;
    let timedOut = false;

    this.limits.setMemoryLimit(config.memoryLimitBytes);
    this.limits.setTimeLimit(config.epochTimeoutMs);

    try {
      runtime = await WasmRuntime.load(module, config);

      this.watchdog.start(config.epochTimeoutMs, () => {
        timedOut = true;
        runtime?.dispose();
      });

      const output = await runtime.call<unknown>(fn, args);
      this.watchdog.feed();
      this.limits.checkLimits({
        wallTimeMs: Date.now() - started,
      });

      return {
        success: !timedOut,
        output,
        durationMs: Date.now() - started,
        fuelRemaining: runtime.getFuelRemaining(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
        fuelRemaining: runtime?.getFuelRemaining(),
      };
    } finally {
      runtime?.dispose();
      this.watchdog.stop();
      void this.policy.snapshot();
    }
  }

  async executeScript(module: BufferSource, config: WasmConfig): Promise<SandboxExecutionResult> {
    return this.execute(module, "main", [], config);
  }

  async executeBinary(module: BufferSource, config: WasmConfig): Promise<SandboxExecutionResult> {
    return this.execute(module, "_start", [], config);
  }
}
