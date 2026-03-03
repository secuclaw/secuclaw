import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
  Skill,
  SkillContent,
  SkillMetadata,
  ParsedSkillFrontmatter,
  SkillTrigger,
  OpenClawMetadata,
  SkillInvocation,
} from "./types.js";

export function parseFrontmatter(content: string): ParsedSkillFrontmatter {
  const { data } = matter(content);
  return data as ParsedSkillFrontmatter;
}

export function resolveOpenClawMetadata(
  frontmatter: ParsedSkillFrontmatter,
): OpenClawMetadata | undefined {
  // 支持 openclaw 或 metadata.openclaw 两种格式
  let openclaw = frontmatter.openclaw;
  if (!openclaw && frontmatter.metadata && typeof frontmatter.metadata === "object") {
    const metadata = frontmatter.metadata as Record<string, unknown>;
    openclaw = metadata.openclaw;
  }
  
  if (!openclaw || typeof openclaw !== "object") {
    return undefined;
  }
  const obj = openclaw as Record<string, unknown>;
  const metadata: OpenClawMetadata = {};
  if (typeof obj.always === "boolean") metadata.always = obj.always;
  if (typeof obj.skillKey === "string") metadata.skillKey = obj.skillKey;
  if (typeof obj.primaryEnv === "string") metadata.primaryEnv = obj.primaryEnv;
  if (typeof obj.emoji === "string") metadata.emoji = obj.emoji;
  if (typeof obj.role === "string") metadata.role = obj.role;
  if (typeof obj.combination === "string") metadata.combination = obj.combination;
  if (Array.isArray(obj.capabilities)) {
    metadata.capabilities = obj.capabilities.filter(
      (c): c is string => typeof c === "string",
    );
  }
  if (Array.isArray(obj.mitre_coverage)) {
    metadata.mitre_coverage = obj.mitre_coverage.filter(
      (c): c is string => typeof c === "string",
    );
  }
  if (Array.isArray(obj.scf_coverage)) {
    metadata.scf_coverage = obj.scf_coverage.filter(
      (c): c is string => typeof c === "string",
    );
  }
  if (typeof obj.homepage === "string") metadata.homepage = obj.homepage;
  if (Array.isArray(obj.os)) {
    metadata.os = obj.os.filter((o): o is string => typeof o === "string");
  }
  return metadata;
}

function parseFrontmatterBool(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  return defaultValue;
}

export function resolveSkillInvocationPolicy(frontmatter: ParsedSkillFrontmatter): SkillInvocation {
  const userInvocable = parseFrontmatterBool(frontmatter["user-invocable"], true);
  const disableModelInvocation = parseFrontmatterBool(
    frontmatter["disable-model-invocation"],
    false,
  );
  let policy: SkillInvocation["policy"] = "auto";
  if (!userInvocable) {
    policy = "manual";
  } else if (disableModelInvocation) {
    policy = "disabled";
  }
  return {
    policy,
    userInvocable,
    disableModelInvocation,
  };
}

export function parseTriggers(frontmatter: ParsedSkillFrontmatter): SkillTrigger[] {
  const triggers = frontmatter.triggers;
  if (!triggers || !Array.isArray(triggers)) {
    return [];
  }
  return triggers.filter((t): t is SkillTrigger => {
    if (!t || typeof t !== "object") return false;
    const trigger = t as unknown as Record<string, unknown>;
    return (
      typeof trigger.type === "string" &&
      ["event", "command", "context", "manual"].includes(trigger.type)
    );
  });
}

export function loadSkillFromFile(filePath: string): Skill | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);
    const frontmatter = data as ParsedSkillFrontmatter;
    const skillName = frontmatter.name || path.basename(path.dirname(filePath));
    const metadata: SkillMetadata = {
      name: skillName,
      description: frontmatter.description,
      version: frontmatter.version,
      author: frontmatter.author,
      tags: frontmatter.tags,
      triggers: parseTriggers(frontmatter),
      openclaw: resolveOpenClawMetadata(frontmatter),
    };
    const skillContent: SkillContent = {
      frontmatter,
      body,
    };
    return {
      name: skillName,
      description: frontmatter.description,
      data,
      content: skillContent,
      filePath,
      baseDir: path.dirname(filePath),
    };
  } catch {
    return null;
  }
}

export function loadSkillFromDir(dirPath: string): Skill | null {
  const skillPath = path.join(dirPath, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    return null;
  }
  return loadSkillFromFile(skillPath);
}

export function listSkillDirectories(dirPath: string): string[] {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return [];
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const dirs: string[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        dirs.push(fullPath);
        continue;
      }
      if (entry.isSymbolicLink()) {
        try {
          if (fs.statSync(fullPath).isDirectory()) {
            dirs.push(fullPath);
          }
        } catch {
          // ignore broken symlinks
        }
      }
    }
    return dirs;
  } catch {
    return [];
  }
}

export function loadSkillsFromDir(dirPath: string, source: string): Skill[] {
  const skills: Skill[] = [];
  const dirs = listSkillDirectories(dirPath);
  for (const dir of dirs) {
    const skill = loadSkillFromDir(dir);
    if (skill) {
      skills.push(skill);
    }
  }
  return skills;
}

export function isValidSkillFile(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (!filePath.endsWith("SKILL.md")) return false;
    const content = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(content);
    return typeof data.name === "string";
  } catch {
    return false;
  }
}
