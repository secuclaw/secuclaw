import type {
  Skill,
  SkillEntry,
  SkillSnapshot,
  SkillSource,
  SkillLoadLimits,
  SkillSourceConfig,
  SkillEligibilityContext,
} from "./types.js";
import { SkillRegistry } from "./registry.js";
import {
  discoverSkills,
  filterSkillsByEligibility,
  compactSkillPaths,
  resolveSkillDirs,
  getSkillSourcePriority,
} from "./discovery.js";

export interface ManagerOptions {
  workspaceDir?: string;
  config?: SkillSourceConfig;
  limits?: SkillLoadLimits;
  autoLoad?: boolean;
}

export class SkillManager {
  private registry: SkillRegistry;
  private workspaceDir: string;
  private config: SkillSourceConfig;
  private limits: SkillLoadLimits;
  private loaded = false;

  constructor(options: ManagerOptions = {}) {
    this.registry = new SkillRegistry();
    this.workspaceDir = options.workspaceDir || process.cwd();
    this.config = options.config || {};
    this.limits = options.limits || {};
    if (options.autoLoad !== false) {
      this.load();
    }
  }

  load(): void {
    if (this.loaded) {
      return;
    }
    const skills = discoverSkills({
      workspaceDir: this.workspaceDir,
      config: this.config,
      limits: this.limits,
    });
    const dirs = resolveSkillDirs({
      workspaceDir: this.workspaceDir,
      config: this.config,
    });
    const sourceMap = this.buildSourceMap(dirs);
    for (const skill of skills) {
      const source = sourceMap.get(skill.baseDir) || "extra";
      this.registry.register(skill, source);
    }
    this.loaded = true;
  }

  private buildSourceMap(dirs: Record<SkillSource, string[]>): Map<string, SkillSource> {
    const map = new Map<string, SkillSource>();
    const priority = getSkillSourcePriority();
    for (const [source, sourceDirs] of Object.entries(dirs)) {
      for (const dir of sourceDirs) {
        const existing = map.get(dir);
        if (!existing || priority[source as SkillSource] > priority[existing]) {
          map.set(dir, source as SkillSource);
        }
      }
    }
    return map;
  }

  reload(): void {
    this.registry.clear();
    this.loaded = false;
    this.load();
  }

  get(name: string): SkillEntry | undefined {
    return this.registry.get(name);
  }

  getAll(): SkillEntry[] {
    return this.registry.getAll();
  }

  getBySource(source: SkillSource): SkillEntry[] {
    return this.registry.getBySource(source);
  }

  has(name: string): boolean {
    return this.registry.has(name);
  }

  size(): number {
    return this.registry.size();
  }

  getNames(): string[] {
    return this.registry.getNames();
  }

  findByTag(tag: string): SkillEntry[] {
    return this.registry.findByTag(tag);
  }

  findByPredicate(predicate: (entry: SkillEntry) => boolean): SkillEntry[] {
    return this.registry.findByPredicate(predicate);
  }

  buildSnapshot(options: {
    filter?: string[];
    eligibility?: SkillEligibilityContext;
  } = {}): SkillSnapshot {
    const entries = this.getAll();
    const eligible = filterSkillsByEligibility(entries, options.filter);
    const resolvedSkills = eligible.map((entry) => entry.skill);
    const compacted = compactSkillPaths(resolvedSkills);
    const prompt = this.formatSkillsForPrompt(compacted);
    return {
      prompt,
      skills: eligible.map((entry) => ({
        name: entry.skill.name,
        primaryEnv: entry.frontmatter.primaryEnv as string | undefined,
      })),
      resolvedSkills: compacted,
      version: Date.now(),
    };
  }

  private formatSkillsForPrompt(skills: Skill[]): string {
    if (skills.length === 0) {
      return "";
    }
    const lines: string[] = ["## Available Skills", ""];
    for (const skill of skills) {
      const emoji = skill.content.frontmatter.emoji as string | undefined;
      const name = skill.name;
      const description = skill.description || "";
      const line = emoji ? `${emoji} **${name}**${description ? `: ${description}` : ""}` : `**${name}**${description ? `: ${description}` : ""}`;
      lines.push(`- ${line}`);
    }
    return lines.join("\n");
  }

  register(skill: Skill, source: SkillSource = "extra"): void {
    this.registry.register(skill, source);
  }

  remove(name: string): boolean {
    return this.registry.remove(name);
  }

  clear(): void {
    this.registry.clear();
    this.loaded = false;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export function createSkillManager(options?: ManagerOptions): SkillManager {
  return new SkillManager(options);
}
