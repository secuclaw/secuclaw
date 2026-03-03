export type SkillLayer = 'workspace' | 'user' | 'bundled' | 'system';
export type SkillType = 'tool' | 'prompt' | 'workflow' | 'knowledge' | 'integration';

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags: string[];
  type: SkillType;
  layer: SkillLayer;
  enabled: boolean;
  priority: number;
  dependencies?: string[];
  conflicts?: string[];
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface SkillDefinition {
  metadata: SkillMetadata;
  parameters: SkillParameter[];
  template?: string;
  handler?: string;
  output?: { type: 'text' | 'json' | 'markdown'; schema?: Record<string, unknown> };
  examples?: Array<{ input: Record<string, unknown>; output: string }>;
}

export interface LoadedSkill extends SkillDefinition {
  id: string;
  path: string;
  loadedAt: Date;
  lastModified: Date;
  checksum: string;
}

export interface SkillContext {
  sessionId: string;
  userId: string;
  workspaceId: string;
  parameters: Record<string, unknown>;
  memory: Map<string, unknown>;
  eventEmitter?: (event: string, data: unknown) => void;
}

export interface SkillExecutionResult {
  success: boolean;
  output: string | Record<string, unknown>;
  metadata?: { tokens?: number; duration?: number; cached?: boolean };
  error?: string;
}

export type SkillExecutor = (context: SkillContext) => Promise<SkillExecutionResult>;

export interface SkillOverride {
  skillId: string;
  overriddenBy: SkillLayer;
  originalLayer: SkillLayer;
  reason: string;
}

export const LAYER_PRIORITY: Record<SkillLayer, number> = {
  workspace: 100,
  user: 75,
  bundled: 50,
  system: 25,
};

export function compareSkillPriority(a: LoadedSkill, b: LoadedSkill): number {
  const layerDiff = LAYER_PRIORITY[b.metadata.layer] - LAYER_PRIORITY[a.metadata.layer];
  if (layerDiff !== 0) return layerDiff;
  return b.metadata.priority - a.metadata.priority;
}

interface LayerConfig {
  path: string;
  enabled: boolean;
  readonly: boolean;
}

export class FourLayerSkillSystem {
  private layers: Map<SkillLayer, Map<string, LoadedSkill>> = new Map();
  private executors: Map<string, SkillExecutor> = new Map();
  private layerConfigs: Map<SkillLayer, LayerConfig> = new Map();
  private resolutionCache: Map<string, LoadedSkill> = new Map();
  private cacheValid = false;

  constructor() {
    this.layers.set('workspace', new Map());
    this.layers.set('user', new Map());
    this.layers.set('bundled', new Map());
    this.layers.set('system', new Map());

    this.layerConfigs.set('workspace', { path: './.security/skills', enabled: true, readonly: false });
    this.layerConfigs.set('user', { path: '~/.security/skills', enabled: true, readonly: false });
    this.layerConfigs.set('bundled', { path: './skills', enabled: true, readonly: true });
    this.layerConfigs.set('system', { path: '/system/skills', enabled: true, readonly: true });
  }

  configureLayer(layer: SkillLayer, config: Partial<LayerConfig>): void {
    const existing = this.layerConfigs.get(layer)!;
    this.layerConfigs.set(layer, { ...existing, ...config });
  }

  register(layer: SkillLayer, skill: SkillDefinition, executor: SkillExecutor, path: string): LoadedSkill {
    if (!this.layerConfigs.get(layer)?.enabled) {
      throw new Error(`Layer ${layer} is disabled`);
    }

    const id = `${layer}:${skill.metadata.name}@${skill.metadata.version}`;
    
    const loadedSkill: LoadedSkill = {
      ...skill,
      id,
      path,
      loadedAt: new Date(),
      lastModified: new Date(),
      checksum: this.hash(JSON.stringify(skill)),
    };

    this.layers.get(layer)!.set(id, loadedSkill);
    this.executors.set(id, executor);
    this.invalidateCache();

    return loadedSkill;
  }

  unregister(skillId: string): boolean {
    const [layer] = skillId.split(':');
    if (!layer || !this.layers.has(layer as SkillLayer)) return false;

    const result = this.layers.get(layer as SkillLayer)!.delete(skillId);
    if (result) {
      this.executors.delete(skillId);
      this.invalidateCache();
    }
    return result;
  }

