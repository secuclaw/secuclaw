import type { GatewayRequestHandlers } from "./types.js";

export const healthHandlers: GatewayRequestHandlers = {
  "health.check": async (_params, context) => {
    const payload = { status: "ok", timestamp: Date.now() };
    context.respond(true, payload);
    return payload;
  },
};
