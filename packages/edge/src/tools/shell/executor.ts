import { spawn } from "node:child_process";

export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface ExecuteOptions {
  timeoutMs?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export class CommandExecutor {
  async execute(command: string, args: string[] = [], options: ExecuteOptions = {}): Promise<ShellResult> {
    return this.executeWithTimeout(command, args, options.timeoutMs ?? 10_000, options);
  }

  async executeWithTimeout(
    command: string,
    args: string[] = [],
    timeoutMs: number,
    options: Omit<ExecuteOptions, "timeoutMs"> = {},
  ): Promise<ShellResult> {
    const started = Date.now();

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: {
          PATH: process.env.PATH,
          ...(options.env ?? {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        if (!settled) {
          settled = true;
          resolve({
            success: false,
            stdout,
            stderr: `${stderr}\ncommand-timeout`,
            exitCode: 124,
            durationMs: Date.now() - started,
          });
        }
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.once("error", (error) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve({
            success: false,
            stdout,
            stderr: `${stderr}\n${error.message}`,
            exitCode: 1,
            durationMs: Date.now() - started,
          });
        }
      });

      child.once("exit", (code) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve({
            success: code === 0,
            stdout,
            stderr,
            exitCode: code ?? 1,
            durationMs: Date.now() - started,
          });
        }
      });
    });
  }

  async *stream(command: string, args: string[] = []): AsyncIterable<string> {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

    const queue: string[] = [];
    let done = false;

    child.stdout.on("data", (chunk) => queue.push(chunk.toString()));
    child.stderr.on("data", (chunk) => queue.push(chunk.toString()));
    child.on("close", () => {
      done = true;
    });

    while (!done || queue.length > 0) {
      const next = queue.shift();
      if (next) {
        yield next;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
  }
}
