import type { Tool, ToolResult, ToolContext } from "./types.js";

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  modifiedResult?: ToolResult;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations?: string[];
}

export interface GuardConfig {
  enableResultValidation: boolean;
  enableAutoFix: boolean;
  enablePIIProtection: boolean;
  maxResultSize: number;
  blockSensitiveData: boolean;
  allowedSensitivePatterns: string[];
  blockedSensitivePatterns: string[];
}

const DEFAULT_CONFIG: GuardConfig = {
  enableResultValidation: true,
  enableAutoFix: true,
  enablePIIProtection: true,
  maxResultSize: 1024 * 1024, // 1MB
  blockSensitiveData: true,
  allowedSensitivePatterns: [
    // Allow internal system information
    "system",
    "internal",
    "config",
  ],
  blockedSensitivePatterns: [
    // Block sensitive data patterns
    "password",
    "secret",
    "token",
    "api_key",
    "credential",
    "private_key",
  ],
};

export class ToolResultGuard {
  private config: GuardConfig;
  private sensitivePatterns: RegExp[];
  private guardChain: Array<(result: ToolResult, context: ToolContext) => GuardResult | Promise<GuardResult>>;

  constructor(config: Partial<GuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sensitivePatterns = this.buildSensitivePatterns();
    this.guardChain = [];
    
    // Add default guards
    this.addDefaultGuards();
  }

  private buildSensitivePatterns(): RegExp[] {
    return [
      /password["']?\s*[:=]\s*["']?[^\s"'}]+/gi,
      /api[_-]?key["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{8,}/gi,
      /secret["']?\s*[:=]\s*["']?[^\s"'}]+/gi,
      /token["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{8,}/gi,
      /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
      /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi,
      /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
    ];
  }

  private addDefaultGuards(): void {
    // Result size guard
    this.guardChain.push(async (result: ToolResult, _context: ToolContext) => {
      if (result.data) {
        const size = JSON.stringify(result.data).length;
        if (size > this.config.maxResultSize) {
          return {
            allowed: true,
            reason: "Result truncated due to size limit",
            modifiedResult: {
              ...result,
              data: typeof result.data === 'string' ? result.data.slice(0, this.config.maxResultSize / 10) + "\n[Result truncated...]" : result.data,
            },
            riskLevel: "low" as const,
            recommendations: ["Consider using pagination for large results"],
          };
        }
      }
      return { allowed: true, riskLevel: "low" as const };
    });

    // Sensitive data guard
    this.guardChain.push(async (result: ToolResult, _context: ToolContext) => {
      if (!this.config.blockSensitiveData) {
        return { allowed: true, riskLevel: "low" as const };
      }

      const content = JSON.stringify(result.data);
      const detectedPatterns: string[] = [];

      for (const pattern of this.sensitivePatterns) {
        if (pattern.test(content)) {
          detectedPatterns.push(pattern.source);
        }
      }

      if (detectedPatterns.length > 0) {
        return {
          allowed: true,
          reason: "Sensitive data detected in result",
          modifiedResult: this.sanitizeResult(result),
          riskLevel: "high" as const,
          recommendations: [
            "Sensitive data has been sanitized",
            "Consider using masked output for sensitive results",
          ],
        };
      }

      return { allowed: true, riskLevel: "low" as const };
    });

    // PII protection guard
    this.guardChain.push(async (result: ToolResult, _context: ToolContext) => {
      if (!this.config.enablePIIProtection) {
        return { allowed: true, riskLevel: "low" as const };
      }

      const content = JSON.stringify(result.data);
      const piiPatterns = [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
        /\b1[3-9]\d{9}\b/g, // Chinese phone
        /\b\d{17}[\dXx]\b/g, // Chinese ID
      ];

      let hasPII = false;
      for (const pattern of piiPatterns) {
        if (pattern.test(content)) {
          hasPII = true;
          break;
        }
      }

      if (hasPII) {
        return {
          allowed: true,
          reason: "PII detected in result",
          modifiedResult: this.maskPII(result),
          riskLevel: "medium" as const,
          recommendations: ["PII has been masked for privacy protection"],
        };
      }

      return { allowed: true, riskLevel: "low" as const };
    });
  }

  private sanitizeResult(result: ToolResult): ToolResult {
    const content = JSON.stringify(result.data);
    let sanitized = content;

    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, "********");
    }

    return {
      ...result,
      data: JSON.parse(sanitized),
    };
  }

  private maskPII(result: ToolResult): ToolResult {
    const content = JSON.stringify(result.data);
    let masked = content;

    // Mask emails
    masked = masked.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      "***@***.***"
    );

    // Mask Chinese phone numbers
    masked = masked.replace(/\b1[3-9]\d{9}\b/g, "1**********");

    // Mask Chinese ID
    masked = masked.replace(/\b\d{17}[\dXx]\b/g, "******************");

    return {
      ...result,
      data: JSON.parse(masked),
    };
  }

  addGuard(
    guard: (result: ToolResult, context: ToolContext) => GuardResult | Promise<GuardResult>
  ): void {
    this.guardChain.push(guard);
  }

  async validate(result: ToolResult, context: ToolContext): Promise<GuardResult> {
    let currentResult = result;
    let highestRisk: GuardResult["riskLevel"] = "low";
    const allRecommendations: string[] = [];

    for (const guard of this.guardChain) {
      const guardResult = await guard(currentResult, context);

      if (!guardResult.allowed) {
        return {
          allowed: false,
          reason: guardResult.reason,
          riskLevel: guardResult.riskLevel,
          recommendations: guardResult.recommendations,
        };
      }

      if (guardResult.modifiedResult) {
        currentResult = guardResult.modifiedResult;
      }

      // Track highest risk level
      const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      if (riskOrder[guardResult.riskLevel] > riskOrder[highestRisk]) {
        highestRisk = guardResult.riskLevel;
      }

      if (guardResult.recommendations) {
        allRecommendations.push(...guardResult.recommendations);
      }
    }

    return {
      allowed: true,
      modifiedResult: currentResult,
      riskLevel: highestRisk,
      recommendations: allRecommendations.length > 0 ? allRecommendations : undefined,
    };
  }

  setConfig(config: Partial<GuardConfig>): void {
    this.config = { ...this.config, ...config };
    this.sensitivePatterns = this.buildSensitivePatterns();
  }

  getConfig(): GuardConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultGuard: ToolResultGuard | null = null;

export function getToolResultGuard(config?: Partial<GuardConfig>): ToolResultGuard {
  if (!defaultGuard) {
    defaultGuard = new ToolResultGuard(config);
  }
  return defaultGuard;
}
