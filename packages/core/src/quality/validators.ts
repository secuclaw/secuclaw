import type {
  ValidationRule,
  ValidationContext,
  ValidationResult,
  QualityIssue,
  ContentType,
} from "./types.js";
import { SECURITY_KEYWORDS, HALLUCINATION_PATTERNS } from "./types.js";

function createRule(
  id: string,
  name: string,
  description: string,
  dimension: "accuracy" | "relevance" | "coherence" | "safety" | "completeness" | "conciseness",
  weight: number,
  validator: (content: string, context?: ValidationContext) => ValidationResult,
  applicableTypes: ContentType[]
): ValidationRule {
  return { id, name, description, dimension, weight, validator, applicableTypes };
}

export const ACCURACY_RULES: ValidationRule[] = [
  createRule(
    "acc-001",
    "Factual Consistency",
    "Check for factual inconsistencies and hallucinations",
    "accuracy",
    0.3,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];
      let score = 1.0;

      for (const pattern of HALLUCINATION_PATTERNS) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          issues.push({
            type: "warning",
            dimension: "accuracy",
            description: `${pattern.description}: ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? "..." : ""}`,
            severity: 0.3,
          });
          score -= 0.1 * Math.min(matches.length, 3);
        }
      }

      return {
        passed: score >= 0.6,
        score: Math.max(score, 0),
        issues,
        reasoning: `Found ${issues.length} potential hallucination indicators`,
      };
    },
    ["security_analysis", "threat_report", "vulnerability_assessment", "incident_response"]
  ),

  createRule(
    "acc-002",
    "Security Terminology",
    "Verify correct usage of security terminology",
    "accuracy",
    0.2,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];
      let score = 1.0;

      const misusePatterns = [
        { pattern: /病毒.*木马|木马.*病毒/gi, issue: "混淆病毒与木马概念" },
        { pattern: /DDOS|DoS攻击|拒绝服务攻击/gi, issue: "DoS/DDoS术语使用" },
        { pattern: /XSS.*注入|注入.*XSS/gi, issue: "XSS与注入攻击混淆" },
      ];

      for (const { pattern, issue } of misusePatterns) {
        if (pattern.test(content)) {
          issues.push({
            type: "warning",
            dimension: "accuracy",
            description: issue,
            severity: 0.2,
          });
          score -= 0.1;
        }
      }

      return {
        passed: issues.length === 0,
        score: Math.max(score, 0),
        issues,
        reasoning: issues.length === 0 ? "安全术语使用正确" : `发现${issues.length}处术语问题`,
      };
    },
    ["security_analysis", "threat_report", "incident_response"]
  ),

  createRule(
    "acc-003",
    "MITRE ATT&CK Reference",
    "Validate MITRE ATT&CK technique references",
    "accuracy",
    0.25,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];
      const mitrePattern = /T\d{4}(?:\.\d{3})?/g;
      const matches = content.match(mitrePattern) || [];
      let score = 1.0;

      if (matches.length > 0) {
        const uniqueMatches = [...new Set(matches)];
        const validPrefixes = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T0"];

        for (const match of uniqueMatches) {
          const isValid = validPrefixes.some((p) => match.startsWith(p));
          if (!isValid) {
            issues.push({
              type: "error",
              dimension: "accuracy",
              description: `无效的MITRE技术编号: ${match}`,
              severity: 0.4,
            });
            score -= 0.2;
          }
        }
      }

      return {
        passed: issues.length === 0,
        score: Math.max(score, 0),
        issues,
        reasoning: matches.length > 0
          ? `引用了${[...new Set(matches)].length}个MITRE技术`
          : "未引用MITRE技术",
      };
    },
    ["security_analysis", "threat_report", "incident_response"]
  ),
];

export const RELEVANCE_RULES: ValidationRule[] = [
  createRule(
    "rel-001",
    "Domain Relevance",
    "Check if content is relevant to security domain",
    "relevance",
    0.3,
    (content: string, context?: ValidationContext): ValidationResult => {
      const issues: QualityIssue[] = [];
      const contentLower = content.toLowerCase();

      let relevantCount = 0;
      for (const keyword of SECURITY_KEYWORDS.threat) {
        if (contentLower.includes(keyword)) relevantCount++;
      }
      for (const keyword of SECURITY_KEYWORDS.mitre) {
        if (contentLower.includes(keyword)) relevantCount++;
      }

      const relevanceScore = Math.min(relevantCount / 5, 1);

      if (context?.contentType !== "general" && relevanceScore < 0.3) {
        issues.push({
          type: "warning",
          dimension: "relevance",
          description: "内容与安全领域相关性较低",
          severity: 0.5,
        });
      }

      return {
        passed: relevanceScore >= 0.3 || context?.contentType === "general",
        score: relevanceScore,
        issues,
        reasoning: `检测到${relevantCount}个安全相关关键词`,
      };
    },
    ["security_analysis", "threat_report", "vulnerability_assessment", "incident_response", "compliance_audit"]
  ),

  createRule(
    "rel-002",
    "Query Alignment",
    "Check if response addresses the query",
    "relevance",
    0.25,
    (content: string, context?: ValidationContext): ValidationResult => {
      const issues: QualityIssue[] = [];

      const hasStructure =
        content.includes("分析") ||
        content.includes("建议") ||
        content.includes("总结") ||
        content.includes("结论") ||
        content.includes("1.") ||
        content.includes("-");

      if (!hasStructure && content.length > 200) {
        issues.push({
          type: "info",
          dimension: "relevance",
          description: "回复结构不够清晰",
          severity: 0.2,
          suggestion: "考虑使用结构化格式组织回复",
        });
      }

      return {
        passed: true,
        score: hasStructure ? 1 : 0.7,
        issues,
        reasoning: hasStructure ? "回复结构良好" : "回复结构可优化",
      };
    },
    ["security_analysis", "threat_report", "recommendation", "incident_response"]
  ),
];

