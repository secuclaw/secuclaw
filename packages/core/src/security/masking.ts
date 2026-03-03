export type MaskingRule = "email" | "phone" | "credit_card" | "ssn" | "ip" | "password" | "api_key" | "chinese_id" | "chinese_phone" | "chinese_bank_card" | "jwt" | "private_key" | "custom";

export interface MaskingConfig {
  enabled: boolean;
  rules: MaskingRuleConfig[];
  defaultChar: string;
  preserveLength: boolean;
  logMaskedData: boolean;
  sensitivityLevels: Record<string, "low" | "medium" | "high" | "critical">;
}

export interface MaskingRuleConfig {
  type: MaskingRule;
  pattern: string;
  replacement: string;
  enabled: boolean;
  description?: string;
}

export interface DataClassification {
  level: "public" | "internal" | "confidential" | "restricted";
  categories: string[];
  piiDetected: boolean;
  sensitivity: number;
  piiTypes: MaskingRule[];
}

export interface MaskingAuditLog {
  timestamp: Date;
  dataType: MaskingRule;
  originalLength: number;
  maskedLength: number;
  field?: string;
  tenantId?: string;
  userId?: string;
}

const DEFAULT_MASKING_CONFIG: MaskingConfig = {
  enabled: true,
  defaultChar: "*",
  preserveLength: true,
  logMaskedData: false,
  sensitivityLevels: {
    email: "medium",
    phone: "medium",
    credit_card: "critical",
    ssn: "critical",
    ip: "low",
    password: "critical",
    api_key: "critical",
    chinese_id: "critical",
    chinese_phone: "medium",
    chinese_bank_card: "critical",
    jwt: "critical",
    private_key: "critical",
  },
  rules: [
    {
      type: "email",
      pattern: "([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})",
      replacement: "$1***@$2.***",
      enabled: true,
      description: "Email addresses",
    },
    {
      type: "phone",
      pattern: "(\\+?\\d{1,3}[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}",
      replacement: "***-***-****",
      enabled: true,
      description: "International phone numbers",
    },
    {
      type: "credit_card",
      pattern: "\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b",
      replacement: "****-****-****-****",
      enabled: true,
      description: "Credit card numbers",
    },
    {
      type: "ssn",
      pattern: "\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b",
      replacement: "***-**-****",
      enabled: true,
      description: "US Social Security Numbers",
    },
    {
      type: "ip",
      pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b",
      replacement: "***.***.***.***",
      enabled: true,
      description: "IPv4 addresses",
    },
    {
      type: "password",
      pattern: "(password|passwd|pwd|pass)[\"']?\\s*[:=]\\s*[\"']?[^\\s\"'}]+",
      replacement: "$1=********",
      enabled: true,
      description: "Password fields",
    },
    {
      type: "api_key",
      pattern: "(api[_-]?key|apikey|api_secret|secret[_-]?key|access[_-]?token|auth[_-]?token)[\"']?\\s*[:=]\\s*[\"']?[a-zA-Z0-9_\\-]{8,}",
      replacement: "$1=********",
      enabled: true,
      description: "API keys and tokens",
    },
    {
      type: "chinese_id",
      pattern: "\\b[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]\\b",
      replacement: "******************",
      enabled: true,
      description: "Chinese ID card numbers (18-digit)",
    },
    {
      type: "chinese_phone",
      pattern: "\\b1[3-9]\\d{9}\\b",
      replacement: "1**********",
      enabled: true,
      description: "Chinese mobile phone numbers",
    },
    {
      type: "chinese_bank_card",
      pattern: "\\b(?:\\d{4}[-\\s]?){4}\\d{4}\\b|\\b\\d{16,19}\\b",
      replacement: "****************",
      enabled: true,
      description: "Chinese bank card numbers",
    },
    {
      type: "jwt",
      pattern: "eyJ[a-zA-Z0-9_-]*\\.eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*",
      replacement: "eyJ***.eyJ***.***",
      enabled: true,
      description: "JWT tokens",
    },
    {
      type: "private_key",
      pattern: "-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\\s\\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----",
      replacement: "-----BEGIN PRIVATE KEY-----***REDACTED***-----END PRIVATE KEY-----",
      enabled: true,
      description: "PEM-format private keys",
    },
  ],
};

