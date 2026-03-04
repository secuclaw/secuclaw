import type { RouteRequest, RouteResponse } from "./types.js";
type RouteHandler = (request: RouteRequest) => Promise<RouteResponse>;
export declare class LiteGateway {
    private routes;
    private started;
    register(path: string, method: "GET" | "POST", handler: RouteHandler): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    isStarted(): boolean;
    handle(request: RouteRequest): Promise<RouteResponse>;
    private routeKey;
}
export {};
//# sourceMappingURL=lite-gateway.d.ts.map