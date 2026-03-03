import type { SkillLayer, SkillDefinition, LoadedSkill, SkillExecutor, SkillOverride } from './types';
import { compareSkillPriority, LAYER_PRIORITY } from './types';

export { compareSkillPriority, LAYER_PRIORITY } from './types';
export type * from './types';

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

  register(
    layer: SkillLayer,
    skill: SkillDefinition,
    executor: SkillExecutor,
    path: string
  ): LoadedSkill {
    if (!this.layerConfigs.get(layer)?.enabled) {
      throw new Error(`Layer ${layer} is disabled`);
    }

    const skillName = skill.metadata?.name || skill.name;
    const skillVersion = skill.metadata?.version || skill.version || '1.0.0';
    const id = `${layer}:${skillName}@${skillVersion}`;
    
    const loadedSkill: LoadedSkill = {
      name: skillName,
      description: skill.metadata?.description || skill.description,
      data: {},
      content: { frontmatter: {}, body: '' },
      filePath: path,
      baseDir: path,
      id,
      layer,
      priority: LAYER_PRIORITY[layer],
      path,
      loadedAt: new Date(),
      lastModified: new Date(),
      checksum: this.hash(JSON.stringify(skill)),
      metadata: skill.metadata ? {
        name: skill.metadata.name,
        version: skill.metadata.version,
        description: skill.metadata.description,
        tags: skill.metadata.tags,
        enabled: skill.metadata.enabled,
        layer: skill.metadata.layer,
        priority: skill.metadata.priority,
        type: skill.metadata.type,
        parameters: skill.parameters,
      } : undefined,
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
    if (!this.cacheValid) {
      this.rebuildCache();
    }
    return this.resolutionCache.get(skillName);
  }

  private rebuildCache(): void {
    this.resolutionCache.clear();

    const layerOrder: SkillLayer[] = ['system', 'bundled', 'user', 'workspace'];

    for (const layer of layerOrder) {
      const layerSkills = this.layers.get(layer);
      if (!layerSkills || !this.layerConfigs.get(layer)?.enabled) continue;

      for (const skill of layerSkills.values()) {
        if (skill.metadata?.enabled !== false) {
          this.resolutionCache.set(skill.name, skill);
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
    for (const layer of this.layers.values()) {
      all.push(...layer.values());
    }
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
        const existing = seen.get(skill.name);
        if (existing) {
          overrides.push({
            field: 'layer',
            value: layer,
            skillId: skill.id || '',
            overriddenBy: layer,
            originalLayer: existing.layer,
            reason: `Layer ${layer} (${this.getLayerPriority(layer)}) overrides ${existing.layer} (${this.getLayerPriority(existing.layer)})`,
          });
        }
        seen.set(skill.name, { layer, skill });
      }
    }

    return overrides;
  }

  enable(skillId: string): boolean {
    const skill = this.get(skillId);
    if (skill && skill.metadata) {
      skill.metadata.enabled = true;
      this.invalidateCache();
      return true;
    }
    return false;
  }

  disable(skillId: string): boolean {
    const skill = this.get(skillId);
    if (skill && skill.metadata) {
      skill.metadata.enabled = false;
      this.invalidateCache();
      return true;
    }
    return false;
  }

  getLayerPriority(layer: SkillLayer): number {
    const priorities: Record<SkillLayer, number> = {
      workspace: 100,
      user: 75,
      bundled: 50,
      system: 25,
    };
    return priorities[layer];
  }

  private hash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  getStats(): {
    total: number;
    byLayer: Record<SkillLayer, number>;
    resolved: number;
    overrides: number;
  } {
    const byLayer: Record<SkillLayer, number> = {
      workspace: 0,
      user: 0,
      bundled: 0,
      system: 0,
    };

    for (const [layer, skills] of this.layers) {
      byLayer[layer] = skills.size;
    }

    return {
      total: this.getAll().length,
      byLayer,
      resolved: this.getResolved().length,
      overrides: this.getOverrides().length,
    };
  }

  exportConfig(): {
    layers: Record<SkillLayer, LayerConfig>;
    skills: Array<{ id: string; name: string; layer: SkillLayer; enabled: boolean }>;
  } {
    return {
      layers: Object.fromEntries(this.layerConfigs) as Record<SkillLayer, LayerConfig>,
      skills: this.getAll().map(s => ({
        id: s.id || '',
        name: s.name,
        layer: s.layer,
        enabled: s.metadata?.enabled !== false,
      })),
    };
  }
}

export const globalFourLayerSystem = new FourLayerSkillSystem();

export function initializeDefaultSkills(system: FourLayerSkillSystem = globalFourLayerSystem): void {
  const defaultSkills: Array<{ layer: SkillLayer; skill: SkillDefinition }> = [
    {
      layer: 'system',
      skill: {
        name: 'security_scan',
        layer: 'system',
        metadata: {
          name: 'security_scan',
          version: '1.0.0',
          description: '安全扫描技能',
          type: 'workflow',
          layer: 'system',
          enabled: true,
          priority: 1,
          tags: ['security', 'scan'],
        },
        parameters: [
          { name: 'target', type: 'string', description: '扫描目标', required: true },
        ],
      },
    },
    {
      layer: 'system',
      skill: {
        name: 'threat_analysis',
        layer: 'system',
        metadata: {
          name: 'threat_analysis',
          version: '1.0.0',
          description: '威胁分析技能',
          type: 'knowledge',
          layer: 'system',
          enabled: true,
          priority: 1,
          tags: ['threat', 'analysis'],
        },
        parameters: [
          { name: 'indicator', type: 'string', description: '威胁指标', required: true },
        ],
      },
    },
  ];

  for (const { layer, skill } of defaultSkills) {
    system.register(
      layer,
      skill,
      { execute: async (ctx: Record<string, unknown>) => ({
        success: true,
        output: `执行 ${skill.name}: ${JSON.stringify(ctx)}`,
      })},
      `/${layer}/skills/${skill.name}`
    );
  }
}
