export class LiteGateway {
    routes = new Map();
    started = false;
    register(path, method, handler) {
        this.routes.set(this.routeKey(path, method), handler);
    }
    async start() {
        this.started = true;
    }
    async stop() {
        this.started = false;
    }
    isStarted() {
        return this.started;
    }
    async handle(request) {
        if (!this.started) {
            return { status: 503, body: { error: "gateway-not-started" } };
        }
        const handler = this.routes.get(this.routeKey(request.path, request.method));
        if (!handler) {
            return { status: 404, body: { error: "not-found" } };
        }
        return handler(request);
    }
    routeKey(path, method) {
        return `${method}:${path}`;
    }
}
//# sourceMappingURL=lite-gateway.js.map