export type A2UIVersion = "v0.8" | "v0.9";

export type A2UIAction =
  | "surfaceUpdate"
  | "beginRendering"
  | "dataModelUpdate"
  | "deleteSurface"
  | "createSurface";

export interface A2UIMessage {
  id: string;
  version: A2UIVersion;
  action: A2UIAction;
  payload: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface EdgeInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface TextProps {
  text: { literalString: string } | { binding: string };
  usageHint?: "title" | "body" | "caption";
}

export interface ColumnProps {
  children: { explicitList: string[] } | { lazyList: string };
  padding?: EdgeInsets;
  alignment?: "start" | "center" | "end";
}

export interface RowProps {
  children: { explicitList: string[] } | { lazyList: string };
  spacing?: number;
}

export interface ButtonProps {
  label: string;
  actionName: string;
  style?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export interface CardProps {
  title: string;
  subtitle?: string;
  child: string;
}

export interface ListProps {
  items: string[];
  ordered?: boolean;
}

export interface ChartProps {
  chartType: "line" | "bar" | "pie";
  series: Array<{
    name: string;
    values: number[];
  }>;
  labels?: string[];
}

export interface ActionButton {
  id: string;
  label: string;
  actionName: string;
}

export interface AlertItem {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  timestamp: number;
}

export interface ThreatCardProps {
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  indicators: string[];
  timestamp: number;
  actions: ActionButton[];
}

export interface SecurityMetricProps {
  label: string;
  value: number | string;
  trend?: "up" | "down" | "stable";
  status: "normal" | "warning" | "critical";
  sparkline?: number[];
}

export interface AlertListProps {
  alerts: AlertItem[];
  groupBySeverity: boolean;
  maxItems: number;
}

export interface TextComponent {
  id: string;
  component: { Text: TextProps };
}

export interface ColumnComponent {
  id: string;
  component: { Column: ColumnProps };
}

export interface RowComponent {
  id: string;
  component: { Row: RowProps };
}

export interface ButtonComponent {
  id: string;
  component: { Button: ButtonProps };
}

export interface CardComponent {
  id: string;
  component: { Card: CardProps };
}

export interface ListComponent {
  id: string;
  component: { List: ListProps };
}

export interface ChartComponent {
  id: string;
  component: { Chart: ChartProps };
}

export interface ThreatCardComponent {
  id: string;
  component: { ThreatCard: ThreatCardProps };
}

export interface SecurityMetricComponent {
  id: string;
  component: { SecurityMetric: SecurityMetricProps };
}

export interface AlertListComponent {
  id: string;
  component: { AlertList: AlertListProps };
}

export type SecurityComponent =
  | ThreatCardComponent
  | SecurityMetricComponent
  | AlertListComponent;

export type UIComponent =
  | TextComponent
  | ColumnComponent
  | RowComponent
  | ButtonComponent
  | CardComponent
  | ListComponent
  | ChartComponent
  | SecurityComponent;

export interface Surface {
  id: string;
  components: Map<string, UIComponent>;
  root?: string;
  dataModel?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SurfaceConfig {
  root?: string;
  dataModel?: Record<string, unknown>;
}

export interface UserAction {
  id: string;
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  context?: Record<string, unknown>;
}

export interface SurfaceUpdatePayload {
  surfaceId: string;
  operation: "push" | "update" | "delete";
  component?: UIComponent;
  componentId?: string;
  updates?: Partial<UIComponent>;
}

export interface BeginRenderingPayload {
  surfaceId: string;
  rootId: string;
}

export interface DataModelUpdatePayload {
  surfaceId: string;
  model: Record<string, unknown>;
}

export interface CreateSurfacePayload {
  surfaceId: string;
  config?: SurfaceConfig;
}

export interface DeleteSurfacePayload {
  surfaceId: string;
}

export interface UserActionEnvelope {
  type: "userAction";
  action: UserAction;
}

export interface A2UITransport {
  send(data: string): void;
  close?(): void;
  onMessage?(handler: (data: string) => void): void;
}

export interface A2UIServerConfig {
  version?: A2UIVersion;
  transport?: A2UITransport;
}

export interface A2UIClientConfig {
  version?: A2UIVersion;
  transport?: A2UITransport;
}

export type UserActionHandler = (action: UserAction) => void;
export type MessageHandler = (message: A2UIMessage) => void;
export type SurfaceUpdateHandler = (payload: SurfaceUpdatePayload) => void;
