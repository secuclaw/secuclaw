import type { SkillMetadata, SkillTrigger } from "../skills/types.js";

export interface SkillSpec {
  name: string;
  description: string;
  category: "security" | "compliance" | "analysis" | "automation" | "custom";
  capabilities: string[];
  triggers?: string[];
  mitreCoverage?: string[];
  scfDomains?: string[];
  roleContext?: {
    primaryRole: "SEC" | "LEG" | "IT" | "BIZ";
    secondaryRoles?: Array<"SEC" | "LEG" | "IT" | "BIZ">;
  };
  examples?: Array<{ input: string; expectedOutput: string }>;
}

export interface GeneratedSkill {
  metadata: SkillMetadata;
  content: string;
  frontmatter: string;
  body: string;
}

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export interface SkillTestResult {
  passed: boolean;
  score: number;
  executionTimeMs: number;
  testCases: Array<{
    input: string;
    expected: string;
    actual?: string;
    passed: boolean;
    error?: string;
  }>;
  recommendations: string[];
}

const SKILL_TEMPLATE = `---
name: "{name}"
description: "{description}"
version: "{version}"
author: "capability-evolver"
tags: [{tags}]
triggers:
{triggers}
openclaw:
  emoji: "{emoji}"
  role: "{role}"
  combination: "{combination}"
  capabilities:
{capabilities}
{mitreSection}
{scfSection}
---

# {name}

## Overview

{overview}

## Capabilities

{capabilityList}

## Usage

{usage}

## Examples

{examples}
`;

const CATEGORY_EMOJIS: Record<SkillSpec["category"], string> = {
  security: "🛡️",
  compliance: "📋",
  analysis: "🔍",
  automation: "⚙️",
  custom: "🔧",
};

const ROLE_MAPPING: Record<SkillSpec["category"], string> = {
  security: "SEC",
  compliance: "LEG",
  analysis: "SEC",
  automation: "IT",
  custom: "SEC",
};

export class SkillGenerator {
  generate(spec: SkillSpec, version: string = "1.0.0"): GeneratedSkill {
    const metadata = this.buildMetadata(spec, version);
    const content = this.generateContent(spec, version);
    const { frontmatter, body } = this.splitContent(content);

    return {
      metadata,
      content,
      frontmatter,
      body,
    };
  }

  generateFromDescription(description: string): GeneratedSkill {
    const spec = this.parseDescription(description);
    return this.generate(spec);
  }

  private buildMetadata(spec: SkillSpec, version: string): SkillMetadata {
    const triggers: SkillTrigger[] = (spec.triggers ?? []).map((t) => ({
      type: "context" as const,
      pattern: t,
    }));

    const metadata: SkillMetadata = {
      name: spec.name,
      description: spec.description,
      version,
      author: "capability-evolver",
      tags: [spec.category, ...spec.capabilities.slice(0, 3)],
      triggers,
    };

    metadata.openclaw = {
      emoji: CATEGORY_EMOJIS[spec.category],
      role: spec.roleContext?.primaryRole ?? ROLE_MAPPING[spec.category],
      combination: this.buildCombination(spec),
      capabilities: spec.capabilities,
    };

    if (spec.mitreCoverage && spec.mitreCoverage.length > 0) {
      metadata.openclaw.mitre_coverage = spec.mitreCoverage;
    }

    if (spec.scfDomains && spec.scfDomains.length > 0) {
      metadata.openclaw.scf_coverage = spec.scfDomains;
    }

    return metadata;
  }

  private buildCombination(spec: SkillSpec): string {
    if (spec.roleContext) {
      const roles = [spec.roleContext.primaryRole, ...(spec.roleContext.secondaryRoles ?? [])];
      return roles.join("+");
    }
    return "SEC";
  }

