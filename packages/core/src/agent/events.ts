import type { AgentEvent } from "./types.js";

export type AgentEventStream = "lifecycle" | "tool" | "assistant" | "error" | "compaction";

export type AgentEventListener = (event: AgentEvent) => void;

const listeners = new Map<AgentEventStream, Set<AgentEventListener>>();
const globalListeners = new Set<AgentEventListener>();
const seqByRun = new Map<string, number>();

function getNextSeq(runId: string): number {
  const current = seqByRun.get(runId) ?? 0;
  const next = current + 1;
  seqByRun.set(runId, next);
  return next;
}

export function emitAgentEvent(
  stream: AgentEventStream,
  runId: string,
  sessionId: string,
  data: Record<string, unknown>,
): void {
  const event: AgentEvent = {
    type: stream,
    runId,
    sessionId,
    timestamp: Date.now(),
    data,
  };

  const streamListeners = listeners.get(stream);
  if (streamListeners) {
    for (const listener of streamListeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  for (const listener of globalListeners) {
    try {
      listener(event);
    } catch {
      // Ignore listener errors
    }
  }
}

export function onAgentEvent(
  stream: AgentEventStream,
  listener: AgentEventListener,
): () => void {
  let streamListeners = listeners.get(stream);
  if (!streamListeners) {
    streamListeners = new Set();
    listeners.set(stream, streamListeners);
  }
  streamListeners.add(listener);

  return () => {
    streamListeners?.delete(listener);
  };
}

export function onAgentEventGlobal(listener: AgentEventListener): () => void {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
}

export function offAgentEvent(stream: AgentEventStream, listener: AgentEventListener): void {
  const streamListeners = listeners.get(stream);
  streamListeners?.delete(listener);
}

export function clearAgentEventListeners(stream?: AgentEventStream): void {
  if (stream) {
    listeners.delete(stream);
  } else {
    listeners.clear();
    globalListeners.clear();
    seqByRun.clear();
  }
}

export function resetSeqForRun(runId: string): void {
  seqByRun.set(runId, 0);
}

export function getSeqForRun(runId: string): number {
  return seqByRun.get(runId) ?? 0;
}
