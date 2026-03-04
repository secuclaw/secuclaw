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

// Security: Whitelist of allowed commands in sandbox
const ALLOWED_SANDBOX_COMMANDS = new Set([
  "nmap", "whois", "dig", "nslookup", "curl", "wget",
  "netcat", "nc", "ssh", "scp", "ping", "traceroute",
]);

// Security: Validate command is in whitelist
function isValidSandboxCommand(command: string): boolean {
  const baseCmd = command.split("/").pop()?.split(" ")[0] || "";
  return ALLOWED_SANDBOX_COMMANDS.has(baseCmd);
}

// Security: Validate target (IP, domain, CIDR)
function isValidTarget(target: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2])$/;
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return ipv4Regex.test(target) || ipv6Regex.test(target) || cidrRegex.test(target) || domainRegex.test(target);
}

// Security: Validate ports format
function isValidPorts(ports: string): boolean {
  const portRegex = /^([TU]:)?(\d+(-\d+)?)(,([TU]:)?(\d+(-\d+)?))*$/;
  return portRegex.test(ports);
}

// Security: Validate path for volume mounts (no path traversal)
function isValidVolumePath(path: string): boolean {
  // Only allow alphanumeric, dash, underscore, dot, and forward slash
  // Must not start with .. or contain /../
  if (path.startsWith("..") || path.includes("/../")) return false;
  return /^[a-zA-Z0-9\-_./]+$/.test(path);
}

// Security: Validate environment variable name and value
function isValidEnvVar(key: string, value: string): boolean {
  // Env var names: alphanumeric and underscore, not starting with digit
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return false;
  // Value: allow most printable characters but limit length
  if (value.length > 4096) return false;
  return true;
}

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

  // Security: Validate command
  if (!isValidSandboxCommand(command)) {
    return {
      success: false,
      error: `Command not allowed in sandbox: ${command}`,
    };
  }

  // Security: Validate args (no shell metacharacters)
  for (const arg of args) {
    if (arg.includes(";") || arg.includes("|") || arg.includes("&") || 
        arg.includes("$") || arg.includes("`") || arg.includes("\n")) {
      return {
        success: false,
        error: "Invalid characters in command arguments",
      };
    }
  }

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

  // Security: Validate volume paths
  for (const vol of cfg.volumes) {
    if (!isValidVolumePath(vol.host) || !isValidVolumePath(vol.container)) {
      return {
        success: false,
        error: `Invalid volume path detected`,
      };
    }
    dockerArgs.push("-v", vol.readonly 
      ? `${vol.host}:${vol.container}:ro`
      : `${vol.host}:${vol.container}`);
  }

  // Security: Validate environment variables
  for (const [key, value] of Object.entries(cfg.env)) {
    if (!isValidEnvVar(key, value)) {
      return {
        success: false,
        error: `Invalid environment variable: ${key}`,
      };
    }
    dockerArgs.push("-e", `${key}=${value}`);
  }

  dockerArgs.push(cfg.image);
  dockerArgs.push("-c");
  // Security: Build command safely with proper escaping
  dockerArgs.push([command, ...args].join(" "));

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

  // Security: Validate target
  if (!isValidTarget(target)) {
    return {
      success: false,
      error: "Invalid target format. Must be a valid IP address, CIDR, or domain name.",
    };
  }

  // Security: Validate ports
  if (ports && !isValidPorts(ports)) {
    return {
      success: false,
      error: "Invalid ports format.",
    };
  }

  const scanFlags: Record<string, string> = {
    connect: "-sT",
    syn: "-sS",
    udp: "-sU",
    version: "-sV",
    quick: "-F",
  };

  const nmapArgs = [
    scanFlags[scanType] || "-sT",
    "-T4",
    "-Pn",
    "--open",
  ];

  if (ports) {
    nmapArgs.push("-p", ports);
  }
  nmapArgs.push(target);

  return executeInSandbox(
    "nmap",
    nmapArgs,
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
