import crypto from "node:crypto";

export type HostFn = (...args: number[]) => number;

export class HostFunctions {
  private readonly functions = new Map<string, HostFn>();

  constructor() {
    this.registerFunction("log", (...args) => {
      console.debug("[wasm-host:log]", ...args);
      return 0;
    });

    this.registerFunction("clock", () => Date.now());
    this.registerFunction("random", () => crypto.randomInt(0, Number.MAX_SAFE_INTEGER));
    this.registerFunction("store", () => 0);
    this.registerFunction("fetch", () => {
      throw new Error("host fetch is disabled by default");
    });
  }

  registerFunction(name: string, fn: HostFn): void {
    this.functions.set(name, fn);
  }

  getImports(namespace: string = "env"): WebAssembly.Imports {
    const imported: Record<string, HostFn> = {};
    for (const [name, fn] of this.functions) {
      imported[name] = fn;
    }
    return {
      [namespace]: imported,
    };
  }
}
