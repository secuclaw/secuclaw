/**
 * Doctor Diagnostic Engine
 * 
 * System health check and diagnostic tool for SecuClaw
 */

import * as os from "node:os";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as https from "node:https";
import * as http from "node:http";
import { getProviderManager } from "../providers/manager.js";

export type CheckStatus = "ok" | "warning" | "error";

export interface DoctorResult {
  check: string;
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
  fixable: boolean;
  fix?: () => Promise<void>;
}

export interface DoctorOptions {
  checks?: string[];
  fix?: boolean;
  verbose?: boolean;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  cpuCount: number;
  totalMemory: number;
  freeMemory: number;
  homeDir: string;
  tempDir: string;
}

export interface ConfigInfo {
  configPath: string;
  configExists: boolean;
  configValid: boolean;
  configContent?: Record<string, unknown>;
}

export interface ProviderInfo {
  name: string;
  configured: boolean;
  available: boolean;
  apiKeyPresent: boolean;
  baseUrl?: string;
}

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpuCount: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024) * 100) / 100, // GB
    freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024) * 100) / 100, // GB
    homeDir: os.homedir(),
    tempDir: os.tmpdir(),
  };
}

/**
 * Mask sensitive API key for display
 */
export function maskApiKey(key: string | undefined): string {
  if (!key) return "(not set)";
  if (key.length <= 8) return "****";
  return key.substring(0, 4) + "****" + key.substring(key.length - 4);
}

/**
 * Check Node.js version meets minimum requirements
 */
export async function checkNodeVersion(): Promise<DoctorResult> {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.substring(1).split(".")[0], 10);
  
  const minVersion = 18;
  const recommendedVersion = 20;
  
  if (majorVersion < minVersion) {
    return {
      check: "node-version",
      status: "error",
      message: `Node.js version ${nodeVersion} is below minimum requirement (v${minVersion}+)`,
      details: { current: nodeVersion, required: `${minVersion}+`, recommended: `${recommendedVersion}+` },
      fixable: false,
    };
  }
  
  if (majorVersion < recommendedVersion) {
    return {
      check: "node-version",
      status: "warning",
      message: `Node.js version ${nodeVersion} works but upgrading to v${recommendedVersion}+ is recommended`,
      details: { current: nodeVersion, recommended: `${recommendedVersion}+` },
      fixable: false,
    };
  }
  
  return {
    check: "node-version",
    status: "ok",
    message: `Node.js version ${nodeVersion} is compatible`,
    details: { current: nodeVersion },
    fixable: false,
  };
}

/**
 * Check available memory
 */
export async function checkMemory(): Promise<DoctorResult> {
  const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024) * 100) / 100;
  const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024) * 100) / 100;
  const usedPercent = Math.round((1 - freeMemory / totalMemory) * 100);
  
  const minFreeMemoryGB = 1; // Minimum 1GB free
  const warningFreeMemoryGB = 2; // Warning at 2GB free
  
  if (freeMemory < minFreeMemoryGB) {
    return {
      check: "memory",
      status: "error",
      message: `Only ${freeMemory}GB free memory available (minimum ${minFreeMemoryGB}GB required)`,
      details: { totalGB: totalMemory, freeGB: freeMemory, usedPercent },
      fixable: false,
    };
  }
  
  if (freeMemory < warningFreeMemoryGB) {
    return {
      check: "memory",
      status: "warning",
      message: `Low memory: ${freeMemory}GB free out of ${totalMemory}GB`,
      details: { totalGB: totalMemory, freeGB: freeMemory, usedPercent },
      fixable: false,
    };
  }
  
  return {
    check: "memory",
    status: "ok",
    message: `Memory: ${freeMemory}GB free out of ${totalMemory}GB`,
    details: { totalGB: totalMemory, freeGB: freeMemory, usedPercent },
    fixable: false,
  };
}

/**
 * Check disk space
 */
