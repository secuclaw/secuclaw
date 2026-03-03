import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Skill, SkillSource, SkillLoadLimits, SkillEntry, SkillSourceConfig } from "./types.js";
import { loadSkillFromDir, loadSkillsFromDir, isValidSkillFile } from "./loader.js";

const DEFAULT_LIMITS: SkillLoadLimits = {
  maxCandidatesPerRoot: 300,
  maxSkillsLoadedPerSource: 200,
  maxSkillsInPrompt: 150,
  maxSkillsPromptChars: 30000,
  maxSkillFileBytes: 256000,
};

export interface DiscoveryOptions {
  workspaceDir?: string;
  config?: SkillSourceConfig;
  limits?: SkillLoadLimits;
}

export function resolveSkillDirs(options: DiscoveryOptions): Record<SkillSource, string[]> {
  const workspaceDir = options.workspaceDir || process.cwd();
  const config = options.config || {};
  const extraDirs = config.extra || [];
  return {
    workspace: [path.resolve(workspaceDir, "skills")],
    managed: [config.managed || path.join(os.homedir(), ".esc", "skills")],
    bundled: [config.bundled || path.join(process.cwd(), "bundled-skills")],
    extra: extraDirs.map((d) => path.resolve(d)),
  };
}

export function loadSkillsBySource(
  source: SkillSource,
  dirs: string[],
  limits: SkillLoadLimits,
): Skill[] {
  const allSkills: Skill[] = [];
  const maxPerSource = limits.maxSkillsLoadedPerSource ?? DEFAULT_LIMITS.maxSkillsLoadedPerSource ?? 200;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      continue;
    }
    const skills = loadSkillsFromDir(dir, `esc-${source}`);
    allSkills.push(...skills);
    if (allSkills.length >= maxPerSource) {
      break;
    }
  }
  return allSkills.slice(0, maxPerSource);
}

export function discoverSkills(options: DiscoveryOptions): Skill[] {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const dirs = resolveSkillDirs(options);
  const extraSkills = loadSkillsBySource("extra", dirs.extra, limits);
  const bundledSkills = loadSkillsBySource("bundled", dirs.bundled, limits);
  const managedSkills = loadSkillsBySource("managed", dirs.managed, limits);
  const workspaceSkills = loadSkillsBySource("workspace", dirs.workspace, limits);
  const merged = new Map<string, Skill>();
  for (const skill of extraSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of bundledSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of managedSkills) {
    merged.set(skill.name, skill);
  }
  for (const skill of workspaceSkills) {
    merged.set(skill.name, skill);
  }
  return Array.from(merged.values());
}

export function discoverSkillsWithMetadata(options: DiscoveryOptions): SkillEntry[] {
  const skills = discoverSkills(options);
  return skills.map((skill) => {
    const frontmatter = skill.content.frontmatter;
    return {
      skill,
      frontmatter: frontmatter as Record<string, unknown>,
    };
  });
}

export function getSkillSourcePriority(): Record<SkillSource, number> {
  return {
    workspace: 4,
    managed: 3,
    bundled: 2,
    extra: 1,
  };
}

export function shouldIncludeSkill(entry: SkillEntry): boolean {
  const invocation = entry.invocation;
  if (!invocation) {
    return true;
  }
  return invocation.policy !== "disabled";
}

export function filterSkillsByEligibility(
  entries: SkillEntry[],
  filter?: string[],
): SkillEntry[] {
  let filtered = entries.filter(shouldIncludeSkill);
  if (filter && filter.length > 0) {
    filtered = filtered.filter((entry) => filter.includes(entry.skill.name));
  }
  return filtered;
}

export function compactSkillPaths(skills: Skill[]): Skill[] {
  const home = os.homedir();
  if (!home) return skills;
  const prefix = home.endsWith(path.sep) ? home : home + path.sep;
  return skills.map((s) => ({
    ...s,
    filePath: s.filePath.startsWith(prefix) ? "~/" + s.filePath.slice(prefix.length) : s.filePath,
  }));
}
