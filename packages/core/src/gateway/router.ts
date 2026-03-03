import type {
  ErrorShape,
  HandlerContext,
  MethodHandler,
  RequestFrame,
  ResponseFrame,
  Router,
} from "./types.js";
import { createErrorResponse, createErrorShape, createSuccessResponse } from "./protocol.js";

export class DefaultRouter implements Router {
  private handlers: Map<string, MethodHandler> = new Map();
  private middleware: Middleware[] = [];

  register(method: string, handler: MethodHandler): void {
    this.handlers.set(method, handler);
  }

  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  async handle(frame: RequestFrame, ctx: HandlerContext): Promise<ResponseFrame> {
    const handler = this.handlers.get(frame.method);

    if (!handler) {
      return createErrorResponse(
        frame.id,
        createErrorShape(
          "METHOD_NOT_FOUND",
          `Method '${frame.method}' not found`,
        ),
      );
    }

    try {
      const composed = this.composeMiddleware(handler);
      const result = await composed(frame.params, ctx);
      return createSuccessResponse(frame.id, result);
    } catch (err) {
      return this.handleError(frame.id, err);
    }
  }

  hasMethod(method: string): boolean {
    return this.handlers.has(method);
  }

  getMethods(): string[] {
    return Array.from(this.handlers.keys());
  }

  private composeMiddleware(handler: MethodHandler): MethodHandler {
    if (this.middleware.length === 0) {
      return handler;
    }

    const reversed = [...this.middleware].reverse();
    return reversed.reduce<MethodHandler>((next, mw) => {
      return async (params?: unknown, ctx?: HandlerContext) => {
        return mw(params, ctx as HandlerContext, next);
      };
    }, handler);
  }

  private handleError(frameId: string, err: unknown): ResponseFrame {
    if (isErrorShape(err)) {
      return createErrorResponse(frameId, err);
    }

    const message = err instanceof Error ? err.message : "Internal error";
    return createErrorResponse(
      frameId,
      createErrorShape("INTERNAL_ERROR", message),
    );
  }
}

function isErrorShape(obj: unknown): obj is ErrorShape {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const error = obj as Record<string, unknown>;
  return (
    typeof error.code === "string" && typeof error.message === "string"
  );
}

export interface Middleware {
  (
    params: unknown,
    ctx: HandlerContext,
    next: MethodHandler,
  ): Promise<unknown>;
}

export function loggingMiddleware(
  params: unknown,
  _ctx: HandlerContext,
  next: MethodHandler,
): Promise<unknown> {
  return next(params);
}

export function validationMiddleware<T>(
  validator: (params: unknown) => params is T,
  transform?: (params: unknown) => T,
): Middleware {
  return async (params: unknown, _ctx: HandlerContext, next: MethodHandler) => {
    if (!validator(params)) {
      throw createErrorShape(
        "INVALID_PARAMS",
        "Invalid parameters",
      );
    }
    const validated = transform ? transform(params) : params;
    return next(validated);
  };
}

export function rateLimitMiddleware(
  windowMs: number,
  maxRequests: number,
): Middleware {
  const requests: Map<string, number[]> = new Map();

  return async (_params: unknown, ctx: HandlerContext, next: MethodHandler) => {
    const key = ctx.clientId;
    const now = Date.now();
    const window = requests.get(key) || [];

    const validTimestamps = window.filter((ts) => now - ts < windowMs);
    requests.set(key, validTimestamps);

    if (validTimestamps.length >= maxRequests) {
      const err = createErrorShape(
        "RATE_LIMITED",
        "Too many requests",
      );
      err.retryable = true;
      err.retryAfterMs = windowMs;
      throw err;
    }

    validTimestamps.push(now);
    return next();
  };
}

export function createRouter(): Router {
  return new DefaultRouter();
}
