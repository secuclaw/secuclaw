export interface SkillTrigger {
  type: "event" | "command" | "context" | "manual";
  pattern?: string;
  conditions?: Record<string, unknown>;
  priority?: number;
}

export interface SkillInvocation {
  policy: "auto" | "manual" | "disabled";
  userInvocable: boolean;
  disableModelInvocation: boolean;
  timeout?: number;
  retries?: number;
}

export interface OpenClawMetadata {
  always?: boolean;
  skillKey?: string;
  primaryEnv?: string;
  emoji?: string;
  role?: string;
  combination?: string;
  capabilities?: string[];
  mitre_coverage?: string[];
  scf_coverage?: string[];
  homepage?: string;
  os?: string[];
  requires?: {
    bins?: string[];
    anyBins?: string[];
    env?: string[];
    config?: string[];
  };
  install?: SkillInstallSpec[];
}

export interface SkillInstallSpec {
  id?: string;
  kind: "brew" | "node" | "go" | "uv" | "download";
  label?: string;
  bins?: string[];
  os?: string[];
  formula?: string;
  package?: string;
  module?: string;
  url?: string;
  archive?: string;
  extract?: boolean;
  stripComponents?: number;
  targetDir?: string;
}

export interface SkillMetadata {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
  triggers?: SkillTrigger[];
  openclaw?: OpenClawMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SkillContent {
  frontmatter: Record<string, unknown>;
  body: string;
}

export interface Skill {
  name: string;
  description?: string;
  data: Record<string, unknown>;
  content: SkillContent;
  filePath: string;
  baseDir: string;
}

export interface SkillEntry {
  skill: Skill;
  frontmatter: Record<string, unknown>;
  metadata?: SkillMetadata;
  invocation?: SkillInvocation;
}

export interface SkillSnapshot {
  prompt: string;
  skills: Array<{ name: string; primaryEnv?: string }>;
  skillFilter?: string[];
  resolvedSkills?: Skill[];
  version?: number;
}

export interface SkillEligibilityContext {
  remote?: {
    platforms: string[];
    hasBin: (bin: string) => boolean;
    hasAnyBin: (bins: string[]) => boolean;
    note?: string;
  };
}

export type SkillSource = "workspace" | "managed" | "bundled" | "extra";

export interface SkillSourceConfig {
  workspace?: string;
  managed?: string;
  bundled?: string;
  extra?: string[];
}

export interface SkillLoadOptions {
  source?: SkillSource;
  filter?: string[];
  eligibility?: SkillEligibilityContext;
  limits?: SkillLoadLimits;
}

export interface SkillLoadLimits {
  maxCandidatesPerRoot?: number;
  maxSkillsLoadedPerSource?: number;
  maxSkillsInPrompt?: number;
  maxSkillsPromptChars?: number;
  maxSkillFileBytes?: number;
}

export const DEFAULT_SKILL_LIMITS: SkillLoadLimits = {
  maxCandidatesPerRoot: 300,
  maxSkillsLoadedPerSource: 200,
  maxSkillsInPrompt: 150,
  maxSkillsPromptChars: 30000,
  maxSkillFileBytes: 256000,
};

export interface SkillCommandSpec {
  name: string;
  skillName: string;
  description: string;
  dispatch?: SkillCommandDispatchSpec;
}

export interface SkillCommandDispatchSpec {
  kind: "tool";
  toolName: string;
  argMode?: "raw";
}

export interface ParsedSkillFrontmatter extends Record<string, unknown> {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
  emoji?: string;
  role?: string;
  combination?: string;
  capabilities?: string[];
  mitre_coverage?: string[];
  scf_coverage?: string[];
  triggers?: SkillTrigger[];
  "user-invocable"?: boolean;
  "disable-model-invocation"?: boolean;
  "command-dispatch"?: string;
  "command-tool"?: string;
  "command-arg-mode"?: string;
}

// Four-layer skill system types
export type SkillLayer = 'system' | 'bundled' | 'user' | 'workspace';

export interface SkillDefinition {
  name: string;
  layer: SkillLayer;
  description?: string;
  version?: string;
  handler?: (input: Record<string, unknown>) => Promise<unknown>;
  // Support for metadata-based skill definitions
  metadata?: {
    name: string;
    version: string;
    description?: string;
    type?: string;
    layer: SkillLayer;
    enabled: boolean;
    priority?: number;
    tags?: string[];
  };
  parameters?: Array<{ name: string; type: string; description: string; required?: boolean }>;
}

export interface LoadedSkill {
  // From Skill
  name: string;
  description?: string;
  data: Record<string, unknown>;
  content: SkillContent;
  filePath: string;
  baseDir: string;
  // Extended properties
  id?: string;
  layer: SkillLayer;
  priority: number;
  path?: string;
  loadedAt?: Date;
  lastModified?: Date;
  checksum?: string;
  overrides?: SkillOverride[];
  metadata?: SkillMetadata & {
    enabled?: boolean;
    layer?: SkillLayer;
    priority?: number;
    type?: string;
    tags?: string[];
    parameters?: Array<{ name: string; type: string; description: string; required?: boolean }>;
  };
}

export interface SkillExecutor {
  execute(input: Record<string, unknown>): Promise<unknown>;
}

export interface SkillOverride {
  field: string;
  value: unknown;
  skillId?: string;
  overriddenBy?: SkillLayer;
  originalLayer?: SkillLayer;
  reason?: string;
}

export const LAYER_PRIORITY: Record<SkillLayer, number> = {
  system: 0,
  bundled: 1,
  user: 2,
  workspace: 3,
};

export function compareSkillPriority(a: LoadedSkill, b: LoadedSkill): number {
  return LAYER_PRIORITY[b.layer] - LAYER_PRIORITY[a.layer];
}