export const SAFETY_RULES: ValidationRule[] = [
  createRule(
    "saf-001",
    "Sensitive Data Exposure",
    "Check for potential sensitive data exposure",
    "safety",
    0.4,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];
      let score = 1.0;

      const sensitivePatterns = [
        { pattern: /[a-zA-Z0-9+/]{40,}={0,2}/g, desc: "可能的Base64编码敏感数据" },
        { pattern: /-----BEGIN.*PRIVATE KEY-----/g, desc: "私钥暴露" },
        { pattern: /password\s*[=:]\s*['"]?\S+/gi, desc: "密码硬编码" },
        { pattern: /api[_-]?key\s*[=:]\s*['"]?\S+/gi, desc: "API密钥暴露" },
        { pattern: /secret\s*[=:]\s*['"]?\S+/gi, desc: "密钥暴露" },
      ];

      for (const { pattern, desc } of sensitivePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({
            type: "error",
            dimension: "safety",
            description: desc,
            severity: 0.8,
            suggestion: "请脱敏或移除敏感数据",
          });
          score -= 0.3;
        }
      }

      return {
        passed: issues.length === 0,
        score: Math.max(score, 0),
        issues,
        reasoning: issues.length === 0 ? "未检测到敏感数据暴露" : `检测到${issues.length}处潜在敏感数据`,
      };
    },
    ["security_analysis", "code_review", "incident_response", "general"]
  ),

  createRule(
    "saf-002",
    "Harmful Content",
    "Check for potentially harmful or dangerous content",
    "safety",
    0.35,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];

      const harmfulPatterns = [
        { pattern: /如何.*攻击|攻击步骤|入侵教程/gi, desc: "攻击教程内容" },
        { pattern: /制造.*病毒|编写.*恶意软件/gi, desc: "恶意软件制作内容" },
        { pattern: /绕过.*验证|破解.*密码/gi, desc: "绕过安全措施内容" },
      ];

      let score = 1.0;
      for (const { pattern, desc } of harmfulPatterns) {
        if (pattern.test(content)) {
          issues.push({
            type: "error",
            dimension: "safety",
            description: desc,
            severity: 0.9,
            suggestion: "应从防御角度重新表述",
          });
          score -= 0.5;
        }
      }

      return {
        passed: issues.length === 0,
        score: Math.max(score, 0),
        issues,
        reasoning: issues.length === 0 ? "内容安全" : `检测到${issues.length}处潜在有害内容`,
      };
    },
    ["security_analysis", "threat_report", "general"]
  ),

  createRule(
    "saf-003",
    "Exploit Code Handling",
    "Check for unsafe exploit code handling",
    "safety",
    0.25,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];

      const exploitPatterns = [
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /shell_exec/gi,
        /subprocess\.call/gi,
      ];

      let hasExploitCode = false;
      for (const pattern of exploitPatterns) {
        if (pattern.test(content)) {
          hasExploitCode = true;
          break;
        }
      }

      if (hasExploitCode) {
        issues.push({
          type: "warning",
          dimension: "safety",
          description: "包含可能的利用代码",
          severity: 0.6,
          suggestion: "确保代码仅用于安全研究目的",
        });
      }

      return {
        passed: true,
        score: hasExploitCode ? 0.7 : 1,
        issues,
        reasoning: hasExploitCode ? "包含敏感代码，请确认使用场景" : "代码安全",
      };
    },
    ["code_review", "vulnerability_assessment"]
  ),
];

