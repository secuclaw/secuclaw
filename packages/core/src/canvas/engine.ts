/**
 * Canvas Engine - Core canvas engine with state management and rendering support
 */

import type {
  CanvasState,
  CanvasConfig,
  CanvasElement,
  ViewportState,
  ThemeConfig,
  SerializedCanvasState,
  CanvasEventListener,
  CanvasEvent,
  ExportFormat,
  SyncConnectionStatus,
} from "./types.js";
import { DEFAULT_CANVAS_CONFIG } from "./types.js";
import {
  deserializeElements,
  serializeElements,
  getElementsInViewport,
} from "./elements.js";
import { CanvasSessionManager } from "./session.js";
import { CanvasSync, createSync, type SyncOptions } from "./sync.js";

// Polyfill for requestAnimationFrame in Node.js environment
type FrameCallback = (timestamp: number) => void;
const requestAnimationFrame =
  (globalThis as unknown as { requestAnimationFrame?: (cb: FrameCallback) => number }).requestAnimationFrame ||
  ((callback: FrameCallback) => setTimeout(() => callback(Date.now()), 16) as unknown as number);
const cancelAnimationFrame =
  (globalThis as unknown as { cancelAnimationFrame?: (id: number) => void }).cancelAnimationFrame ||
  ((id: number) => clearTimeout(id));

/** Default theme */
const DEFAULT_THEME: ThemeConfig = {
  type: "dark",
  colors: {
    background: "#1a1a2e",
    surface: "#16213e",
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
    text: "#ffffff",
    textMuted: "#9ca3af",
  },
  fonts: {
    sans: "system-ui, -apple-system, sans-serif",
    mono: "ui-monospace, monospace",
  },
};

/**
 * Canvas Engine
 * Main engine for managing canvas state, rendering, and synchronization
 */
export class CanvasEngine {
  private config: CanvasConfig;
  private state: CanvasState;
  private sessionManager: CanvasSessionManager;
  private sync: CanvasSync | null = null;
  private listeners: Set<CanvasEventListener> = new Set();
  private renderCallback: ((state: CanvasState) => void) | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private running = false;

  constructor(config: Partial<CanvasConfig> = {}) {
    this.config = { ...DEFAULT_CANVAS_CONFIG, ...config };
    this.state = this.createInitialState();
    this.sessionManager = new CanvasSessionManager();
  }

  /**
   * Initialize the canvas engine
   */
  async initialize(): Promise<void> {
    // Engine is ready immediately
    this.startRenderLoop();
  }

