export interface SkillFrontmatter {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  triggers?: string[];
  tools?: string[];
  layer?: 'bundled' | 'managed' | 'workspace' | 'plugin';
  priority?: number;
  examples?: SkillExample[];
  metadata?: Record<string, unknown>;
}

export interface SkillExample {
  input: string;
  output: string;
  context?: string;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  content: string;
  rawContent: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillLoaderConfig {
  skillsDir: string;
  watchForChanges: boolean;
  validateOnLoad: boolean;
}

export const DEFAULT_SKILL_LOADER_CONFIG: Partial<SkillLoaderConfig> = {
  watchForChanges: false,
  validateOnLoad: true,
};

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n/;
const YAML_BOOLEAN_PATTERN = /^(true|false|yes|no)$/i;
const YAML_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const YAML_QUOTED_STRING_PATTERN = /^["'](.*)["']$/;
const YAML_LIST_PATTERN = /^\s*[-*]\s+/;

export function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; remaining: string } {
  const match = content.match(FRONTMATTER_PATTERN);
  
  if (!match) {
    return {
      frontmatter: {
        name: 'Unnamed Skill',
        description: '',
        triggers: [],
        tools: [],
      },
      remaining: content,
    };
  }

  const yamlContent = match[1];
  const remaining = content.slice(match[0].length);
  const frontmatter = parseYamlFrontmatter(yamlContent);

  return { frontmatter, remaining };
}

function parseYamlFrontmatter(yaml: string): SkillFrontmatter {
  const result: Partial<SkillFrontmatter> = {};
  const lines = yaml.split('\n');
  let currentKey = '';
  let currentValue: unknown[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) continue;

    if (YAML_LIST_PATTERN.test(trimmed)) {
      const value = trimmed.replace(YAML_LIST_PATTERN, '').trim();
      
      if (!inList) {
        inList = true;
        currentValue = [];
      }
      
      currentValue.push(parseYamlValue(value));
      continue;
    }

    if (inList && currentKey) {
      (result as Record<string, unknown>)[currentKey] = currentValue;
      currentKey = '';
      currentValue = [];
      inList = false;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (!value) {
      currentKey = key;
      inList = false;
      continue;
    }

    (result as Record<string, unknown>)[key] = parseYamlValue(value);
  }

  if (inList && currentKey) {
    (result as Record<string, unknown>)[currentKey] = currentValue;
  }

  return normalizeFrontmatter(result);
}

function parseYamlValue(value: string): unknown {
  if (YAML_BOOLEAN_PATTERN.test(value)) {
    return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
  }

  if (YAML_NUMBER_PATTERN.test(value)) {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  }

  const quotedMatch = value.match(YAML_QUOTED_STRING_PATTERN);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map(v => parseYamlValue(v.trim()));
  }

  return value;
}