  resolve(skillName: string): LoadedSkill | undefined {
    if (!this.cacheValid) this.rebuildCache();
    return this.resolutionCache.get(skillName);
  }

  private rebuildCache(): void {
    this.resolutionCache.clear();
    const layerOrder: SkillLayer[] = ['system', 'bundled', 'user', 'workspace'];

    for (const layer of layerOrder) {
      const layerSkills = this.layers.get(layer);
      if (!layerSkills || !this.layerConfigs.get(layer)?.enabled) continue;

      for (const skill of layerSkills.values()) {
        if (skill.metadata.enabled) {
          this.resolutionCache.set(skill.metadata.name, skill);
        }
      }
    }
    this.cacheValid = true;
  }

  private invalidateCache(): void {
    this.cacheValid = false;
  }

  get(skillId: string): LoadedSkill | undefined {
    const [layer] = skillId.split(':');
    return this.layers.get(layer as SkillLayer)?.get(skillId);
  }

  getExecutor(skillId: string): SkillExecutor | undefined {
    return this.executors.get(skillId);
  }

  getLayer(layer: SkillLayer): LoadedSkill[] {
    return Array.from(this.layers.get(layer)?.values() || []);
  }

  getAll(): LoadedSkill[] {
    const all: LoadedSkill[] = [];
    for (const layer of this.layers.values()) all.push(...layer.values());
    return all;
  }

  getResolved(): LoadedSkill[] {
    if (!this.cacheValid) this.rebuildCache();
    return Array.from(this.resolutionCache.values());
  }

  getOverrides(): SkillOverride[] {
    const overrides: SkillOverride[] = [];
    const seen = new Map<string, { layer: SkillLayer; skill: LoadedSkill }>();
    const layerOrder: SkillLayer[] = ['system', 'bundled', 'user', 'workspace'];

    for (const layer of layerOrder) {
      const layerSkills = this.layers.get(layer);
      if (!layerSkills) continue;

      for (const skill of layerSkills.values()) {
        const existing = seen.get(skill.metadata.name);
        if (existing) {
          overrides.push({
            skillId: skill.id,
            overriddenBy: layer,
            originalLayer: existing.layer,
            reason: `Layer ${layer} overrides ${existing.layer}`,
          });
        }
        seen.set(skill.metadata.name, { layer, skill });
      }
    }
    return overrides;
  }

  enable(skillId: string): boolean {
    const skill = this.get(skillId);
    if (skill) {
      skill.metadata.enabled = true;
      this.invalidateCache();
      return true;
    }
    return false;
  }

  disable(skillId: string): boolean {
    const skill = this.get(skillId);
    if (skill) {
      skill.metadata.enabled = false;
      this.invalidateCache();
      return true;
    }
    return false;
  }

  getStats(): { total: number; byLayer: Record<SkillLayer, number>; resolved: number; overrides: number } {
    const byLayer: Record<SkillLayer, number> = { workspace: 0, user: 0, bundled: 0, system: 0 };
    for (const [layer, skills] of this.layers) byLayer[layer] = skills.size;
    return { total: this.getAll().length, byLayer, resolved: this.getResolved().length, overrides: this.getOverrides().length };
  }

  private hash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export const globalFourLayerSystem = new FourLayerSkillSystem();

export function initializeDefaultSkills(system: FourLayerSkillSystem = globalFourLayerSystem): void {
  const defaultSkills: Array<{ layer: SkillLayer; skill: SkillDefinition }> = [
    {
      layer: 'system',
      skill: {
        metadata: { name: 'security_scan', version: '1.0.0', description: '安全扫描', type: 'workflow', layer: 'system', enabled: true, priority: 1, tags: ['security'] },
        parameters: [{ name: 'target', type: 'string', description: '目标', required: true }],
      },
    },
    {
      layer: 'system',
      skill: {
        metadata: { name: 'threat_analysis', version: '1.0.0', description: '威胁分析', type: 'knowledge', layer: 'system', enabled: true, priority: 1, tags: ['threat'] },
        parameters: [{ name: 'indicator', type: 'string', description: '指标', required: true }],
      },
    },
  ];

  for (const { layer, skill } of defaultSkills) {
    system.register(layer, skill, async (ctx: SkillContext) => ({ success: true, output: `执行 ${skill.metadata.name}: ${JSON.stringify(ctx.parameters)}` }), `/${layer}/${skill.metadata.name}`);
  }
}
