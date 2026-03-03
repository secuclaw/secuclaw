import type { GatewayError, GatewayMessage } from "../protocol.js";

export interface GatewayConnection {
  id: string;
  send(message: GatewayMessage): void;
  close(code?: number, reason?: string): void;
  metadata?: Record<string, unknown>;
}

export type MethodResponder<R = unknown> = (
  success: boolean,
  result?: R,
  error?: GatewayError,
) => void;

export type MethodContext<R = unknown> = {
  sessionId?: string;
  connection: GatewayConnection;
  respond: MethodResponder<R>;
};

export type MethodHandler<P = unknown, R = unknown> = (
  params: P,
  context: MethodContext<R>,
) => Promise<R> | R;

export type GatewayRequestHandlers = {
  [method: string]: MethodHandler<unknown, unknown>;
};
