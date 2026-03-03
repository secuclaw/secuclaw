import { WebSocketServer, WebSocket } from "ws";
import type {
  Authenticator,
  ClientConnection,
  ConnectParams,
  GatewayFrame,
  GatewayServer as LegacyGatewayServer,
  HandlerContext,
  HelloOk,
  RequestFrame,
  Router,
  ServerEvents,
} from "./types.js";
import {
  createEvent,
  createErrorResponse,
  createSuccessResponse,
  parseGatewayMessage,
  parseFrame,
  serializeGatewayMessage,
  serializeFrame,
  type GatewayError,
  type GatewayMessage,
} from "./protocol.js";
import { authorizeGatewayConnect, type GatewayAuthConfig } from "./auth.js";
import { DEFAULT_GATEWAY_BIND, DEFAULT_GATEWAY_PORT } from "./server-constants.js";
import type { GatewayConnection as ControlPlaneConnection, MethodHandler as ControlPlaneMethodHandler } from "./methods/types.js";

declare const setInterval: (callback: () => void, ms: number) => number;
declare const clearInterval: (timerId: number) => void;

type TimerId = number;

export class DefaultGatewayServer implements LegacyGatewayServer {
  private connections: Map<string, ConnectionState> = new Map();
  private nextConnId = 0;
  private running = false;
  private tickSeq = 0;
  private version = "1.0.0";
  private tickTimer: TimerId | null = null;

  constructor(
    private router: Router & { hasMethod?: (method: string) => boolean; getMethods?: () => string[] },
    private authenticator?: Authenticator,
    private events?: ServerEvents,
  ) {}

  async start(opts: { host: string; port: number; router: Router; onConnect?: (clientId: string, connId: string) => void; onDisconnect?: (clientId: string, connId: string) => void }): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    this.tickTimer = setInterval(() => {
      this.tickSeq++;
      this.broadcast("tick", { ts: Date.now(), seq: this.tickSeq });
    }, 1000);

    if (this.tickTimer && typeof this.tickTimer === "object" && "unref" in this.tickTimer) {
      (this.tickTimer as { unref: () => void }).unref();
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    for (const [, conn] of this.connections) {
      conn.close(1000, "Server shutting down");
    }
    this.connections.clear();
  }

  broadcast(event: string, payload?: unknown): void {
    const frame = createEvent(event, payload);
    const data = serializeFrame(frame);

    for (const conn of this.connections.values()) {
      this.sendToConnection(conn, data);
    }
  }

  sendToClient(connId: string, frame: GatewayFrame): void {
    const conn = this.connections.get(connId);
    if (conn) {
      this.sendToConnection(conn, serializeFrame(frame));
    }
  }

  private createMessageHandler(opts: { host: string; port: number; onConnect?: (clientId: string, connId: string) => void }) {
    return {
      onConnection: (socket: SocketLike) => {
        const connId = `conn-${++this.nextConnId}`;
        const conn: ConnectionState = {
          connId,
          socket,
          clientId: "",
          authenticated: false,
          role: undefined,
          scopes: undefined,
          pendingRequests: new Map(),
          close: (code?: number, reason?: string) => {
            socket.close(code ?? 1000, reason ?? "Close");
          },
        };

        this.connections.set(connId, conn);

        socket.onmessage = async (event: { data: string }) => {
          await this.handleMessage(conn, event.data, opts);
        };

        socket.onclose = () => {
          this.handleClose(conn);
        };

        socket.onerror = () => {
          this.handleError(conn);
        };

        this.events?.onConnect?.(this.wrapConnection(conn));
      },
    };
  }

  private async handleMessage(
    conn: ConnectionState,
    data: string,
    opts: { onConnect?: (clientId: string, connId: string) => void },
  ): Promise<void> {
    const frame = parseFrame(data);
    if (!frame) {
      this.sendToConnection(
        conn,
        serializeFrame(createErrorResponse("unknown", { code: "INVALID_FRAME", message: "Failed to parse frame" })),
      );
      return;
    }

    this.events?.onFrame?.(this.wrapConnection(conn), frame);

    if (frame.type === "req") {
      await this.handleRequest(conn, frame, opts);
    }
  }

  private async handleRequest(
    conn: ConnectionState,
    frame: RequestFrame,
    opts: { onConnect?: (clientId: string, connId: string) => void },
  ): Promise<void> {
    if (!conn.authenticated && frame.method !== "connect") {
      this.sendToConnection(
        conn,
        serializeFrame(
          createErrorResponse(frame.id, {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          }),
        ),
      );
      return;
    }

    if (frame.method === "connect") {
      await this.handleConnect(conn, frame, opts);
      return;
    }

    if (frame.method === "ping") {
      this.sendToConnection(conn, serializeFrame(createSuccessResponse(frame.id, { pong: true })));
      return;
    }

    const ctx: HandlerContext = {
      clientId: conn.clientId,
      connId: conn.connId,
      role: conn.role,
      scopes: conn.scopes,
    };

    const response = await this.router.handle(frame, ctx);
    this.sendToConnection(conn, serializeFrame(response));
  }