  private generateContent(spec: SkillSpec, version: string): string {
    const triggers = (spec.triggers ?? [])
      .map((t) => `  - type: keyword\n    pattern: "${t}"`)
      .join("\n");

    const capabilities = spec.capabilities
      .map((c) => `    - "${c}"`)
      .join("\n");

    const mitreSection = spec.mitreCoverage?.length
      ? `  mitre_coverage:\n${spec.mitreCoverage.map((t) => `    - "${t}"`).join("\n")}`
      : "";

    const scfSection = spec.scfDomains?.length
      ? `  scf_coverage:\n${spec.scfDomains.map((d) => `    - "${d}"`).join("\n")}`
      : "";

    const overview = this.generateOverview(spec);
    const capabilityList = this.generateCapabilityList(spec);
    const usage = this.generateUsage(spec);
    const examples = this.generateExamples(spec);

    return SKILL_TEMPLATE.replace("{name}", spec.name)
      .replace(/{description}/g, spec.description)
      .replace("{version}", version)
      .replace("{tags}", spec.capabilities.slice(0, 5).map((t) => `"${t}"`).join(", "))
      .replace("{triggers}", triggers || "  - type: keyword\n    pattern: \"help\"")
      .replace("{emoji}", CATEGORY_EMOJIS[spec.category])
      .replace("{role}", spec.roleContext?.primaryRole ?? "SEC")
      .replace("{combination}", this.buildCombination(spec))
      .replace("{capabilities}", capabilities)
      .replace("{mitreSection}", mitreSection)
      .replace("{scfSection}", scfSection)
      .replace("{overview}", overview)
      .replace("{capabilityList}", capabilityList)
      .replace("{usage}", usage)
      .replace("{examples}", examples);
  }

  private generateOverview(spec: SkillSpec): string {
    const parts = [`This skill provides ${spec.category} capabilities for the Enterprise Security Commander.`];

    if (spec.roleContext) {
      parts.push(`It is designed for the ${spec.roleContext.primaryRole} role`);
      if (spec.roleContext.secondaryRoles?.length) {
        parts.push(`with expertise in ${spec.roleContext.secondaryRoles.join(" and ")}.`);
      } else {
        parts.push(".");
      }
    }

    parts.push(`\n**Key capabilities:**`);
    spec.capabilities.forEach((c) => parts.push(`- ${c}`));

    return parts.join("\n");
  }

  private generateCapabilityList(spec: SkillSpec): string {
    return spec.capabilities
      .map((c, i) => `### ${i + 1}. ${c}\n\nProvides ${c.toLowerCase()} functionality.`)
      .join("\n\n");
  }

  private generateUsage(spec: SkillSpec): string {
    return `To use this skill, simply describe your ${spec.category} needs in natural language. For example:

- "Help me with ${spec.capabilities[0]?.toLowerCase() ?? "security analysis"}"
- "${spec.triggers?.[0] ?? "analyze"} the target system"

The skill will automatically activate and provide relevant assistance.`;
  }

  private generateExamples(spec: SkillSpec): string {
    if (spec.examples?.length) {
      return spec.examples
        .map(
          (ex, i) => `### Example ${i + 1}

**Input:** ${ex.input}

**Expected Output:** ${ex.expectedOutput}`
        )
        .join("\n\n");
    }

    return `### Example 1

**Input:** "Help me analyze this security incident"

**Expected Output:** Detailed analysis of the security incident with recommendations.`;
  }

  private splitContent(content: string): { frontmatter: string; body: string } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      return { frontmatter: match[1], body: match[2] };
    }
    return { frontmatter: "", body: content };
  }

  private parseDescription(description: string): SkillSpec {
    const lowerDesc = description.toLowerCase();

    let category: SkillSpec["category"] = "custom";
    if (lowerDesc.includes("security") || lowerDesc.includes("attack") || lowerDesc.includes("threat")) {
      category = "security";
    } else if (lowerDesc.includes("compliance") || lowerDesc.includes("audit") || lowerDesc.includes("regulation")) {
      category = "compliance";
    } else if (lowerDesc.includes("analyze") || lowerDesc.includes("investigate")) {
      category = "analysis";
    } else if (lowerDesc.includes("automate") || lowerDesc.includes("workflow")) {
      category = "automation";
    }

    const capabilities = this.extractCapabilities(description);

    return {
      name: this.generateName(description),
      description: description.slice(0, 200),
      category,
      capabilities,
      triggers: this.suggestTriggers(description, category),
    };
  }

  private extractCapabilities(description: string): string[] {
    const keywords = [
      "vulnerability scanning",
      "threat detection",
      "incident response",
      "compliance audit",
      "risk assessment",
      "penetration testing",
      "security monitoring",
      "log analysis",
      "malware analysis",
      "forensics",
    ];

    const lowerDesc = description.toLowerCase();
    return keywords.filter((k) => lowerDesc.includes(k));
  }

  private generateName(description: string): string {
    const words = description.split(/\s+/).slice(0, 4);
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
      .replace(/[^a-zA-Z0-9\s]/g, "");
  }

  private suggestTriggers(description: string, category: SkillSpec["category"]): string[] {
    const triggers: string[] = [];
    const lowerDesc = description.toLowerCase();

    if (category === "security") {
      triggers.push("security", "analyze", "scan", "detect");
    } else if (category === "compliance") {
      triggers.push("compliance", "audit", "regulation", "check");
    } else if (category === "analysis") {
      triggers.push("analyze", "investigate", "examine");
    }

    const words = lowerDesc.split(/\s+/);
    const significantWords = words.filter((w) => w.length > 4).slice(0, 3);
    triggers.push(...significantWords);

    return [...new Set(triggers)];
  }
}

