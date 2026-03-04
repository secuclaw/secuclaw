/**
 * Talk Module - Talk Session
 * 
 * Manages conversation sessions including history, turn-taking,
 * and context management for continuous dialogue.
 */

import { EventEmitter } from 'events';
import type {
  TalkSession as ITalkSession,
  TalkModeStatus,
  ConversationMessage,
  TurnEvent,
  TurnState,
  TalkMetrics,
  SpeechEvent,
  ResponseEvent,
} from './types.js';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `talk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Talk Session Manager
 * 
 * Manages a single conversation session with history tracking,
 * turn management, and metrics collection.
 * 
 * @example
 * ```typescript
 * const session = new TalkSession();
 * await session.start();
 * 
 * session.addUserMessage('Hello');
 * const history = session.getHistory();
 * 
 * session.addAIResponse('Hi there!');
 * 
 * await session.end();
 * ```
 */
export class TalkSession extends EventEmitter {
  private id: string;
  private startTime: number;
  private status: TalkModeStatus;
  private userTurnCount = 0;
  private aiTurnCount = 0;
  private currentTurn: TurnState = 'transitioning';
  private history: ConversationMessage[] = [];
  private maxHistoryLength: number;
  private metrics: TalkMetrics;
  private isActive = false;

  constructor(maxHistoryLength = 50) {
    super();
    this.id = generateSessionId();
    this.startTime = 0;
    this.status = 'idle';
    this.maxHistoryLength = maxHistoryLength;
    this.metrics = this.createInitialMetrics();
  }

  /**
   * Create initial metrics
   */
  private createInitialMetrics(): TalkMetrics {
    return {
      sessionDurationMs: 0,
      userTurns: 0,
      aiTurns: 0,
      avgSTTLatencyMs: 0,
      avgTTSLatencyMs: 0,
      interruptionCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Start the session
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.id = generateSessionId();
    this.startTime = Date.now();
    this.status = 'listening';
    this.userTurnCount = 0;
    this.aiTurnCount = 0;
    this.currentTurn = 'transitioning';
    this.history = [];
    this.metrics = this.createInitialMetrics();
    this.isActive = true;

    this.emit('started', this.getSessionInfo());
  }

  /**
   * End the session
   */
  async end(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.status = 'idle';
    this.isActive = false;
    this.metrics.sessionDurationMs = Date.now() - this.startTime;

    this.emit('ended', this.getSessionInfo());
  }

  /**
   * Check if session is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get session information
   */
  getSessionInfo(): ITalkSession {
    return {
      id: this.id,
      startTime: this.startTime,
      status: this.status,
      userTurnCount: this.userTurnCount,
      aiTurnCount: this.aiTurnCount,
    };
  }

  /**
   * Get current status
   */
  getStatus(): TalkModeStatus {
    return this.status;
  }

  /**
   * Set session status
   */
  setStatus(status: TalkModeStatus): void {
    this.status = status;
    this.emit('status', status);
  }

  /**
   * Get current turn
   */
  getCurrentTurn(): TurnState {
    return this.currentTurn;
  }

  /**
   * Add user message to history
   * 
   * @param content - Message content
   * @param audio - Optional audio data
   * @param metadata - Optional metadata
   */
  addUserMessage(
    content: string,
    audio?: Buffer,
    metadata?: Record<string, unknown>
  ): void {
    const message: ConversationMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
      audio,
      metadata,
    };

    this.addToHistory(message);
    this.userTurnCount++;
    this.setTurn('user');

    this.emit('userMessage', message);
  }

  /**
   * Add AI/assistant message to history
   * 
   * @param content - Message content
   * @param audio - Optional audio data
   * @param metadata - Optional metadata
   */
  addAIResponse(
    content: string,
    audio?: Buffer,
    metadata?: Record<string, unknown>
  ): void {
    const message: ConversationMessage = {
      role: 'assistant',
      content,
      timestamp: Date.now(),
      audio,
      metadata,
    };

    this.addToHistory(message);
    this.aiTurnCount++;
    this.setTurn('ai');

    this.emit('aiMessage', message);
  }

  /**
   * Add system message to history
   * 
   * @param content - Message content
   * @param metadata - Optional metadata
   */
  addSystemMessage(content: string, metadata?: Record<string, unknown>): void {
    const message: ConversationMessage = {
      role: 'system',
      content,
      timestamp: Date.now(),
      metadata,
    };

    this.addToHistory(message);
    this.emit('systemMessage', message);
  }

  /**
   * Add message to history with length limiting
   */
  private addToHistory(message: ConversationMessage): void {
    this.history.push(message);

    // Trim history if exceeds max length
    while (this.history.length > this.maxHistoryLength) {
      // Keep system messages and most recent messages
      const systemMessages = this.history.filter(m => m.role === 'system');
      const recentMessages = this.history.slice(-(this.maxHistoryLength - systemMessages.length));
      
      // Rebuild history preserving system messages
      this.history = [...systemMessages, ...recentMessages];
    }

    this.emit('historyUpdate', this.history);
  }

  /**
   * Get conversation history
   * 
   * @param limit - Optional limit on number of messages to return
   */
  getHistory(limit?: number): ConversationMessage[] {
    if (limit !== undefined && limit > 0) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get history for AI context (formatted for LLM)
   */
  getAIContext(): string {
    return this.history
      .map(msg => `${msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
    this.emit('historyClear');
  }

  /**
   * Set current turn holder
   */
  private setTurn(turn: TurnState): void {
    const previousTurn = this.currentTurn;
    
    if (previousTurn !== turn) {
      this.currentTurn = turn;
      
      const event: TurnEvent = {
        turn,
        timestamp: Date.now(),
        previousTurn,
      };
      
      this.emit('turn', event);
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): TalkMetrics {
    return { ...this.metrics };
  }

  /**
   * Update STT latency metric
   */
  recordSTTLatency(latencyMs: number): void {
    const currentAvg = this.metrics.avgSTTLatencyMs;
    const totalTurns = this.userTurnCount;
    
    if (totalTurns === 0) {
      // First recording - set directly
      this.metrics.avgSTTLatencyMs = latencyMs;
    } else {
      // Calculate running average
      this.metrics.avgSTTLatencyMs = (currentAvg * totalTurns + latencyMs) / (totalTurns + 1);
    }
  }

  /**
   * Update TTS latency metric
   */
  recordTTSLatency(latencyMs: number): void {
    const currentAvg = this.metrics.avgTTSLatencyMs;
    const totalTurns = this.aiTurnCount;
    
    if (totalTurns === 0) {
      // First recording - set directly
      this.metrics.avgTTSLatencyMs = latencyMs;
    } else {
      // Calculate running average
      this.metrics.avgTTSLatencyMs = (currentAvg * totalTurns + latencyMs) / (totalTurns + 1);
    }
  }

  /**
   * Record interruption
   */
  recordInterruption(): void {
    this.metrics.interruptionCount++;
    this.emit('interruption', this.metrics.interruptionCount);
  }

  /**
   * Record error
   */
  recordError(): void {
    this.metrics.errorCount++;
    this.emit('error', this.metrics.errorCount);
  }

  /**
   * Get session ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get turn counts
   */
  getTurnCounts(): { user: number; ai: number } {
    return {
      user: this.userTurnCount,
      ai: this.aiTurnCount,
    };
  }

  /**
   * Check if session has messages
   */
  hasMessages(): boolean {
    return this.history.length > 0;
  }

  /**
   * Get last user message
   */
  getLastUserMessage(): ConversationMessage | undefined {
    const userMessages = this.history.filter(m => m.role === 'user');
    return userMessages[userMessages.length - 1];
  }

  /**
   * Get last AI message
   */
  getLastAIMessage(): ConversationMessage | undefined {
    const aiMessages = this.history.filter(m => m.role === 'assistant');
    return aiMessages[aiMessages.length - 1];
  }

  /**
   * Summarize conversation (truncates middle if too long)
   */
  summarize(maxMessages = 10): ConversationMessage[] {
    if (this.history.length <= maxMessages) {
      return [...this.history];
    }

    const systemMessages = this.history.filter(m => m.role === 'system');
    const otherMessages = this.history.filter(m => m.role !== 'system');
    
    const keepPerSide = Math.floor((maxMessages - systemMessages.length) / 2);
    
    return [
      ...systemMessages,
      ...otherMessages.slice(0, keepPerSide),
      {
        role: 'system',
        content: `[${otherMessages.length - keepPerSide * 2} messages truncated]`,
        timestamp: Date.now(),
      },
      ...otherMessages.slice(-keepPerSide),
    ];
  }
}

