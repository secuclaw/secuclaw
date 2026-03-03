/**
 * Canvas Types - TypeScript type definitions for the Live Canvas engine
 */

// =============================================================================
// Element Types
// =============================================================================

/** Base element type identifier */
export type ElementType =
  | "rectangle"
  | "circle"
  | "line"
  | "text"
  | "image"
  | "annotation"
  | "chart"
  | "map"
  | "timeline"
  | "status"
  | "alert"
  | "metric"
  | "table"
  | "log"
  | "network-graph";

/** Severity levels for security elements */
export type SeverityLevel = "info" | "warning" | "error" | "critical" | "low" | "medium" | "high";

/** Network node types */
export type NetworkNodeType = "host" | "server" | "firewall" | "router" | "cloud";

/** Network node status */
export type NodeStatus = "healthy" | "warning" | "critical" | "unknown";

/** Traffic level */
export type TrafficLevel = "normal" | "elevated" | "suspicious";

/** Graph layout types */
export type GraphLayout = "force" | "hierarchical" | "circular";

/** Theme type */
export type ThemeType = "light" | "dark";

/** Export format */
export type ExportFormat = "png" | "svg" | "json";

// =============================================================================
// Base Interfaces
// =============================================================================

/** Base properties for all canvas elements */
export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  rotation: number;
  opacity: number;
  createdAt: number;
  updatedAt: number;
}

/** Viewport state */
export interface ViewportState {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

/** Theme configuration */
export interface ThemeConfig {
  type: ThemeType;
  colors: Record<string, string>;
  fonts: Record<string, string>;
}

// =============================================================================
// Shape Elements
// =============================================================================

/** Rectangle element */
export interface RectangleElement extends BaseElement {
  type: "rectangle";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

/** Circle element */
export interface CircleElement extends BaseElement {
  type: "circle";
  fill: string;
  stroke: string;
  strokeWidth: number;
  rx: number; // radius x
  ry: number; // radius y
}

/** Line element */
export interface LineElement extends BaseElement {
  type: "line";
  points: number[]; // [x1, y1, x2, y2, ...]
  stroke: string;
  strokeWidth: number;
  dashArray?: number[];
}

// =============================================================================
// Content Elements
// =============================================================================

/** Text element */
export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  align: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
}

/** Image element */
export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  alt: string;
  objectFit: "contain" | "cover" | "fill";
}

// =============================================================================
// Annotation Elements
// =============================================================================

/** Annotation element */
export interface AnnotationElement extends BaseElement {
  type: "annotation";
  content: string;
  style: "note" | "comment" | "highlight";
  author?: string;
  timestamp: number;
}

// =============================================================================
// Security-Specific Elements
// =============================================================================

/** Threat marker for threat maps */
export interface ThreatMarker {
  id: string;
  lat: number;
  lng: number;
  severity: SeverityLevel;
  threatType: string;
  timestamp: number;
  source: string;
  description?: string;
}

/** Threat map element */
export interface ThreatMapElement extends BaseElement {
  type: "map";
  subType: "threat-map";
  threats: ThreatMarker[];
  center: { lat: number; lng: number };
  zoom: number;
  showLegend: boolean;
}

/** Security alert */
export interface SecurityAlert {
  id: string;
  timestamp: number;
  severity: SeverityLevel;
  title: string;
  description: string;
  source: string;
  indicators?: string[];
  mitigation?: string;
}

/** Alert timeline element */
export interface AlertTimelineElement extends BaseElement {
  type: "timeline";
  subType: "alert-timeline";
  alerts: SecurityAlert[];
  timeRange: { start: number; end: number };
  groupBySeverity: boolean;
}

/** Network node */
export interface NetworkNode {
  id: string;
  label: string;
  nodeType: NetworkNodeType;
  status: NodeStatus;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/** Network edge */
export interface NetworkEdge {
  from: string;
  to: string;
  label?: string;
  traffic: TrafficLevel;
}

/** Network graph element */
export interface NetworkGraphElement extends BaseElement {
  type: "network-graph";
  subType: "network-graph";
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  layout: GraphLayout;
}

/** Metric element */
export interface MetricElement extends BaseElement {
  type: "metric";
  value: number;
  label: string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  threshold?: { warning: number; critical: number };
}

/** Status indicator element */
export interface StatusElement extends BaseElement {
  type: "status";
  status: NodeStatus;
  label: string;
  pulse: boolean;
}

/** Table row */
export interface TableRow {
  id: string;
  cells: string[];
}

/** Table element */
export interface TableElement extends BaseElement {
  type: "table";
  headers: string[];
  rows: TableRow[];
  sortable: boolean;
  striped: boolean;
}

/** Log entry */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: SeverityLevel;
  message: string;
  source?: string;
}

