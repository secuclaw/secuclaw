import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/**
 * SecuClaw 技能目录配置
 * 
 * 技能安装目录优先级：
 * 1. SECUCALW_SKILLS_DIR 环境变量
 * 2. 配置文件中的 skillsDir 设置
 * 3. 默认目录 ~/.secuclaw/skills
 */
export const SKILLS_DIR_NAME = "skills";
export const CONFIG_DIR_NAME = ".secuclaw";
export const BUILTIN_SKILLS_DIR_NAME = "skills";

/**
 * 获取用户主目录
 */
export function getHomeDir(): string {
  return os.homedir();
}

/**
 * 获取 SecuClaw 配置目录 (~/.secuclaw)
 */
export function getConfigDir(): string {
  return path.join(getHomeDir(), CONFIG_DIR_NAME);
}

/**
 * 获取默认技能安装目录 (~/.secuclaw/skills)
 */
export function getDefaultSkillsDir(): string {
  return path.join(getConfigDir(), SKILLS_DIR_NAME);
}

/**
 * 获取内置技能目录 (相对于项目根目录)
 */
export function getBuiltinSkillsDir(projectRoot?: string): string {
  if (projectRoot) {
    return path.join(projectRoot, BUILTIN_SKILLS_DIR_NAME);
  }
  // 尝试从当前目录向上查找
  let currentDir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const skillsPath = path.join(currentDir, BUILTIN_SKILLS_DIR_NAME);
    if (fs.existsSync(skillsPath)) {
      return skillsPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  // 回退到默认位置
  return path.join(process.cwd(), BUILTIN_SKILLS_DIR_NAME);
}

/**
 * 技能目录来源类型
 */
export type SkillDirectorySource = 
  | "builtin"    // 内置技能（项目目录下）
  | "installed"  // 已安装技能（~/.secuclaw/skills）
  | "custom";    // 自定义目录

/**
 * 技能目录信息
 */
export interface SkillDirectory {
  path: string;
  source: SkillDirectorySource;
  exists: boolean;
  skillCount: number;
}

/**
 * 获取所有技能目录
 * 按优先级返回：自定义 > 已安装 > 内置
 */
export function getSkillDirectories(customDir?: string): SkillDirectory[] {
  const directories: SkillDirectory[] = [];

  // 1. 自定义目录（最高优先级）
  if (customDir) {
    directories.push(getSkillDirectoryInfo(customDir, "custom"));
  }

  // 2. 环境变量指定的目录
  const envSkillsDir = process.env.SECUCLAW_SKILLS_DIR;
  if (envSkillsDir && envSkillsDir !== customDir) {
    directories.push(getSkillDirectoryInfo(envSkillsDir, "custom"));
  }

  // 3. 已安装技能目录
  const installedDir = getDefaultSkillsDir();
  if (installedDir !== customDir && installedDir !== envSkillsDir) {
    directories.push(getSkillDirectoryInfo(installedDir, "installed"));
  }

  // 4. 内置技能目录
  const builtinDir = getBuiltinSkillsDir();
  if (builtinDir !== customDir && builtinDir !== envSkillsDir && builtinDir !== installedDir) {
    directories.push(getSkillDirectoryInfo(builtinDir, "builtin"));
  }

  return directories;
}

/**
 * 获取技能目录信息
 */
export function getSkillDirectoryInfo(dirPath: string, source: SkillDirectorySource): SkillDirectory {
  const exists = fs.existsSync(dirPath);
  let skillCount = 0;

  if (exists) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const skillPath = path.join(dirPath, entry.name, "SKILL.md");
          if (fs.existsSync(skillPath)) {
            skillCount++;
          }
        }
      }
    } catch {
      // 忽略读取错误
    }
  }

  return {
    path: dirPath,
    source,
    exists,
    skillCount,
  };
}

/**
 * 确保技能安装目录存在
 */
export function ensureSkillsDirExists(skillsDir?: string): string {
  const dir = skillsDir || getDefaultSkillsDir();
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

/**
 * 获取技能安装路径
 */
export function getSkillInstallPath(skillName: string, skillsDir?: string): string {
  const baseDir = skillsDir || getDefaultSkillsDir();
  return path.join(baseDir, skillName);
}

/**
 * 检查技能是否已安装
 */
export function isSkillInstalled(skillName: string, skillsDir?: string): boolean {
  const skillPath = getSkillInstallPath(skillName, skillsDir);
  const skillFile = path.join(skillPath, "SKILL.md");
  return fs.existsSync(skillFile);
}

/**
 * 获取技能可视化目录路径
 */
export function getSkillVisualizationsDir(skillPath: string): string {
  return path.join(skillPath, "visualizations");
}

/**
 * 获取技能可视化清单文件路径
 */
export function getSkillVisualizationManifest(skillPath: string): { yaml: string; json: string } {
  return {
    yaml: path.join(skillPath, "visualizations.yaml"),
    json: path.join(skillPath, "visualizations.json"),
  };
}
