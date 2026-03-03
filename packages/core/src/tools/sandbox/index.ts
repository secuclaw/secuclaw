import { spawn } from "child_process";
import type { ToolResult, ToolContext } from "../types.js";

export interface SandboxConfig {
  image: string;
  timeout: number;
  memoryLimit: string;
  cpuLimit: string;
  networkEnabled: boolean;
  volumes: Array<{ host: string; container: string; readonly?: boolean }>;
  env: Record<string, string>;
}

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  image: "security-tools:latest",
  timeout: 300000,
  memoryLimit: "512m",
  cpuLimit: "1.0",
  networkEnabled: true,
  volumes: [],
  env: {},
};

export async function checkDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("docker", ["--version"]);
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

export async function buildSecurityImage(): Promise<{ success: boolean; output: string }> {
  const dockerfile = `
FROM kalilinux/kali-rolling:latest

RUN apt-get update && apt-get install -y \\
  nmap \\
  curl \\
  dnsutils \\
  whois \\
  netcat-openbsd \\
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash scanner
USER scanner
WORKDIR /home/scanner

ENTRYPOINT ["/bin/bash"]
`;

  return new Promise((resolve) => {
    let output = "";
    const proc = spawn("docker", ["build", "-t", "security-tools:latest", "-"], {
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

export async function executeInSandbox(
  command: string,
  args: string[],
  config: Partial<SandboxConfig> = {},
  context: ToolContext
): Promise<ToolResult> {
  const cfg = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  const startTime = Date.now();

  const dockerAvailable = await checkDockerAvailable();
  if (!dockerAvailable) {
    return {
      success: false,
      error: "Docker is not available. Please install Docker to use sandboxed tool execution.",
    };
  }

  const dockerArgs = [
    "run",
    "--rm",
    `--memory=${cfg.memoryLimit}`,
    `--cpus=${cfg.cpuLimit}`,
    "--user", "scanner",
  ];

  if (!cfg.networkEnabled) {
    dockerArgs.push("--network=none");
  }

  for (const vol of cfg.volumes) {
    const volStr = vol.readonly 
      ? `-v ${vol.host}:${vol.container}:ro`
      : `-v ${vol.host}:${vol.container}`;
    dockerArgs.push(...volStr.split(" "));
  }

  for (const [key, value] of Object.entries(cfg.env)) {
    dockerArgs.push("-e", `${key}=${value}`);
  }

  dockerArgs.push(cfg.image);
  dockerArgs.push("-c", `${command} ${args.join(" ")}`);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn("docker", dockerArgs, {
      timeout: cfg.timeout,
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      stderr += "\nSandbox execution timed out";
    }, cfg.timeout);

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        data: {
          stdout,
          stderr,
          exitCode: code ?? 1,
          duration: Date.now() - startTime,
          sandboxed: true,
          sessionId: context.sessionId,
        },
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error: `Sandbox execution failed: ${err.message}`,
      });
    });
  });
}

export async function executeNmapInSandbox(
  params: {
    target: string;
    scanType?: string;
    ports?: string;
    timeout?: number;
  },
  context: ToolContext
): Promise<ToolResult> {
  const { target, scanType = "connect", ports } = params;

  const scanFlags: Record<string, string> = {
    connect: "-sT",
    syn: "-sS",
    udp: "-sU",
    version: "-sV",
    quick: "-F",
  };

  let nmapCmd = `nmap ${scanFlags[scanType] || "-sT"} -T4 -Pn --open`;
  if (ports) {
    nmapCmd += ` -p ${ports}`;
  }
  nmapCmd += ` ${target}`;

  return executeInSandbox(
    nmapCmd,
    [],
    {
      networkEnabled: true,
      timeout: params.timeout ?? 120000,
    },
    context
  );
}

export async function listSecurityTools(): Promise<string[]> {
  const dockerAvailable = await checkDockerAvailable();
  if (!dockerAvailable) {
    return [];
  }

  return new Promise((resolve) => {
    let output = "";
    const proc = spawn("docker", ["images", "--format", "{{.Repository}}:{{.Tag}}", "security-tools"]);
    
    proc.stdout.on("data", (data) => { output += data.toString(); });
    
    proc.on("close", () => {
      const images = output.trim().split("\n").filter(Boolean);
      resolve(images);
    });
    
    proc.on("error", () => resolve([]));
  });
}
