import type { ToolResult, ToolContext } from "../../tools/types.js";
import { executeInSandbox } from "../../sandbox/docker.js";
import { auditLog } from "../../audit/logger.js";

export interface NmapOptions {
  target: string;
  scanType?: "connect" | "syn" | "udp" | "version" | "quick";
  ports?: string;
  scripts?: string[];
  osDetection?: boolean;
  serviceDetection?: boolean;
  aggressive?: boolean;
  timeout?: number;
}

export interface NmapResult {
  hosts: NmapHost[];
  openPorts: number;
  closedPorts: number;
  filteredPorts: number;
  totalHosts: number;
  scanTime: number;
}

export interface NmapHost {
  ip: string;
  hostname?: string;
  mac?: string;
  os?: string;
  ports: NmapPort[];
}

export interface NmapPort {
  port: number;
  protocol: "tcp" | "udp";
  state: "open" | "closed" | "filtered";
  service: string;
  version?: string;
  script?: Record<string, string>;
}

export async function executeNmap(
  options: NmapOptions,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();

  auditLog("tool.execute", "nmap", {
    target: options.target,
    scanType: options.scanType,
  }, { sessionId: context.sessionId, source: "nmap" });

  const args = buildNmapArgs(options);

  const result = await executeInSandbox(
    "nmap",
    args,
    {
      timeout: options.timeout || 120000,
      networkEnabled: true,
    },
    context
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Nmap execution failed",
    };
  }

  const output = (result.data as { stdout?: string })?.stdout || "";
  const parsed = parseNmapOutput(output);

  return {
    success: true,
    data: {
      ...parsed,
      duration: Date.now() - startTime,
    },
  };
}

function buildNmapArgs(options: NmapOptions): string[] {
  const scanFlags: Record<string, string> = {
    connect: "-sT",
    syn: "-sS",
    udp: "-sU",
    version: "-sV",
    quick: "-F",
  };

  const args: string[] = [
    scanFlags[options.scanType || "connect"],
    "-T4",
    "-Pn",
    "--open",
  ];

  if (options.ports) {
    args.push("-p", options.ports);
  }

  if (options.scripts && options.scripts.length > 0) {
    args.push(`--script=${options.scripts.join(",")}`);
  }

  if (options.osDetection) {
    args.push("-O");
  }

  if (options.serviceDetection) {
    args.push("-sV");
  }

  if (options.aggressive) {
    args.push("-A");
  }

  args.push(options.target);

  return args;
}

function parseNmapOutput(output: string): NmapResult {
  const result: NmapResult = {
    hosts: [],
    openPorts: 0,
    closedPorts: 0,
    filteredPorts: 0,
    totalHosts: 0,
    scanTime: 0,
  };

  const hostBlocks = output.split("Nmap scan report for ");

  for (const block of hostBlocks.slice(1)) {
    const lines = block.split("\n");
    const host: NmapHost = {
      ip: "",
      ports: [],
    };

    const ipMatch = lines[0]?.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (ipMatch) {
      host.ip = ipMatch[1];
    }

    const hostnameMatch = lines[0]?.match(/for\s+(.+?)\s+\(/);
    if (hostnameMatch) {
      host.hostname = hostnameMatch[1];
    }

    const osMatch = block.match(/OS details:\s*(.+)/);
    if (osMatch) {
      host.os = osMatch[1].trim();
    }

    const portMatches = block.matchAll(/(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(\S+)(?:\s+(.+))?/g);
    for (const match of portMatches) {
      const port: NmapPort = {
        port: parseInt(match[1]),
        protocol: match[2] as "tcp" | "udp",
        state: match[3] as "open" | "closed" | "filtered",
        service: match[4],
        version: match[5]?.trim(),
      };

      host.ports.push(port);

      if (port.state === "open") result.openPorts++;
      else if (port.state === "closed") result.closedPorts++;
      else result.filteredPorts++;
    }

    if (host.ip) {
      result.hosts.push(host);
      result.totalHosts++;
    }
  }

  const timeMatch = output.match(/scanned in\s+([\d.]+)\s+seconds/);
  if (timeMatch) {
    result.scanTime = parseFloat(timeMatch[1]);
  }

  return result;
}

export interface SubfinderOptions {
  domain: string;
  recursive?: boolean;
  all?: boolean;
  silent?: boolean;
  timeout?: number;
}

export interface SubfinderResult {
  domain: string;
  subdomains: string[];
  total: number;
}

export async function executeSubfinder(
  options: SubfinderOptions,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();

  auditLog("tool.execute", "subfinder", {
    domain: options.domain,
  }, { sessionId: context.sessionId, source: "subfinder" });

  const args = ["-d", options.domain];

  if (options.recursive) {
    args.push("-recursive");
  }

  if (options.all) {
    args.push("-all");
  }

  if (options.silent) {
    args.push("-silent");
  }

  const result = await executeInSandbox(
    "subfinder",
    args,
    {
      timeout: options.timeout || 60000,
      networkEnabled: true,
    },
    context
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Subfinder execution failed",
    };
  }

  const output = (result.data as { stdout?: string })?.stdout || "";
  const subdomains = output
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    success: true,
    data: {
      domain: options.domain,
      subdomains,
      total: subdomains.length,
      duration: Date.now() - startTime,
    },
  };
}

export interface DnsOptions {
  domain: string;
  recordType?: "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SOA" | "PTR";
  server?: string;
  timeout?: number;
}

export interface DnsResult {
  domain: string;
  recordType: string;
  records: DnsRecord[];
}

export interface DnsRecord {
  name: string;
  type: string;
  value: string;
  ttl?: number;
}

export async function executeDns(
  options: DnsOptions,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();

  auditLog("tool.execute", "dns", {
    domain: options.domain,
    recordType: options.recordType,
  }, { sessionId: context.sessionId, source: "dns" });

  const args = [options.domain];

  if (options.recordType) {
    args.push(options.recordType);
  }

  if (options.server) {
    args.push(`@${options.server}`);
  }

  const result = await executeInSandbox(
    "dig",
    args,
    {
      timeout: options.timeout || 30000,
      networkEnabled: true,
    },
    context
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "DNS query failed",
    };
  }

  const output = (result.data as { stdout?: string })?.stdout || "";
  const parsed = parseDigOutput(output, options.recordType || "A");

  return {
    success: true,
    data: {
      ...parsed,
      duration: Date.now() - startTime,
    },
  };
}

function parseDigOutput(output: string, recordType: string): DnsResult {
  const result: DnsResult = {
    domain: "",
    recordType,
    records: [],
  };

  const domainMatch = output.match(/;;\s*QUESTION SECTION:\n;(\S+)/);
  if (domainMatch) {
    result.domain = domainMatch[1];
  }

  const answerSection = output.split(";; ANSWER SECTION:")[1]?.split(";;")[0];
  if (answerSection) {
    const recordMatches = answerSection.matchAll(
      /(\S+)\s+(\d+)\s+IN\s+(\w+)\s+(.+)/g
    );

    for (const match of recordMatches) {
      result.records.push({
        name: match[1],
        type: match[3],
        value: match[4].trim(),
        ttl: parseInt(match[2]),
      });
    }
  }

  return result;
}