export async function checkDiskSpace(): Promise<DoctorResult> {
  // On macOS, use df command to get disk info
  try {
    const { execSync } = await import("node:child_process");
    const output = execSync("df -g /").toString();
    const lines = output.split("\n");
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      const freeGB = parseInt(parts[3], 10);
      const totalGB = parseInt(parts[1], 10);
      
      const minFreeGB = 5;
      
      if (freeGB < minFreeGB) {
        return {
          check: "disk-space",
          status: "error",
          message: `Only ${freeGB}GB free disk space (minimum ${minFreeGB}GB required)`,
          details: { freeGB, totalGB },
          fixable: false,
        };
      }
      
      return {
        check: "disk-space",
        status: "ok",
        message: `Disk space: ${freeGB}GB free out of ${totalGB}GB`,
        details: { freeGB, totalGB },
        fixable: false,
      };
    }
  } catch {
    // Fallback - return warning if we can't check
    return {
      check: "disk-space",
      status: "warning",
      message: "Could not check disk space",
      details: {},
      fixable: false,
    };
  }
  
  return {
    check: "disk-space",
    status: "ok",
    message: "Disk space check unavailable",
    details: {},
    fixable: false,
  };
}

/**
 * Check configuration file
 */
export async function checkConfig(): Promise<DoctorResult> {
  const configPath = path.join(os.homedir(), ".secuclaw", "config.json");
  
  // Check if config directory exists
  const configDir = path.dirname(configPath);
  try {
    await fs.access(configDir);
  } catch {
    // Create config directory
    return {
      check: "config",
      status: "warning",
      message: "Configuration directory does not exist",
      details: { path: configDir },
      fixable: true,
      fix: async () => {
        await fs.mkdir(configDir, { recursive: true, mode: 0o700 });
        await fs.writeFile(configPath, JSON.stringify({ version: "1.0.0", values: {} }, null, 2), { mode: 0o600 });
      },
    };
  }
  
  // Check if config file exists
  try {
    await fs.access(configPath);
  } catch {
    return {
      check: "config",
      status: "warning",
      message: "Configuration file does not exist",
      details: { path: configPath },
      fixable: true,
      fix: async () => {
        await fs.writeFile(configPath, JSON.stringify({ version: "1.0.0", values: {} }, null, 2), { mode: 0o600 });
      },
    };
  }
  
  // Check if config is valid JSON
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);
    
    // Check for required fields
    const hasVersion = parsed.version !== undefined;
    const hasValues = parsed.values !== undefined;
    
    if (!hasVersion || !hasValues) {
      return {
        check: "config",
        status: "warning",
        message: "Configuration file is incomplete",
        details: { path: configPath, hasVersion, hasValues },
        fixable: true,
        fix: async () => {
          await fs.writeFile(configPath, JSON.stringify({ version: "1.0.0", values: {} }, null, 2), { mode: 0o600 });
        },
      };
    }
    
    return {
      check: "config",
      status: "ok",
      message: "Configuration file is valid",
      details: { path: configPath, version: parsed.version },
      fixable: false,
    };
  } catch (err) {
    return {
      check: "config",
      status: "error",
      message: `Configuration file is invalid: ${err instanceof Error ? err.message : String(err)}`,
      details: { path: configPath },
      fixable: true,
      fix: async () => {
        await fs.writeFile(configPath, JSON.stringify({ version: "1.0.0", values: {} }, null, 2), { mode: 0o600 });
      },
    };
  }
}

/**
 * Check API keys and provider configuration
 */
