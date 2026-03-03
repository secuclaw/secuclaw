export interface SessionConfig {
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  agentId: string;
  createdAt: number;
  updatedAt: number;
  config?: SessionConfig;
  messages: SessionMessage[];
}

function createSessionId(agentId: string): string {
  return `sess-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class SessionManager {
  private readonly sessions = new Map<string, Session>();

  createSession(agentId: string, config?: SessionConfig): Session {
    const now = Date.now();
    const session: Session = {
      id: createSessionId(agentId),
      agentId,
      createdAt: now,
      updatedAt: now,
      config,
      messages: [],
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  appendMessage(sessionId: string, message: SessionMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.messages.push(message);
    session.updatedAt = Date.now();
  }

  getTranscript(sessionId: string): SessionMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }
    return [...session.messages];
  }

  compactSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.messages.length <= 20) {
      return;
    }

    const head = session.messages.slice(0, 2);
    const tail = session.messages.slice(-18);
    session.messages = [...head, ...tail];
    session.updatedAt = Date.now();
  }
}
