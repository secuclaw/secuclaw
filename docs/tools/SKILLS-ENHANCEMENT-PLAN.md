# Skills System Enhancement Plan

> **Version:** 1.0.0  
> **Last Updated:** 2026-02-23  
> **Status:** Planning Phase

---

## Current State

### Existing Skills (10 defined)

| Skill | Status | Location |
|-------|--------|----------|
| secuclaw-commander | ✅ | `skills/secuclaw-commander/SKILL.md` |
| security-expert | ✅ | `skills/security-expert/SKILL.md` |
| security-architect | ✅ | `skills/security-architect/SKILL.md` |
| security-ops | ✅ | `skills/security-ops/SKILL.md` |
| threat-hunter | ✅ | `skills/threat-hunter/SKILL.md` |
| privacy-officer | ✅ | `skills/privacy-officer/SKILL.md` |
| ciso | ✅ | `skills/ciso/SKILL.md` |
| business-security-officer | ✅ | `skills/business-security-officer/SKILL.md` |
| supply-chain-security | ✅ | `skills/supply-chain-security/SKILL.md` |
| test-visualization-skill | ✅ | `skills/test-visualization-skill/SKILL.md` |

### Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| SKILL.md Format | ✅ Complete | Following Anthropic Agent Skill spec |
| Skill Loading | ✅ Complete | Dynamic loading from skills/ directory |
| Skill Registry | ✅ Complete | Registry with skill metadata |
| 4-Layer Architecture | ⚠️ Partial | No clear layer separation |
| SecuHub Marketplace | ❌ Not Started | Skill discovery/installation |
| Capability Evolver | ⚠️ Partial | patterns.json exists |
| Visualization Support | ✅ Complete | test-visualization-skill has visualizations |

---

## Phase 1: 4-Layer Architecture (Q2 2026)

### 1.1 Layer Definition

```
Priority Order (highest to lowest):

1. Workspace Layer   → <workspace>/.secuclaw/skills/
2. User Layer        → ~/.secuclaw/skills/
3. System Layer      → /usr/local/share/secuclaw/skills/ (or equivalent)
4. Bundled Layer     → <install>/skills/ (built-in, read-only)
```

### 1.2 Directory Structure

```
~/.secuclaw/
├── skills/
│   ├── installed/           # User-installed skills from SecuHub
│   │   ├── skill-a/
│   │   │   └── SKILL.md
│   │   └── skill-b/
│   │       └── SKILL.md
│   ├── custom/              # User-created skills
│   │   └── my-skill/
│   │       └── SKILL.md
│   └── config.json          # User skill configuration

<workspace>/.secuclaw/
├── skills/
│   └── project-skill/       # Project-specific skills
│       └── SKILL.md
└── config.json              # Workspace skill configuration

<install>/secuclaw/
└── skills/                  # Bundled skills (read-only)
    ├── secuclaw-commander/
    ├── security-expert/
    ├── security-architect/
    ├── security-ops/
    ├── threat-hunter/
    ├── privacy-officer/
    ├── ciso/
    ├── business-security-officer/
    └── supply-chain-security/
```

### 1.3 Skill Resolution Logic

```typescript
// packages/core/src/skills/resolver.ts

export interface SkillResolution {
  skill: Skill;
  source: 'workspace' | 'user' | 'system' | 'bundled';
  path: string;
}

export class SkillResolver {
  private resolutionOrder = [
    'workspace',  // Highest priority
    'user',
    'system',
    'bundled',    // Lowest priority
  ];

  resolve(skillId: string): SkillResolution | null {
    for (const layer of this.resolutionOrder) {
      const skill = this.loadFromLayer(skillId, layer);
      if (skill) {
        return {
          skill,
          source: layer,
          path: skill.path,
        };
      }
    }
    return null;
  }

  private loadFromLayer(skillId: string, layer: string): Skill | null {
    const paths = this.getLayerPaths(layer);
    for (const basePath of paths) {
      const skillPath = path.join(basePath, skillId, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        return this.parseSkill(skillPath);
      }
    }
    return null;
  }

  private getLayerPaths(layer: string): string[] {
    switch (layer) {
      case 'workspace':
        return [path.join(process.cwd(), '.secuclaw', 'skills')];
      case 'user':
        return [path.join(os.homedir(), '.secuclaw', 'skills', 'installed'),
                path.join(os.homedir(), '.secuclaw', 'skills', 'custom')];
      case 'system':
        return ['/usr/local/share/secuclaw/skills', 
                '/usr/share/secuclaw/skills'];
      case 'bundled':
        return [path.join(__dirname, '..', 'skills')];
      default:
        return [];
    }
  }
}
```

---

## Phase 2: SecuHub Marketplace (Q3 2026)

### 2.1 Marketplace API

```typescript
// packages/core/src/skills/marketplace.ts

export interface MarketplaceSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  categories: string[];
  visibility: 'public' | 'private';
}

export interface SecuHubClient {
  // Search skills
  search(query: string, options?: SearchOptions): Promise<MarketplaceSkill[]>;
  
  // Get skill details
  getSkill(skillId: string): Promise<MarketplaceSkill>;
  
  // Install skill
  install(skillId: string, version?: string): Promise<void>;
  
  // Uninstall skill
  uninstall(skillId: string): Promise<void>;
  
  // Update skill
  update(skillId: string): Promise<void>;
  
  // List installed skills
  listInstalled(): Promise<InstalledSkill[]>;
}
```

### 2.2 CLI Commands

