import type { AgentEvent } from "../agent/types.js";

export type EventStreamType =
  | "lifecycle"
  | "tool"
  | "assistant"
  | "error"
  | "compaction"
  | "lane.enqueue"
  | "lane.dequeue"
  | "lane.complete"
  | "session.create"
  | "session.message"
  | "session.prune"
  | "reasoning.start"
  | "reasoning.result"
  | "sandbox.start"
  | "sandbox.complete"
  | "audit.log"
  | "risk.update"
  | "alert.trigger";

export const EVENT_STREAM_TYPES: EventStreamType[] = [
  "lifecycle",
  "tool",
  "assistant",
  "error",
  "compaction",
  "lane.enqueue",
  "lane.dequeue",
  "lane.complete",
  "session.create",
  "session.message",
  "session.prune",
  "reasoning.start",
  "reasoning.result",
  "sandbox.start",
  "sandbox.complete",
  "audit.log",
  "risk.update",
  "alert.trigger",
];

export interface EventListener {
  id: string;
  stream: EventStreamType;
  callback: (event: AgentEvent) => void | Promise<void>;
  filter?: (event: AgentEvent) => boolean;
}

export interface EventSubscription {
  id: string;
  unsubscribe: () => void;
}

export interface EventStats {
  totalEmitted: number;
  byStream: Record<EventStreamType, number>;
  activeListeners: number;
}

class EventStreamManager {
  private listeners: Map<EventStreamType, Set<EventListener>> = new Map();
  private globalListeners: Set<EventListener> = new Set();
  private eventHistory: AgentEvent[] = [];
  private maxHistorySize: number = 1000;
  private stats: EventStats = {
    totalEmitted: 0,
    byStream: {} as Record<EventStreamType, number>,
    activeListeners: 0,
  };
  private seqByRun: Map<string, number> = new Map();

  constructor() {
    for (const stream of EVENT_STREAM_TYPES) {
      this.listeners.set(stream, new Set());
      this.stats.byStream[stream] = 0;
    }
  }

  private getNextSeq(runId: string): number {
    const current = this.seqByRun.get(runId) ?? 0;
    const next = current + 1;
    this.seqByRun.set(runId, next);
    return next;
  }

  emit(
    stream: EventStreamType,
    runId: string,
    sessionId: string,
    data: Record<string, unknown>
  ): void {
    const event: AgentEvent = {
      type: stream,
      runId,
      sessionId,
      timestamp: Date.now(),
      seq: this.getNextSeq(runId),
      data,
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this.stats.totalEmitted++;
    this.stats.byStream[stream]++;

    const streamListeners = this.listeners.get(stream);
    if (streamListeners) {
      for (const listener of streamListeners) {
        if (listener.filter && !listener.filter(event)) continue;
        try {
          const result = listener.callback(event);
          if (result instanceof Promise) {
            result.catch(() => {});
          }
        } catch {}
      }
    }

    for (const listener of this.globalListeners) {
      if (listener.filter && !listener.filter(event)) continue;
      try {
        const result = listener.callback(event);
        if (result instanceof Promise) {
          result.catch(() => {});
        }
      } catch {}
    }
  }

  subscribe(
    stream: EventStreamType | "*",
    callback: (event: AgentEvent) => void | Promise<void>,
    filter?: (event: AgentEvent) => boolean
  ): EventSubscription {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const listener: EventListener = { id, stream: stream as EventStreamType, callback, filter };

    if (stream === "*") {
      this.globalListeners.add(listener);
    } else {
      const streamListeners = this.listeners.get(stream as EventStreamType);
      if (streamListeners) {
        streamListeners.add(listener);
      }
    }

    this.stats.activeListeners++;

    return {
      id,
      unsubscribe: () => {
        if (stream === "*") {
          this.globalListeners.delete(listener);
        } else {
          this.listeners.get(stream as EventStreamType)?.delete(listener);
        }
        this.stats.activeListeners--;
      },
    };
  }

  getHistory(limit?: number, stream?: EventStreamType): AgentEvent[] {
    let events = this.eventHistory;
    if (stream) {
      events = events.filter((e) => e.type === stream);
    }
    return limit ? events.slice(-limit) : events;
  }

  getStats(): EventStats {
    return { ...this.stats };
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  clearAllListeners(): void {
    for (const [, listeners] of this.listeners) {
      listeners.clear();
    }
    this.globalListeners.clear();
    this.stats.activeListeners = 0;
  }
}

export const eventStream = new EventStreamManager();

export function emitEvent(
  stream: EventStreamType,
  runId: string,
  sessionId: string,
  data: Record<string, unknown>
): void {
  eventStream.emit(stream, runId, sessionId, data);
}

export function subscribeToEvent(
  stream: EventStreamType | "*",
  callback: (event: AgentEvent) => void | Promise<void>,
  filter?: (event: AgentEvent) => boolean
): EventSubscription {
  return eventStream.subscribe(stream, callback, filter);
}

export function getEventHistory(limit?: number, stream?: EventStreamType): AgentEvent[] {
  return eventStream.getHistory(limit, stream);
}

export function getEventStats(): EventStats {
  return eventStream.getStats();
}