/** Log stream element */
export interface LogElement extends BaseElement {
  type: "log";
  entries: LogEntry[];
  maxEntries: number;
  autoScroll: boolean;
  filter?: string;
}

// =============================================================================
// Chart Elements (Generic)
// =============================================================================

/** Chart data point */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/** Chart element */
export interface ChartElement extends BaseElement {
  type: "chart";
  chartType: "bar" | "line" | "pie" | "area" | "scatter";
  data: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend: boolean;
  showGrid: boolean;
}

// =============================================================================
// Union Type for All Elements
// =============================================================================

/** All canvas element types */
export type CanvasElement =
  | RectangleElement
  | CircleElement
  | LineElement
  | TextElement
  | ImageElement
  | AnnotationElement
  | ThreatMapElement
  | AlertTimelineElement
  | NetworkGraphElement
  | MetricElement
  | StatusElement
  | TableElement
  | LogElement
  | ChartElement;

// =============================================================================
// Canvas State
// =============================================================================

/** Canvas state */
export interface CanvasState {
  version: string;
  elements: Map<string, CanvasElement>;
  viewport: ViewportState;
  theme: ThemeConfig;
  lastUpdate: number;
}

/** Serialized canvas state (for JSON) */
export interface SerializedCanvasState {
  version: string;
  elements: CanvasElement[];
  viewport: ViewportState;
  theme: ThemeConfig;
  lastUpdate: number;
}

// =============================================================================
// Canvas Configuration
// =============================================================================

/** Canvas configuration */
export interface CanvasConfig {
  width: number;
  height: number;
  theme: ThemeType;
  backgroundColor: string;
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

/** Default canvas configuration */
export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 1920,
  height: 1080,
  theme: "dark",
  backgroundColor: "#1a1a2e",
  gridEnabled: true,
  snapToGrid: false,
  gridSize: 20,
};

// =============================================================================
// Canvas Server Types
// =============================================================================

/** Canvas server options */
export interface CanvasServerOpts {
  rootDir?: string;
  port?: number;
  host?: string;
  liveReload?: boolean;
}

/** Canvas server instance */
export interface CanvasServer {
  port: number;
  host: string;
  rootDir: string;
  close: () => Promise<void>;
}

// =============================================================================
// Session Types
// =============================================================================

/** Canvas session */
export interface CanvasSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  collaborators: CanvasSessionMember[];
  state: SerializedCanvasState;
}

/** Canvas session member */
export interface CanvasSessionMember {
  userId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: number;
  cursor?: { x: number; y: number };
  color: string;
}

/** Session events */
export type SessionEvent =
  | { type: "join"; userId: string; sessionId: string }
  | { type: "leave"; userId: string; sessionId: string }
  | { type: "cursor_move"; userId: string; position: { x: number; y: number } }
  | { type: "element_add"; element: CanvasElement }
  | { type: "element_update"; elementId: string; updates: Partial<CanvasElement> }
  | { type: "element_delete"; elementId: string }
  | { type: "state_sync"; state: SerializedCanvasState };

// =============================================================================
// Sync Types
// =============================================================================

/** Sync message types */
export type SyncMessageType =
  | "join"
  | "leave"
  | "cursor"
  | "element_add"
  | "element_update"
  | "element_delete"
  | "state_request"
  | "state_response"
  | "error";

/** Sync message */
export interface SyncMessage {
  type: SyncMessageType;
  sessionId: string;
  userId: string;
  timestamp: number;
  payload: unknown;
}

/** Sync connection status */
export type SyncConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

/** Sync options */
export interface SyncOptions {
  sessionId: string;
  userId: string;
  wsUrl: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

// =============================================================================
// Event Types
// =============================================================================

/** Canvas event listener */
export type CanvasEventListener = (event: CanvasEvent) => void;

/** Canvas events */
export type CanvasEvent =
  | { type: "element_added"; element: CanvasElement }
  | { type: "element_updated"; elementId: string; updates: Partial<CanvasElement> }
  | { type: "element_deleted"; elementId: string }
  | { type: "viewport_changed"; viewport: ViewportState }
  | { type: "theme_changed"; theme: ThemeConfig }
  | { type: "session_joined"; sessionId: string }
  | { type: "session_left"; sessionId: string }
  | { type: "member_joined"; member: CanvasSessionMember }
  | { type: "member_left"; userId: string }
  | { type: "cursor_moved"; userId: string; position: { x: number; y: number } }
  | { type: "sync_status_changed"; status: SyncConnectionStatus }
  | { type: "state_sync"; state: SerializedCanvasState }
  | { type: "error"; error: Error };

/** State listener */
export type StateListener = (state: CanvasState) => void;
