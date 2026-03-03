/**
 * Canvas Module - Live Canvas engine for real-time collaborative visualization
 * 
 * @module @secuclaw/core/canvas
 */

// Re-export types
export type {
  ElementType,
  SeverityLevel,
  NetworkNodeType,
  NodeStatus,
  TrafficLevel,
  GraphLayout,
  ThemeType,
  ExportFormat,
  BaseElement,
  ViewportState,
  ThemeConfig,
  RectangleElement,
  CircleElement,
  LineElement,
  TextElement,
  ImageElement,
  AnnotationElement,
  ThreatMarker,
  ThreatMapElement,
  SecurityAlert,
  AlertTimelineElement,
  NetworkNode,
  NetworkEdge,
  NetworkGraphElement,
  MetricElement,
  StatusElement,
  TableRow,
  TableElement,
  LogEntry,
  LogElement,
  ChartDataPoint,
  ChartElement,
  CanvasElement,
  CanvasState,
  SerializedCanvasState,
  CanvasConfig,
  CanvasServerOpts,
  CanvasServer,
  CanvasSession,
  CanvasSessionMember,
  SessionEvent,
  SyncMessageType,
  SyncMessage,
  SyncConnectionStatus,
  SyncOptions,
  CanvasEventListener,
  CanvasEvent,
  StateListener,
} from "./types.js";

// Re-export element factories
export {
  createRectangle,
  createCircle,
  createLine,
  createText,
  createImage,
  createAnnotation,
  createThreatMap,
  addThreatMarker,
  createAlertTimeline,
  addAlert,
  createNetworkGraph,
  addNetworkNode,
  addNetworkEdge,
  createMetric,
  createStatus,
  createTable,
  addTableRow,
  createLog,
  addLogEntry,
  createChart,
  updateChartData,
  getElementById,
  updateElement,
  deleteElement,
  getElementsInViewport,
  serializeElements,
  deserializeElements,
} from "./elements.js";

// Re-export session management
export { CanvasSessionManager, createSessionManager, generateUserId } from "./session.js";

// Re-export sync
export {
  CanvasSync,
  createSync,
  serializeStateForSync,
  deserializeStateFromSync,
  createMockWebSocket,
  type SyncEventType,
  type SyncEvent,
} from "./sync.js";

// Re-export engine
export { CanvasEngine, createCanvasEngine } from "./engine.js";

// Re-export A2UI
export * from "./a2ui/index.js";

// Default configuration
export { DEFAULT_CANVAS_CONFIG } from "./types.js";
