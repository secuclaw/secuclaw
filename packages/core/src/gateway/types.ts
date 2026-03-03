export interface ErrorShape {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
}

export interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
}

export interface ResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: ErrorShape;
}

export interface EventFrame {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: ClientInfo;
  caps?: string[];
  commands?: string[];
  permissions?: Record<string, boolean>;
  pathEnv?: string;
  role?: string;
  scopes?: string[];
  device?: DeviceInfo;
  auth?: AuthInfo;
  locale?: string;
  userAgent?: string;
}

export interface ClientInfo {
  id: string;
  displayName?: string;
  version: string;
  platform: string;
  deviceFamily?: string;
  modelIdentifier?: string;
  mode: "agent" | "controller" | "observer";
  instanceId?: string;
}

export interface DeviceInfo {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce?: string;
}

export interface AuthInfo {
  token?: string;
  password?: string;
}

export interface HelloOk {
  type: "hello-ok";
  protocol: number;
  server: ServerInfo;
  features: Features;
  policy: Policy;
}

export interface ServerInfo {
  version: string;
  commit?: string;
  host?: string;
  connId: string;
}

export interface Features {
  methods: string[];
  events: string[];
}

export interface Policy {
  maxPayload: number;
  maxBufferedBytes: number;
  tickIntervalMs: number;
}

export interface TickEvent {
  type: "tick";
  ts: number;
}

export interface ShutdownEvent {
  type: "shutdown";
  reason: string;
  restartExpectedMs?: number;
}

export type GatewayEvent = TickEvent | ShutdownEvent;

export type MethodHandler = (
  params?: unknown,
  ctx?: HandlerContext,
) => Promise<unknown>;

export interface HandlerContext {
  clientId: string;
  connId: string;
  role?: string;
  scopes?: string[];
}

export interface Router {
  register(method: string, handler: MethodHandler): void;
  handle(frame: RequestFrame, ctx: HandlerContext): Promise<ResponseFrame>;
}

export interface Authenticator {
  authenticate(params: ConnectParams, auth?: AuthInfo): Promise<AuthResult>;
}

export interface AuthResult {
  ok: boolean;
  clientId?: string;
  role?: string;
  scopes?: string[];
  error?: ErrorShape;
}

export interface GatewayServer {
  start(opts: ServerOptions): Promise<void>;
  stop(): Promise<void>;
  broadcast(event: string, payload?: unknown): void;
}

export interface ServerOptions {
  host: string;
  port: number;
  router: Router;
  authenticator?: Authenticator;
  onConnect?: (clientId: string, connId: string) => void;
  onDisconnect?: (clientId: string, connId: string) => void;
}

export interface ClientConnection {
  connId: string;
  clientId: string;
  send(frame: GatewayFrame): void;
  close(code?: number, reason?: string): void;
}

export interface ServerEvents {
  onConnect?: (conn: ClientConnection) => void;
  onDisconnect?: (conn: ClientConnection) => void;
  onFrame?: (conn: ClientConnection, frame: GatewayFrame) => void;
}
