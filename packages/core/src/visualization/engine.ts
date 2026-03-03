import type {
  VisualizationDefinition,
  VisualizationInstance,
  DashboardDefinition,
  VisualizationRegistryStats,
  VisualizationType,
  VisualizationEventHandler,
  DataSchema,
  VisualizationConfig,
  ComponentReference,
  WidgetDefinition,
  DashboardFilter,
} from './types.js';

export class VisualizationRegistry {
  private definitions: Map<string, VisualizationDefinition> = new Map();
  private instances: Map<string, VisualizationInstance> = new Map();
  private dashboards: Map<string, DashboardDefinition> = new Map();
  private skillVisualizations: Map<string, Set<string>> = new Map();
  private eventHandlers: VisualizationEventHandler[] = [];

  private builtinVisualizations: Map<string, BuiltinVisualization> = new Map();

  constructor() {
    this.registerBuiltinVisualizations();
  }

  private registerBuiltinVisualizations(): void {
    const builtins: BuiltinVisualization[] = [
      {
        type: 'chart',
        name: 'line-chart',
        defaultConfig: {
          chart: {
            subType: 'line',
            series: [],
            legend: { position: 'bottom', show: true },
            tooltip: { show: true, trigger: 'axis' },
            zoom: true,
            animation: true,
          },
          layout: { width: '100%', height: 300, responsive: true },
          styling: { theme: 'auto', fontSize: 'medium' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'labels', type: 'array', required: true },
            { name: 'values', type: 'array', required: true },
          ],
        },
      },
      {
        type: 'chart',
        name: 'bar-chart',
        defaultConfig: {
          chart: {
            subType: 'bar',
            series: [],
            legend: { position: 'bottom', show: true },
            tooltip: { show: true, trigger: 'axis' },
            zoom: false,
            animation: true,
          },
          layout: { width: '100%', height: 300, responsive: true },
          styling: { theme: 'auto', fontSize: 'medium' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'categories', type: 'array', required: true },
            { name: 'values', type: 'array', required: true },
          ],
        },
      },
      {
        type: 'chart',
        name: 'pie-chart',
        defaultConfig: {
          chart: {
            subType: 'pie',
            series: [],
            legend: { position: 'right', show: true },
            tooltip: { show: true, trigger: 'item' },
            zoom: false,
            animation: true,
          },
          layout: { width: '100%', height: 300, responsive: true },
          styling: { theme: 'auto', fontSize: 'medium' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'name', type: 'string', required: true },
            { name: 'value', type: 'number', required: true },
          ],
        },
      },
      {
        type: 'table',
        name: 'data-table',
        defaultConfig: {
          table: {
            columns: [],
            pagination: { enabled: true, pageSize: 10, pageSizeOptions: [10, 25, 50, 100] },
            sorting: { enabled: true },
            filtering: { enabled: true, globalSearch: true, columnFilters: true },
            selection: 'none',
            expandable: false,
          },
          layout: { width: '100%', height: 'auto', responsive: true },
          styling: { theme: 'auto', fontSize: 'small' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'rows', type: 'array', required: true },
            { name: 'columns', type: 'array', required: false },
          ],
        },
      },
      {
        type: 'timeline',
        name: 'event-timeline',
        defaultConfig: {
          timeline: {
            timeField: 'timestamp',
            eventField: 'event',
            zoomable: true,
            showLabels: true,
            orientation: 'horizontal',
          },
          layout: { width: '100%', height: 200, responsive: true },
          styling: { theme: 'auto', fontSize: 'medium' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'events', type: 'array', required: true },
            { name: 'timestamp', type: 'date', required: true },
          ],
        },
      },
      {
        type: 'graph',
        name: 'network-graph',
        defaultConfig: {
          graph: {
            nodeField: 'id',
            layout: 'force',
            nodeConfig: { labelField: 'name', shape: 'circle' },
            edgeConfig: { curved: false, animated: false },
            zoomable: true,
            draggable: true,
          },
          layout: { width: '100%', height: 400, responsive: true },
          styling: { theme: 'auto', fontSize: 'medium' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'nodes', type: 'array', required: true },
            { name: 'edges', type: 'array', required: false },
          ],
        },
      },
      {
        type: 'gauge',
        name: 'metric-gauge',
        defaultConfig: {
          layout: { width: 200, height: 150, responsive: false },
          styling: { theme: 'auto', fontSize: 'medium' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'value', type: 'number', required: true },
            { name: 'max', type: 'number', required: false, defaultValue: 100 },
          ],
        },
      },
      {
        type: 'heatmap',
        name: 'correlation-heatmap',
        defaultConfig: {
          layout: { width: '100%', height: 300, responsive: true },
          styling: { theme: 'auto', fontSize: 'small' },
          interactions: [],
        },
        defaultDataSchema: {
          input: [
            { name: 'matrix', type: 'array', required: true },
            { name: 'xLabels', type: 'array', required: true },
            { name: 'yLabels', type: 'array', required: true },
          ],
        },
      },
    ];

    for (const viz of builtins) {
      this.builtinVisualizations.set(viz.name, viz);
    }
  }

  registerSkillVisualization(options: {
    skillId: string;
    name: string;
    description: string;
    type: VisualizationType;
    category?: 'dashboard' | 'report' | 'widget' | 'panel' | 'modal';
    dataSchema: DataSchema;
    config: Partial<VisualizationConfig>;
    component?: ComponentReference;
    tags?: string[];
    author: string;
  }): VisualizationDefinition {
    const id = this.generateId('viz');

    const builtin = this.builtinVisualizations.get(options.type === 'chart' ? 'line-chart' : `${options.type}-chart`);

    const definition: VisualizationDefinition = {
      id,
      skillId: options.skillId,
      name: options.name,
      description: options.description,
      type: options.type,
      category: options.category || 'widget',
      version: '1.0.0',
      dataSchema: options.dataSchema,
      config: {
        ...builtin?.defaultConfig,
        ...options.config,
      } as VisualizationConfig,
      component: options.component || {
        type: 'builtin',
        name: this.getBuiltinName(options.type),
      },
      permissions: {
        viewRoles: ['*'],
        editRoles: ['admin'],
        adminRoles: ['admin'],
      },
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['en'],
      },
      author: options.author,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: options.tags || [],
    };

    this.definitions.set(id, definition);

    if (!this.skillVisualizations.has(options.skillId)) {
      this.skillVisualizations.set(options.skillId, new Set());
    }
    this.skillVisualizations.get(options.skillId)!.add(id);

    this.emit('visualization_registered', definition);
    return definition;
  }

  private getBuiltinName(type: VisualizationType): string {
    const mapping: Record<VisualizationType, string> = {
      chart: 'line-chart',
      table: 'data-table',
      timeline: 'event-timeline',
      graph: 'network-graph',
      map: 'geo-map',
      gauge: 'metric-gauge',
      heatmap: 'correlation-heatmap',
      treemap: 'hierarchy-treemap',
      sankey: 'flow-sankey',
      custom: 'custom-component',
    };
    return mapping[type] || 'line-chart';
  }

  registerFromYaml(skillId: string, yamlContent: string): VisualizationDefinition[] {
    const configs = this.parseYamlVisualizations(yamlContent);
    const definitions: VisualizationDefinition[] = [];

    for (const config of configs) {
      const def = this.registerSkillVisualization({
        skillId,
        ...config,
      });
      definitions.push(def);
    }

    return definitions;
  }

  private parseYamlVisualizations(yamlContent: string): Array<{
    name: string;
    description: string;
    type: VisualizationType;
    dataSchema: DataSchema;
    config: Partial<VisualizationConfig>;
    tags?: string[];
    author: string;
  }> {
    return [];
  }

  getDefinition(visualizationId: string): VisualizationDefinition | undefined {
    return this.definitions.get(visualizationId);
  }

  getVisualizationsBySkill(skillId: string): VisualizationDefinition[] {
    const ids = this.skillVisualizations.get(skillId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.definitions.get(id))
      .filter((d): d is VisualizationDefinition => d !== undefined);
  }

  getVisualizationsByType(type: VisualizationType): VisualizationDefinition[] {
    return Array.from(this.definitions.values()).filter(d => d.type === type);
  }

  createInstance(options: {
    visualizationId: string;
    context?: {
      dashboardId?: string;
      pageId?: string;
      containerId?: string;
      userId?: string;
      filters?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
    };
    data?: unknown;
  }): VisualizationInstance {
    const definition = this.definitions.get(options.visualizationId);
    if (!definition) {
      throw new Error(`Visualization not found: ${options.visualizationId}`);
    }

    const instanceId = this.generateId('instance');

    const instance: VisualizationInstance = {
      id: instanceId,
      definitionId: options.visualizationId,
      skillId: definition.skillId,
      context: {
        dashboardId: options.context?.dashboardId,
        pageId: options.context?.pageId,
        containerId: options.context?.containerId,
        userId: options.context?.userId,
        filters: options.context?.filters,
        parameters: options.context?.parameters,
      },
      data: options.data,
      state: {
        loading: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.instances.set(instanceId, instance);
    this.emit('instance_created', instance);
    return instance;
  }

  updateInstanceData(instanceId: string, data: unknown): VisualizationInstance {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.data = data;
    instance.state.lastRefresh = new Date();
    instance.updatedAt = new Date();

    this.emit('instance_updated', { instance, field: 'data' });
    return instance;
  }

  setInstanceState(instanceId: string, state: Partial<VisualizationInstance['state']>): VisualizationInstance {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.state = { ...instance.state, ...state };
    instance.updatedAt = new Date();

    this.emit('instance_state_changed', { instance, state });
    return instance;
  }

  getInstance(instanceId: string): VisualizationInstance | undefined {
    return this.instances.get(instanceId);
  }

  destroyInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    this.instances.delete(instanceId);
    this.emit('instance_destroyed', instance);
    return true;
  }

  createDashboard(options: {
    name: string;
    description?: string;
    widgets?: Array<{
      visualizationId: string;
      title?: string;
      position: { x: number; y: number; width: number; height: number };
      configOverrides?: Partial<VisualizationConfig>;
    }>;
    filters?: DashboardFilter[];
    createdBy: string;
  }): DashboardDefinition {
    const dashboardId = this.generateId('dashboard');
    const now = new Date();

    const widgets: WidgetDefinition[] = (options.widgets || []).map((w, i) => ({
      id: this.generateId('widget'),
      visualizationId: w.visualizationId,
      title: w.title,
      position: w.position,
      configOverrides: w.configOverrides,
    }));

    const dashboard: DashboardDefinition = {
      id: dashboardId,
      name: options.name,
      description: options.description || '',
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 80,
        gap: 16,
        responsive: true,
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      },
      widgets,
      filters: options.filters || [],
      permissions: {
        viewRoles: ['*'],
        editRoles: ['admin'],
        adminRoles: ['admin'],
      },
      refreshInterval: 60000,
      createdAt: now,
      updatedAt: now,
      createdBy: options.createdBy,
    };

    this.dashboards.set(dashboardId, dashboard);
    this.emit('dashboard_created', dashboard);
    return dashboard;
  }

  addWidgetToDashboard(dashboardId: string, options: {
    visualizationId: string;
    title?: string;
    position: { x: number; y: number; width: number; height: number };
    configOverrides?: Partial<VisualizationConfig>;
  }): WidgetDefinition {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const widget: WidgetDefinition = {
      id: this.generateId('widget'),
      visualizationId: options.visualizationId,
      title: options.title,
      position: options.position,
      configOverrides: options.configOverrides,
    };

    dashboard.widgets.push(widget);
    dashboard.updatedAt = new Date();

    this.emit('widget_added', { dashboard, widget });
    return widget;
  }

  removeWidgetFromDashboard(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const index = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (index === -1) return false;

    const removed = dashboard.widgets.splice(index, 1)[0];
    dashboard.updatedAt = new Date();

    this.emit('widget_removed', { dashboard, widget: removed });
    return true;
  }

  getDashboard(dashboardId: string): DashboardDefinition | undefined {
    return this.dashboards.get(dashboardId);
  }

  listDashboards(): DashboardDefinition[] {
    return Array.from(this.dashboards.values());
  }

  getStats(): VisualizationRegistryStats {
    const definitionsByType: Record<VisualizationType, number> = {
      chart: 0,
      table: 0,
      timeline: 0,
      graph: 0,
      map: 0,
      gauge: 0,
      heatmap: 0,
      treemap: 0,
      sankey: 0,
      custom: 0,
    };

    const definitionsBySkill: Record<string, number> = {};

    for (const def of this.definitions.values()) {
      definitionsByType[def.type]++;
      definitionsBySkill[def.skillId] = (definitionsBySkill[def.skillId] || 0) + 1;
    }

    return {
      totalDefinitions: this.definitions.size,
      definitionsByType,
      definitionsBySkill,
      totalInstances: this.instances.size,
      totalDashboards: this.dashboards.size,
    };
  }

  validateData(visualizationId: string, data: unknown): { valid: boolean; errors: string[] } {
    const definition = this.definitions.get(visualizationId);
    if (!definition) {
      return { valid: false, errors: ['Visualization not found'] };
    }

    const errors: string[] = [];
    const schema = definition.dataSchema;

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Data must be an object'] };
    }

    for (const field of schema.input) {
      if (field.required) {
        const value = (data as Record<string, unknown>)[field.name];
        if (value === undefined || value === null) {
          errors.push(`Required field '${field.name}' is missing`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  unregisterVisualization(visualizationId: string): boolean {
    const definition = this.definitions.get(visualizationId);
    if (!definition) return false;

    this.definitions.delete(visualizationId);

    const skillViz = this.skillVisualizations.get(definition.skillId);
    if (skillViz) {
      skillViz.delete(visualizationId);
    }

    for (const [instanceId, instance] of this.instances) {
      if (instance.definitionId === visualizationId) {
        this.instances.delete(instanceId);
      }
    }

    this.emit('visualization_unregistered', definition);
    return true;
  }

  addEventHandler(handler: VisualizationEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(eventType: string, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(eventType, data);
      } catch {
        // Intentionally ignoring handler errors to prevent cascading failures
      }
    }
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `viz_${prefix}_${timestamp}_${random}`;
  }
}

interface BuiltinVisualization {
  type: VisualizationType;
  name: string;
  defaultConfig: Partial<VisualizationConfig>;
  defaultDataSchema: DataSchema;
}

export function createVisualizationRegistry(): VisualizationRegistry {
  return new VisualizationRegistry();
}
