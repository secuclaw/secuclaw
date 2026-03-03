import { spawn } from "child_process";
import type { ToolResult, ToolContext } from "../types";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export async function executeCommand(
  command: string,
  args: string[],
  options?: {
    timeout?: number;
    cwd?: string;
    env?: Record<string, string>;
  }
): Promise<CommandResult> {
  const startTime = Date.now();
  const timeout = options?.timeout ?? 60000;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(command, args, {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
      shell: false,
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      stderr += "\nCommand timed out";
    }, timeout);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        duration: Date.now() - startTime,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: err.message,
        exitCode: 1,
        duration: Date.now() - startTime,
      });
    });
  });
}

export function parseNmapOutput(output: string): {
  hosts: Array<{
    address: string;
    ports: Array<{ port: number; protocol: string; service: string; state: string }>;
    os?: string;
  }>;
  summary: string;
} {
  const hosts: Array<{
    address: string;
    ports: Array<{ port: number; protocol: string; service: string; state: string }>;
    os?: string;
  }> = [];

  const lines = output.split("\n");
  let currentHost: typeof hosts[0] | null = null;

  for (const line of lines) {
    const hostMatch = line.match(/Nmap scan report for\s+(.+)/i);
    if (hostMatch) {
      if (currentHost) hosts.push(currentHost);
      currentHost = { address: hostMatch[1].trim(), ports: [] };
      continue;
    }

    const portMatch = line.match(/(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(\S+)/i);
    if (portMatch && currentHost) {
      currentHost.ports.push({
        port: parseInt(portMatch[1]),
        protocol: portMatch[2],
        state: portMatch[3],
        service: portMatch[4],
      });
    }

    const osMatch = line.match(/OS details:\s+(.+)/i);
    if (osMatch && currentHost) {
      currentHost.os = osMatch[1].trim();
    }
  }

  if (currentHost) hosts.push(currentHost);

  return {
    hosts,
    summary: `Found ${hosts.length} host(s), ${hosts.reduce((sum, h) => sum + h.ports.length, 0)} open port(s)`,
  };
}

export async function executeNmapScan(
  params: {
    target: string;
    scanType?: string;
    ports?: string;
    timeout?: number;
  },
  context: ToolContext
): Promise<ToolResult> {
  const { target, scanType = "connect", ports, timeout = 120000 } = params;

  const scanTypeFlags: Record<string, string[]> = {
    connect: ["-sT"],
    syn: ["-sS"],
    udp: ["-sU"],
    version: ["-sV"],
    os: ["-O"],
    aggressive: ["-A"],
    quick: ["-F"],
  };

  const args = [
    ...(scanTypeFlags[scanType] || ["-sT"]),
    "-T4",
    "-Pn",
    "--open",
  ];

  if (ports) {
    args.push("-p", ports);
  }

  args.push(target);

  const result = await executeCommand("nmap", args, { timeout });

  if (result.exitCode !== 0 && !result.stdout) {
    return {
      success: false,
      error: `nmap scan failed: ${result.stderr || "Unknown error"}`,
    };
  }

  const parsed = parseNmapOutput(result.stdout);

  return {
    success: true,
    data: {
      raw: result.stdout,
      parsed,
      duration: result.duration,
      sessionId: context.sessionId,
    },
  };
}

export async function executeHttpProbe(
  params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  },
  context: ToolContext
): Promise<ToolResult> {
  const { url, method = "GET", headers = {}, timeout = 30000 } = params;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: {
        "User-Agent": "ESC-SecurityScanner/1.0",
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    const body = await response.text();

    return {
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: body.substring(0, 10000),
        url: response.url,
        sessionId: context.sessionId,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `HTTP probe failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

export async function executeDnsLookup(
  params: {
    domain: string;
    type?: string;
  },
  context: ToolContext
): Promise<ToolResult> {
  const { domain, type = "A" } = params;

  const result = await executeCommand("dig", [domain, type, "+short"], { timeout: 10000 });

  if (result.exitCode !== 0) {
    return {
      success: false,
      error: `DNS lookup failed: ${result.stderr}`,
    };
  }

  const records = result.stdout.trim().split("\n").filter(Boolean);

  return {
    success: true,
    data: {
      domain,
      type,
      records,
      raw: result.stdout,
      sessionId: context.sessionId,
    },
  };
}

export function checkToolAvailable(toolName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("which", [toolName]);
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

export const toolAvailability: Map<string, boolean> = new Map();

export async function initToolAvailability(): Promise<void> {
  const tools = ["nmap", "dig", "curl", "whois"];
  for (const tool of tools) {
    toolAvailability.set(tool, await checkToolAvailable(tool));
  }
}