export const COHERENCE_RULES: ValidationRule[] = [
  createRule(
    "coh-001",
    "Logical Flow",
    "Check for logical consistency and flow",
    "coherence",
    0.25,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];
      const sentences = content.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);

      let score = 1.0;

      if (sentences.length < 2) {
        return {
          passed: true,
          score: 1,
          issues: [],
          reasoning: "内容简短，逻辑流检查跳过",
        };
      }

      const contradictionPatterns = [
        /虽然.*但是.*不.*却|不是.*而是.*其实/g,
        /首先.*最后.*第一步/g,
      ];

      for (const pattern of contradictionPatterns) {
        if (pattern.test(content)) {
          issues.push({
            type: "warning",
            dimension: "coherence",
            description: "可能的逻辑矛盾",
            severity: 0.3,
          });
          score -= 0.2;
        }
      }

      return {
        passed: issues.length === 0,
        score: Math.max(score, 0),
        issues,
        reasoning: issues.length === 0 ? "逻辑流畅" : `发现${issues.length}处潜在逻辑问题`,
      };
    },
    ["security_analysis", "threat_report", "incident_response", "recommendation"]
  ),

  createRule(
    "coh-002",
    "Structure Quality",
    "Check for proper content structure",
    "coherence",
    0.2,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];
      let score = 1.0;

      const hasIntro = /^(根据|分析|关于|针对)/.test(content);
      const hasConclusion = /(综上|总结|建议|结论|因此)/.test(content);
      const hasList = /^[-*•]\s|^\d+\.\s/m.test(content);

      if (content.length > 500) {
        if (!hasIntro) {
          issues.push({
            type: "info",
            dimension: "coherence",
            description: "缺少引导性开头",
            severity: 0.1,
          });
          score -= 0.1;
        }
        if (!hasConclusion) {
          issues.push({
            type: "info",
            dimension: "coherence",
            description: "缺少总结性结尾",
            severity: 0.1,
          });
          score -= 0.1;
        }
        if (!hasList) {
          issues.push({
            type: "info",
            dimension: "coherence",
            description: "可考虑使用列表提高可读性",
            severity: 0.05,
          });
          score -= 0.05;
        }
      }

      return {
        passed: true,
        score: Math.max(score, 0.5),
        issues,
        reasoning: hasList || hasIntro || hasConclusion ? "结构良好" : "结构可优化",
      };
    },
    ["security_analysis", "threat_report", "recommendation"]
  ),
];

export const COMPLETENESS_RULES: ValidationRule[] = [
  createRule(
    "com-001",
    "Content Completeness",
    "Check if content is sufficiently complete",
    "completeness",
    0.2,
    (content: string, context?: ValidationContext): ValidationResult => {
      const issues: QualityIssue[] = [];
      const minLen = context?.minLength || 50;
      const maxLen = context?.maxLength || 10000;

      let score = 1.0;

      if (content.length < minLen) {
        issues.push({
          type: "warning",
          dimension: "completeness",
          description: `内容过短 (${content.length} < ${minLen})`,
          severity: 0.4,
        });
        score -= 0.3;
      }

      if (content.length > maxLen) {
        issues.push({
          type: "warning",
          dimension: "conciseness",
          description: `内容过长 (${content.length} > ${maxLen})`,
          severity: 0.2,
        });
        score -= 0.1;
      }

      if (content.endsWith("...") || content.endsWith("…")) {
        issues.push({
          type: "warning",
          dimension: "completeness",
          description: "内容可能被截断",
          severity: 0.3,
        });
        score -= 0.2;
      }

      return {
        passed: content.length >= minLen && !content.endsWith("..."),
        score: Math.max(score, 0),
        issues,
        reasoning: `内容长度: ${content.length}字符`,
      };
    },
    ["security_analysis", "threat_report", "vulnerability_assessment", "incident_response", "recommendation"]
  ),
];

export const CONCISENESS_RULES: ValidationRule[] = [
  createRule(
    "con-001",
    "Redundancy Check",
    "Check for redundant or repetitive content",
    "conciseness",
    0.15,
    (content: string): ValidationResult => {
      const issues: QualityIssue[] = [];
      const sentences = content.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);

      let score = 1.0;

      if (sentences.length > 3) {
        const uniqueSentences = new Set(
          sentences.map((s) => s.trim().toLowerCase())
        );
        const redundancyRatio =
          1 - uniqueSentences.size / sentences.length;

        if (redundancyRatio > 0.3) {
          issues.push({
            type: "info",
            dimension: "conciseness",
            description: `内容冗余度: ${(redundancyRatio * 100).toFixed(1)}%`,
            severity: 0.2,
            suggestion: "考虑精简重复内容",
          });
          score -= redundancyRatio * 0.5;
        }
      }

      return {
        passed: issues.length === 0,
        score: Math.max(score, 0.5),
        issues,
        reasoning: issues.length === 0 ? "内容简洁" : "存在冗余内容",
      };
    },
    ["security_analysis", "threat_report", "recommendation"]
  ),
];

export const ALL_RULES: ValidationRule[] = [
  ...ACCURACY_RULES,
  ...RELEVANCE_RULES,
  ...SAFETY_RULES,
  ...COHERENCE_RULES,
  ...COMPLETENESS_RULES,
  ...CONCISENESS_RULES,
];

export function getRulesForContentType(contentType: ContentType): ValidationRule[] {
  return ALL_RULES.filter(
    (rule) => rule.applicableTypes.length === 0 || rule.applicableTypes.includes(contentType)
  );
}