/**
 * Session Manager - manages multiple talk sessions
 */
export class SessionManager extends EventEmitter {
  private sessions: Map<string, TalkSession> = new Map();
  private activeSession: TalkSession | null = null;
  private maxSessions: number;

  constructor(maxSessions = 5) {
    super();
    this.maxSessions = maxSessions;
  }

  /**
   * Create a new session
   */
  createSession(maxHistoryLength = 50): TalkSession {
    // Clean up old sessions if at max
    if (this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) {
        this.sessions.delete(oldestKey);
      }
    }

    const session = new TalkSession(maxHistoryLength);
    this.sessions.set(session.getId(), session);
    
    session.on('ended', () => {
      if (this.activeSession?.getId() === session.getId()) {
        this.activeSession = null;
      }
    });

    this.emit('sessionCreated', session.getId());
    
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(id: string): TalkSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Get active session
   */
  getActiveSession(): TalkSession | null {
    return this.activeSession;
  }

  /**
   * Set active session
   */
  setActiveSession(session: TalkSession): void {
    this.activeSession = session;
    this.emit('activeSessionChanged', session.getId());
  }

  /**
   * End session by ID
   */
  async endSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      await session.end();
      this.sessions.delete(id);
      this.emit('sessionEnded', id);
    }
  }

  /**
   * End all sessions
   */
  async endAllSessions(): Promise<void> {
    const endPromises = Array.from(this.sessions.values()).map(s => s.end());
    await Promise.all(endPromises);
    this.sessions.clear();
    this.activeSession = null;
  }

  /**
   * Get all session IDs
   */
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}