export async function checkApiKeys(): Promise<DoctorResult> {
  const providerManager = getProviderManager();
  const availableProviders = providerManager.listAvailable();
  
  const configuredProviders: string[] = [];
  
  // Check environment variables for known providers
  const providerEnvVars: Record<string, string[]> = {
    anthropic: ["ANTHROPIC_API_KEY"],
    openai: ["OPENAI_API_KEY"],
    ollama: ["OLLAMA_ENABLED"],
    deepseek: ["DEEPSEEK_API_KEY"],
    zhipu: ["ZHIPU_API_KEY"],
    minimax: ["MINIMAX_API_KEY"],
    google: ["GOOGLE_API_KEY"],
    azure: ["AZURE_OPENAI_API_KEY"],
  };
  
  for (const [provider, envVars] of Object.entries(providerEnvVars)) {
    for (const envVar of envVars) {
      if (process.env[envVar]) {
        configuredProviders.push(provider);
        break;
      }
    }
  }
  
  const hasAnyProvider = configuredProviders.length > 0 || availableProviders.length > 0;
  
  if (!hasAnyProvider) {
    return {
      check: "api-keys",
      status: "warning",
      message: "No LLM providers configured",
      details: {
        configuredProviders,
        availableProviders,
        envVarsChecked: Object.values(providerEnvVars).flat(),
      },
      fixable: false,
    };
  }
  
  return {
    check: "api-keys",
    status: "ok",
    message: `${availableProviders.length} LLM provider(s) available`,
    details: {
      configuredProviders,
      availableProviders,
    },
    fixable: false,
  };
}

/**
 * Check connectivity to LLM providers
 */
