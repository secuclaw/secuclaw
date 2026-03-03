/**
 * Canvas Elements - Factory functions and utilities for canvas elements
 */

import type {
  CanvasElement,
  RectangleElement,
  CircleElement,
  LineElement,
  TextElement,
  ImageElement,
  AnnotationElement,
  ThreatMapElement,
  AlertTimelineElement,
  NetworkGraphElement,
  MetricElement,
  StatusElement,
  TableElement,
  LogElement,
  ChartElement,
  ThreatMarker,
  SecurityAlert,
  NetworkNode,
  NetworkEdge,
  LogEntry,
  ChartDataPoint,
} from "./types.js";

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Get current timestamp */
function now(): number {
  return Date.now();
}

// =============================================================================
// Shape Element Factories
// =============================================================================

/**
 * Create a rectangle element
 */
export function createRectangle(
  options: Partial<RectangleElement> = {}
): RectangleElement {
  return {
    id: options.id ?? generateId(),
    type: "rectangle",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 100,
    height: options.height ?? 100,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    fill: options.fill ?? "#3b82f6",
    stroke: options.stroke ?? "#1d4ed8",
    strokeWidth: options.strokeWidth ?? 2,
    cornerRadius: options.cornerRadius ?? 0,
  };
}

/**
 * Create a circle element
 */
export function createCircle(options: Partial<CircleElement> = {}): CircleElement {
  return {
    id: options.id ?? generateId(),
    type: "circle",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 50,
    height: options.height ?? 50,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    fill: options.fill ?? "#10b981",
    stroke: options.stroke ?? "#059669",
    strokeWidth: options.strokeWidth ?? 2,
    rx: options.rx ?? 25,
    ry: options.ry ?? 25,
  };
}

/**
 * Create a line element
 */
export function createLine(options: Partial<LineElement> = {}): LineElement {
  return {
    id: options.id ?? generateId(),
    type: "line",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 100,
    height: options.height ?? 0,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    points: options.points ?? [0, 0, 100, 0],
    stroke: options.stroke ?? "#f59e0b",
    strokeWidth: options.strokeWidth ?? 2,
    dashArray: options.dashArray,
  };
}

// =============================================================================
// Content Element Factories
// =============================================================================

/**
 * Create a text element
 */
export function createText(options: Partial<TextElement> = {}): TextElement {
  return {
    id: options.id ?? generateId(),
    type: "text",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 200,
    height: options.height ?? 30,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    content: options.content ?? "Text",
    fontSize: options.fontSize ?? 16,
    fontFamily: options.fontFamily ?? "sans-serif",
    fontWeight: options.fontWeight ?? "normal",
    color: options.color ?? "#ffffff",
    align: options.align ?? "left",
    verticalAlign: options.verticalAlign ?? "top",
  };
}

/**
 * Create an image element
 */
export function createImage(options: Partial<ImageElement> = {}): ImageElement {
  return {
    id: options.id ?? generateId(),
    type: "image",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 200,
    height: options.height ?? 200,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    src: options.src ?? "",
    alt: options.alt ?? "",
    objectFit: options.objectFit ?? "contain",
  };
}

// =============================================================================
// Annotation Element Factories
// =============================================================================

/**
 * Create an annotation element
 */
export function createAnnotation(
  options: Partial<AnnotationElement> = {}
): AnnotationElement {
  return {
    id: options.id ?? generateId(),
    type: "annotation",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 150,
    height: options.height ?? 80,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    content: options.content ?? "",
    style: options.style ?? "note",
    author: options.author,
    timestamp: options.timestamp ?? now(),
  };
}

// =============================================================================
// Security Element Factories
// =============================================================================

/**
 * Create a threat map element
 */
export function createThreatMap(
  options: Partial<ThreatMapElement> = {}
): ThreatMapElement {
  return {
    id: options.id ?? generateId(),
    type: "map",
    subType: "threat-map",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 800,
    height: options.height ?? 600,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    threats: options.threats ?? [],
    center: options.center ?? { lat: 39.9042, lng: 116.4074 },
    zoom: options.zoom ?? 4,
    showLegend: options.showLegend ?? true,
  };
}

/**
 * Add a threat marker to a threat map
 */
export function addThreatMarker(
  map: ThreatMapElement,
  marker: ThreatMarker
): ThreatMapElement {
  return {
    ...map,
    threats: [...map.threats, marker],
    updatedAt: now(),
  };
}

/**
 * Create an alert timeline element
 */
export function createAlertTimeline(
  options: Partial<AlertTimelineElement> = {}
): AlertTimelineElement {
  return {
    id: options.id ?? generateId(),
    type: "timeline",
    subType: "alert-timeline",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 600,
    height: options.height ?? 400,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    alerts: options.alerts ?? [],
    timeRange: options.timeRange ?? {
      start: Date.now() - 24 * 60 * 60 * 1000,
      end: Date.now(),
    },
    groupBySeverity: options.groupBySeverity ?? false,
  };
}

/**
 * Add an alert to a timeline
 */
export function addAlert(
  timeline: AlertTimelineElement,
  alert: SecurityAlert
): AlertTimelineElement {
  return {
    ...timeline,
    alerts: [...timeline.alerts, alert].sort((a, b) => a.timestamp - b.timestamp),
    updatedAt: now(),
  };
}

/**
 * Create a network graph element
 */
export function createNetworkGraph(
  options: Partial<NetworkGraphElement> = {}
): NetworkGraphElement {
  return {
    id: options.id ?? generateId(),
    type: "network-graph",
    subType: "network-graph",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 800,
    height: options.height ?? 600,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    nodes: options.nodes ?? [],
    edges: options.edges ?? [],
    layout: options.layout ?? "force",
  };
}

