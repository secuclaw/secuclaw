import * as fs from "node:fs";
import * as path from "node:path";
import type {
  Session,
  SessionMessage,
  SessionMessageContent,
  SessionConfig,
  SessionMetadata,
  SessionListener,
  SessionEvent,
} from "./types.js";
import { DEFAULT_SESSION_CONFIG } from "./types.js";
import {
  ensureSessionFile,
  appendMessageToSession,
  readSessionMessages,
  writeSessionMessages,
  resolveSessionFilePath,
  deleteSessionFile,
  getSessionFileSize,
} from "./persistence.js";
import {
  compactSessionMessages,
  performCompaction,
  needsCompaction,
  estimateTokenCount,
} from "./compaction.js";

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `session-${timestamp}-${randomPart}`;
}

function generateSessionKey(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `${timestamp}-${randomPart}`;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private config: SessionConfig;
  private listeners: Set<SessionListener> = new Set();
  
  constructor(config: Partial<SessionConfig> & { dataDir: string }) {
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...config,
    };
  }
  
  async createSession(metadata?: Partial<SessionMetadata>): Promise<Session> {
    const sessionId = generateSessionId();
    const sessionKey = generateSessionKey();
    const now = Date.now();
    
    const session: Session = {
      id: sessionId,
      key: sessionKey,
      createdAt: now,
      updatedAt: now,
      messages: [],
      metadata: metadata ?? {},
    };
    
    this.sessions.set(sessionId, session);
    
    const sessionFile = resolveSessionFilePath(sessionId, this.config.dataDir);
    await ensureSessionFile(sessionFile, sessionId);
    
    return session;
  }
  
  async getOrCreateSession(
    sessionKey: string,
    metadata?: Partial<SessionMetadata>,
  ): Promise<Session> {
    const existing = this.getSessionByKey(sessionKey);
    if (existing) {
      return existing;
    }
    
    return this.createSession(metadata);
  }
  
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }
  
  getSessionByKey(sessionKey: string): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.key === sessionKey) {
        return session;
      }
    }
    return undefined;
  }
  
  async loadSession(sessionId: string): Promise<Session | null> {
    const sessionFile = resolveSessionFilePath(sessionId, this.config.dataDir);
    
    if (!fs.existsSync(sessionFile)) {
      return null;
    }
    
    const messages = await readSessionMessages(sessionFile);
    
    const session: Session = {
      id: sessionId,
      key: "",
      createdAt: messages[0]?.timestamp ?? Date.now(),
      updatedAt: messages[messages.length - 1]?.timestamp ?? Date.now(),
      messages,
      metadata: {},
    };
    
    this.sessions.set(sessionId, session);
    
    return session;
  }
  
  async addMessage(
    sessionId: string,
    role: SessionMessage["role"],
    content: SessionMessageContent[],
    options?: {
      provider?: string;
      model?: string;
      usage?: SessionMessage["usage"];
      stopReason?: string;
    },
  ): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, reason: "session not found" };
    }
    
    const sessionFile = resolveSessionFilePath(sessionId, this.config.dataDir);
    await ensureSessionFile(sessionFile, sessionId);
    
    const result = await appendMessageToSession(sessionFile, role, content, options);
    
    if (!result.ok) {
      return result;
    }
    
    const timestamp = Date.now();
    const message: SessionMessage = {
      id: result.messageId,
      role,
      content,
      timestamp,
      provider: options?.provider,
      model: options?.model,
      usage: options?.usage,
      stopReason: options?.stopReason,
    };
    
    session.messages.push(message);
    session.updatedAt = timestamp;
    
    this.emitEvent({ type: "message_added", sessionId, messageId: result.messageId });
    
    if (this.config.enableCompaction && needsCompaction(session.messages, this.config.maxMessages, this.config.maxTokens)) {
      await this.compactSession(sessionId);
    }
    
    return result;
  }
  
  async compactSession(sessionId: string): Promise<{ wasCompacted: boolean; originalCount: number; compactedCount: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { wasCompacted: false, originalCount: 0, compactedCount: 0 };
    }
    
    const originalCount = session.messages.length;
    
    const result = performCompaction(
      session.messages,
      this.config.compactionLevels,
      this.config.maxMessages,
      this.config.maxTokens,
    );
    
    if (!result.wasCompacted) {
      return { wasCompacted: false, originalCount, compactedCount: originalCount };
    }
    
    session.messages = result.messages;
    session.updatedAt = Date.now();
    
    const sessionFile = resolveSessionFilePath(sessionId, this.config.dataDir);
    await writeSessionMessages(sessionFile, sessionId, result.messages);
    
    this.emitEvent({
      type: "compacted",
      sessionId,
      originalCount,
      compactedCount: result.result?.compactedCount ?? result.messages.length,
    });
    
    return {
      wasCompacted: true,
      originalCount,
      compactedCount: result.messages.length,
    };
  }
  
  getMessages(sessionId: string): SessionMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.messages ?? [];
  }
  
  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    const sessionFile = resolveSessionFilePath(sessionId, this.config.dataDir);
    await deleteSessionFile(sessionFile);
    
    this.sessions.delete(sessionId);
    
    this.emitEvent({ type: "pruned", sessionId });
    
    return true;
  }
  
  pruneStaleSessions(): number {
    const cutoff = Date.now() - this.config.pruneAfterMs;
    let pruned = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.updatedAt < cutoff) {
        this.sessions.delete(sessionId);
        pruned++;
      }
    }
    
    return pruned;
  }
  
  addListener(listener: SessionListener): void {
    this.listeners.add(listener);
  }
  
  removeListener(listener: SessionListener): void {
    this.listeners.delete(listener);
  }
  
  private emitEvent(event: SessionEvent): void {
    for (const listener of this.listeners) {
      const promise = listener.onEvent(event);
      if (promise && typeof promise.then === "function") {
        (promise as Promise<void>).catch(() => {});
      }
    }
  }
  
  getConfig(): SessionConfig {
    return { ...this.config };
  }
  
  getSessionCount(): number {
    return this.sessions.size;
  }
  
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
  
  async rotateSessionIfNeeded(sessionId: string): Promise<boolean> {
    const sessionFile = resolveSessionFilePath(sessionId, this.config.dataDir);
    const size = await getSessionFileSize(sessionFile);
    
    if (size === null || size <= this.config.rotateBytes) {
      return false;
    }
    
    const timestamp = Date.now();
    const backupPath = `${sessionFile}.bak.${timestamp}`;
    
    try {
      await fs.promises.rename(sessionFile, backupPath);
      await ensureSessionFile(sessionFile, sessionId);
      
      const session = this.sessions.get(sessionId);
      if (session && session.messages.length > 0) {
        await writeSessionMessages(sessionFile, sessionId, session.messages);
      }
      
      return true;
    } catch {
      return false;
    }
  }
}

export { estimateTokenCount, needsCompaction };