  /**
   * Start the engine
   */
  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.startRenderLoop();
  }

  /**
   * Stop the engine
   */
  stop(): void {
    this.running = false;
    this.stopRenderLoop();
    this.disconnectSync();
  }

  /**
   * Destroy the engine
   */
  async destroy(): Promise<void> {
    this.stop();
    this.listeners.clear();
    this.renderCallback = null;
  }

  // =============================================================================
  // State Management
  // =============================================================================

  /**
   * Get current state
   */
  getState(): CanvasState {
    return {
      version: this.state.version,
      elements: new Map(this.state.elements),
      viewport: { ...this.state.viewport },
      theme: { ...this.state.theme },
      lastUpdate: this.state.lastUpdate,
    };
  }

  /**
   * Set state
   */
  setState(updates: Partial<CanvasState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: Date.now(),
    };
    this.notifyListeners({ type: "state_sync", state: this.getSerializedState() });
  }

  /**
   * Get serialized state
   */
  getSerializedState(): SerializedCanvasState {
    return {
      version: this.state.version,
      elements: serializeElements(this.state.elements),
      viewport: this.state.viewport,
      theme: this.state.theme,
      lastUpdate: this.state.lastUpdate,
    };
  }

  /**
   * Set serialized state
   */
  setSerializedState(state: SerializedCanvasState): void {
    this.state = {
      version: state.version,
      elements: deserializeElements(state.elements),
      viewport: state.viewport,
      theme: state.theme,
      lastUpdate: state.lastUpdate,
    };
    this.notifyListeners({ type: "state_sync", state: state });
  }

  // =============================================================================
  // Element Operations
  // =============================================================================

  /**
   * Add an element
   */
  addElement(element: CanvasElement): void {
    this.state.elements.set(element.id, element);
    this.state.lastUpdate = Date.now();
    this.notifyListeners({ type: "element_added", element });

    // Sync if connected
    if (this.sync?.isConnected()) {
      this.sync.sendElementAdd(element);
    }
  }

  /**
   * Remove an element
   */
  removeElement(id: string): void {
    if (this.state.elements.has(id)) {
      this.state.elements.delete(id);
      this.state.lastUpdate = Date.now();
      this.notifyListeners({ type: "element_deleted", elementId: id });

      // Sync if connected
      if (this.sync?.isConnected()) {
        this.sync.sendElementDelete(id);
      }
    }
  }

  /**
   * Update an element
   */
  updateElement(id: string, updates: Partial<CanvasElement>): void {
    const element = this.state.elements.get(id);
    if (element) {
      const updated = { ...element, ...updates, updatedAt: Date.now() };
      this.state.elements.set(id, updated as CanvasElement);
      this.state.lastUpdate = Date.now();
      this.notifyListeners({ type: "element_updated", elementId: id, updates });

      // Sync if connected
      if (this.sync?.isConnected()) {
        this.sync.sendElementUpdate(id, updates);
      }
    }
  }

  /**
   * Get element by ID
   */
  getElement(id: string): CanvasElement | undefined {
    return this.state.elements.get(id);
  }

  /**
   * Get all elements
   */
  getElements(): CanvasElement[] {
    return serializeElements(this.state.elements);
  }

  /**
   * Get elements in viewport
   */
  getVisibleElements(): CanvasElement[] {
    return getElementsInViewport(this.state.elements, this.state.viewport);
  }

  // =============================================================================
  // Viewport Operations
  // =============================================================================

  /**
   * Get viewport
   */
  getViewport(): ViewportState {
    return { ...this.state.viewport };
  }

  /**
   * Set viewport
   */
  setViewport(viewport: Partial<ViewportState>): void {
    this.state.viewport = { ...this.state.viewport, ...viewport };
    this.state.lastUpdate = Date.now();
    this.notifyListeners({ type: "viewport_changed", viewport: this.state.viewport });
  }

  /**
   * Pan viewport
   */
  pan(deltaX: number, deltaY: number): void {
    this.state.viewport.x += deltaX;
    this.state.viewport.y += deltaY;
    this.state.lastUpdate = Date.now();
    this.notifyListeners({ type: "viewport_changed", viewport: this.state.viewport });
  }

  /**
   * Zoom viewport
   */
  zoom(factor: number, centerX?: number, centerY?: number): void {
    const oldZoom = this.state.viewport.zoom;
    const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));

    if (centerX !== undefined && centerY !== undefined) {
      // Zoom towards center point
      const scale = newZoom / oldZoom;
      this.state.viewport.x = centerX - (centerX - this.state.viewport.x) * scale;
      this.state.viewport.y = centerY - (centerY - this.state.viewport.y) * scale;
    }

    this.state.viewport.zoom = newZoom;
    this.state.lastUpdate = Date.now();
    this.notifyListeners({ type: "viewport_changed", viewport: this.state.viewport });
  }

  /**
   * Reset viewport
   */
  resetViewport(): void {
    this.state.viewport = {
      x: 0,
      y: 0,
      width: this.config.width,
      height: this.config.height,
      zoom: 1,
    };
    this.state.lastUpdate = Date.now();
    this.notifyListeners({ type: "viewport_changed", viewport: this.state.viewport });
  }

  // =============================================================================
  // Theme Operations
  // =============================================================================

  /**
   * Get theme
   */
  getTheme(): ThemeConfig {
    return { ...this.state.theme };
  }

  /**
   * Set theme
   */
  setTheme(theme: Partial<ThemeConfig>): void {
    this.state.theme = { ...this.state.theme, ...theme };
    this.state.lastUpdate = Date.now();
    this.notifyListeners({ type: "theme_changed", theme: this.state.theme });
  }

  // =============================================================================
  // Session Management
  // =============================================================================

  /**
   * Get session manager
   */
  getSessionManager(): CanvasSessionManager {
    return this.sessionManager;
  }

  /**
   * Create a new session
   */
  createSession(name: string, ownerId: string) {
    return this.sessionManager.createSession(name, ownerId);
  }

  // =============================================================================
  // Sync Operations
  // =============================================================================

  /**
   * Connect to sync server
   */
  connectSync(options: SyncOptions): void {
    this.sync = createSync(options);
    
    this.sync.subscribe((event) => {
      this.handleSyncEvent(event);
    });

    this.sync.connect();
  }

  /**
   * Disconnect from sync server
   */
  disconnectSync(): void {
    if (this.sync) {
      this.sync.disconnect();
      this.sync = null;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return this.sync?.getStatus() ?? "disconnected";
  }

  /**
   * Handle sync events
   */
  private handleSyncEvent(event: { type: string; payload: unknown }): void {
    switch (event.type) {
      case "status_changed":
        this.notifyListeners({ type: "sync_status_changed", status: event.payload as SyncConnectionStatus });
        break;
      case "element_added": {
        const payload = event.payload as { element: CanvasElement };
        this.state.elements.set(payload.element.id, payload.element);
        this.notifyListeners({ type: "element_added", element: payload.element });
        break;
      }
      case "element_updated": {
        const payload = event.payload as { elementId: string; updates: Partial<CanvasElement> };
        const element = this.state.elements.get(payload.elementId);
        if (element) {
          const updated = { ...element, ...payload.updates, updatedAt: Date.now() };
          this.state.elements.set(payload.elementId, updated as CanvasElement);
          this.notifyListeners({ type: "element_updated", elementId: payload.elementId, updates: payload.updates });
        }
        break;
      }
      case "element_deleted": {
        const payload = event.payload as { elementId: string };
        this.state.elements.delete(payload.elementId);
        this.notifyListeners({ type: "element_deleted", elementId: payload.elementId });
        break;
      }
      case "state_received": {
        const payload = event.payload as SerializedCanvasState;
        this.setSerializedState(payload);
        break;
      }
    }
  }

  // =============================================================================
  // Rendering
  // =============================================================================

  /**
   * Set render callback
   */
  setRenderCallback(callback: (state: CanvasState) => void): void {
    this.renderCallback = callback;
  }

  /**
   * Trigger render
   */
  render(): void {
    if (this.renderCallback) {
      this.renderCallback(this.getState());
    }
  }

  /**
   * Update (called each frame)
   */
  update(delta: number): void {
    // Placeholder for custom update logic
    // Can be used for animations, timers, etc.
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    const loop = (timestamp: number) => {
      if (!this.running) {
        return;
      }

      const delta = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;

      // Update at ~60fps
      if (delta >= 16) {
        this.update(delta);
        this.render();
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop render loop
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // =============================================================================
  // Event Handling
  // =============================================================================

  /**
   * Subscribe to canvas events
   */
  subscribe(listener: CanvasEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: CanvasEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Canvas event listener error:", error);
      }
    }
  }

  // =============================================================================
  // Export
  // =============================================================================

  /**
   * Export canvas to specified format
   */
  async export(format: ExportFormat): Promise<string> {
    const state = this.getSerializedState();

    switch (format) {
      case "json":
        return JSON.stringify(state, null, 2);
      case "png":
      case "svg":
        // These would require canvas/svg rendering implementation
        // For now, return JSON with metadata
        return JSON.stringify({ format, state }, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import canvas from JSON
   */
  import(json: string): void {
    const state = JSON.parse(json) as SerializedCanvasState;
    this.setSerializedState(state);
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  /**
   * Create initial state
   */
  private createInitialState(): CanvasState {
    return {
      version: "1.0.0",
      elements: new Map(),
      viewport: {
        x: 0,
        y: 0,
        width: this.config.width,
        height: this.config.height,
        zoom: 1,
      },
      theme: DEFAULT_THEME,
      lastUpdate: Date.now(),
    };
  }
}

/**
 * Create a canvas engine instance
 */
export function createCanvasEngine(config?: Partial<CanvasConfig>): CanvasEngine {
  return new CanvasEngine(config);
}