/**
 * Add a node to a network graph
 */
export function addNetworkNode(
  graph: NetworkGraphElement,
  node: NetworkNode
): NetworkGraphElement {
  return {
    ...graph,
    nodes: [...graph.nodes, node],
    updatedAt: now(),
  };
}

/**
 * Add an edge to a network graph
 */
export function addNetworkEdge(
  graph: NetworkGraphElement,
  edge: NetworkEdge
): NetworkGraphElement {
  return {
    ...graph,
    edges: [...graph.edges, edge],
    updatedAt: now(),
  };
}

// =============================================================================
// Status and Metric Element Factories
// =============================================================================

/**
 * Create a metric element
 */
export function createMetric(options: Partial<MetricElement> = {}): MetricElement {
  return {
    id: options.id ?? generateId(),
    type: "metric",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 120,
    height: options.height ?? 80,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    value: options.value ?? 0,
    label: options.label ?? "Metric",
    unit: options.unit,
    trend: options.trend,
    threshold: options.threshold,
  };
}

/**
 * Create a status element
 */
export function createStatus(options: Partial<StatusElement> = {}): StatusElement {
  return {
    id: options.id ?? generateId(),
    type: "status",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 100,
    height: options.height ?? 30,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    status: options.status ?? "unknown",
    label: options.label ?? "Status",
    pulse: options.pulse ?? false,
  };
}

// =============================================================================
// Data Element Factories
// =============================================================================

/**
 * Create a table element
 */
export function createTable(options: Partial<TableElement> = {}): TableElement {
  return {
    id: options.id ?? generateId(),
    type: "table",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 400,
    height: options.height ?? 300,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    headers: options.headers ?? ["Column 1", "Column 2"],
    rows: options.rows ?? [],
    sortable: options.sortable ?? true,
    striped: options.striped ?? true,
  };
}

/**
 * Add a row to a table
 */
export function addTableRow(
  table: TableElement,
  cells: string[]
): TableElement {
  return {
    ...table,
    rows: [...table.rows, { id: generateId(), cells }],
    updatedAt: now(),
  };
}

/**
 * Create a log element
 */
export function createLog(options: Partial<LogElement> = {}): LogElement {
  return {
    id: options.id ?? generateId(),
    type: "log",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 500,
    height: options.height ?? 300,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    entries: options.entries ?? [],
    maxEntries: options.maxEntries ?? 100,
    autoScroll: options.autoScroll ?? true,
    filter: options.filter,
  };
}

/**
 * Add a log entry
 */
export function addLogEntry(log: LogElement, entry: LogEntry): LogElement {
  const entries = [...log.entries, entry];
  if (entries.length > log.maxEntries) {
    entries.shift();
  }
  return {
    ...log,
    entries,
    updatedAt: now(),
  };
}

// =============================================================================
// Chart Element Factories
// =============================================================================

/**
 * Create a chart element
 */
export function createChart(options: Partial<ChartElement> = {}): ChartElement {
  return {
    id: options.id ?? generateId(),
    type: "chart",
    chartType: options.chartType ?? "bar",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 400,
    height: options.height ?? 300,
    zIndex: options.zIndex ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 1,
    createdAt: options.createdAt ?? now(),
    updatedAt: options.updatedAt ?? now(),
    data: options.data ?? [],
    xAxisLabel: options.xAxisLabel,
    yAxisLabel: options.yAxisLabel,
    showLegend: options.showLegend ?? true,
    showGrid: options.showGrid ?? true,
  };
}

/**
 * Update chart data
 */
export function updateChartData(
  chart: ChartElement,
  data: ChartDataPoint[]
): ChartElement {
  return {
    ...chart,
    data,
    updatedAt: now(),
  };
}

// =============================================================================
// Element Utilities
// =============================================================================

/**
 * Get element by ID from a map
 */
export function getElementById(
  elements: Map<string, CanvasElement>,
  id: string
): CanvasElement | undefined {
  return elements.get(id);
}

/**
 * Update an element in the map
 */
export function updateElement(
  elements: Map<string, CanvasElement>,
  id: string,
  updates: Partial<CanvasElement>
): Map<string, CanvasElement> {
  const element = elements.get(id);
  if (!element) {
    return elements;
  }
  const updated = { ...element, ...updates, updatedAt: now() };
  const newMap = new Map(elements);
  newMap.set(id, updated as CanvasElement);
  return newMap;
}

/**
 * Delete an element from the map
 */
export function deleteElement(
  elements: Map<string, CanvasElement>,
  id: string
): Map<string, CanvasElement> {
  const newMap = new Map(elements);
  newMap.delete(id);
  return newMap;
}

/**
 * Get elements in viewport
 */
export function getElementsInViewport(
  elements: Map<string, CanvasElement>,
  viewport: { x: number; y: number; width: number; height: number }
): CanvasElement[] {
  const result: CanvasElement[] = [];
  for (const element of elements.values()) {
    if (
      element.x < viewport.x + viewport.width &&
      element.x + element.width > viewport.x &&
      element.y < viewport.y + viewport.height &&
      element.y + element.height > viewport.y &&
      element.visible
    ) {
      result.push(element);
    }
  }
  return result.sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Serialize elements map to array
 */
export function serializeElements(
  elements: Map<string, CanvasElement>
): CanvasElement[] {
  return Array.from(elements.values());
}

/**
 * Deserialize elements array to map
 */
export function deserializeElements(
  elementArray: CanvasElement[]
): Map<string, CanvasElement> {
  const map = new Map<string, CanvasElement>();
  for (const element of elementArray) {
    map.set(element.id, element);
  }
  return map;
}
