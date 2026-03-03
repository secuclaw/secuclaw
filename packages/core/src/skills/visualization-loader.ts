import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Skill } from './types.js';
import type {
  SkillVisualization,
  SkillVisualizationConfig,
  SkillVisualizationManifest,
  VisualizationLoadMode,
} from './visualization-types.js';

const MANIFEST_VERSION = '1.0.0';

export function parseVisualizationsFromFrontmatter(
  frontmatter: Record<string, unknown>
): SkillVisualizationConfig[] {
  const visualizations: SkillVisualizationConfig[] = [];
  
  const vizConfig = frontmatter.visualizations;
  if (!vizConfig || typeof vizConfig !== 'object') {
    return visualizations;
  }

  if (Array.isArray(vizConfig)) {
    for (const viz of vizConfig) {
      if (isValidVisualizationConfig(viz)) {
        visualizations.push(normalizeVisualizationConfig(viz));
      }
    }
  } else if (typeof vizConfig === 'object') {
    const vizObj = vizConfig as Record<string, unknown>;
    if (vizObj.inline && Array.isArray(vizObj.inline)) {
      for (const viz of vizObj.inline) {
        if (isValidVisualizationConfig(viz)) {
          visualizations.push(normalizeVisualizationConfig(viz));
        }
      }
    }
  }

  return visualizations;
}

function isValidVisualizationConfig(viz: unknown): viz is SkillVisualizationConfig {
  if (!viz || typeof viz !== 'object') return false;
  const v = viz as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.type === 'string' &&
    typeof v.dataSource === 'string'
  );
}

function normalizeVisualizationConfig(viz: Partial<SkillVisualizationConfig>): SkillVisualizationConfig {
  return {
    id: viz.id || `viz_${Date.now()}`,
    name: viz.name || 'Unnamed Visualization',
    description: viz.description,
    type: viz.type || 'chart',
    category: viz.category || 'widget',
    dataSource: viz.dataSource || 'default',
    dataTransform: viz.dataTransform,
    refreshInterval: viz.refreshInterval,
    config: viz.config || {},
    layout: viz.layout || { width: '100%', height: 300 },
    styling: viz.styling || { theme: 'auto' },
    interactions: viz.interactions || [],
    permissions: viz.permissions || { viewRoles: ['*'], editRoles: ['admin'] },
  };
}

export function loadVisualizationManifest(skillDir: string): SkillVisualizationManifest | null {
  const manifestPath = path.join(skillDir, 'visualizations.yaml');
  const manifestJsonPath = path.join(skillDir, 'visualizations.json');

  let manifestFile: string | null = null;
  let isJson = false;

  if (fs.existsSync(manifestPath)) {
    manifestFile = manifestPath;
  } else if (fs.existsSync(manifestJsonPath)) {
    manifestFile = manifestJsonPath;
    isJson = true;
  }

  if (!manifestFile) {
    return null;
  }

  try {
    const content = fs.readFileSync(manifestFile, 'utf-8');
    const parsed = isJson ? JSON.parse(content) : parseYaml(content);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const manifest: SkillVisualizationManifest = {
      version: parsed.version || MANIFEST_VERSION,
      visualizations: [],
      components: parsed.components || [],
      dependencies: parsed.dependencies || {},
    };

    if (Array.isArray(parsed.visualizations)) {
      for (const viz of parsed.visualizations) {
        if (isValidVisualizationConfig(viz)) {
          manifest.visualizations.push(normalizeVisualizationConfig(viz));
        }
      }
    }

    return manifest;
  } catch {
    return null;
  }
}

