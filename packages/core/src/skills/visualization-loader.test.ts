import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import type { Skill } from './types.js';
import { loadSkillFromDir } from './loader.js';
import {
  loadSkillVisualizations,
  parseVisualizationsFromFrontmatter,
  loadVisualizationFiles,
} from './visualization-loader.js';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const TEST_SKILL_DIR = path.join(PROJECT_ROOT, 'skills/test-visualization-skill');

describe('Visualization Loader', () => {
  let skill: Skill | null;

  beforeAll(() => {
    skill = loadSkillFromDir(TEST_SKILL_DIR);
  });

  describe('Skill Loading', () => {
    it('should load skill from directory', () => {
      expect(skill).not.toBeNull();
      expect(skill?.name).toBe('test-visualization-skill');
    });

    it('should have valid skill content', () => {
      expect(skill).not.toBeNull();
      expect(skill?.content).toBeDefined();
      expect(skill?.content.frontmatter).toBeDefined();
    });
  });

  describe('Inline Visualizations', () => {
    it('should parse visualizations from frontmatter', () => {
      expect(skill).not.toBeNull();
      const frontmatter = skill!.content.frontmatter;
      const inlineViz = parseVisualizationsFromFrontmatter(frontmatter);

      expect(inlineViz.length).toBeGreaterThanOrEqual(2);
    });

    it('should have chart visualization', () => {
      expect(skill).not.toBeNull();
      const inlineViz = parseVisualizationsFromFrontmatter(skill!.content.frontmatter);
      const chartViz = inlineViz.find(v => v.id === 'inline-chart');

      expect(chartViz).toBeDefined();
      expect(chartViz?.type).toBe('chart');
    });

    it('should have gauge visualization', () => {
      expect(skill).not.toBeNull();
      const inlineViz = parseVisualizationsFromFrontmatter(skill!.content.frontmatter);
      const gaugeViz = inlineViz.find(v => v.id === 'inline-gauge');

      expect(gaugeViz).toBeDefined();
      expect(gaugeViz?.type).toBe('gauge');
    });
  });

  describe('File Visualizations', () => {
    it('should load visualization files', () => {
      const fileViz = loadVisualizationFiles(TEST_SKILL_DIR);

      expect(fileViz.length).toBeGreaterThanOrEqual(2);
    });

    it('should load graph visualization from YAML', () => {
      const fileViz = loadVisualizationFiles(TEST_SKILL_DIR);

      const graphViz = fileViz.find(v => v.id === 'files-network-graph');
      expect(graphViz).toBeDefined();
      expect(graphViz?.type).toBe('graph');
    });

    it('should load heatmap visualization from JSON', () => {
      const fileViz = loadVisualizationFiles(TEST_SKILL_DIR);

      const heatmapViz = fileViz.find(v => v.id === 'files-heatmap');
      expect(heatmapViz).toBeDefined();
      expect(heatmapViz?.type).toBe('heatmap');
    });
  });

  describe('Hybrid Loading', () => {
    it('should combine all visualizations in hybrid mode', () => {
      expect(skill).not.toBeNull();
      const skillViz = loadSkillVisualizations(skill!, 'hybrid');

      expect(skillViz).not.toBeNull();
      expect(skillViz?.manifest.visualizations.length).toBeGreaterThanOrEqual(2);
    });

    it('should include skill metadata', () => {
      expect(skill).not.toBeNull();
      const skillViz = loadSkillVisualizations(skill!, 'hybrid');

      expect(skillViz).not.toBeNull();
      expect(skillViz?.skillId).toBe('test-visualization-skill');
      expect(skillViz?.basePath).toBe(TEST_SKILL_DIR);
      expect(skillViz?.loadedAt).toBeInstanceOf(Date);
    });
  });
});
