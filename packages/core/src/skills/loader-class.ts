import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Skill, SkillMetadata, SkillSource } from "./types.js";
import {
  loadSkillFromDir,
  listSkillDirectories,
  resolveOpenClawMetadata,
  parseTriggers,
} from "./loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface SkillLoaderOptions {
  sources?: SkillSourceConfig[];
  watch?: boolean;
}

export interface SkillSourceConfig {
  type: SkillSource;
  path: string;
  priority: number;
}

export interface LoadedSkill extends Skill {
  source: SkillSource;
  priority: number;
  metadata: SkillMetadata;
}

export class SkillLoader {
  private skills: Map<string, LoadedSkill> = new Map();
  private sources: SkillSourceConfig[] = [];
  private watchEnabled = false;

  constructor(skillsDir: string, options?: SkillLoaderOptions) {
    if (options?.sources) {
      this.sources = options.sources;
    } else {
      this.sources = [
        { type: "workspace", path: skillsDir, priority: 100 },
        { type: "managed", path: path.join(process.env.HOME || "", ".esc", "skills"), priority: 50 },
        { type: "bundled", path: path.join(__dirname, "..", "..", "skills"), priority: 10 },
      ];
    }
    this.watchEnabled = options?.watch ?? false;
  }

  async loadAll(): Promise<void> {
    this.skills.clear();

    const sortedSources = [...this.sources].sort((a, b) => b.priority - a.priority);

    for (const source of sortedSources) {
      await this.loadFromSource(source);
    }
  }

  private async loadFromSource(source: SkillSourceConfig): Promise<void> {
    if (!fs.existsSync(source.path)) {
      return;
    }

    const dirs = listSkillDirectories(source.path);

    for (const dir of dirs) {
      const skill = loadSkillFromDir(dir);
      if (!skill) continue;

      const skillName = skill.name;
      if (this.skills.has(skillName)) {
        continue;
      }

      const metadata: SkillMetadata = {
        name: skillName,
        description: skill.description,
        version: skill.data.version as string | undefined,
        author: skill.data.author as string | undefined,
        tags: skill.data.tags as string[] | undefined,
        triggers: parseTriggers(skill.data),
        openclaw: resolveOpenClawMetadata(skill.data),
      };

      this.skills.set(skillName, {
        ...skill,
        source: source.type,
        priority: source.priority,
        metadata,
      });
    }
  }

  getAll(): LoadedSkill[] {
    return Array.from(this.skills.values());
  }

  get(name: string): LoadedSkill | undefined {
    return this.skills.get(name);
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  getBySource(source: SkillSource): LoadedSkill[] {
    return this.getAll().filter((s) => s.source === source);
  }

  getByTag(tag: string): LoadedSkill[] {
    return this.getAll().filter((s) => s.metadata.tags?.includes(tag));
  }

  search(query: string): LoadedSkill[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower) ||
        s.metadata.tags?.some((t) => t.toLowerCase().includes(lower))
    );
  }

  async create(name: string, targetDir: string): Promise<void> {
    fs.mkdirSync(targetDir, { recursive: true });

    const skillFile = path.join(targetDir, "SKILL.md");
    const content = `---
name: "${name}"
description: "A new skill for ${name}"
version: "0.1.0"
author: ""
tags: []
---

# ${name}

Describe what this skill does and how to use it.

## Capabilities

- List the capabilities this skill provides

## Usage

Examples of how to invoke this skill.
`;

    fs.writeFileSync(skillFile, content);

    const readmeFile = path.join(targetDir, "README.md");
    fs.writeFileSync(readmeFile, `# ${name} Skill\n\nDocumentation for the ${name} skill.\n`);
  }

  async reload(name?: string): Promise<void> {
    if (name) {
      this.skills.delete(name);
      for (const source of this.sources) {
        const skillDir = path.join(source.path, name);
        if (fs.existsSync(skillDir)) {
          const skill = loadSkillFromDir(skillDir);
          if (skill) {
            const metadata: SkillMetadata = {
              name: skill.name,
              description: skill.description,
              version: skill.data.version as string | undefined,
              author: skill.data.author as string | undefined,
              tags: skill.data.tags as string[] | undefined,
              triggers: parseTriggers(skill.data),
              openclaw: resolveOpenClawMetadata(skill.data),
            };
            this.skills.set(skill.name, {
              ...skill,
              source: source.type,
              priority: source.priority,
              metadata,
            });
          }
        }
      }
    } else {
      await this.loadAll();
    }
  }

  addSource(source: SkillSourceConfig): void {
    this.sources.push(source);
  }

  removeSource(path: string): void {
    this.sources = this.sources.filter((s) => s.path !== path);
    for (const [name, skill] of this.skills) {
      if (skill.baseDir.startsWith(path)) {
        this.skills.delete(name);
      }
    }
  }

  getSources(): SkillSourceConfig[] {
    return [...this.sources];
  }

  count(): number {
    return this.skills.size;
  }
}
