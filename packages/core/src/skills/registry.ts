import type { Skill, SkillEntry, SkillSource, SkillInvocation } from "./types.js";
import { parseFrontmatter, resolveSkillInvocationPolicy } from "./loader.js";

export class SkillRegistry {
  private skills: Map<string, SkillEntry> = new Map();
  private sourceOrder: Map<string, SkillSource> = new Map();

  register(skill: Skill, source: SkillSource): void {
    const existing = this.skills.get(skill.name);
    if (existing) {
      const existingSource = this.sourceOrder.get(skill.name);
      if (!this.shouldReplace(existingSource, source)) {
        return;
      }
    }
    const frontmatter = skill.content.frontmatter;
    const invocation = resolveSkillInvocationPolicy(frontmatter as Record<string, unknown>);
    this.skills.set(skill.name, {
      skill,
      frontmatter: frontmatter as Record<string, unknown>,
      invocation,
    });
    this.sourceOrder.set(skill.name, source);
  }

  private shouldReplace(existing: SkillSource | undefined, incoming: SkillSource): boolean {
    const priority: Record<SkillSource, number> = {
      workspace: 4,
      managed: 3,
      bundled: 2,
      extra: 1,
    };
    const existingPriority = existing ? priority[existing] : 0;
    return priority[incoming] > existingPriority;
  }

  get(name: string): SkillEntry | undefined {
    return this.skills.get(name);
  }

  getAll(): SkillEntry[] {
    return Array.from(this.skills.values());
  }

  getBySource(source: SkillSource): SkillEntry[] {
    return this.getAll().filter((entry) => {
      const entrySource = this.sourceOrder.get(entry.skill.name);
      return entrySource === source;
    });
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  remove(name: string): boolean {
    this.sourceOrder.delete(name);
    return this.skills.delete(name);
  }

  clear(): void {
    this.skills.clear();
    this.sourceOrder.clear();
  }

  size(): number {
    return this.skills.size;
  }

  getNames(): string[] {
    return Array.from(this.skills.keys());
  }

  findByTag(tag: string): SkillEntry[] {
    return this.getAll().filter((entry) => {
      const tags = entry.frontmatter.tags;
      if (!Array.isArray(tags)) return false;
      return tags.includes(tag);
    });
  }

  findByPredicate(predicate: (entry: SkillEntry) => boolean): SkillEntry[] {
    return this.getAll().filter(predicate);
  }
}

export function createRegistry(): SkillRegistry {
  return new SkillRegistry();
}