class DataMasker {
  private config: MaskingConfig;
  private compiledPatterns: Map<MaskingRule, RegExp> = new Map();
  private auditLogs: MaskingAuditLog[] = [];
  private maxAuditLogs: number = 10000;

  constructor(config: Partial<MaskingConfig> = {}) {
    this.config = { ...DEFAULT_MASKING_CONFIG, ...config };
    this.compilePatterns();
  }

  private compilePatterns(): void {
    for (const rule of this.config.rules) {
      try {
        this.compiledPatterns.set(rule.type, new RegExp(rule.pattern, "gi"));
      } catch (e) {
        console.warn("Failed to compile pattern for " + rule.type + ":", e);
      }
    }
  }

  private logMasking(dataType: MaskingRule, originalLength: number, maskedLength: number, field?: string): void {
    if (!this.config.logMaskedData) return;
    
    const log: MaskingAuditLog = {
      timestamp: new Date(),
      dataType,
      originalLength,
      maskedLength,
      field,
    };
    
    this.auditLogs.push(log);
    
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
    }
  }

  mask(input: string, rules?: MaskingRule[], context?: { field?: string; tenantId?: string }): string {
    if (!this.config.enabled || typeof input !== "string") return input;

    let result = input;
    const rulesToApply = rules ?? this.config.rules.map((r) => r.type);

    for (const ruleConfig of this.config.rules) {
      if (!rulesToApply.includes(ruleConfig.type) || !ruleConfig.enabled) continue;

      const pattern = this.compiledPatterns.get(ruleConfig.type);
      if (!pattern) continue;

      const matches = result.match(new RegExp(ruleConfig.pattern, "gi"));
      if (matches && matches.length > 0) {
        const beforeLen = result.length;
        
        result = result.replace(pattern, (match) => {
          if (ruleConfig.replacement.includes("$")) {
            return match.replace(new RegExp(ruleConfig.pattern, "i"), ruleConfig.replacement);
          }
          if (this.config.preserveLength) {
            return ruleConfig.replacement[0].repeat(match.length);
          }
          return ruleConfig.replacement;
        });
        
        this.logMasking(ruleConfig.type, beforeLen, result.length, context?.field);
      }
    }

    return result;
  }

  maskObject<T extends Record<string, unknown>>(
    obj: T,
    fieldRules?: Record<string, MaskingRule[]>,
    context?: { tenantId?: string }
  ): T {
    if (!this.config.enabled || !obj) return obj;

    const result = { ...obj } as T;
    const sensitiveFields = [
      "password", "pwd", "pass", "secret", "token", "api_key", "apikey",
      "private_key", "privatekey", "credential", "auth", "key",
      "ssn", "social_security", "id_card", "identity",
      "credit_card", "card_number", "bank_account",
      "phone", "mobile", "tel", "telephone",
      "email", "mail", "email_address",
    ];

    for (const [key, value] of Object.entries(result)) {
      if (value === null || value === undefined) continue;

      const fieldMaskingRules = fieldRules?.[key];
      const keyLower = key.toLowerCase();
      const fieldContext = { field: key, ...context };

      if (typeof value === "string") {
        if (fieldMaskingRules) {
          result[key as keyof T] = this.mask(value, fieldMaskingRules, fieldContext) as T[keyof T];
        } else {
          for (const sensitive of sensitiveFields) {
            if (keyLower.includes(sensitive)) {
              let autoRules: MaskingRule[] = [];
              
              if (keyLower.includes("email") || keyLower.includes("mail")) {
                autoRules = ["email"];
              } else if (keyLower.includes("phone") || keyLower.includes("mobile") || keyLower.includes("tel")) {
                autoRules = ["phone", "chinese_phone"];
              } else if (keyLower.includes("password") || keyLower.includes("pwd") || keyLower.includes("pass")) {
                autoRules = ["password"];
              } else if (keyLower.includes("api") && keyLower.includes("key")) {
                autoRules = ["api_key"];
              } else if (keyLower.includes("token") || keyLower.includes("secret") || keyLower.includes("auth")) {
                autoRules = ["api_key", "jwt"];
              } else if (keyLower.includes("ip") || keyLower.includes("address")) {
                autoRules = ["ip"];
              } else if (keyLower.includes("card") || keyLower.includes("credit")) {
                autoRules = ["credit_card", "chinese_bank_card"];
              } else if (keyLower.includes("ssn") || keyLower.includes("social")) {
                autoRules = ["ssn"];
              } else if (keyLower.includes("id_card") || keyLower.includes("identity")) {
                autoRules = ["chinese_id", "ssn"];
              } else if (keyLower.includes("private_key") || keyLower.includes("privatekey")) {
                autoRules = ["private_key"];
              } else {
                autoRules = ["password", "api_key"];
              }
              
              result[key as keyof T] = this.mask(value, autoRules, fieldContext) as T[keyof T];
              break;
            }
          }
        }
      } else if (typeof value === "object" && !Array.isArray(value)) {
        result[key as keyof T] = this.maskObject(
          value as Record<string, unknown>,
          fieldRules,
          context
        ) as T[keyof T];
      } else if (Array.isArray(value)) {
        result[key as keyof T] = value.map((item) =>
          typeof item === "string"
            ? this.mask(item, undefined, fieldContext)
            : typeof item === "object"
            ? this.maskObject(item, fieldRules, context)
            : item
        ) as T[keyof T];
      }
    }

    return result;
  }

  maskStream(
    chunks: AsyncIterable<string> | NodeJS.ReadableStream,
    rules?: MaskingRule[]
  ): AsyncGenerator<string> {
    const self = this;
    
    return (async function* (): AsyncGenerator<string> {
      let buffer = "";
      
      for await (const chunk of chunks) {
        buffer += chunk;
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          yield self.mask(line, rules) + "\n";
        }
      }
      
      if (buffer) {
        yield self.mask(buffer, rules);
      }
    })();
  }

  detectPII(input: string): Array<{ type: MaskingRule; matches: string[]; count: number }> {
    const detections: Array<{ type: MaskingRule; matches: string[]; count: number }> = [];

    for (const ruleConfig of this.config.rules) {
      if (!ruleConfig.enabled) continue;

      const pattern = this.compiledPatterns.get(ruleConfig.type);
      if (!pattern) continue;

      const matches = input.match(new RegExp(ruleConfig.pattern, "gi"));
      if (matches && matches.length > 0) {
        detections.push({
          type: ruleConfig.type,
          matches: [...new Set(matches)].slice(0, 10),
          count: matches.length,
        });
      }
    }

    return detections;
  }

  classify(input: string): DataClassification {
    const piiDetections = this.detectPII(input);

    let level: DataClassification["level"] = "public";
    let sensitivity = 0;
    const categories: string[] = [];
    const piiTypes: MaskingRule[] = [];

    if (piiDetections.length > 0) {
      categories.push("pii");
      sensitivity += 30;
    }

    for (const detection of piiDetections) {
      piiTypes.push(detection.type);
      const ruleLevel = this.config.sensitivityLevels[detection.type] || "medium";
      
      if (ruleLevel === "critical" || detection.type === "ssn" || detection.type === "credit_card" || 
          detection.type === "chinese_id" || detection.type === "chinese_bank_card" || detection.type === "private_key") {
        level = "restricted";
        sensitivity += 40;
      } else if (ruleLevel === "high" || detection.type === "password" || detection.type === "api_key" || detection.type === "jwt") {
        if (level !== "restricted") level = "confidential";
        sensitivity += 30;
      } else if (ruleLevel === "medium" || detection.type === "email" || detection.type === "phone" || detection.type === "chinese_phone") {
        if (level === "public") level = "internal";
        sensitivity += 15;
      } else {
        sensitivity += 5;
      }
    }

    const lowerInput = input.toLowerCase();
    const confidentialKeywords = ["confidential", "secret", "private", "internal", "classified", "敏感", "机密", "秘密", "绝密"];
    for (const keyword of confidentialKeywords) {
      if (lowerInput.includes(keyword)) {
        categories.push(keyword);
        sensitivity += 5;
      }
    }

    const financialKeywords = ["payment", "credit", "bank", "transaction", "account", "支付", "银行", "账户", "交易"];
    for (const keyword of financialKeywords) {
      if (lowerInput.includes(keyword)) {
        categories.push("financial");
        sensitivity += 10;
        break;
      }
    }

    return {
      level,
      categories,
      piiDetected: piiDetections.length > 0,
      sensitivity: Math.min(sensitivity, 100),
      piiTypes,
    };
  }

  requiresMasking(input: string): boolean {
    const classification = this.classify(input);
    return classification.piiDetected || classification.level !== "public";
  }

  getMaskingRecommendation(input: string): {
    shouldMask: boolean;
    recommendedRules: MaskingRule[];
    riskLevel: string;
    reason: string;
  } {
    const classification = this.classify(input);
    const detections = this.detectPII(input);
    
    const recommendedRules = detections.map(d => d.type);
    
    let reason = "";
    if (classification.piiDetected) {
      reason = "Detected " + detections.length + " PII type(s): " + detections.map(d => d.type).join(", ");
    } else if (classification.level !== "public") {
      reason = "Data classified as " + classification.level + " with " + classification.categories.join(", ") + " keywords";
    } else {
      reason = "No PII or sensitive data detected";
    }

    return {
      shouldMask: classification.piiDetected || classification.level !== "public",
      recommendedRules,
      riskLevel: classification.level,
      reason,
    };
  }

  addCustomRule(type: MaskingRule, pattern: string, replacement: string, description?: string): void {
    const existing = this.config.rules.find((r) => r.type === type);
    if (existing) {
      existing.pattern = pattern;
      existing.replacement = replacement;
      existing.description = description;
    } else {
      this.config.rules.push({
        type,
        pattern,
        replacement,
        enabled: true,
        description,
      });
    }

    try {
      this.compiledPatterns.set(type, new RegExp(pattern, "gi"));
    } catch (e) {
      console.warn("Failed to compile custom pattern for " + type + ":", e);
    }
  }

  removeRule(type: MaskingRule): boolean {
    const index = this.config.rules.findIndex((r) => r.type === type);
    if (index >= 0) {
      this.config.rules.splice(index, 1);
      this.compiledPatterns.delete(type);
      return true;
    }
    return false;
  }

  setRuleEnabled(type: MaskingRule, enabled: boolean): void {
    const rule = this.config.rules.find((r) => r.type === type);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  getConfig(): MaskingConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<MaskingConfig>): void {
    this.config = { ...this.config, ...config };
    this.compilePatterns();
  }

  getAuditLogs(limit: number = 100): MaskingAuditLog[] {
    return this.auditLogs.slice(-limit);
  }

  clearAuditLogs(): void {
    this.auditLogs = [];
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(json: string): void {
    try {
      const config = JSON.parse(json);
      this.setConfig(config);
    } catch (e) {
      throw new Error("Failed to import masking config: " + (e instanceof Error ? e.message : String(e)));
    }
  }
}

export { DataMasker };

export const defaultMasker = new DataMasker();

export function maskData(input: string, rules?: MaskingRule[]): string {
  return defaultMasker.mask(input, rules);
}

export function maskObject<T extends Record<string, unknown>>(
  obj: T,
  fieldRules?: Record<string, MaskingRule[]>
): T {
  return defaultMasker.maskObject(obj, fieldRules);
}

export function detectPII(input: string): Array<{ type: MaskingRule; matches: string[]; count: number }> {
  return defaultMasker.detectPII(input);
}

export function classifyData(input: string): DataClassification {
  return defaultMasker.classify(input);
}

export function requiresMasking(input: string): boolean {
  return defaultMasker.requiresMasking(input);
}

export function getMaskingRecommendation(input: string): {
  shouldMask: boolean;
  recommendedRules: MaskingRule[];
  riskLevel: string;
  reason: string;
} {
  return defaultMasker.getMaskingRecommendation(input);
}
