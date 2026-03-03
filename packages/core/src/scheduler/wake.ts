import type {
  HeartbeatRunResult,
  HeartbeatWakeHandler,
  PendingWake,
  WakeKind,
  WakeState,
} from "./types.js";
import { WakePriority } from "./types.js";

type TimerId = number;

const DEFAULT_COALESCE_MS = 250;
const DEFAULT_RETRY_MS = 1_000;

let state: WakeState = {
  handler: null,
  pendingWakes: new Map(),
  scheduled: false,
  running: false,
  timer: null,
  timerDueAt: null,
  timerKind: null,
};

function resolveReasonPriority(reason: string | undefined): number {
  if (!reason) {
    return WakePriority.DEFAULT;
  }
  
  const kind = resolveWakeKind(reason);
  
  switch (kind) {
    case "retry":
      return WakePriority.RETRY;
    case "interval":
      return WakePriority.INTERVAL;
    case "action":
      return WakePriority.ACTION;
    default:
      return WakePriority.DEFAULT;
  }
}

function resolveWakeKind(reason: string | undefined): WakeKind {
  if (!reason) {
    return "default";
  }
  
  const lower = reason.toLowerCase();
  
  if (lower === "retry") {
    return "retry";
  }
  if (lower === "interval") {
    return "interval";
  }
  if (lower === "action" || lower === "wake" || lower === "hook") {
    return "action";
  }
  
  return "default";
}

function normalizeWakeTarget(value: string | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

function getWakeTargetKey(params: { agentId?: string; sessionKey?: string }): string {
  const agentId = normalizeWakeTarget(params.agentId);
  const sessionKey = normalizeWakeTarget(params.sessionKey);
  return `${agentId ?? ""}::${sessionKey ?? ""}`;
}

function queuePendingWakeReason(params?: {
  reason?: string;
  requestedAt?: number;
  agentId?: string;
  sessionKey?: string;
}): void {
  const requestedAt = params?.requestedAt ?? Date.now();
  const normalizedReason = params?.reason ?? "default";
  const normalizedAgentId = normalizeWakeTarget(params?.agentId);
  const normalizedSessionKey = normalizeWakeTarget(params?.sessionKey);
  const wakeTargetKey = getWakeTargetKey({
    agentId: normalizedAgentId,
    sessionKey: normalizedSessionKey,
  });

  const next: PendingWake = {
    reason: normalizedReason,
    priority: resolveReasonPriority(normalizedReason),
    requestedAt,
    agentId: normalizedAgentId,
    sessionKey: normalizedSessionKey,
  };

  const previous = state.pendingWakes.get(wakeTargetKey);
  
  if (!previous) {
    state.pendingWakes.set(wakeTargetKey, next);
    return;
  }

  if (next.priority > previous.priority) {
    state.pendingWakes.set(wakeTargetKey, next);
    return;
  }

  if (next.priority === previous.priority && next.requestedAt >= previous.requestedAt) {
    state.pendingWakes.set(wakeTargetKey, next);
  }
}

function schedule(coalesceMs: number, kind: WakeKind = "normal"): void {
  const delay = Number.isFinite(coalesceMs) ? Math.max(0, coalesceMs) : DEFAULT_COALESCE_MS;
  const dueAt = Date.now() + delay;

  if (state.timer) {
    if (state.timerKind === "retry") {
      return;
    }
    if (typeof state.timerDueAt === "number" && state.timerDueAt <= dueAt) {
      return;
    }
    clearTimer(state.timer);
    state.timer = null;
    state.timerDueAt = null;
    state.timerKind = null;
  }

  state.timerDueAt = dueAt;
  state.timerKind = kind;
  state.timer = setTimeout(async () => {
    state.timer = null;
    state.timerDueAt = null;
    state.timerKind = null;
    state.scheduled = false;

    const active = state.handler;
    if (!active) {
      return;
    }

    if (state.running) {
      state.scheduled = true;
      schedule(delay, kind);
      return;
    }

    const pendingBatch = Array.from(state.pendingWakes.values());
    state.pendingWakes.clear();
    state.running = true;

    try {
      for (const pendingWake of pendingBatch) {
        const wakeOpts = {
          reason: pendingWake.reason ?? undefined,
          ...(pendingWake.agentId ? { agentId: pendingWake.agentId } : {}),
          ...(pendingWake.sessionKey ? { sessionKey: pendingWake.sessionKey } : {}),
        };
        
        const res = await active(wakeOpts);
        
        if (res.status === "skipped" && res.reason === "requests-in-flight") {
          queuePendingWakeReason({
            reason: pendingWake.reason ?? "retry",
            agentId: pendingWake.agentId,
            sessionKey: pendingWake.sessionKey,
          });
          schedule(DEFAULT_RETRY_MS, "retry");
        }
      }
    } catch {
      for (const pendingWake of pendingBatch) {
        queuePendingWakeReason({
          reason: pendingWake.reason ?? "retry",
          agentId: pendingWake.agentId,
          sessionKey: pendingWake.sessionKey,
        });
      }
      schedule(DEFAULT_RETRY_MS, "retry");
    } finally {
      state.running = false;
      if (state.pendingWakes.size > 0 || state.scheduled) {
        schedule(delay, "normal");
      }
    }
  }, delay);
  
  if (state.timer && typeof state.timer.unref === "function") {
    state.timer.unref();
  }
}

function clearTimer(timer: ReturnType<typeof setTimeout>): void {
  if (timer) {
    clearTimeout(timer);
  }
}

export function setHeartbeatWakeHandler(next: HeartbeatWakeHandler | null): () => void {
  const prevHandler = state.handler;
  state.handler = next;

  if (next) {
    if (state.timer) {
      clearTimer(state.timer);
    }
    state.timer = null;
    state.timerDueAt = null;
    state.timerKind = null;
    state.running = false;
    state.scheduled = false;
  }

  if (state.handler && state.pendingWakes.size > 0) {
    schedule(DEFAULT_COALESCE_MS, "normal");
  }

  return () => {
    if (state.handler !== next) {
      return;
    }
    state.handler = null;
  };
}

export function requestHeartbeatNow(opts?: {
  reason?: string;
  coalesceMs?: number;
  agentId?: string;
  sessionKey?: string;
}): void {
  queuePendingWakeReason({
    reason: opts?.reason,
    agentId: opts?.agentId,
    sessionKey: opts?.sessionKey,
  });
  schedule(opts?.coalesceMs ?? DEFAULT_COALESCE_MS, "normal");
}

export function hasHeartbeatWakeHandler(): boolean {
  return state.handler !== null;
}

export function hasPendingHeartbeatWake(): boolean {
  return state.pendingWakes.size > 0 || Boolean(state.timer) || state.scheduled;
}

export function resetWakeState(): void {
  if (state.timer) {
    clearTimer(state.timer);
  }
  state.timer = null;
  state.timerDueAt = null;
  state.timerKind = null;
  state.pendingWakes.clear();
  state.scheduled = false;
  state.running = false;
  state.handler = null;
}

export function getWakeState(): Readonly<{
  handler: HeartbeatWakeHandler | null;
  pendingWakes: Map<string, PendingWake>;
  scheduled: boolean;
  running: boolean;
}> {
  return {
    handler: state.handler,
    pendingWakes: state.pendingWakes,
    scheduled: state.scheduled,
    running: state.running,
  };
}
