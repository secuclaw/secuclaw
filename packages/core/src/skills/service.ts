import { resolve } from "node:path";
import { loadSkillsFromDir, loadSkillFromFile, resolveOpenClawMetadata } from "./loader.js";
import type { Skill, SkillMetadata, OpenClawMetadata } from "./types.js";

export interface SkillInfo {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  role?: string;
  combination?: string;
  systemPrompt: string;
}

interface InternalSkill extends Skill {
  metadata?: SkillMetadata;
}

export class SkillService {
  private skills: Map<string, InternalSkill> = new Map();
  private skillsDir: string;

  constructor(skillsDir: string) {
    this.skillsDir = skillsDir;
  }

  async initialize(): Promise<void> {
    const loaded = loadSkillsFromDir(this.skillsDir, "workspace");
    for (const skill of loaded) {
      const openclaw = resolveOpenClawMetadata(skill.data as Record<string, unknown>);
      const metadata: SkillMetadata = {
        name: skill.name,
        description: skill.description,
        openclaw,
      };
      const internalSkill: InternalSkill = {
        ...skill,
        metadata,
      };
      this.skills.set(skill.name, internalSkill);
    }
  }

  getSkill(name: string): InternalSkill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): InternalSkill[] {
    return Array.from(this.skills.values());
  }

  getSkillInfo(name: string): SkillInfo | undefined {
    const skill = this.skills.get(name);
    if (!skill) return undefined;

    return {
      id: skill.name,
      name: skill.metadata?.name ?? skill.name,
      description: skill.metadata?.description,
      emoji: skill.metadata?.openclaw?.emoji,
      role: skill.metadata?.openclaw?.role,
      combination: skill.metadata?.openclaw?.combination,
      systemPrompt: this.buildSystemPrompt(skill),
    };
  }

  getAllSkillInfo(): SkillInfo[] {
    return this.getAllSkills().map(skill => ({
      id: skill.name,
      name: skill.metadata?.name ?? skill.name,
      description: skill.metadata?.description,
      emoji: skill.metadata?.openclaw?.emoji,
      role: skill.metadata?.openclaw?.role,
      combination: skill.metadata?.openclaw?.combination,
      systemPrompt: this.buildSystemPrompt(skill),
    }));
  }

  buildSystemPrompt(skill: InternalSkill): string {
    const parts: string[] = [];

    const meta = skill.metadata;
    if (meta?.description) {
      parts.push(`你是${meta.name}，${meta.description}`);
    }

    if (skill.content?.body) {
      parts.push(skill.content.body);
    }

    return parts.join("\n\n");
  }

  getSystemPrompt(skillName: string): string {
    const skill = this.skills.get(skillName);
    if (!skill) {
      return "你是一个企业安全助手，帮助用户解决安全相关问题。";
    }
    return this.buildSystemPrompt(skill);
  }
}

let serviceInstance: SkillService | null = null;

export function getSkillService(): SkillService {
  if (!serviceInstance) {
    const skillsDir = resolve(process.cwd(), "skills");
    serviceInstance = new SkillService(skillsDir);
  }
  return serviceInstance;
}

export async function initSkillService(): Promise<SkillService> {
  const service = getSkillService();
  await service.initialize();
  return service;
}
