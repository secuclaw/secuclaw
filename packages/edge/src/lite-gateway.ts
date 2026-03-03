import type { RouteRequest, RouteResponse } from "./types.js";

type RouteHandler = (request: RouteRequest) => Promise<RouteResponse>;

export class LiteGateway {
  private routes = new Map<string, RouteHandler>();
  private started = false;

  register(path: string, method: "GET" | "POST", handler: RouteHandler): void {
    this.routes.set(this.routeKey(path, method), handler);
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  isStarted(): boolean {
    return this.started;
  }

  async handle(request: RouteRequest): Promise<RouteResponse> {
    if (!this.started) {
      return { status: 503, body: { error: "gateway-not-started" } };
    }

    const handler = this.routes.get(this.routeKey(request.path, request.method));
    if (!handler) {
      return { status: 404, body: { error: "not-found" } };
    }
    return handler(request);
  }

  private routeKey(path: string, method: "GET" | "POST"): string {
    return `${method}:${path}`;
  }
}
