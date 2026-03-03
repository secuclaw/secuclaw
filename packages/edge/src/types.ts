export interface ResourceUsage {
  rssMb: number;
  heapTotalMb: number;
  heapUsedMb: number;
  externalMb: number;
  arrayBuffersMb: number;
  uptimeMs: number;
}

export interface EdgeRuntimeConfig {
  nodeEnv: "development" | "test" | "production";
  enableGateway: boolean;
  enableHealthCheck: boolean;
  enableConfigSync: boolean;
  preloadModules: string[];
  memoryLimitMb: number;
  startupTimeoutMs: number;
}

export interface EdgeModule {
  readonly id: string;
  readonly critical: boolean;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface AgentTask {
  id: string;
  type: "scan" | "analyze" | "alert" | "health";
  payload: Record<string, unknown>;
}

export interface AgentTaskResult {
  taskId: string;
  ok: boolean;
  output: string;
  durationMs: number;
}

export interface RouteRequest {
  path: string;
  method: "GET" | "POST";
  body?: unknown;
}

export interface RouteResponse {
  status: number;
  body: unknown;
}