```bash
# Search for skills
secuclaw skill search "threat hunting"

# Install a skill
secuclaw skill install skill-id

# Install specific version
secuclaw skill install skill-id@1.2.0

# Uninstall a skill
secuclaw skill uninstall skill-id

# Update a skill
secuclaw skill update skill-id

# Update all skills
secuclaw skill update --all

# List installed skills
secuclaw skill list

# List skills by layer
secuclaw skill list --layer user
secuclaw skill list --layer bundled

# Create a new skill
secuclaw skill create my-skill

# Validate a skill
secuclaw skill validate ./my-skill

# Publish a skill (requires auth)
secuclaw skill publish ./my-skill
```

### 2.3 Skill Manifest

```json
{
  "id": "threat-hunter-pro",
  "name": "Threat Hunter Pro",
  "version": "1.2.0",
  "description": "Advanced threat hunting capabilities",
  "author": "security-team",
  "license": "MIT",
  "repository": "https://github.com/example/threat-hunter-pro",
  "keywords": ["threat", "hunting", "security"],
  "categories": ["threat-intelligence", "security-operations"],
  "dependencies": {
    "secuclaw": ">=1.0.0",
    "skills": ["security-expert"]
  },
  "compatibleRoles": ["threat-hunter", "security-architect"],
  "entryPoint": "./SKILL.md"
}
```

---

## Phase 3: Capability Evolver (Q3-Q4 2026)

### 3.1 Self-Improvement Pipeline

```typescript
// packages/core/src/learning/evolver.ts

export interface EvolverConfig {
  enabled: boolean;
  autoGenerate: boolean;
  autoTest: boolean;
  minSuccessRate: number;    // Minimum success rate to promote skill
  maxSkillsPerMonth: number; // Rate limiting
}

export class CapabilityEvolver {
  // Analyze task patterns and identify gaps
  analyzePatterns(tasks: Task[]): SkillGap[];

  // Generate a new skill from patterns
  generateSkill(gap: SkillGap): GeneratedSkill;

  // Test generated skill against test cases
  testSkill(skill: GeneratedSkill): TestResult;

  // Promote skill to user layer if tests pass
  promoteSkill(skill: GeneratedSkill): void;

  // Iterate on skill based on feedback
  iterateSkill(skill: Skill, feedback: Feedback[]): Skill;
}
```

### 3.2 Skill Generation Template

```markdown
---
name: Auto-Generated Skill
version: 0.1.0-generated
generated: 2026-02-23
patterns:
  - pattern-1: "high frequency"
  - pattern-2: "medium frequency"
status: experimental
---

# Auto-Generated Skill

This skill was automatically generated based on observed patterns.

## Trigger Patterns

- Pattern 1: [description]
- Pattern 2: [description]

## Capabilities

### Capability 1

[Auto-generated capability description]

### Capability 2

[Auto-generated capability description]

## Feedback

Please provide feedback to improve this skill.
```

### 3.3 Learning Data Structure

```json
// data/learning/patterns.json
{
  "patterns": [
    {
      "id": "pattern-001",
      "type": "task_sequence",
      "frequency": 42,
      "success": 0.89,
      "context": "vulnerability assessment",
      "triggers": ["scan", "assess", "report"],
      "actions": ["vulnerability-scan", "risk-score", "generate-report"],
      "lastSeen": "2026-02-23T10:00:00Z"
    }
  ]
}
```

---

## Phase 4: Visualization Enhancement (Q4 2026)

### 4.1 Visualization Types

| Type | Use Case | File Format |
|------|----------|-------------|
| Heatmap | Risk distribution | JSON, YAML |
| Network Graph | Attack paths | YAML |
| Timeline | Incident timeline | JSON |
| TreeMap | Asset hierarchy | JSON |
| Sankey Diagram | Data flow | YAML |

### 4.2 Visualization Integration

```typescript
// Skill with visualization support
export interface VisualizationEnabledSkill extends Skill {
  visualizations: {
    id: string;
    type: 'heatmap' | 'network-graph' | 'timeline' | 'treemap' | 'sankey';
    trigger: string;  // When to show visualization
    dataPath: string; // Path to visualization data
    config?: Record<string, unknown>;
  }[];
}
```

---

## Implementation Timeline

| Phase | Tasks | Target | Effort |
|-------|-------|--------|--------|
| 1.1 | 4-Layer directory structure | Q2 2026 | 3 days |
| 1.2 | Skill resolver implementation | Q2 2026 | 2 days |
| 2.1 | SecuHub API client | Q3 2026 | 3 days |
| 2.2 | CLI skill commands | Q3 2026 | 2 days |
| 2.3 | Skill manifest support | Q3 2026 | 1 day |
| 3.1 | Pattern analyzer | Q3 2026 | 3 days |
| 3.2 | Skill generator | Q4 2026 | 5 days |
| 3.3 | Testing framework | Q4 2026 | 3 days |
| 4.1 | Visualization types | Q4 2026 | 2 days |
| 4.2 | Integration | Q4 2026 | 2 days |

**Total Effort: ~26 days**

---

## Metrics & KPIs

| Metric | Current | Target |
|--------|---------|--------|
| Skills Available | 10 | 20+ |
| Layer Coverage | 1 layer | 4 layers |
| Marketplace Skills | 0 | 50+ |
| Auto-generated Skills | 0 | 5/month |
| User Satisfaction | TBD | 90%+ |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skill conflicts | Medium | Layer priority + versioning |
| Malicious skills | High | Review process + sandboxing |
| Skill bloat | Low | Size limits + cleanup tools |
| API changes | Medium | Versioned API + deprecation policy |

---

*Next Review: 2026-03-01*