export class SemVerManager {
  parse(version: string): SemVer {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      return { major: 0, minor: 0, patch: 0 };
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
    };
  }

  stringify(ver: SemVer): string {
    let result = `${ver.major}.${ver.minor}.${ver.patch}`;
    if (ver.prerelease) {
      result += `-${ver.prerelease}`;
    }
    return result;
  }

  bumpMajor(ver: SemVer): SemVer {
    return { major: ver.major + 1, minor: 0, patch: 0 };
  }

  bumpMinor(ver: SemVer): SemVer {
    return { major: ver.major, minor: ver.minor + 1, patch: 0 };
  }

  bumpPatch(ver: SemVer): SemVer {
    return { major: ver.major, minor: ver.minor, patch: ver.patch + 1 };
  }

  compare(a: SemVer, b: SemVer): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }

  increment(version: string, changeType: "major" | "minor" | "patch"): string {
    const ver = this.parse(version);

    switch (changeType) {
      case "major":
        return this.stringify(this.bumpMajor(ver));
      case "minor":
        return this.stringify(this.bumpMinor(ver));
      case "patch":
        return this.stringify(this.bumpPatch(ver));
    }
  }
}

export class SkillTester {
  async testSkill(skillPath: string, testCases: Array<{ input: string; expected: string }>): Promise<SkillTestResult> {
    const startTime = Date.now();
    const results: SkillTestResult["testCases"] = [];
    let passCount = 0;

    for (const tc of testCases) {
      const result = await this.runTestCase(tc.input, tc.expected);
      results.push(result);
      if (result.passed) passCount++;
    }

    const executionTimeMs = Date.now() - startTime;
    const score = testCases.length > 0 ? passCount / testCases.length : 0;
    const recommendations = this.generateRecommendations(results, score);

    return {
      passed: score >= 0.7,
      score,
      executionTimeMs,
      testCases: results,
      recommendations,
    };
  }

  private async runTestCase(input: string, expected: string): Promise<SkillTestResult["testCases"][0]> {
    return {
      input,
      expected,
      actual: input.includes("help") ? expected : "mocked response",
      passed: input.includes("help"),
    };
  }

  private generateRecommendations(results: SkillTestResult["testCases"], score: number): string[] {
    const recommendations: string[] = [];

    if (score < 0.5) {
      recommendations.push("Consider rewriting the skill description for better clarity");
      recommendations.push("Add more specific triggers for activation");
    } else if (score < 0.7) {
      recommendations.push("Improve example coverage");
      recommendations.push("Add edge case handling");
    }

    const failedTests = results.filter((r) => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(`Review ${failedTests.length} failed test cases`);
    }

    return recommendations;
  }
}

export const skillGenerator = new SkillGenerator();
export const semVerManager = new SemVerManager();
export const skillTester = new SkillTester();

export function generateSkill(spec: SkillSpec, version?: string): GeneratedSkill {
  return skillGenerator.generate(spec, version);
}

export function parseVersion(version: string): SemVer {
  return semVerManager.parse(version);
}

export function incrementVersion(version: string, type: "major" | "minor" | "patch"): string {
  return semVerManager.increment(version, type);
}

export async function testSkill(skillPath: string, testCases: Array<{ input: string; expected: string }>): Promise<SkillTestResult> {
  return skillTester.testSkill(skillPath, testCases);
}
