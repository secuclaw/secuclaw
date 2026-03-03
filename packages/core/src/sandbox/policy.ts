import type { SandboxPolicyPreset } from "./types.js";

export interface PolicySnapshot {
  fs: boolean;
  net: boolean;
  env: boolean;
  process: boolean;
}

export class SandboxPolicy {
  private policy: PolicySnapshot = {
    fs: false,
    net: false,
    env: false,
    process: false,
  };

  allowFs(allowed: boolean): this {
    this.policy.fs = allowed;
    return this;
  }

  allowNet(allowed: boolean): this {
    this.policy.net = allowed;
    return this;
  }

  allowEnv(allowed: boolean): this {
    this.policy.env = allowed;
    return this;
  }

  allowProcess(allowed: boolean): this {
    this.policy.process = allowed;
    return this;
  }

  applyPreset(preset: SandboxPolicyPreset): this {
    if (preset === "strict") {
      this.policy = { fs: false, net: false, env: false, process: false };
    } else if (preset === "balanced") {
      this.policy = { fs: true, net: false, env: false, process: false };
    } else {
      this.policy = { fs: true, net: true, env: true, process: false };
    }
    return this;
  }

  snapshot(): PolicySnapshot {
    return { ...this.policy };
  }
}
