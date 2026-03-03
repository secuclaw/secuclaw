import type { ToolResult, ToolContext } from "../../tools/types.js";
import { executeInSandbox } from "../../sandbox/docker.js";
import { auditLog } from "../../audit/logger.js";

export interface SqlmapOptions {
  target: string;
  dbms?: "mysql" | "postgresql" | "mssql" | "oracle" | "sqlite";
  level?: number;
  risk?: number;
  technique?: "B" | "E" | "U" | "S" | "T" | "Q";
  db?: string;
  tables?: boolean;
  dump?: boolean;
  batch?: boolean;
  randomAgent?: boolean;
  threads?: number;
  timeout?: number;
}

export interface SqlmapResult {
  vulnerable: boolean;
  injectionType: string | null;
  dbms: string | null;
  database: string | null;
  tables: string[];
  data: Record<string, unknown>[];
  payload: string | null;
  rawOutput: string;
}

export async function executeSqlmap(
  options: SqlmapOptions,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();
  
  auditLog("tool.execute", "sqlmap", {
    target: options.target,
    options: { ...options, target: "[REDACTED]" },
  }, { sessionId: context.sessionId, source: "sqlmap" });

  const args = buildSqlmapArgs(options);

  const result = await executeInSandbox(
    "sqlmap",
    args,
    {
      timeout: options.timeout || 300000,
      networkEnabled: true,
    },
    context
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "SQLMap execution failed",
    };
  }

  const output = (result.data as { stdout?: string })?.stdout || "";
  const parsed = parseSqlmapOutput(output);

  return {
    success: true,
    data: {
      ...parsed,
      duration: Date.now() - startTime,
      command: `sqlmap ${args.join(" ")}`,
    },
  };
}

function buildSqlmapArgs(options: SqlmapOptions): string[] {
  const args: string[] = ["-u", options.target];

  if (options.dbms) {
    args.push(`--dbms=${options.dbms}`);
  }

  if (options.level !== undefined) {
    args.push(`--level=${options.level}`);
  }

  if (options.risk !== undefined) {
    args.push(`--risk=${options.risk}`);
  }

  if (options.technique) {
    args.push(`--technique=${options.technique}`);
  }

  if (options.db) {
    args.push("-D", options.db);
  }

  if (options.tables) {
    args.push("--tables");
  }

  if (options.dump) {
    args.push("--dump");
  }

  args.push("--batch");

  if (options.randomAgent) {
    args.push("--random-agent");
  }

  if (options.threads) {
    args.push("--threads", options.threads.toString());
  }

  return args;
}

function parseSqlmapOutput(output: string): SqlmapResult {
  const result: SqlmapResult = {
    vulnerable: false,
    injectionType: null,
    dbms: null,
    database: null,
    tables: [],
    data: [],
    payload: null,
    rawOutput: output,
  };

  if (output.includes("is vulnerable") || output.includes("Parameter:")) {
    result.vulnerable = true;
  }

  const typeMatch = output.match(/Type:\s*(\w+)/i);
  if (typeMatch) {
    result.injectionType = typeMatch[1];
  }

  const dbmsMatch = output.match(/back-end DBMS:\s*([a-zA-Z]+)/i);
  if (dbmsMatch) {
    result.dbms = dbmsMatch[1];
  }

  const dbMatch = output.match(/current database:\s*'([^']+)'/i);
  if (dbMatch) {
    result.database = dbMatch[1];
  }

  const tableMatches = output.matchAll(/\|\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+\|/g);
  for (const match of tableMatches) {
    if (!result.tables.includes(match[1])) {
      result.tables.push(match[1]);
    }
  }

  const payloadMatch = output.match(/Payload:\s*([^\n]+)/);
  if (payloadMatch) {
    result.payload = payloadMatch[1].trim();
  }

  return result;
}

export interface NucleiOptions {
  target: string;
  templates?: string[];
  severity?: "critical" | "high" | "medium" | "low" | "info";
  tags?: string[];
  excludeTags?: string[];
  rateLimit?: number;
  bulkSize?: number;
  timeout?: number;
}

export interface NucleiResult {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  findings: NucleiFinding[];
}

export interface NucleiFinding {
  templateId: string;
  templateName: string;
  severity: string;
  matchedAt: string;
  timestamp: string;
  curlCommand?: string;
  extractedResults?: string[];
}

