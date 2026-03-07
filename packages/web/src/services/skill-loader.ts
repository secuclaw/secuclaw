// Service to load skill files from the /skills directory
import type { SkillMetadata, SkillCapabilities } from '../config/roles';
import { getRoleById } from '../config/roles';

// Mapping from role ID to skill folder name - inline to avoid import issues
const ROLE_SKILL_MAPPING: Record<string, string> = {
  'security-expert': 'security-expert',
  'privacy-security-officer': 'privacy-officer',
  'security-architect': 'security-architect',
  'business-security-officer': 'business-security-officer',
  'chief-security-architect': 'ciso',
  'supply-chain-security-officer': 'supply-chain-security',
  'business-security-operations': 'security-ops',
  'secuclaw-commander': 'secuclaw-commander',
};

export { getRoleById };
// Base path to skills directory (relative to public or assets)
const SKILLS_BASE_PATH = '/skills';

// Cache for loaded skills
const skillCache = new Map<string, SkillMetadata | null>();

// Parse YAML frontmatter - simplified regex-based approach
function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter = match[1];
  const result: Record<string, unknown> = {};
  
  // Extract top-level key-value pairs
  const lines = frontmatter.split('\n');
  let currentParent: Record<string, unknown> = result;
  let currentKey = '';
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    
    // Top-level key: value
    const topLevelMatch = trimmed.match(/^(\w+):\s*"([^"]+)"$/);
    if (topLevelMatch) {
      const [, key, value] = topLevelMatch;
      result[key] = value;
      continue;
    }
    
    // Top-level key (no value yet)
    const keyMatch = trimmed.match(/^(\w+):$/);
    if (keyMatch && indent === 0) {
      currentKey = keyMatch[1];
      if (!result[currentKey]) {
        result[currentKey] = {};
      }
      currentParent = result[currentKey] as Record<string, unknown>;
      continue;
    }
    
    // Second level key: value (like metadata.openclaw.emoji)
    const secondLevelMatch = trimmed.match(/^(\w+):\s*"([^"]+)"$/);
    if (secondLevelMatch && indent > 0) {
      const [, key, value] = secondLevelMatch;
      if (!result['metadata']) {
        result['metadata'] = { openclaw: {} };
      }
      const metadata = result['metadata'] as Record<string, unknown>;
      if (!metadata['openclaw']) {
        metadata['openclaw'] = {};
      }
      (metadata['openclaw'] as Record<string, unknown>)[key] = value;
      continue;
    }
    
    // Second level key (no value) - like capabilities:
    const secondKeyMatch = trimmed.match(/^(\w+):$/);
    if (secondKeyMatch && indent > 0) {
      currentKey = secondKeyMatch[1];
      if (!result['metadata']) {
        result['metadata'] = { openclaw: {} };
      }
      const metadata = result['metadata'] as Record<string, unknown>;
      if (!metadata['openclaw']) {
        metadata['openclaw'] = {};
      }
      (metadata['openclaw'] as Record<string, unknown>)[currentKey] = {};
      continue;
    }
    
    // Array items at second level (like capabilities.light: [...])
    const arrayItemMatch = trimmed.match(/^(\w+):\s*\[([^\]]*)\]$/);
    if (arrayItemMatch) {
      const [, key, values] = arrayItemMatch;
      const arr = values.split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
      if (!result['metadata']) {
        result['metadata'] = { openclaw: {} };
      }
      const metadata = result['metadata'] as Record<string, unknown>;
      if (!metadata['openclaw']) {
        metadata['openclaw'] = {};
      }
      (metadata['openclaw'] as Record<string, unknown>)[key] = arr;
      continue;
    }
  }
  
  return result;
}

// Simpler approach - directly extract capabilities using regex
function extractCapabilities(content: string): SkillCapabilities {
  const capabilities: SkillCapabilities = {
    light: [],
    dark: [],
    security: [],
    legal: [],
    technology: [],
    business: [],
  };
  
  // Match capabilities section
  const capMatch = content.match(/capabilities:\s*\n([\s\S]*?)(?=\n\w|\n---|\nvisualizations:)/);
  if (!capMatch) return capabilities;
  
  const capSection = capMatch[1];
  
  // Extract each capability type
  const types: (keyof SkillCapabilities)[] = ['light', 'dark', 'security', 'legal', 'technology', 'business'];
  
  for (const type of types) {
    const typeMatch = capSection.match(new RegExp(`${type}:\\s*\\[([^\\]]*)\\]`));
    if (typeMatch) {
      const values = typeMatch[1].split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
      capabilities[type] = values;
    }
  }
  
  return capabilities;
}

// Extract arrays from content using regex
function extractArray(content: string, key: string): string[] {
  const match = content.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  return match[1].split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

// Load skill metadata from SKILL.md file
export async function loadSkillMetadata(roleId: string): Promise<SkillMetadata | null> {
  const folder = ROLE_SKILL_MAPPING[roleId];
  if (!folder) return null;
  
  // Check cache first
  if (skillCache.has(folder)) {
    return skillCache.get(folder) || null;
  }
  
  try {
    const response = await fetch(`${SKILLS_BASE_PATH}/${folder}/SKILL.md`);
    if (!response.ok) {
      console.warn(`Skill file not found: ${folder}/SKILL.md`);
      skillCache.set(folder, null);
      return null;
    }
    
    const content = await response.text();
    
    // Extract capabilities
    const capabilities = extractCapabilities(content);
    
    // Extract metadata using regex
    const emojiMatch = content.match(/emoji:\s*"([^"]+)"/);
    const roleMatch = content.match(/role:\s*"([^"]+)"/);
    const comboMatch = content.match(/combination:\s*"([^"]+)"/);
    const versionMatch = content.match(/version:\s*"([^"]+)"/);
    
    // Extract name and description
    const nameMatch = content.match(/^name:\s*(\w+)/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    
    const metadata: SkillMetadata = {
      name: nameMatch ? nameMatch[1] : folder,
      description: descMatch ? descMatch[1] : '',
      emoji: emojiMatch ? emojiMatch[1] : '🔧',
      role: roleMatch ? roleMatch[1] : '',
      combination: comboMatch ? comboMatch[1] : '',
      version: versionMatch ? versionMatch[1] : '1.0.0',
      capabilities,
      mitre_coverage: extractArray(content, 'mitre_coverage'),
      scf_coverage: extractArray(content, 'scf_coverage'),
    };
    
    skillCache.set(folder, metadata);
    return metadata;
  } catch (error) {
    console.error(`Error loading skill ${folder}:`, error);
    skillCache.set(folder, null);
    return null;
  }
}

// Preload all skills
export async function preloadAllSkills(): Promise<void> {
  const promises = Object.keys(ROLE_SKILL_MAPPING).map(roleId => loadSkillMetadata(roleId));
  await Promise.all(promises);
}

// Get all skill folders
export function getAllSkillFolders(): string[] {
  return Object.values(ROLE_SKILL_MAPPING);
}
