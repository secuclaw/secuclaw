import { spawn, type ChildProcess } from "child_process";
import type { ToolResult, ToolContext } from "../tools/types.js";
import { emitEvent } from "../events/stream.js";
import { auditLog } from "../audit/logger.js";

export interface SandboxExecutionConfig {
  image: string;
  timeout: number;
  memoryLimit: string;
  cpuLimit: string;
  networkEnabled: boolean;
  volumes: Array<{ host: string; container: string; readonly?: boolean }>;
  env: Record<string, string>;
  workDir: string;
  user: string;
  securityOpts: string[];
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  sandboxed: boolean;
  containerId?: string;
  timedOut: boolean;
}

export interface SandboxStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timedOutExecutions: number;
  avgDuration: number;
  totalDuration: number;
}

const DEFAULT_CONFIG: SandboxExecutionConfig = {
  image: "esc-sandbox:latest",
  timeout: 120000,
  memoryLimit: "512m",
  cpuLimit: "1.0",
  networkEnabled: true,
  volumes: [],
  env: {},
  workDir: "/workspace",
  user: "scanner",
  securityOpts: ["no-new-privileges", "seccomp=unconfined"],
};

class DockerSandbox {
  private stats: SandboxStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    timedOutExecutions: 0,
    avgDuration: 0,
    totalDuration: 0,
  };
  private activeContainers: Map<string, ChildProcess> = new Map();

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn("docker", ["--version"]);
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });
  }

  async buildImage(): Promise<{ success: boolean; output: string }> {
    const dockerfile = `
FROM kalilinux/kali-rolling:latest

RUN apt-get update && apt-get install -y \\
  nmap curl dnsutils whois netcat-openbsd \\
  sqlmap nikto dirb gobuster hydra \\
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash scanner
USER scanner
WORKDIR /home/scanner

RUN mkdir -p /home/scanner/workspace
VOLUME /home/scanner/workspace

ENTRYPOINT ["/bin/bash"]
`;

    return new Promise((resolve) => {
      let output = "";
      const proc = spawn("docker", ["build", "-t", DEFAULT_CONFIG.image, "-"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      proc.stdin.write(dockerfile);
      proc.stdin.end();

      proc.stdout.on("data", (data) => { output += data.toString(); });
      proc.stderr.on("data", (data) => { output += data.toString(); });

      proc.on("close", (code) => {
        resolve({ success: code === 0, output });
      });

      proc.on("error", (err) => {
        resolve({ success: false, output: err.message });
      });
    });
  }

  async execute(
    command: string,
    args: string[],
    config: Partial<SandboxExecutionConfig>,
    context: ToolContext
  ): Promise<ToolResult> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const runId = `run-${Date.now()}`;
    const sessionId = context.sessionId || "default";

    const available = await this.isAvailable();
    if (!available) {
      return {
        success: false,
        error: "Docker is not available. Please install Docker to use sandboxed tool execution.",
      };
    }

    emitEvent("sandbox.start", runId, sessionId, {
      command: `${command} ${args.join(" ")}`,
      config: { image: cfg.image, timeout: cfg.timeout },
    });

    auditLog("sandbox.start", "execute", {
      command,
      args,
      image: cfg.image,
      timeout: cfg.timeout,
      sessionId,
    }, { sessionId, source: "sandbox" });

    const startTime = Date.now();
    const result = await this.runInContainer(command, args, cfg);

    const duration = Date.now() - startTime;
    this.updateStats(result);

    emitEvent("sandbox.complete", runId, sessionId, {
      exitCode: result.exitCode,
      duration,
      success: result.exitCode === 0,
      timedOut: result.timedOut,
    });

    auditLog("sandbox.complete", "execute", {
      exitCode: result.exitCode,
      duration,
      success: result.exitCode === 0,
      timedOut: result.timedOut,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length,
    }, { sessionId, source: "sandbox", duration });

    return {
      success: result.exitCode === 0,
      data: {
        ...result,
        sessionId,
        runId,
      },
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }

  private async runInContainer(
    command: string,
    args: string[],
    config: SandboxExecutionConfig
  ): Promise<SandboxExecutionResult> {
    const dockerArgs = this.buildDockerArgs(command, args, config);

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let containerId: string | undefined;

      const proc = spawn("docker", dockerArgs);
      const containerIdMatch: RegExp = /[a-f0-9]{64}/;

      proc.stdout.on("data", (data: Buffer) => {
        const str = data.toString();
        stdout += str;
        const match = str.match(containerIdMatch);
        if (match && !containerId) {
          containerId = match[0];
          this.activeContainers.set(containerId, proc);
        }
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGKILL");
        stderr += "\nSandbox execution timed out";
      }, config.timeout);

      const startTime = Date.now();

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (containerId) {
          this.activeContainers.delete(containerId);
        }
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
          duration: Date.now() - startTime,
          sandboxed: true,
          containerId,
          timedOut,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: err.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          sandboxed: true,
          timedOut: false,
        });
      });
    });
  }

  private buildDockerArgs(
    command: string,
    args: string[],
    config: SandboxExecutionConfig
  ): string[] {
    const dockerArgs = [
      "run",
      "--rm",
      `--memory=${config.memoryLimit}`,
      `--cpus=${config.cpuLimit}`,
      `--user=${config.user}`,
      `-w=${config.workDir}`,
    ];

    for (const opt of config.securityOpts) {
      dockerArgs.push(`--security-opt=${opt}`);
    }

    if (!config.networkEnabled) {
      dockerArgs.push("--network=none");
    }

    for (const vol of config.volumes) {
      const mode = vol.readonly ? ":ro" : "";
      dockerArgs.push("-v", `${vol.host}:${vol.container}${mode}`);
    }

    for (const [key, value] of Object.entries(config.env)) {
      dockerArgs.push("-e", `${key}=${value}`);
    }

    dockerArgs.push(config.image);
    dockerArgs.push("-c", `${command} ${args.join(" ")}`);

    return dockerArgs;
  }

  private updateStats(result: SandboxExecutionResult): void {
    this.stats.totalExecutions++;
    this.stats.totalDuration += result.duration;

    if (result.exitCode === 0) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }

    if (result.timedOut) {
      this.stats.timedOutExecutions++;
    }

    this.stats.avgDuration = this.stats.totalDuration / this.stats.totalExecutions;
  }

  async killContainer(containerId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn("docker", ["kill", containerId]);
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });
  }

  async cleanup(): Promise<void> {
    const killPromises = Array.from(this.activeContainers.keys()).map((id) =>
      this.killContainer(id)
    );
    await Promise.all(killPromises);
    this.activeContainers.clear();
  }

  getStats(): SandboxStats {
    return { ...this.stats };
  }

  getActiveContainers(): string[] {
    return Array.from(this.activeContainers.keys());
  }
}

export const dockerSandbox = new DockerSandbox();

export async function executeInSandbox(
  command: string,
  args: string[],
  config: Partial<SandboxExecutionConfig>,
  context: ToolContext
): Promise<ToolResult> {
  return dockerSandbox.execute(command, args, config, context);
}

export async function checkDockerAvailable(): Promise<boolean> {
  return dockerSandbox.isAvailable();
}

export function getSandboxStats(): SandboxStats {
  return dockerSandbox.getStats();
}
