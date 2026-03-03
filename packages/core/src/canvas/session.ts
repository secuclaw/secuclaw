/**
 * Canvas Session Management - Handles canvas session lifecycle and collaboration
 */

import type {
  CanvasSession,
  CanvasSessionMember,
  SerializedCanvasState,
  SessionEvent,
  ViewportState,
  ThemeConfig,
  CanvasElement,
} from "./types.js";
import { serializeElements, deserializeElements } from "./elements.js";

/** Generate unique session ID */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Generate unique user ID */
function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Member colors for collaboration */
const MEMBER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

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

/** Default viewport */
const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  zoom: 1,
};

/** Default serialized state */
function createDefaultState(): SerializedCanvasState {
  return {
    version: "1.0.0",
    elements: [],
    viewport: DEFAULT_VIEWPORT,
    theme: DEFAULT_THEME,
    lastUpdate: Date.now(),
  };
}

/** Session events handler */
type SessionEventHandler = (event: SessionEvent) => void;

/**
 * Canvas Session Manager
 * Handles creation, joining, leaving, and synchronization of canvas sessions
 */
export class CanvasSessionManager {
  private sessions: Map<string, CanvasSession> = new Map();
  private eventHandlers: Set<SessionEventHandler> = new Set();
  private colorIndex = 0;

  /**
   * Create a new canvas session
   */
  createSession(name: string, ownerId: string): CanvasSession {
    const id = generateSessionId();
    const now = Date.now();

    const session: CanvasSession = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      ownerId,
      collaborators: [
        {
          userId: ownerId,
          role: "owner",
          joinedAt: now,
          color: this.getNextColor(),
        },
      ],
      state: createDefaultState(),
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): CanvasSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): CanvasSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Join a session
   */
  joinSession(
    sessionId: string,
    userId: string,
    role: "editor" | "viewer" = "viewer"
  ): CanvasSessionMember | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if user already in session
    const existingMember = session.collaborators.find((m) => m.userId === userId);
    if (existingMember) {
      return existingMember;
    }

    const member: CanvasSessionMember = {
      userId,
      role,
      joinedAt: Date.now(),
      color: this.getNextColor(),
    };

    session.collaborators.push(member);
    session.updatedAt = Date.now();

    this.emitEvent({
      type: "join",
      userId,
      sessionId,
    });

    return member;
  }

  /**
   * Leave a session
   */
  leaveSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const index = session.collaborators.findIndex((m) => m.userId === userId);
    if (index === -1) {
      return false;
    }

    session.collaborators.splice(index, 1);
    session.updatedAt = Date.now();

    this.emitEvent({
      type: "leave",
      userId,
      sessionId,
    });

    // Delete session if no collaborators left
    if (session.collaborators.length === 0) {
      this.sessions.delete(sessionId);
    }

    return true;
  }

  /**
   * Update member cursor position
   */
  updateCursor(
    sessionId: string,
    userId: string,
    position: { x: number; y: number }
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const member = session.collaborators.find((m) => m.userId === userId);
    if (member) {
      member.cursor = position;
      this.emitEvent({
        type: "cursor_move",
        userId,
        position,
      });
    }
  }

  /**
   * Add an element to session state
   */
  addElement(sessionId: string, element: CanvasElement): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const elements = deserializeElements(session.state.elements);
    elements.set(element.id, element);
    session.state.elements = serializeElements(elements);
    session.state.lastUpdate = Date.now();
    session.updatedAt = Date.now();

    this.emitEvent({
      type: "element_add",
      element,
    });

    return true;
  }

  /**
   * Update an element in session state
   */
  updateElement(
    sessionId: string,
    elementId: string,
    updates: Partial<CanvasElement>
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const elements = deserializeElements(session.state.elements);
    const element = elements.get(elementId);
    if (!element) {
      return false;
    }

    const updated = { ...element, ...updates, updatedAt: Date.now() };
    elements.set(elementId, updated as CanvasElement);
    session.state.elements = serializeElements(elements);
    session.state.lastUpdate = Date.now();
    session.updatedAt = Date.now();

    this.emitEvent({
      type: "element_update",
      elementId,
      updates,
    });

    return true;
  }

  /**
   * Delete an element from session state
   */
  deleteElement(sessionId: string, elementId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const elements = deserializeElements(session.state.elements);
    if (!elements.has(elementId)) {
      return false;
    }

    elements.delete(elementId);
    session.state.elements = serializeElements(elements);
    session.state.lastUpdate = Date.now();
    session.updatedAt = Date.now();

    this.emitEvent({
      type: "element_delete",
      elementId,
    });

    return true;
  }

  /**
   * Update session viewport
   */
  updateViewport(sessionId: string, viewport: Partial<ViewportState>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.state.viewport = { ...session.state.viewport, ...viewport };
    session.state.lastUpdate = Date.now();
    session.updatedAt = Date.now();

    return true;
  }

  /**
   * Update session theme
   */
  updateTheme(sessionId: string, theme: Partial<ThemeConfig>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.state.theme = { ...session.state.theme, ...theme };
    session.state.lastUpdate = Date.now();
    session.updatedAt = Date.now();

    return true;
  }

  /**
   * Get session state
   */
  getState(sessionId: string): SerializedCanvasState | null {
    const session = this.sessions.get(sessionId);
    return session?.state ?? null;
  }

  /**
   * Set full session state
   */
  setState(sessionId: string, state: SerializedCanvasState): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.state = state;
    session.state.lastUpdate = Date.now();
    session.updatedAt = Date.now();

    this.emitEvent({
      type: "state_sync",
      state,
    });

    return true;
  }

  /**
   * Subscribe to session events
   */
  subscribe(handler: SessionEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit an event to all handlers
   */
  private emitEvent(event: SessionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("Session event handler error:", error);
      }
    }
  }

  /**
   * Get next available color
   */
  private getNextColor(): string {
    const color = MEMBER_COLORS[this.colorIndex % MEMBER_COLORS.length];
    this.colorIndex++;
    return color;
  }
}

/**
 * Create a new session manager instance
 */
export function createSessionManager(): CanvasSessionManager {
  return new CanvasSessionManager();
}

/**
 * Generate a new user ID
 */
export { generateUserId };