export async function executeNuclei(
  options: NucleiOptions,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();

  auditLog("tool.execute", "nuclei", {
    target: options.target,
    severity: options.severity,
  }, { sessionId: context.sessionId, source: "nuclei" });

  const args = buildNucleiArgs(options);

  const result = await executeInSandbox(
    "nuclei",
    args,
    {
      timeout: options.timeout || 180000,
      networkEnabled: true,
    },
    context
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Nuclei execution failed",
    };
  }

  const output = (result.data as { stdout?: string })?.stdout || "";
  const parsed = parseNucleiOutput(output);

  return {
    success: true,
    data: {
      ...parsed,
      duration: Date.now() - startTime,
    },
  };
}

function buildNucleiArgs(options: NucleiOptions): string[] {
  const args: string[] = ["-u", options.target, "-json"];

  if (options.templates && options.templates.length > 0) {
    args.push("-t", options.templates.join(","));
  }

  if (options.severity) {
    args.push("-severity", options.severity);
  }

  if (options.tags && options.tags.length > 0) {
    args.push("-tags", options.tags.join(","));
  }

  if (options.excludeTags && options.excludeTags.length > 0) {
    args.push("-exclude-tags", options.excludeTags.join(","));
  }

  if (options.rateLimit) {
    args.push("-rate-limit", options.rateLimit.toString());
  }

  if (options.bulkSize) {
    args.push("-bulk-size", options.bulkSize.toString());
  }

  return args;
}

function parseNucleiOutput(output: string): NucleiResult {
  const result: NucleiResult = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    findings: [],
  };

  const lines = output.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const finding = JSON.parse(line);
      result.total++;
      result.findings.push({
        templateId: finding.template_id || finding["template-id"] || "unknown",
        templateName: finding.info?.name || finding.template_id || "Unknown",
        severity: (finding.info?.severity || "unknown").toLowerCase(),
        matchedAt: finding.matched_at || finding.host || "",
        timestamp: finding.timestamp || new Date().toISOString(),
        curlCommand: finding.cli_command || finding.curl_command,
        extractedResults: finding.extracted_results,
      });

      const severity = (finding.info?.severity || "info").toLowerCase();
      if (severity === "critical") result.critical++;
      else if (severity === "high") result.high++;
      else if (severity === "medium") result.medium++;
      else if (severity === "low") result.low++;
      else result.info++;
    } catch {}
  }

  return result;
}

export interface HttpxOptions {
  target: string;
  ports?: string[];
  statusCodes?: string;
  contentLength?: string;
  title?: boolean;
  techDetect?: boolean;
  followRedirects?: boolean;
  threads?: number;
  timeout?: number;
}

export interface HttpxResult {
  total: number;
  alive: number;
  dead: number;
  urls: HttpxUrl[];
}

export interface HttpxUrl {
  url: string;
  statusCode: number;
  contentLength: number;
  title?: string;
  technologies?: string[];
  host: string;
  port: number;
  scheme: string;
}

export async function executeHttpx(
  options: HttpxOptions,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();

  auditLog("tool.execute", "httpx", {
    target: options.target,
  }, { sessionId: context.sessionId, source: "httpx" });

  const args = buildHttpxArgs(options);

  const result = await executeInSandbox(
    "httpx",
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
      error: result.error || "Httpx execution failed",
    };
  }

  const output = (result.data as { stdout?: string })?.stdout || "";
  const parsed = parseHttpxOutput(output);

  return {
    success: true,
    data: {
      ...parsed,
      duration: Date.now() - startTime,
    },
  };
}

function buildHttpxArgs(options: HttpxOptions): string[] {
  const args: string[] = ["-u", options.target, "-json", "-silent"];

  if (options.ports && options.ports.length > 0) {
    args.push("-ports", options.ports.join(","));
  }

  if (options.statusCodes) {
    args.push("-status-code");
  }

  if (options.title) {
    args.push("-title");
  }

  if (options.techDetect) {
    args.push("-tech-detect");
  }

  if (options.followRedirects) {
    args.push("-follow-redirects");
  }

  if (options.threads) {
    args.push("-threads", options.threads.toString());
  }

  return args;
}

function parseHttpxOutput(output: string): HttpxResult {
  const result: HttpxResult = {
    total: 0,
    alive: 0,
    dead: 0,
    urls: [],
  };

  const lines = output.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const urlData = JSON.parse(line);
      result.total++;
      result.alive++;

      result.urls.push({
        url: urlData.url || urlData.input || "",
        statusCode: urlData.status_code || urlData.statusCode || 0,
        contentLength: urlData.content_length || urlData.contentLength || 0,
        title: urlData.title,
        technologies: urlData.tech || urlData.technologies || [],
        host: urlData.host || "",
        port: urlData.port || 0,
        scheme: urlData.scheme || "https",
      });
    } catch {}
  }

  return result;
}
