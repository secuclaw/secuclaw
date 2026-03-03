import {
  ToolPolicy,
  ToolPolicyMode,
  ToolContext,
  PolicyChainItem,
  Tool,
  ToolResult,
  SecurityTool,
} from "./types.js";

export type ResultGuardRule = "allow" | "mask" | "redact" | "block";

export interface ResultGuardConfig {
  rule: ResultGuardRule;
  patterns?: RegExp[];
  maxDataSize?: number;
  maskChar?: string;
  preserveLength?: boolean;
}

export interface PolicyDecision {
  mode: ToolPolicyMode;
  reason: string;
  source: string;
  resultGuard?: ResultGuardConfig;
}

export interface PolicyEngineOptions {
  defaultMode: ToolPolicyMode;
  enableResultGuard: boolean;
  defaultResultGuard: ResultGuardConfig;
  sensitivePatterns: RegExp[];
}

const DEFAULT_SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
  /password["']?\s*[:=]\s*["'][^"']+["']/gi,
  /api[_-]?key["']?\s*[:=]\s*["'][^"']+["']/gi,
  /secret["']?\s*[:=]\s*["'][^"']+["']/gi,
  /token["']?\s*[:=]\s*["'][^"']+["']/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
];

const DEFAULT_RESULT_GUARD: ResultGuardConfig = {
  rule: "mask",
  maxDataSize: 1024 * 1024,
  maskChar: "*",
  preserveLength: true,
};

export class PolicyEngine {
  private policyChain: PolicyChainItem[] = [];
  private options: PolicyEngineOptions;
  private toolSpecificGuards: Map<string, ResultGuardConfig> = new Map();

  constructor(options?: Partial<PolicyEngineOptions>) {
    this.options = {
      defaultMode: options?.defaultMode ?? ToolPolicyMode.NONE,
      enableResultGuard: options?.enableResultGuard ?? true,
      defaultResultGuard: { ...DEFAULT_RESULT_GUARD, ...options?.defaultResultGuard },
      sensitivePatterns: options?.sensitivePatterns ?? DEFAULT_SENSITIVE_PATTERNS,
    };
  }

  addPolicyToChain(item: PolicyChainItem): void {
    this.policyChain.push(item);
    this.policyChain.sort((a, b) => b.priority - a.priority);
  }

  removePolicyFromChain(name: string): boolean {
    const index = this.policyChain.findIndex((p) => p.name === name);
    if (index >= 0) {
      this.policyChain.splice(index, 1);
      return true;
    }
    return false;
  }

  setToolResultGuard(toolName: string, config: ResultGuardConfig): void {
    this.toolSpecificGuards.set(toolName, config);
  }

  evaluate(
    tool: Tool,
    context: ToolContext,
    basePolicy?: ToolPolicy,
  ): PolicyDecision {
    const sortedChain = [...this.policyChain].sort((a, b) => b.priority - a.priority);

    for (const policyItem of sortedChain) {
      const resolved = policyItem.resolver(tool.name, context);
      if (resolved !== ToolPolicyMode.NONE) {
        return {
          mode: resolved,
          reason: `Policy chain: ${policyItem.name}`,
          source: policyItem.name,
          resultGuard: this.getResultGuard(tool.name),
        };
      }
    }

    if (basePolicy) {
      const baseDecision = this.evaluateBasePolicy(tool.name, basePolicy);
      if (baseDecision.mode !== ToolPolicyMode.NONE) {
        return {
          ...baseDecision,
          source: "base_policy",
          resultGuard: this.getResultGuard(tool.name),
        };
      }
    }

    const toolDefault = tool.policy.mode;
    if (toolDefault !== ToolPolicyMode.NONE) {
      return {
        mode: toolDefault,
        reason: "Tool default policy",
        source: "tool_default",
        resultGuard: this.getResultGuard(tool.name),
      };
    }

    return {
      mode: this.options.defaultMode,
      reason: "Engine default",
      source: "engine_default",
      resultGuard: this.getResultGuard(tool.name),
    };
  }

  private evaluateBasePolicy(toolName: string, policy: ToolPolicy): PolicyDecision {
    switch (policy.mode) {
      case ToolPolicyMode.ALLOW:
        if (policy.denyList && policy.denyList.length > 0) {
          if (this.matchesPattern(toolName, policy.denyList)) {
            return { mode: ToolPolicyMode.DENY, reason: "In deny list", source: "base_policy" };
          }
        }
        if (policy.allowList && policy.allowList.length > 0) {
          if (!this.matchesPattern(toolName, policy.allowList)) {
            return { mode: ToolPolicyMode.DENY, reason: "Not in allow list", source: "base_policy" };
          }
        }
        return { mode: ToolPolicyMode.ALLOW, reason: "Explicitly allowed", source: "base_policy" };

      case ToolPolicyMode.DENY:
        if (policy.allowList && policy.allowList.length > 0) {
          if (this.matchesPattern(toolName, policy.allowList)) {
            return { mode: ToolPolicyMode.ALLOW, reason: "Exception in allow list", source: "base_policy" };
          }
        }
        if (policy.denyList && policy.denyList.length > 0) {
          if (!this.matchesPattern(toolName, policy.denyList)) {
            return { mode: ToolPolicyMode.ALLOW, reason: "Not in deny list", source: "base_policy" };
          }
        }
        return { mode: ToolPolicyMode.DENY, reason: "Explicitly denied", source: "base_policy" };

      case ToolPolicyMode.NONE:
      default:
        return { mode: ToolPolicyMode.NONE, reason: "No policy set", source: "base_policy" };
    }
  }

  private matchesPattern(toolName: string, patterns: string[]): boolean {
    const normalized = toolName.toLowerCase().trim();
    return patterns.some((pattern) => {
      const normalizedPattern = pattern.toLowerCase().trim();
      if (normalizedPattern.includes("*")) {
        const regex = new RegExp(`^${normalizedPattern.replace(/\*/g, ".*")}$`);
        return regex.test(normalized);
      }
      return normalized === normalizedPattern;
    });
  }

  private getResultGuard(toolName: string): ResultGuardConfig {
    if (this.toolSpecificGuards.has(toolName)) {
      return this.toolSpecificGuards.get(toolName)!;
    }
    return this.options.defaultResultGuard;
  }

  applyResultGuard(tool: Tool, result: ToolResult): ToolResult {
    if (!this.options.enableResultGuard) {
      return result;
    }

    const guardConfig = this.getResultGuard(tool.name);
    const isSecurityTool = this.isSecurityTool(tool);

    if (isSecurityTool && guardConfig.rule === "allow") {
      guardConfig.rule = "mask";
    }

    if (result.data === undefined) {
      return result;
    }

    const dataStr = typeof result.data === "string" ? result.data : JSON.stringify(result.data);

    if (guardConfig.maxDataSize && dataStr.length > guardConfig.maxDataSize) {
      return {
        ...result,
        data: this.truncateData(dataStr, guardConfig.maxDataSize),
        metadata: {
          ...result.metadata,
          truncated: true,
          originalSize: dataStr.length,
        },
      };
    }

    let processedData: unknown;
    switch (guardConfig.rule) {
      case "allow":
        processedData = result.data;
        break;
      case "mask":
        processedData = this.maskSensitiveData(dataStr, guardConfig);
        break;
      case "redact":
        processedData = this.redactSensitiveData(dataStr, guardConfig);
        break;
      case "block":
        processedData = "[REDACTED - Sensitive data blocked]";
        break;
    }

    return {
      ...result,
      data: processedData,
    };
  }

  private isSecurityTool(tool: Tool): boolean {
    return (
      (tool as SecurityTool).mitreTechniques !== undefined ||
      (tool as SecurityTool).scfControls !== undefined ||
      (tool as SecurityTool).severity !== undefined
    );
  }

  private maskSensitiveData(data: string, config: ResultGuardConfig): string {
    let result = data;
    const maskChar = config.maskChar ?? "*";

    for (const pattern of this.options.sensitivePatterns) {
      result = result.replace(pattern, (match) => {
        if (config.preserveLength) {
          return maskChar.repeat(match.length);
        }
        return maskChar.repeat(8);
      });
    }

    return result;
  }

  private redactSensitiveData(data: string, config: ResultGuardConfig): string {
    let result = data;
    const placeholder = config.preserveLength ? undefined : "[REDACTED]";

    for (const pattern of this.options.sensitivePatterns) {
      result = result.replace(pattern, () => {
        if (placeholder) {
          return placeholder;
        }
        return "[REDACTED]";
      });
    }

    return result;
  }

  private truncateData(data: string, maxSize: number): string {
    if (data.length <= maxSize) {
      return data;
    }

    const halfSize = Math.floor(maxSize / 2);
    return data.slice(0, halfSize) + "\n... [TRUNCATED] ...\n" + data.slice(-halfSize);
  }
}

export function createSecurityPolicyEngine(): PolicyEngine {
  const engine = new PolicyEngine({
    defaultMode: ToolPolicyMode.DENY,
    enableResultGuard: true,
    defaultResultGuard: {
      rule: "mask",
      maxDataSize: 512 * 1024,
      maskChar: "█",
      preserveLength: false,
    },
  });

  engine.addPolicyToChain({
    name: "critical_tools",
    priority: 100,
    resolver: (toolName: string, _context: ToolContext): ToolPolicyMode => {
      const criticalTools = ["metasploit", "sqlmap", "exploitdb"];
      if (criticalTools.some((t) => toolName.toLowerCase().includes(t))) {
        return ToolPolicyMode.DENY;
      }
      return ToolPolicyMode.NONE;
    },
  });

  engine.addPolicyToChain({
    name: "analysis_tools",
    priority: 50,
    resolver: (toolName: string, _context: ToolContext): ToolPolicyMode => {
      const analysisTools = ["nmap", "nuclei", "httpx", "subfinder"];
      if (analysisTools.some((t) => toolName.toLowerCase().includes(t))) {
        return ToolPolicyMode.ALLOW;
      }
      return ToolPolicyMode.NONE;
    },
  });

  engine.setToolResultGuard("nmap", { rule: "mask", maxDataSize: 256 * 1024 });
  engine.setToolResultGuard("sqlmap", { rule: "redact", maxDataSize: 128 * 1024 });
  engine.setToolResultGuard("nuclei", { rule: "mask", maxDataSize: 512 * 1024 });

  return engine;
}

export function createPermissivePolicyEngine(): PolicyEngine {
  return new PolicyEngine({
    defaultMode: ToolPolicyMode.ALLOW,
    enableResultGuard: true,
    defaultResultGuard: {
      rule: "mask",
      maxDataSize: 1024 * 1024,
      maskChar: "*",
      preserveLength: true,
    },
  });
}