function parseYaml(content: string): Record<string, unknown> {
  const lines = content.split('\n');
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let currentArray: unknown[] | null = null;
  let currentObj: Record<string, unknown> = result;
  let indent = 0;
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: 0 }];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const currentIndent = line.search(/\S/);
    
    if (trimmed.startsWith('- ')) {
      if (currentArray === null) {
        currentArray = [];
        currentObj[currentKey] = currentArray;
      }
      const item = parseYamlValue(trimmed.substring(2));
      if (typeof item === 'object' && item !== null) {
        const newObj = item as Record<string, unknown>;
        currentArray.push(newObj);
        stack.push({ obj: newObj, indent: currentIndent });
        currentObj = newObj;
      } else {
        currentArray.push(item);
      }
    } else if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (currentIndent < indent) {
        while (stack.length > 1 && stack[stack.length - 1].indent >= currentIndent) {
          stack.pop();
        }
        currentObj = stack[stack.length - 1].obj;
        currentArray = null;
      }

      indent = currentIndent;

      if (value === '' || value === '|' || value === '>') {
        currentKey = key;
        currentArray = null;
        currentObj[key] = {};
        const newObj = currentObj[key] as Record<string, unknown>;
        stack.push({ obj: newObj, indent: currentIndent });
        currentObj = newObj;
      } else {
        currentObj[key] = parseYamlValue(value);
        currentKey = key;
        currentArray = null;
      }
    }
  }

  return result;
}

function parseYamlValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === '~') return null;
  
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

export function loadVisualizationFiles(skillDir: string): SkillVisualizationConfig[] {
  const visualizationsDir = path.join(skillDir, 'visualizations');
  const visualizations: SkillVisualizationConfig[] = [];

  if (!fs.existsSync(visualizationsDir)) {
    return visualizations;
  }

  const entries = fs.readdirSync(visualizationsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const filePath = path.join(visualizationsDir, entry.name);
    const ext = path.extname(entry.name);

    try {
      let viz: SkillVisualizationConfig | null = null;

      if (ext === '.yaml' || ext === '.yml') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseYaml(content);
        if (isValidVisualizationConfig(parsed)) {
          viz = normalizeVisualizationConfig(parsed);
        }
      } else if (ext === '.json') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (isValidVisualizationConfig(parsed)) {
          viz = normalizeVisualizationConfig(parsed);
        }
      }

      if (viz) {
        if (!viz.id) {
          viz.id = path.basename(entry.name, ext);
        }
        visualizations.push(viz);
      }
    } catch {
      // Skip invalid visualization files
    }
  }

  return visualizations;
}

export function loadSkillVisualizations(
  skill: Skill,
  mode: VisualizationLoadMode = 'hybrid'
): SkillVisualization | null {
  const skillDir = skill.baseDir;
  const visualizations: SkillVisualizationConfig[] = [];

  if (mode === 'inline' || mode === 'hybrid') {
    const inlineViz = parseVisualizationsFromFrontmatter(skill.content.frontmatter);
    visualizations.push(...inlineViz);
  }

  if (mode === 'external' || mode === 'hybrid') {
    const manifest = loadVisualizationManifest(skillDir);
    if (manifest) {
      visualizations.push(...manifest.visualizations);
    }

    const fileViz = loadVisualizationFiles(skillDir);
    visualizations.push(...fileViz);
  }

  if (visualizations.length === 0) {
    return null;
  }

  const uniqueViz = visualizations.filter((viz, index, self) =>
    index === self.findIndex(v => v.id === viz.id)
  );

  const manifest: SkillVisualizationManifest = {
    version: MANIFEST_VERSION,
    visualizations: uniqueViz,
  };

  return {
    skillId: skill.name,
    skillName: skill.name,
    manifest,
    loadedAt: new Date(),
    basePath: skillDir,
  };
}

export function getVisualizationLoadMode(skill: Skill): VisualizationLoadMode {
  const frontmatter = skill.content.frontmatter;
  
  if (frontmatter.visualizations) {
    const vizConfig = frontmatter.visualizations as Record<string, unknown>;
    if (vizConfig.mode && typeof vizConfig.mode === 'string') {
      if (['inline', 'external', 'hybrid'].includes(vizConfig.mode)) {
        return vizConfig.mode as VisualizationLoadMode;
      }
    }
  }

  return 'hybrid';
}

export function extractVisualizationDataPath(skill: Skill, visualizationId: string): string | null {
  const viz = loadSkillVisualizations(skill);
  if (!viz) return null;

  const config = viz.manifest.visualizations.find(v => v.id === visualizationId);
  return config?.dataSource || null;
}

export function listSkillVisualizations(skill: Skill): string[] {
  const viz = loadSkillVisualizations(skill);
  if (!viz) return [];

  return viz.manifest.visualizations.map(v => v.id);
}
