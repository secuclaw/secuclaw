import type { WasmConfig } from "../types.js";
import { FuelMetering } from "./metering.js";
import { EpochInterrupt } from "./epoch.js";
import { HostFunctions } from "./host.js";
import { WasmCompiler } from "./compiler.js";

export class WasmRuntime {
  private instance: WebAssembly.Instance;
  private readonly metering: FuelMetering;
  private readonly epoch: EpochInterrupt;
  private readonly config: WasmConfig;

  private constructor(
    instance: WebAssembly.Instance,
    config: WasmConfig,
    metering: FuelMetering,
    epoch: EpochInterrupt,
  ) {
    this.instance = instance;
    this.config = config;
    this.metering = metering;
    this.epoch = epoch;
  }

  static async load(module: BufferSource, config: WasmConfig): Promise<WasmRuntime> {
    const compiler = new WasmCompiler();
    const compiled = await compiler.compile(module);

    const metering = new FuelMetering();
    metering.setFuel(config.fuel);

    const epoch = new EpochInterrupt();
    epoch.startEpoch(config.epochTimeoutMs);

    const host = new HostFunctions();
    const instance = await WebAssembly.instantiate(compiled, host.getImports());

    return new WasmRuntime(instance, config, metering, epoch);
  }

  async call<T>(fn: string, args: number[] = []): Promise<T> {
    this.epoch.checkInterrupt();
    this.metering.consumeFuel(Math.max(1, args.length + 1));

    const exported = this.instance.exports[fn];
    if (typeof exported !== "function") {
      throw new Error(`WASM export is not callable: ${fn}`);
    }

    const result = (exported as (...raw: number[]) => unknown)(...args);
    this.epoch.checkInterrupt();
    return result as T;
  }

  getMemory(): WebAssembly.Memory {
    const mem = this.instance.exports.memory;
    if (!(mem instanceof WebAssembly.Memory)) {
      throw new Error("WASM module does not export memory");
    }
    return mem;
  }

  getFuelRemaining(): number {
    return this.metering.getFuel();
  }

  dispose(): void {
    this.epoch.endEpoch();
  }

  getConfig(): WasmConfig {
    return { ...this.config };
  }
}
