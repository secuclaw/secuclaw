import type {
  ErrorShape,
  EventFrame,
  GatewayFrame,
  RequestFrame,
  ResponseFrame,
} from "./types.js";

export function createRequest(id: string, method: string, params?: unknown): RequestFrame {
  return { type: "req", id, method, params };
}

export function createResponse(
  id: string,
  ok: boolean,
  payload?: unknown,
  error?: ErrorShape,
): ResponseFrame {
  return { type: "res", id, ok, payload, error };
}

export function createSuccessResponse(id: string, payload?: unknown): ResponseFrame {
  return createResponse(id, true, payload);
}

export function createErrorResponse(id: string, error: ErrorShape): ResponseFrame {
  return createResponse(id, false, undefined, error);
}

export function createEvent(event: string, payload?: unknown, seq?: number): EventFrame {
  return { type: "event", event, payload, seq };
}

export function createTickEvent(ts: number): EventFrame {
  return createEvent("tick", { ts });
}

export function createShutdownEvent(reason: string, restartExpectedMs?: number): EventFrame {
  return createEvent("shutdown", { reason, restartExpectedMs });
}

export function isRequestFrame(frame: GatewayFrame): frame is RequestFrame {
  return frame.type === "req";
}

export function isResponseFrame(frame: GatewayFrame): frame is ResponseFrame {
  return frame.type === "res";
}

export function isEventFrame(frame: GatewayFrame): frame is EventFrame {
  return frame.type === "event";
}

export function parseFrame(data: string): GatewayFrame | null {
  try {
    const parsed = JSON.parse(data);
    if (!isValidFrame(parsed)) {
      return null;
    }
    return parsed as GatewayFrame;
  } catch {
    return null;
  }
}

export function serializeFrame(frame: GatewayFrame): string {
  return JSON.stringify(frame);
}

function isValidFrame(obj: unknown): obj is GatewayFrame {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const frame = obj as Record<string, unknown>;

  if (frame.type === "req") {
    return (
      typeof frame.id === "string" &&
      typeof frame.method === "string" &&
      (frame.params === undefined || frame.params !== null)
    );
  }

  if (frame.type === "res") {
    return (
      typeof frame.id === "string" &&
      typeof frame.ok === "boolean" &&
      (frame.payload === undefined || frame.payload !== null) &&
      (frame.error === undefined || isValidErrorShape(frame.error))
    );
  }

  if (frame.type === "event") {
    return (
      typeof frame.event === "string" &&
      (frame.payload === undefined || frame.payload !== null)
    );
  }

  return false;
}

function isValidErrorShape(obj: unknown): obj is ErrorShape {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const error = obj as Record<string, unknown>;
  return (
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    (error.details === undefined || error.details !== null) &&
    (error.retryable === undefined || typeof error.retryable === "boolean") &&
    (error.retryAfterMs === undefined ||
      (typeof error.retryAfterMs === "number" && error.retryAfterMs >= 0))
  );
}

export function createErrorShape(
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
  retryAfterMs?: number,
): ErrorShape {
  return { code, message, details, retryable, retryAfterMs };
}

export const ErrorCodes = {
  INTERNAL_ERROR: "INTERNAL_ERROR",
  METHOD_NOT_FOUND: "METHOD_NOT_FOUND",
  INVALID_PARAMS: "INVALID_PARAMS",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  TIMEOUT: "TIMEOUT",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export function isInternalError(frame: GatewayFrame): boolean {
  return (
    isResponseFrame(frame) &&
    frame.ok === false &&
    frame.error?.code === ErrorCodes.INTERNAL_ERROR
  );
}

export function isAuthError(frame: GatewayFrame): boolean {
  return (
    isResponseFrame(frame) &&
    frame.ok === false &&
    (frame.error?.code === ErrorCodes.UNAUTHORIZED ||
      frame.error?.code === ErrorCodes.FORBIDDEN)
  );
}

// P1-T13 control-plane frame model (JSON-RPC style)
export interface GatewayError {
  code: number;
  message: string;
  data?: unknown;
}

export type GatewayRequestMessage = {
  type: "request";
  id: string;
  method: string;
  params: unknown;
};

export type GatewayResponseMessage = {
  type: "response";
  id: string;
  result?: unknown;
  error?: GatewayError;
};

export type GatewayEventMessage = {
  type: "event";
  event: string;
  data: unknown;
};

export type GatewayMessage =
  | GatewayRequestMessage
  | GatewayResponseMessage
  | GatewayEventMessage;

export function parseGatewayMessage(data: string): GatewayMessage | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (!isGatewayMessage(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function serializeGatewayMessage(message: GatewayMessage): string {
  return JSON.stringify(message);
}

export function isGatewayMessage(input: unknown): input is GatewayMessage {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  const record = input as Record<string, unknown>;
  if (record.type === "request") {
    return typeof record.id === "string" && typeof record.method === "string" && "params" in record;
  }
  if (record.type === "response") {
    if (typeof record.id !== "string") {
      return false;
    }
    if (record.error === undefined) {
      return true;
    }
    return isGatewayError(record.error);
  }
  if (record.type === "event") {
    return typeof record.event === "string" && "data" in record;
  }
  return false;
}

export function isGatewayError(input: unknown): input is GatewayError {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  const record = input as Record<string, unknown>;
  return typeof record.code === "number" && typeof record.message === "string";
}
