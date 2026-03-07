export * from "./types.js";
export * from "./protocol.js";
export * from "./router.js";
export * from "./auth.js";
export * from "./server.js";
export * from "./market-routes.js";

export { createRouter } from "./router.js";
export { createServer, SocketState } from "./server.js";
export { createAuthenticator, DefaultAuthenticator, TokenAuthenticator } from "./auth.js";
export { Gateway } from "./wrapper.js";
export { createMarketApiHandler, CATEGORY_COLORS } from "./market-routes.js";
export type { MarketApiRouteContext } from "./market-routes.js";
export type { GatewayOptions, GatewayState } from "./wrapper.js";

// Control UI
export {
  resolveControlUiRoot,
  isControlUiAvailable,
  handleControlUiRequest,
  createControlUiHandler,
} from "./control-ui-assets.js";
export type { ControlUiConfig } from "./control-ui-assets.js";
