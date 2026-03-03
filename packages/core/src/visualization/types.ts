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

export type ChartSubType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'donut'
  | 'area'
  | 'scatter'
  | 'radar'
  | 'funnel';

export type VisualizationCategory =
  | 'dashboard'
  | 'report'
  | 'widget'
  | 'panel'
  | 'modal';

export interface VisualizationDefinition {
  id: string;
  skillId: string;
  name: string;
  description: string;
  type: VisualizationType;
  category: VisualizationCategory;
  version: string;
  
  dataSchema: DataSchema;
  config: VisualizationConfig;
  
  component: ComponentReference;
  
  permissions: PermissionConfig;
  localization: LocalizationConfig;
  
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface DataSchema {
  input: SchemaField[];
  output?: SchemaField[];
  transformations?: DataTransformation[];
  refreshInterval?: number;
  cacheStrategy?: 'none' | 'short' | 'medium' | 'long';
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: unknown;
  message?: string;
}

export interface DataTransformation {
  type: 'filter' | 'sort' | 'aggregate' | 'map' | 'reduce';
  config: Record<string, unknown>;
}

export interface VisualizationConfig {
  chart?: ChartConfig;
  table?: TableConfig;
  timeline?: TimelineConfig;
  graph?: GraphConfig;
  map?: MapConfig;
  custom?: CustomConfig;
  
  layout: LayoutConfig;
  styling: StylingConfig;
  interactions: InteractionConfig[];
}

export interface ChartConfig {
  subType: ChartSubType;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series: SeriesConfig[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  zoom?: boolean;
  animation?: boolean;
}

export interface AxisConfig {
  field: string;
  label?: string;
  type?: 'linear' | 'logarithmic' | 'category' | 'time';
  min?: number;
  max?: number;
  format?: string;
}

export interface SeriesConfig {
  field: string;
  name: string;
  type?: ChartSubType;
  color?: string;
  stack?: string;
  areaStyle?: 'none' | 'solid' | 'gradient';
}

export interface LegendConfig {
  position: 'top' | 'bottom' | 'left' | 'right';
  show: boolean;
}

export interface TooltipConfig {
  show: boolean;
  trigger: 'item' | 'axis';
  formatter?: string;
}

export interface TableConfig {
  columns: TableColumnConfig[];
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
  selection?: 'none' | 'single' | 'multiple';
  expandable?: boolean;
}

export interface TableColumnConfig {
  field: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: 'text' | 'number' | 'date' | 'link' | 'badge' | 'progress' | 'custom';
  renderConfig?: Record<string, unknown>;
}

export interface PaginationConfig {
  enabled: boolean;
  pageSize: number;
  pageSizeOptions: number[];
}

export interface SortingConfig {
  enabled: boolean;
  defaultField?: string;
  defaultDirection?: 'asc' | 'desc';
}

export interface FilteringConfig {
  enabled: boolean;
  globalSearch?: boolean;
  columnFilters?: boolean;
}

export interface TimelineConfig {
  timeField: string;
  eventField: string;
  groupField?: string;
  colorField?: string;
  zoomable: boolean;
  showLabels: boolean;
  orientation: 'horizontal' | 'vertical';
}

export interface GraphConfig {
  nodeField: string;
  edgeField?: string;
  layout: 'force' | 'tree' | 'radial' | 'circular' | 'hierarchical';
  nodeConfig: NodeVisualConfig;
  edgeConfig: EdgeVisualConfig;
  zoomable: boolean;
  draggable: boolean;
}

export interface NodeVisualConfig {
  sizeField?: string;
  colorField?: string;
  labelField: string;
  shape: 'circle' | 'square' | 'diamond' | 'icon';
  icon?: string;
}

export interface EdgeVisualConfig {
  widthField?: string;
  colorField?: string;
  labelField?: string;
  curved: boolean;
  animated: boolean;
}

export interface MapConfig {
  regionField: string;
  valueField?: string;
  mapType: 'world' | 'country' | 'region';
  regionCode?: string;
  colorScale: ColorScaleConfig;
}

export interface ColorScaleConfig {
  type: 'continuous' | 'discrete';
  colors: string[];
  min?: number;
  max?: number;
}

export interface CustomConfig {
  framework: 'react' | 'vue' | 'web-component';
  entryPoint: string;
  dependencies?: string[];
  props?: Record<string, unknown>;
}

export interface LayoutConfig {
  width: number | 'auto' | '100%';
  height: number | 'auto' | '100%';
  minWidth?: number;
  minHeight?: number;
  responsive: boolean;
  aspectRatio?: number;
}

export interface StylingConfig {
  theme: 'light' | 'dark' | 'auto';
  colorPalette?: string[];
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  borderWidth?: number;
  borderRadius?: number;
  customStyles?: Record<string, string>;
}

export interface InteractionConfig {
  type: 'click' | 'hover' | 'select' | 'drag' | 'zoom' | 'pan';
  action: InteractionAction;
  enabled: boolean;
}

export interface InteractionAction {
  type: 'navigate' | 'filter' | 'highlight' | 'tooltip' | 'emit' | 'callback';
  target?: string;
  params?: Record<string, unknown>;
}

export interface ComponentReference {
  type: 'builtin' | 'registered' | 'external';
  name: string;
  path?: string;
  bundle?: string;
  loader?: string;
}

export interface PermissionConfig {
  viewRoles: string[];
  editRoles: string[];
  adminRoles: string[];
}

export interface LocalizationConfig {
  defaultLocale: string;
  supportedLocales: string[];
  translationsPath?: string;
}

export interface VisualizationInstance {
  id: string;
  definitionId: string;
  skillId: string;
  context: InstanceContext;
  data: unknown;
  state: InstanceState;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstanceContext {
  dashboardId?: string;
  pageId?: string;
  containerId?: string;
  userId?: string;
  sessionId?: string;
  filters?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface InstanceState {
  loading: boolean;
  error?: string;
  lastRefresh?: Date;
  interactions?: Record<string, unknown>;
}

export interface DashboardDefinition {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  widgets: WidgetDefinition[];
  filters: DashboardFilter[];
  permissions: PermissionConfig;
  refreshInterval?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'custom';
  columns: number;
  rowHeight: number;
  gap: number;
  responsive: boolean;
  breakpoints?: Record<string, number>;
}

export interface WidgetDefinition {
  id: string;
  visualizationId: string;
  title?: string;
  position: WidgetPosition;
  configOverrides?: Partial<VisualizationConfig>;
  dataSource?: WidgetDataSource;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

export interface WidgetDataSource {
  type: 'inline' | 'api' | 'skill' | 'stream';
  config: Record<string, unknown>;
  mapping?: DataMapping;
}

export interface DataMapping {
  fieldMappings: Record<string, string>;
  transformations?: DataTransformation[];
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'text';
  field: string;
  defaultValue?: unknown;
  options?: FilterOption[];
  dependentFilters?: string[];
}

export interface FilterOption {
  label: string;
  value: unknown;
}

export interface VisualizationRegistryStats {
  totalDefinitions: number;
  definitionsByType: Record<VisualizationType, number>;
  definitionsBySkill: Record<string, number>;
  totalInstances: number;
  totalDashboards: number;
}

export type VisualizationEventHandler = (eventType: string, data: unknown) => void | Promise<void>;