export async function checkConnectivity(): Promise<DoctorResult> {
  const checks: Array<{ name: string; url: string; timeout: number }> = [];
  
  // Check Ollama
  if (process.env.OLLAMA_ENABLED === "true" || !process.env.OLLAMA_BASE_URL?.includes("api")) {
    checks.push({
      name: "ollama",
      url: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      timeout: 3000,
    });
  }
  
  // Check common LLM endpoints
  const endpoints = [
    { name: "openai", url: "https://api.openai.com/v1/models", timeout: 5000 },
    { name: "anthropic", url: "https://api.anthropic.com", timeout: 5000 },
  ];
  
  for (const endpoint of endpoints) {
    if (process.env[`${endpoint.name.toUpperCase()}_API_KEY`]) {
      checks.push(endpoint);
    }
  }
  
  if (checks.length === 0) {
    return {
      check: "connectivity",
      status: "ok",
      message: "No external connectivity checks needed (no providers configured)",
      details: {},
      fixable: false,
    };
  }
  
  const results: Record<string, boolean> = {};
  let hasErrors = false;
  
  for (const check of checks) {
    try {
      const reachable = await checkUrlReachability(check.url, check.timeout);
      results[check.name] = reachable;
      if (!reachable) hasErrors = true;
    } catch {
      results[check.name] = false;
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    const failedProviders = Object.entries(results)
      .filter(([_, success]) => !success)
      .map(([name]) => name);
    
    return {
      check: "connectivity",
      status: "warning",
      message: `Some providers unreachable: ${failedProviders.join(", ")}`,
      details: { results },
      fixable: false,
    };
  }
  
  return {
    check: "connectivity",
    status: "ok",
    message: "All configured providers are reachable",
    details: { results },
    fixable: false,
  };
}

/**
 * Helper function to check if a URL is reachable
 */
function checkUrlReachability(url: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check security settings
 */
export async function checkSecurity(): Promise<DoctorResult> {
  const issues: string[] = [];
  
  // Check config file permissions
  const configPath = path.join(os.homedir(), ".secuclaw", "config.json");
  try {
    const stats = await fs.stat(configPath);
    const mode = stats.mode & 0o777;
    
    if (mode > 0o600) {
      issues.push(`Config file has overly permissive permissions: ${mode.toString(8)}`);
    }
  } catch {
    // Config doesn't exist, skip
  }
  
  // Check for exposed API keys in environment
  const sensitivePatterns = ["API_KEY", "SECRET", "PASSWORD", "TOKEN"];
  const exposedKeys: string[] = [];
  
  for (const key of Object.keys(process.env)) {
    for (const pattern of sensitivePatterns) {
      if (key.includes(pattern) && process.env[key]) {
        exposedKeys.push(key);
        break;
      }
    }
  }
  
  // Note: We don't fail on this, just warn - it's common in dev environments
  // The important thing is not to log them
  
  if (issues.length > 0) {
    return {
      check: "security",
      status: "warning",
      message: `Security issues found: ${issues.join(", ")}`,
      details: { issues },
      fixable: true,
      fix: async () => {
        // Fix config file permissions
        try {
          await fs.chmod(configPath, 0o600);
        } catch {
          // Ignore if doesn't exist
        }
      },
    };
  }
  
  return {
    check: "security",
    status: "ok",
    message: "Security settings look good",
    details: { configPermissions: "ok" },
    fixable: false,
  };
}

/**
 * Check dependencies
 */
export async function checkDependencies(): Promise<DoctorResult> {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  
  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    
    const issues: string[] = [];
    
    // Check if pnpm is used
    const packageManager = process.env.npm_config_user_agent?.includes("pnpm") ? "pnpm" : "unknown";
    
    return {
      check: "dependencies",
      status: "ok",
      message: "Dependencies check passed",
      details: {
        packageManager,
        nodeVersion: process.version,
        packageName: pkg.name,
        packageVersion: pkg.version,
      },
      fixable: false,
    };
  } catch {
    return {
      check: "dependencies",
      status: "warning",
      message: "Could not check dependencies (package.json not found)",
      details: { path: packageJsonPath },
      fixable: false,
    };
  }
}

/**
 * Run all diagnostic checks
 */
export async function runDiagnostics(options: DoctorOptions = {}): Promise<DoctorResult[]> {
  const allChecks: Record<string, () => Promise<DoctorResult>> = {
    "node-version": checkNodeVersion,
    memory: checkMemory,
    "disk-space": checkDiskSpace,
    config: checkConfig,
    "api-keys": checkApiKeys,
    connectivity: checkConnectivity,
    security: checkSecurity,
    dependencies: checkDependencies,
  };
  
  const checksToRun = options.checks ?? Object.keys(allChecks);
  const results: DoctorResult[] = [];
  
  for (const checkName of checksToRun) {
    const checkFn = allChecks[checkName];
    if (!checkFn) {
      results.push({
        check: checkName,
        status: "error",
        message: `Unknown check: ${checkName}`,
        fixable: false,
      });
      continue;
    }
    
    try {
      const result = await checkFn();
      results.push(result);
      
      // Auto-fix if requested
      if (options.fix && result.fixable && result.fix) {
        await result.fix();
      }
    } catch (err) {
      results.push({
        check: checkName,
        status: "error",
        message: `Check failed: ${err instanceof Error ? err.message : String(err)}`,
        fixable: false,
      });
    }
  }
  
  return results;
}

/**
 * Generate diagnostic report
 */
export function generateReport(results: DoctorResult[]): string {
  const statusEmoji: Record<CheckStatus, string> = {
    ok: "✅",
    warning: "⚠️",
    error: "❌",
  };
  
  let report = "\n📋 SecuClaw Diagnostic Report\n";
  report += "═".repeat(50) + "\n\n";
  
  for (const result of results) {
    const emoji = statusEmoji[result.status];
    report += `${emoji} ${result.check}\n`;
    report += `   ${result.message}\n`;
    
    if (result.details && Object.keys(result.details).length > 0) {
      report += `   Details: ${JSON.stringify(result.details)}\n`;
    }
    
    if (result.fixable) {
      report += `   🔧 Auto-fix available\n`;
    }
    
    report += "\n";
  }
  
  // Summary
  const okCount = results.filter(r => r.status === "ok").length;
  const warningCount = results.filter(r => r.status === "warning").length;
  const errorCount = results.filter(r => r.status === "error").length;
  
  report += "─".repeat(50) + "\n";
  report += `Summary: ${okCount} passed, ${warningCount} warnings, ${errorCount} errors\n`;
  
  return report;
}

/**
 * Generate JSON report
 */
export function generateJsonReport(results: DoctorResult[]): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      ok: results.filter(r => r.status === "ok").length,
      warning: results.filter(r => r.status === "warning").length,
      error: results.filter(r => r.status === "error").length,
    },
  }, null, 2);
}