function normalizeFrontmatter(raw: Record<string, unknown>): SkillFrontmatter {
  return {
    name: String(raw.name ?? 'Unnamed Skill'),
    description: String(raw.description ?? ''),
    version: raw.version ? String(raw.version) : undefined,
    author: raw.author ? String(raw.author) : undefined,
    triggers: normalizeStringArray(raw.triggers ?? []),
    tools: normalizeStringArray(raw.tools ?? []),
    layer: normalizeLayer(raw.layer),
    priority: typeof raw.priority === 'number' ? raw.priority : undefined,
    examples: normalizeExamples(raw.examples),
    metadata: typeof raw.metadata === 'object' ? raw.metadata as Record<string, unknown> : undefined,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(v => String(v));
  }
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeLayer(value: unknown): 'bundled' | 'managed' | 'workspace' | 'plugin' {
  const layer = String(value).toLowerCase();
  if (['bundled', 'managed', 'workspace', 'plugin'].includes(layer)) {
    return layer as 'bundled' | 'managed' | 'workspace' | 'plugin';
  }
  return 'managed';
}

function normalizeExamples(value: unknown): SkillExample[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value.map(ex => {
    if (typeof ex === 'object' && ex !== null) {
      return {
        input: String((ex as Record<string, unknown>).input ?? ''),
        output: String((ex as Record<string, unknown>).output ?? ''),
        context: (ex as Record<string, unknown>).context ? String((ex as Record<string, unknown>).context) : undefined,
      };
    }
    return { input: '', output: '' };
  }).filter(ex => ex.input || ex.output);
}

export function parseSkillMd(content: string, source: string = 'unknown'): ParsedSkill {
  const { frontmatter, remaining } = parseFrontmatter(content);

  return {
    frontmatter,
    content: remaining.trim(),
    rawContent: content,
    source,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function validateSkill(skill: ParsedSkill): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!skill.frontmatter.name || skill.frontmatter.name === 'Unnamed Skill') {
    errors.push('Skill name is required');
  }

  if (!skill.frontmatter.description) {
    errors.push('Skill description is recommended');
  }

  if (!skill.frontmatter.triggers || skill.frontmatter.triggers.length === 0) {
    errors.push('Skill triggers are recommended for activation');
  }

  if (!skill.content || skill.content.length < 50) {
    errors.push('Skill content should be at least 50 characters');
  }

  if (skill.frontmatter.examples) {
    for (let i = 0; i < skill.frontmatter.examples.length; i++) {
      const ex = skill.frontmatter.examples[i];
      if (!ex.input) {
        errors.push(`Example ${i + 1} is missing input`);
      }
      if (!ex.output) {
        errors.push(`Example ${i + 1} is missing output`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateSkillMd(skill: Partial<SkillFrontmatter> & { content: string }): string {
  const frontmatter: Record<string, unknown> = {
    name: skill.name ?? 'New Skill',
  };

  if (skill.description) frontmatter.description = skill.description;
  if (skill.version) frontmatter.version = skill.version;
  if (skill.author) frontmatter.author = skill.author;
  if (skill.triggers && skill.triggers.length > 0) frontmatter.triggers = skill.triggers;
  if (skill.tools && skill.tools.length > 0) frontmatter.tools = skill.tools;
  if (skill.layer) frontmatter.layer = skill.layer;
  if (skill.priority !== undefined) frontmatter.priority = skill.priority;
  if (skill.examples && skill.examples.length > 0) frontmatter.examples = skill.examples;

  const yamlLines: string[] = ['---'];
  
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      yamlLines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          yamlLines.push(`  - input: "${(item as SkillExample).input ?? ''}"`);
          yamlLines.push(`    output: "${(item as SkillExample).output ?? ''}"`);
        } else {
          yamlLines.push(`  - ${item}`);
        }
      }
    } else if (typeof value === 'string') {
      yamlLines.push(`${key}: "${value}"`);
    } else {
      yamlLines.push(`${key}: ${value}`);
    }
  }

  yamlLines.push('---');
  yamlLines.push('');

  return yamlLines.join('\n') + (skill.content ?? '');
}

export class SkillMdLoader {
  private skills: Map<string, ParsedSkill> = new Map();
  private config: SkillLoaderConfig;

  constructor(config: Partial<SkillLoaderConfig> = {}) {
    this.config = { ...DEFAULT_SKILL_LOADER_CONFIG, ...config } as SkillLoaderConfig;
  }

  load(content: string, source: string): ParsedSkill | null {
    const skill = parseSkillMd(content, source);

    if (this.config.validateOnLoad) {
      const { valid, errors } = validateSkill(skill);
      if (!valid) {
        console.warn(`Skill validation warnings for ${source}:`, errors);
      }
    }

    this.skills.set(skill.frontmatter.name, skill);
    return skill;
  }

  get(name: string): ParsedSkill | undefined {
    return this.skills.get(name);
  }

  list(): ParsedSkill[] {
    return Array.from(this.skills.values());
  }

  findMatchingSkills(input: string): ParsedSkill[] {
    const lowerInput = input.toLowerCase();
    const matches: Array<{ skill: ParsedSkill; score: number }> = [];

    for (const skill of this.skills.values()) {
      let score = 0;

      for (const trigger of skill.frontmatter.triggers ?? []) {
        const lowerTrigger = trigger.toLowerCase();
        
        if (lowerInput.includes(lowerTrigger)) {
          score += 10;
        }
        
        const triggerWords = lowerTrigger.split(/\s+/);
        for (const word of triggerWords) {
          if (lowerInput.includes(word)) {
            score += 2;
          }
        }
      }

      if (score > 0) {
        matches.push({ skill, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .map(m => m.skill);
  }

  unload(name: string): boolean {
    return this.skills.delete(name);
  }

  clear(): void {
    this.skills.clear();
  }
}

export function createSkillMdLoader(config?: Partial<SkillLoaderConfig>): SkillMdLoader {
  return new SkillMdLoader(config);
}
