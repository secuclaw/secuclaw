export class ESCError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ESCError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFIG_ERROR", 500, details);
    this.name = "ConfigError";
  }
}

export class ValidationError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class AgentError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "AGENT_ERROR", 500, details);
    this.name = "AgentError";
  }
}

export class SessionError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "SESSION_ERROR", 500, details);
    this.name = "SessionError";
  }
}

export class MemoryError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "MEMORY_ERROR", 500, details);
    this.name = "MemoryError";
  }
}

export class ToolError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "TOOL_ERROR", 500, details);
    this.name = "ToolError";
  }
}

export class SandboxError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "SANDBOX_ERROR", 500, details);
    this.name = "SandboxError";
  }
}

export class StorageError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "STORAGE_ERROR", 500, details);
    this.name = "StorageError";
  }
}

export class AuthenticationError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "AUTH_ERROR", 401, details);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "AUTHORIZATION_ERROR", 403, details);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends ESCError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NOT_FOUND_ERROR", 404, details);
    this.name = "NotFoundError";
  }
}

export function isESCError(value: unknown): value is ESCError {
  return value instanceof ESCError;
}

export function getErrorCode(error: unknown): string {
  if (isESCError(error)) {
    return error.code;
  }
  return "UNKNOWN_ERROR";
}

export function getErrorStatusCode(error: unknown): number {
  if (isESCError(error)) {
    return error.statusCode;
  }
  return 500;
}
