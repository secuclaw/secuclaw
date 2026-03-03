/**
 * Canvas Sync - Real-time synchronization via WebSocket
 */

import type {
  SyncMessage,
  SyncMessageType,
  SyncOptions,
  SyncConnectionStatus,
  SerializedCanvasState,
  CanvasElement,
  CanvasSessionMember,
} from "./types.js";

// Re-export types needed by other modules
export type { SyncOptions } from "./types.js";

/** WebSocket-like interface for testing */
interface WebSocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((error: unknown) => void) | null;
}

/** Sync event types */
export type SyncEventType =
  | "status_changed"
  | "member_joined"
  | "member_left"
  | "cursor_moved"
  | "element_added"
  | "element_updated"
  | "element_deleted"
  | "state_received"
  | "error";

/** Sync event */
export interface SyncEvent {
  type: SyncEventType;
  payload: unknown;
}

/** Sync event handler */
type SyncEventHandler = (event: SyncEvent) => void;

/** Default sync options */
const DEFAULT_SYNC_OPTIONS: Required<Pick<SyncOptions, "reconnectInterval" | "maxReconnectAttempts">> = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

/**
 * Canvas Sync - Handles real-time synchronization over WebSocket
 */
export class CanvasSync {
  private ws: WebSocketLike | null = null;
  private options: SyncOptions & typeof DEFAULT_SYNC_OPTIONS;
  private status: SyncConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Set<SyncEventHandler> = new Set();
  private messageHandlers: Map<SyncMessageType, ((payload: unknown) => void)[]> = new Map();

  constructor(options: SyncOptions) {
    this.options = { ...DEFAULT_SYNC_OPTIONS, ...options };
  }

  /**
   * Connect to the sync server
   */
  connect(): void {
    if (this.ws || this.status === "connected" || this.status === "connecting") {
      return;
    }

    this.setStatus("connecting");

    try {
      const WebSocketClass = this.getWebSocketClass();
      this.ws = new WebSocketClass(this.options.wsUrl) as WebSocketLike;
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.handleError(error);
    }
  }

  /**
   * Disconnect from the sync server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus("disconnected");
    this.reconnectAttempts = 0;
  }

  /**
   * Send a message to the sync server
   */
  send(type: SyncMessageType, payload: unknown): void {
    if (!this.ws || this.status !== "connected") {
      console.warn("Cannot send message: not connected");
      return;
    }

    const message: SyncMessage = {
      type,
      sessionId: this.options.sessionId,
      userId: this.options.userId,
      timestamp: Date.now(),
      payload,
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Failed to send message:", error);
      this.handleError(error);
    }
  }

  /**
   * Join a session
   */
  joinSession(): void {
    this.send("join", { sessionId: this.options.sessionId });
  }

  /**
   * Leave a session
   */
  leaveSession(): void {
    this.send("leave", { sessionId: this.options.sessionId });
  }

  /**
   * Send cursor position
   */
  sendCursor(x: number, y: number): void {
    this.send("cursor", { x, y });
  }

  /**
   * Send element added event
   */
  sendElementAdd(element: CanvasElement): void {
    this.send("element_add", { element });
  }

  /**
   * Send element updated event
   */
  sendElementUpdate(elementId: string, updates: Partial<CanvasElement>): void {
    this.send("element_update", { elementId, updates });
  }

  /**
   * Send element deleted event
   */
  sendElementDelete(elementId: string): void {
    this.send("element_delete", { elementId });
  }

  /**
   * Request state sync
   */
  requestState(): void {
    this.send("state_request", {});
  }

  /**
   * Subscribe to sync events
   */
  subscribe(handler: SyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Register a message handler
   */
  onMessage(type: SyncMessageType, handler: (payload: unknown) => void): () => void {
    const handlers = this.messageHandlers.get(type) ?? [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) {
        handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): SyncConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === "connected";
  }

  /**
   * Set connection status
   */
  private setStatus(status: SyncConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emitEvent({ type: "status_changed", payload: status });
    }
  }

  /**
   * Emit event to all handlers
   */
  private emitEvent(event: SyncEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("Sync event handler error:", error);
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as SyncMessage;
      const handlers = this.messageHandlers.get(message.type) ?? [];
      
      for (const handler of handlers) {
        try {
          handler(message.payload);
        } catch (error) {
          console.error("Message handler error:", error);
        }
      }

      // Also emit as event
      switch (message.type) {
        case "join":
          this.emitEvent({ type: "member_joined", payload: message.payload });
          break;
        case "leave":
          this.emitEvent({ type: "member_left", payload: message.payload });
          break;
        case "cursor":
          this.emitEvent({ type: "cursor_moved", payload: message.payload });
          break;
        case "element_add":
          this.emitEvent({ type: "element_added", payload: message.payload });
          break;
        case "element_update":
          this.emitEvent({ type: "element_updated", payload: message.payload });
          break;
        case "element_delete":
          this.emitEvent({ type: "element_deleted", payload: message.payload });
          break;
        case "state_response":
          this.emitEvent({ type: "state_received", payload: message.payload });
          break;
        case "error":
          this.emitEvent({ type: "error", payload: message.payload });
          break;
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) {
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("connected");
      this.joinSession();
    };

    this.ws.onclose = () => {
      this.handleClose();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.handleError(error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    this.ws = null;

    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.setStatus("reconnecting");
      this.scheduleReconnect();
    } else {
      this.setStatus("disconnected");
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): void {
    this.emitEvent({ type: "error", payload: error });
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get WebSocket class (allows override for testing)
   */
  private getWebSocketClass(): typeof WebSocket {
    // Use native WebSocket
    return WebSocket;
  }
}

/**
 * Create a sync instance
 */
export function createSync(options: SyncOptions): CanvasSync {
  return new CanvasSync(options);
}

/**
 * Serialize state for sync
 */
export function serializeStateForSync(state: SerializedCanvasState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize state from sync
 */
export function deserializeStateFromSync(data: string): SerializedCanvasState {
  return JSON.parse(data) as SerializedCanvasState;
}

/**
 * Create a mock WebSocket for testing
 */
export function createMockWebSocket(): WebSocketLike {
  let handlers: {
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    onerror: ((error: unknown) => void) | null;
  } = {
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  };

  return {
    send: () => {},
    close: () => {
      handlers.onclose?.();
    },
    get onopen() {
      return handlers.onopen;
    },
    set onopen(value) {
      handlers.onopen = value;
    },
    get onclose() {
      return handlers.onclose;
    },
    set onclose(value) {
      handlers.onclose = value;
    },
    get onmessage() {
      return handlers.onmessage;
    },
    set onmessage(value) {
      handlers.onmessage = value;
    },
    get onerror() {
      return handlers.onerror;
    },
    set onerror(value) {
      handlers.onerror = value;
    },
  };
}