  private async handleConnect(
    conn: ConnectionState,
    frame: RequestFrame,
    opts: { onConnect?: (clientId: string, connId: string) => void },
  ): Promise<void> {
    const params = frame.params as ConnectParams | undefined;
    if (!params) {
      this.sendToConnection(
        conn,
        serializeFrame(
          createErrorResponse(frame.id, {
            code: "INVALID_PARAMS",
            message: "Connect parameters required",
          }),
        ),
      );
      return;
    }

    let authResult;
    if (this.authenticator) {
      authResult = await this.authenticator.authenticate(params, params.auth);
    } else {
      authResult = { ok: true, clientId: params.client.id };
    }

    if (!authResult.ok) {
      this.sendToConnection(
        conn,
        serializeFrame(createErrorResponse(frame.id, authResult.error!)),
      );
      return;
    }

    conn.clientId = authResult.clientId!;
    conn.authenticated = true;
    conn.role = authResult.role;
    conn.scopes = authResult.scopes;

    const getMethods = this.router.getMethods ?? (() => ["connect", "ping"]);

    const hello: HelloOk = {
      type: "hello-ok",
      protocol: 1,
      server: {
        version: this.version,
        connId: conn.connId,
      },
      features: {
        methods: getMethods(),
        events: ["tick", "shutdown"],
      },
      policy: {
        maxPayload: 1024 * 1024,
        maxBufferedBytes: 10 * 1024 * 1024,
        tickIntervalMs: 1000,
      },
    };

    this.sendToConnection(conn, serializeFrame(createSuccessResponse(frame.id, hello)));
    opts.onConnect?.(conn.clientId, conn.connId);
  }

  private handleClose(conn: ConnectionState): void {
    this.events?.onDisconnect?.(this.wrapConnection(conn));
    this.connections.delete(conn.connId);
  }

  private handleError(conn: ConnectionState): void {
    this.connections.delete(conn.connId);
  }

  private sendToConnection(conn: ConnectionState, data: string): void {
    if (conn.socket.readyState === SocketState.OPEN) {
      conn.socket.send(data);
    }
  }

  private wrapConnection(conn: ConnectionState): ClientConnection {
    return {
      connId: conn.connId,
      clientId: conn.clientId,
      send: (frame: GatewayFrame) => {
        this.sendToConnection(conn, serializeFrame(frame));
      },
      close: conn.close,
    };
  }
}

interface ConnectionState {
  connId: string;
  clientId: string;
  authenticated: boolean;
  role?: string;
  scopes?: string[];
  socket: SocketLike;
  pendingRequests: Map<string, unknown>;
  close(code?: number, reason?: string): void;
}

interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((error: unknown) => void) | null;
}

export const SocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export function createServer(
  router: Router & { hasMethod?: (method: string) => boolean; getMethods?: () => string[] },
  authenticator?: Authenticator,
  events?: ServerEvents,
): LegacyGatewayServer {
  return new DefaultGatewayServer(router, authenticator, events);
}

export type RuntimeEnv = {
  name?: string;
  version?: string;
  [key: string]: unknown;
};

export type GatewayServerOpts = {
  port?: number;
  bind?: "loopback" | "all";
  auth?: GatewayAuthConfig;
  runtime: RuntimeEnv;
};

export type ConnectionHandler = (connection: ControlPlaneConnection) => void;

interface GatewayConnectionState {
  id: string;
  socket: WebSocket;
  user?: string;
}

export class GatewayServer {
  port: number;
  private readonly opts: GatewayServerOpts;
  private wsServer: WebSocketServer | null = null;
  private nextConnectionId = 0;
  private readonly connections = new Map<string, GatewayConnectionState>();
  private readonly connectionHandlers = new Set<ConnectionHandler>();
  private readonly methods = new Map<string, ControlPlaneMethodHandler<unknown, unknown>>();

  constructor(opts: GatewayServerOpts) {
    this.opts = opts;
    this.port = opts.port ?? DEFAULT_GATEWAY_PORT;
    this.registerMethod("health.check", async () => {
      return { status: "ok", timestamp: Date.now() };
    });
  }

