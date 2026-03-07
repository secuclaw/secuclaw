import type {
  Authenticator,
  ClientConnection,
  ConnectParams,
  GatewayFrame,
  GatewayServer,
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
  parseFrame,
  serializeFrame,
} from "./protocol.js";

declare const setInterval: (callback: () => void, ms: number) => number;
declare const clearInterval: (timerId: number) => void;

type TimerId = number;

export class DefaultGatewayServer implements GatewayServer {
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
): GatewayServer {
  return new DefaultGatewayServer(router, authenticator, events);
}
