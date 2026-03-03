/**
 * Prompt Injection Protection
 * 
 * Detection and sanitization of prompt injection attempts.
 */

// ============================================================================
// Types
// ============================================================================

export type InjectionType = "direct" | "indirect" | "role-play" | "jailbreak";

export interface InjectionAttempt {
  type: InjectionType;
  pattern: string;
  severity: "low" | "medium" | "high";
  location: "system" | "user" | "tool";
  matchedText: string;
}

export interface ScanResult {
  clean: boolean;
  attempts: InjectionAttempt[];
  riskScore: number;
}

// ============================================================================
// Pattern Library
// ============================================================================

const INJECTION_PATTERNS = [
  // Direct instructions
  { pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i, type: "direct" as InjectionType, severity: "high" },
  { pattern: /forget\s+(everything|all)\s+(you|i)\s+(know|learned)/i, type: "direct" as InjectionType, severity: "high" },
  { pattern: /disregard\s+(your|from)\s+(rules|guidelines)/i, type: "direct" as InjectionType, severity: "high" },
  
  // Role play
  { pattern: /act\s+(as|like|if\s+you\s+are|if\s+you\s+were)/i, type: "role-play" as InjectionType, severity: "medium" },
  { pattern: /pretend\s+(to\s+be|you\s+are)/i, type: "role-play" as InjectionType, severity: "medium" },
  { pattern: /you\s+are\s+(now|a|an)\s+\w+/i, type: "role-play" as InjectionType, severity: "medium" },
  
  // Jailbreak
  { pattern: /DAN\s+mode/i, type: "jailbreak" as InjectionType, severity: "high" },
  { pattern: /developer\s+mode/i, type: "jailbreak" as InjectionType, severity: "high" },
  { pattern: /bypass\s+(safety|restrictions)/i, type: "jailbreak" as InjectionType, severity: "high" },
  
  // Data exfiltration
  { pattern: /print\s+(all|your)\s+(instructions|prompt)/i, type: "indirect" as InjectionType, severity: "high" },
  { pattern: /reveal\s+(your|system)\s+(instructions|prompt)/i, type: "indirect" as InjectionType, severity: "high" },
  
  // Override attempts
  { pattern: /^system:\s*/im, type: "direct" as InjectionType, severity: "high", location: "user" },
  { pattern: /^assistant:\s*/im, type: "direct" as InjectionType, severity: "medium", location: "user" },
];

// ============================================================================
// Scanner
// ============================================================================

/**
 * Scans for prompt injection attempts
 */
export class PromptScanner {
  /**
   * Scan text for injection attempts
   */
  scan(text: string): ScanResult {
    const attempts: InjectionAttempt[] = [];
    
    for (const { pattern, type, severity } of INJECTION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const matched of matches) {
          attempts.push({
            type,
            pattern: pattern.source,
            severity: severity as "low" | "medium" | "high",
            location: this.detectLocation(text, matched),
            matchedText: matched,
          });
        }
      }
    }
    
    const riskScore = this.calculateRiskScore(attempts);
    
    return {
      clean: attempts.length === 0,
      attempts,
      riskScore,
    };
  }

  /**
   * Detect where in the prompt the injection is
   */
  private detectLocation(text: string, matched: string): "system" | "user" | "tool" {
    const lowerText = text.toLowerCase();
    const lowerMatched = matched.toLowerCase();
    
    if (lowerMatched.includes("system:")) return "system";
    if (lowerMatched.includes("user:")) return "user";
    if (lowerText.includes("tool") || lowerText.includes("function")) return "tool";
    return "user";
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(attempts: InjectionAttempt[]): number {
    let score = 0;
    for (const attempt of attempts) {
      switch (attempt.severity) {
        case "high": score += 40; break;
        case "medium": score += 20; break;
        case "low": score += 10; break;
      }
    }
    return Math.min(score, 100);
  }
}

// ============================================================================
// Sanitizer
// ============================================================================

/**
 * Sanitizes prompt injection attempts
 */
export class Sanitizer {
  private scanner = new PromptScanner();

  /**
   * Sanitize text by removing injection attempts
   */
  sanitize(text: string): string {
    let result = text;
    
    for (const { pattern } of INJECTION_PATTERNS) {
      result = result.replace(pattern, "[FILTERED]");
    }
    
    return result;
  }

  /**
   * Check and sanitize if needed
   */
  checkAndSanitize(text: string): { sanitized: string; wasDirty: boolean } {
    const scanResult = this.scanner.scan(text);
    if (scanResult.clean) {
      return { sanitized: text, wasDirty: false };
    }
    return { sanitized: this.sanitize(text), wasDirty: true };
  }
}

// ============================================================================
// Detector
// ============================================================================

/**
 * High-level detector with logging
 */
export class InjectionDetector {
  private scanner = new PromptScanner();
  private sanitizer = new Sanitizer();
  private auditLog: ScanResult[] = [];

  /**
   * Detect with audit logging
   */
  detect(text: string, logAudit = true): ScanResult {
    const result = this.scanner.scan(text);
    if (logAudit) {
      this.auditLog.push(result);
    }
    return result;
  }

  /**
   * Detect and auto-sanitize
   */
  detectAndSanitize(text: string): { result: ScanResult; sanitized: string } {
    const result = this.detect(text);
    const sanitized = result.clean ? text : this.sanitizer.sanitize(text);
    return { result, sanitized };
  }

  /**
   * Get audit log
   */
  getAuditLog(): ScanResult[] {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create injection detector
 */
export function createInjectionDetector(): InjectionDetector {
  return new InjectionDetector();
}
