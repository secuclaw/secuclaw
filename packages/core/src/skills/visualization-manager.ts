import type { Skill } from './types.js';
import type { SkillVisualization, SkillVisualizationConfig } from './visualization-types.js';
import { loadSkillVisualizations } from './visualization-loader.js';

export interface VisualizationRegistryAdapter {
  registerSkillVisualization(skillId: string, config: SkillVisualizationConfig): void;
  unregisterSkillVisualizations(skillId: string): void;
  getVisualization(visualizationId: string): SkillVisualizationConfig | undefined;
  getVisualizationsBySkill(skillId: string): SkillVisualizationConfig[];
}

export class SkillVisualizationManager {
  private visualizations: Map<string, SkillVisualization> = new Map();
  private registry: VisualizationRegistryAdapter | null = null;
  private handlers: SkillVisualizationEventHandler[] = [];

  setRegistry(registry: VisualizationRegistryAdapter): void {
    this.registry = registry;
  }

  registerSkill(skill: Skill): SkillVisualization | null {
    const skillViz = loadSkillVisualizations(skill);
    if (!skillViz) {
      return null;
    }

    this.visualizations.set(skill.name, skillViz);

    if (this.registry) {
      for (const config of skillViz.manifest.visualizations) {
        this.registry.registerSkillVisualization(skill.name, config);
      }
    }

    this.emit('skill_visualizations_registered', { skillId: skill.name, visualization: skillViz });
    return skillViz;
  }

  unregisterSkill(skillId: string): void {
    const skillViz = this.visualizations.get(skillId);
    if (!skillViz) return;

    if (this.registry) {
      this.registry.unregisterSkillVisualizations(skillId);
    }

    this.visualizations.delete(skillId);
    this.emit('skill_visualizations_unregistered', { skillId });
  }

  getSkillVisualizations(skillId: string): SkillVisualization | undefined {
    return this.visualizations.get(skillId);
  }

  getVisualization(skillId: string, visualizationId: string): SkillVisualizationConfig | undefined {
    const skillViz = this.visualizations.get(skillId);
    if (!skillViz) return undefined;

    return skillViz.manifest.visualizations.find(v => v.id === visualizationId);
  }

  getAllVisualizations(): Map<string, SkillVisualization> {
    return new Map(this.visualizations);
  }

  getVisualizationsByType(type: SkillVisualizationConfig['type']): Array<{ skillId: string; config: SkillVisualizationConfig }> {
    const result: Array<{ skillId: string; config: SkillVisualizationConfig }> = [];

    for (const [skillId, skillViz] of this.visualizations) {
      for (const config of skillViz.manifest.visualizations) {
        if (config.type === type) {
          result.push({ skillId, config });
        }
      }
    }

    return result;
  }

  getVisualizationsByCategory(category: SkillVisualizationConfig['category']): Array<{ skillId: string; config: SkillVisualizationConfig }> {
    const result: Array<{ skillId: string; config: SkillVisualizationConfig }> = [];

    for (const [skillId, skillViz] of this.visualizations) {
      for (const config of skillViz.manifest.visualizations) {
        if (config.category === category) {
          result.push({ skillId, config });
        }
      }
    }

    return result;
  }

  getStatistics(): {
    totalSkills: number;
    totalVisualizations: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    let totalVisualizations = 0;
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const skillViz of this.visualizations.values()) {
      totalVisualizations += skillViz.manifest.visualizations.length;

      for (const config of skillViz.manifest.visualizations) {
        byType[config.type] = (byType[config.type] || 0) + 1;
        if (config.category) {
          byCategory[config.category] = (byCategory[config.category] || 0) + 1;
        }
      }
    }

    return {
      totalSkills: this.visualizations.size,
      totalVisualizations,
      byType,
      byCategory,
    };
  }

  addEventHandler(handler: SkillVisualizationEventHandler): void {
    this.handlers.push(handler);
  }

  removeEventHandler(handler: SkillVisualizationEventHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  private emit(eventType: string, data: unknown): void {
    for (const handler of this.handlers) {
      try {
        handler(eventType, data);
      } catch {
        // Intentionally ignoring handler errors to prevent cascading failures
      }
    }
  }
}

export type SkillVisualizationEventHandler = (eventType: string, data: unknown) => void | Promise<void>;

export function createSkillVisualizationManager(): SkillVisualizationManager {
  return new SkillVisualizationManager();
}
