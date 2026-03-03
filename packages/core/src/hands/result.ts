/**
 * Hand Framework - Result Types
 * 
 * Defines types for Hand execution results, artifacts, and errors.
 */

// Hand error structure
export interface HandError {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
  details?: unknown;
}

// Hand artifact - output produced by a Hand
export interface HandArtifact {
  type: "file" | "report" | "alert" | "metric";
  name: string;
  path?: string;
  content?: unknown;
  metadata?: Record<string, unknown>;
}

// Hand execution result
export interface HandResult {
  success: boolean;
  data?: unknown;
  error?: HandError;
  duration: number;
  metrics: Record<string, unknown>;
  artifacts?: HandArtifact[];
}

// Factory functions for creating results
export function createSuccessResult(data: unknown, duration: number, metrics: Record<string, unknown> = {}, artifacts: HandArtifact[] = []): HandResult {
  return {
    success: true,
    data,
    duration,
    metrics,
    artifacts,
  };
}

export function createErrorResult(error: HandError, duration: number, metrics: Record<string, unknown> = {}): HandResult {
  return {
    success: false,
    error,
    duration,
    metrics,
  };
}

export function createArtifact(type: HandArtifact["type"], name: string, options?: Partial<HandArtifact>): HandArtifact {
  return {
    type,
    name,
    ...options,
  };
}