  async start(): Promise<void> {
    if (this.wsServer) {
      return;
    }

    const host = (this.opts.bind ?? DEFAULT_GATEWAY_BIND) === "all" ? "0.0.0.0" : "127.0.0.1";
    this.wsServer = new WebSocketServer({
      host,
      port: this.port,
    });

    await new Promise<void>((resolve, reject) => {
      if (!this.wsServer) {
        reject(new Error("Gateway server was not initialized"));
        return;
      }
      this.wsServer.once("listening", () => {
        const address = this.wsServer?.address();
        if (address && typeof address !== "string") {
          this.port = address.port;
        }
        resolve();
      });
      this.wsServer.once("error", (error) => {
        reject(error);
      });
    });

    this.wsServer.on("connection", (socket, request) => {
      void this.handleConnection(socket, request.url ?? "", request.headers);
    });
  }

  async stop(): Promise<void> {
    for (const connection of this.connections.values()) {
      connection.socket.close(1001, "Server stopping");
    }
    this.connections.clear();

    if (!this.wsServer) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.wsServer?.close(() => {
        resolve();
      });
    });
    this.wsServer = null;
  }

  async close(): Promise<void> {
    await this.stop();
  }

  broadcast(message: GatewayMessage): void {
    const encoded = serializeGatewayMessage(message);
    for (const connection of this.connections.values()) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(encoded);
      }
    }
  }

  onConnection(handler: ConnectionHandler): void {
    this.connectionHandlers.add(handler);
  }

  getConnections(): ControlPlaneConnection[] {
    return Array.from(this.connections.values()).map((connection) => this.asConnection(connection));
  }

  registerMethod(name: string, handler: ControlPlaneMethodHandler<unknown, unknown>): void {
    this.methods.set(name, handler);
  }

  private async handleConnection(
    socket: WebSocket,
    requestUrl: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    const auth = await this.authorizeRequest(requestUrl, headers);
    if (!auth.ok) {
      socket.close(4401, auth.reason ?? "Unauthorized");
      return;
    }

    const id = `gw-${++this.nextConnectionId}`;
    const state: GatewayConnectionState = {
      id,
      socket,
      user: auth.user,
    };
    this.connections.set(id, state);
    const connection = this.asConnection(state);
    for (const handler of this.connectionHandlers) {
      handler(connection);
    }

    socket.on("message", async (raw) => {
      await this.handleMessage(state, raw.toString());
    });
    socket.on("close", () => {
      this.connections.delete(id);
    });
    socket.on("error", () => {
      this.connections.delete(id);
    });
  }

  private async authorizeRequest(
    requestUrl: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<{ ok: boolean; user?: string; reason?: string }> {
    const mode = this.opts.auth?.mode ?? "none";
    const query = new URL(requestUrl, "http://gateway.local").searchParams;

    const result = await authorizeGatewayConnect({
      mode,
      token: query.get("token") ?? undefined,
      expectedToken: this.opts.auth?.token,
      password: query.get("password") ?? undefined,
      expectedPassword: this.opts.auth?.password,
      tailscaleUser: headerValue(headers["x-tailscale-user"]),
      trustedTailnet: this.opts.auth?.trustedTailnet,
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    return { ok: true, user: result.user };
  }

  private async handleMessage(state: GatewayConnectionState, raw: string): Promise<void> {
    const message = parseGatewayMessage(raw);
    if (!message || message.type !== "request") {
      return;
    }

    const handler = this.methods.get(message.method);
    if (!handler) {
      this.send(state, {
        type: "response",
        id: message.id,
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`,
        },
      });
      return;
    }

    let responded = false;
    const connection = this.asConnection(state);
    const respond = (success: boolean, result?: unknown, error?: GatewayError): void => {
      responded = true;
      if (success) {
        this.send(state, {
          type: "response",
          id: message.id,
          result,
        });
        return;
      }
      this.send(state, {
        type: "response",
        id: message.id,
        error: error ?? { code: -32000, message: "Unknown error" },
      });
    };

    try {
      const result = await handler(message.params, {
        connection,
        respond,
      });
      if (!responded) {
        this.send(state, {
          type: "response",
          id: message.id,
          result,
        });
      }
    } catch (error) {
      this.send(state, {
        type: "response",
        id: message.id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : "Method execution failed",
        },
      });
    }
  }

  private send(state: GatewayConnectionState, message: GatewayMessage): void {
    if (state.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    state.socket.send(serializeGatewayMessage(message));
  }

  private asConnection(state: GatewayConnectionState): ControlPlaneConnection {
    return {
      id: state.id,
      metadata: {
        user: state.user,
      },
      send: (message) => {
        this.send(state, message);
      },
      close: (code?: number, reason?: string) => {
        state.socket.close(code, reason);
      },
    };
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
