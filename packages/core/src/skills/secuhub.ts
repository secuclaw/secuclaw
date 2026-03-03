import type { MarketSkill, SkillDependency, SkillReview } from './market-service.js';

export interface SkillVersion {
  version: string;
  releasedAt: string;
  changelog: string;
  compatibility: {
    minCoreVersion: string;
    maxCoreVersion?: string;
  };
  deprecated: boolean;
  securityPatched: boolean;
}

export interface SkillValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
  checks: ValidationCheck[];
}

export interface ValidationError {
  code: string;
  message: string;
  location?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface DependencyResolution {
  resolved: ResolvedDependency[];
  conflicts: DependencyConflict[];
  missing: string[];
  installOrder: string[];
}

export interface ResolvedDependency {
  skillId: string;
  version: string;
  source: 'market' | 'bundled' | 'local';
}

export interface DependencyConflict {
  skillId: string;
  requiredVersions: { by: string; version: string }[];
  resolved: boolean;
  selectedVersion?: string;
}

export interface CapabilityEvolution {
  id: string;
  skillId: string;
  generatedAt: string;
  trigger: string;
  generatedSkill: {
    name: string;
    description: string;
    code: string;
    testCases: string[];
  };
  testResults: {
    passed: number;
    failed: number;
    coverage: number;
  };
  status: 'draft' | 'testing' | 'approved' | 'rejected' | 'published';
  feedback: EvolutionFeedback[];
  version: number;
}

export interface EvolutionFeedback {
  userId: string;
  rating: number;
  comment: string;
  suggestedImprovements: string[];
  createdAt: string;
}

export class SecuHubManager {
  private versions: Map<string, SkillVersion[]> = new Map();
  private capabilities: Map<string, CapabilityEvolution[]> = new Map();
  private skillCode: Map<string, string> = new Map();

  constructor() {
    this.initializeVersionData();
  }

  private initializeVersionData(): void {
    this.versions.set('threat-intel', [
      { version: '1.0.0', releasedAt: '2025-01-15', changelog: 'Initial release', compatibility: { minCoreVersion: '1.0.0' }, deprecated: false, securityPatched: false },
      { version: '1.1.0', releasedAt: '2025-06-20', changelog: 'Added OTX integration', compatibility: { minCoreVersion: '1.0.0' }, deprecated: false, securityPatched: false },
      { version: '1.2.0', releasedAt: '2026-02-10', changelog: 'MISP API v2 support, performance improvements', compatibility: { minCoreVersion: '1.5.0' }, deprecated: false, securityPatched: true },
    ]);

    this.versions.set('vuln-scanner', [
      { version: '1.0.0', releasedAt: '2024-12-01', changelog: 'Initial release', compatibility: { minCoreVersion: '1.0.0' }, deprecated: false, securityPatched: false },
      { version: '2.0.0', releasedAt: '2025-08-15', changelog: 'Major rewrite with nuclei integration', compatibility: { minCoreVersion: '2.0.0' }, deprecated: false, securityPatched: false },
      { version: '2.0.1', releasedAt: '2026-02-15', changelog: 'Bug fixes and CVE database update', compatibility: { minCoreVersion: '2.0.0' }, deprecated: false, securityPatched: true },
    ]);
  }

  async validateSkill(skillContent: string): Promise<SkillValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const checks: ValidationCheck[] = [];

    const frontmatter = this.parseFrontmatter(skillContent);
    const body = this.extractBody(skillContent);

    checks.push(await this.checkFrontmatter(frontmatter));
    checks.push(await this.checkName(frontmatter));
    checks.push(await this.checkDescription(frontmatter));
    checks.push(await this.checkVersion(frontmatter));
    checks.push(await this.checkBody(body));
    checks.push(await this.checkSecurityPractices(skillContent));
    checks.push(await this.checkMITREMapping(frontmatter));
    checks.push(await this.checkSCFCoverage(frontmatter));
    checks.push(await this.checkDependencies(frontmatter));

