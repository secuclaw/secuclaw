export type VisualizationType = 
  | 'chart'
  | 'table'
  | 'timeline'
  | 'graph'
  | 'map'
  | 'gauge'
  | 'heatmap'
  | 'treemap'
  | 'sankey'
  | 'custom';

export type VisualizationCategory =
  | 'dashboard'
  | 'report'
  | 'widget'
  | 'panel'
  | 'modal';

export interface SkillVisualizationConfig {
  id: string;
  name: string;
  description?: string;
  type: VisualizationType;
  category?: VisualizationCategory;
  
  dataSource: string;
  dataTransform?: string;
  refreshInterval?: number;
  
  config: Record<string, unknown>;
  
  layout?: {
    width?: number | 'auto' | '100%';
    height?: number | 'auto' | '100%';
    minWidth?: number;
    minHeight?: number;
  };
  
  styling?: {
    theme?: 'light' | 'dark' | 'auto';
    colorPalette?: string[];
  };
  
  interactions?: Array<{
    type: 'click' | 'hover' | 'select' | 'drilldown';
    action: string;
    params?: Record<string, unknown>;
  }>;
  
  permissions?: {
    viewRoles?: string[];
    editRoles?: string[];
  };
}

export interface SkillVisualizationFile {
  path: string;
  format: 'yaml' | 'json' | 'typescript';
  exports: string[];
}

export interface SkillVisualizationManifest {
  version: string;
  visualizations: SkillVisualizationConfig[];
  components?: SkillVisualizationFile[];
  dependencies?: Record<string, string>;
}

export interface SkillVisualization {
  skillId: string;
  skillName: string;
  manifest: SkillVisualizationManifest;
  loadedAt: Date;
  basePath: string;
}

export type VisualizationLoadMode = 'inline' | 'external' | 'hybrid';