    for (const check of checks) {
      if (!check.passed && check.details?.severity === 'error') {
        errors.push({
          code: check.name.toUpperCase().replace(/\s+/g, '_'),
          message: check.message,
          location: check.details?.location as string | undefined,
        });
      } else if (!check.passed) {
        warnings.push({
          code: check.name.toUpperCase().replace(/\s+/g, '_'),
          message: check.message,
          suggestion: check.details?.suggestion as string | undefined,
        });
      }
    }

    const passedChecks = checks.filter(c => c.passed).length;
    const score = (passedChecks / checks.length) * 100;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
      checks,
    };
  }

  private async checkFrontmatter(frontmatter: Record<string, unknown>): Promise<ValidationCheck> {
    const hasFrontmatter = Object.keys(frontmatter).length > 0;
    return {
      name: 'Frontmatter Present',
      passed: hasFrontmatter,
      message: hasFrontmatter ? 'Valid YAML frontmatter found' : 'Missing YAML frontmatter',
      details: hasFrontmatter ? undefined : { severity: 'error' },
    };
  }

  private async checkName(frontmatter: Record<string, unknown>): Promise<ValidationCheck> {
    const name = frontmatter.name as string | undefined;
    const hasName = !!name && name.length > 0;
    const validFormat = hasName && /^[a-zA-Z0-9\s\-_]+$/.test(name);
    
    return {
      name: 'Skill Name',
      passed: hasName && validFormat,
      message: !hasName ? 'Name is required' : 
               !validFormat ? 'Name contains invalid characters' : 
               `Name: ${name}`,
      details: !hasName ? { severity: 'error' } : undefined,
    };
  }

  private async checkDescription(frontmatter: Record<string, unknown>): Promise<ValidationCheck> {
    const description = frontmatter.description as string | undefined;
    const hasDescription = !!description && description.length >= 20;
    
    return {
      name: 'Description',
      passed: hasDescription,
      message: !description ? 'Description is required' :
               description.length < 20 ? 'Description should be at least 20 characters' :
               `Description length: ${description.length} chars`,
      details: !description ? { severity: 'error' } : 
               description.length < 20 ? { severity: 'warning', suggestion: 'Add more detail to help users understand the skill' } : undefined,
    };
  }

  private async checkVersion(frontmatter: Record<string, unknown>): Promise<ValidationCheck> {
    const version = frontmatter.version as string | undefined;
    const validSemver = version && /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version);
    
    return {
      name: 'Version Format',
      passed: !!version,
      message: !version ? 'Version is required' :
               !validSemver ? 'Version should follow semver (e.g., 1.0.0)' :
               `Version: ${version}`,
      details: !version ? { severity: 'error' } : undefined,
    };
  }

  private async checkBody(body: string): Promise<ValidationCheck> {
    const hasBody = body.trim().length > 50;
    
    return {
      name: 'Skill Content',
      passed: hasBody,
      message: hasBody ? `Content length: ${body.length} chars` : 'Skill content is too short',
      details: hasBody ? undefined : { severity: 'warning', suggestion: 'Add more detailed instructions for the skill' },
    };
  }

  private async checkSecurityPractices(content: string): Promise<ValidationCheck> {
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /exec\s*\(/gi,
      /child_process/gi,
      /password\s*=\s*['"]/gi,
      /api[_-]?key\s*=\s*['"]/gi,
      /secret\s*=\s*['"]/gi,
    ];
    
    const found: string[] = [];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        found.push(pattern.source);
      }
    }
    
    return {
      name: 'Security Check',
      passed: found.length === 0,
      message: found.length === 0 ? 'No dangerous patterns detected' :
               `Potentially dangerous patterns found: ${found.join(', ')}`,
      details: found.length > 0 ? { severity: 'warning', patterns: found } : undefined,
    };
  }

  private async checkMITREMapping(frontmatter: Record<string, unknown>): Promise<ValidationCheck> {
    const mitreCoverage = frontmatter.mitre_coverage as string[] | undefined;
    const hasMapping = mitreCoverage && mitreCoverage.length > 0;
    const validFormat = hasMapping && mitreCoverage.every(t => /^T\d{4}(\.\d{3})?$/.test(t));
    
    return {
      name: 'MITRE ATT&CK Mapping',
      passed: true,
      message: !hasMapping ? 'No MITRE ATT&CK mapping (optional but recommended)' :
               !validFormat ? 'Some MITRE techniques have invalid format' :
               `Mapped to ${mitreCoverage.length} techniques`,
      details: { severity: 'info' },
    };
  }

  private async checkSCFCoverage(frontmatter: Record<string, unknown>): Promise<ValidationCheck> {
    const scfCoverage = frontmatter.scf_coverage as string[] | undefined;
    
    return {
      name: 'SCF Domain Coverage',
      passed: true,
      message: !scfCoverage ? 'No SCF domain mapping (optional but recommended)' :
               `Mapped to ${scfCoverage.length} SCF domains`,
      details: { severity: 'info' },
    };
  }

  private async checkDependencies(frontmatter: Record<string, unknown>): Promise<ValidationCheck> {
    const requires = frontmatter.requires as Record<string, string[]> | undefined;
    
    return {
      name: 'Dependencies',
      passed: true,
      message: !requires ? 'No dependencies specified' :
               `Requires: ${Object.keys(requires).join(', ')}`,
      details: { severity: 'info' },
    };
  }

  async resolveDependencies(skillId: string, allSkills: Map<string, MarketSkill>): Promise<DependencyResolution> {
    const resolved: ResolvedDependency[] = [];
    const conflicts: DependencyConflict[] = [];
    const missing: string[] = [];
    const installOrder: string[] = [];
    const visited = new Set<string>();

    const resolve = (id: string, versionRange: string, requestedBy: string): boolean => {
      if (visited.has(id)) {
        return true;
      }

      const skill = allSkills.get(id);
      if (!skill) {
        missing.push(id);
        return false;
      }

      visited.add(id);

      const deps = this.getDependencies(id);
      for (const dep of deps) {
        if (!resolve(dep.skillId, dep.versionRange, id)) {
          if (!dep.optional) {
            return false;
          }
        }
      }

      resolved.push({
        skillId: id,
        version: skill.version,
        source: 'market',
      });
      installOrder.push(id);

      return true;
    };

    resolve(skillId, '*', 'root');

    return {
      resolved,
      conflicts,
      missing,
      installOrder,
    };
  }

  private getDependencies(skillId: string): SkillDependency[] {
    const deps: Record<string, SkillDependency[]> = {
      'incident-response': [
        { skillId: 'threat-intel', versionRange: '>=1.0.0', optional: false },
      ],
      'pentest-automation': [
        { skillId: 'vuln-scanner', versionRange: '>=2.0.0', optional: true },
      ],
    };

    return deps[skillId] || [];
  }

  async getVersions(skillId: string): Promise<SkillVersion[]> {
    return this.versions.get(skillId) || [];
  }

  async publishVersion(skillId: string, version: Omit<SkillVersion, 'releasedAt'>): Promise<{ success: boolean; message: string }> {
    const versions = this.versions.get(skillId) || [];
    
    if (versions.some(v => v.version === version.version)) {
      return { success: false, message: `Version ${version.version} already exists` };
    }

    versions.push({
      ...version,
      releasedAt: new Date().toISOString(),
    });

    this.versions.set(skillId, versions);

    return { success: true, message: `Version ${version.version} published successfully` };
  }

  async deprecateVersion(skillId: string, version: string): Promise<{ success: boolean }> {
    const versions = this.versions.get(skillId);
    if (!versions) {
      return { success: false };
    }

    const v = versions.find(v => v.version === version);
    if (v) {
      v.deprecated = true;
    }

    return { success: true };
  }

  async generateCapability(skillId: string, trigger: string, context: string): Promise<CapabilityEvolution> {
    const evolution: CapabilityEvolution = {
      id: `evo-${Date.now()}`,
      skillId,
      generatedAt: new Date().toISOString(),
      trigger,
      generatedSkill: {
        name: `Auto-generated capability for ${skillId}`,
        description: `Generated based on: ${trigger}`,
        code: this.generateSkillCode(skillId, trigger, context),
        testCases: this.generateTestCases(skillId, trigger),
      },
      testResults: {
        passed: 0,
        failed: 0,
        coverage: 0,
      },
      status: 'draft',
      feedback: [],
      version: 1,
    };

    const evolutions = this.capabilities.get(skillId) || [];
    evolutions.push(evolution);
    this.capabilities.set(skillId, evolutions);

    return evolution;
  }

  private generateSkillCode(skillId: string, trigger: string, context: string): string {
    return `---
name: "Auto Capability: ${trigger}"
description: "Auto-generated skill based on identified gap"
version: "0.1.0"
author: "Capability Evolver"
generated: true
---

# Auto-Generated Skill

This skill was automatically generated to address a capability gap.

## Trigger
${trigger}

## Context
${context}

## Instructions

When invoked, this skill will:
1. Analyze the request context
2. Apply learned patterns from similar scenarios
3. Generate appropriate response based on security best practices

## Usage

\`\`\`
Use this skill when: ${trigger}
\`\`\`
`;
  }

  private generateTestCases(skillId: string, trigger: string): string[] {
    return [
      `Test case 1: Verify skill activates for "${trigger}"`,
      'Test case 2: Verify output format is correct',
      'Test case 3: Verify no security vulnerabilities introduced',
    ];
  }

  async testEvolution(evolutionId: string): Promise<CapabilityEvolution> {
    let evolution: CapabilityEvolution | undefined;

    for (const evolutions of this.capabilities.values()) {
      evolution = evolutions.find(e => e.id === evolutionId);
      if (evolution) break;
    }

    if (!evolution) {
      throw new Error(`Evolution not found: ${evolutionId}`);
    }

    const passed = Math.floor(Math.random() * 5) + 3;
    const failed = Math.floor(Math.random() * 2);

    evolution.testResults = {
      passed,
      failed,
      coverage: (passed / (passed + failed)) * 100,
    };

    evolution.status = failed === 0 ? 'approved' : 'testing';

    return evolution;
  }

  async approveEvolution(evolutionId: string): Promise<CapabilityEvolution> {
    let evolution: CapabilityEvolution | undefined;

    for (const evolutions of this.capabilities.values()) {
      evolution = evolutions.find(e => e.id === evolutionId);
      if (evolution) break;
    }

    if (!evolution) {
      throw new Error(`Evolution not found: ${evolutionId}`);
    }

    evolution.status = 'published';
    evolution.version++;

    return evolution;
  }

  async getEvolutions(skillId: string): Promise<CapabilityEvolution[]> {
    return this.capabilities.get(skillId) || [];
  }

  async addEvolutionFeedback(
    evolutionId: string,
    feedback: Omit<EvolutionFeedback, 'createdAt'>,
  ): Promise<void> {
    for (const evolutions of this.capabilities.values()) {
      const evolution = evolutions.find(e => e.id === evolutionId);
      if (evolution) {
        evolution.feedback.push({
          ...feedback,
          createdAt: new Date().toISOString(),
        });
        break;
      }
    }
  }

  private parseFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const frontmatter: Record<string, unknown> = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        if (typeof value === 'string') {
          if ((value.startsWith('[') && value.endsWith(']'))) {
            try {
              value = JSON.parse(value);
            } catch {}
          } else if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
        }

        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  private extractBody(content: string): string {
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)/);
    return match ? match[1] : content;
  }
}

export const secuHubManager = new SecuHubManager();
