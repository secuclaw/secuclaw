// Simplified Gateway client for secuclaw

export type GatewayEventFrame = {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
};

export type GatewayResponseFrame = {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string; details?: unknown };
};

export type GatewayHelloOk = {
  type: 'hello-ok';
  protocol: number;
  server?: {
    version?: string;
    connId?: string;
  };
  features?: { methods?: string[]; events?: string[] };
  auth?: {
    deviceToken?: string;
    role?: string;
    scopes?: string[];
    issuedAtMs?: number;
  };
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
};

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private closed = false;
  private lastSeq: number | null = null;
  private backoffMs = 800;
  private connectSent = false;
  
  private onHello?: (hello: GatewayHelloOk) => void;
  private onEvent?: (evt: GatewayEventFrame) => void;
  private onClose?: (info: { code: number; reason: string }) => void;
  private onConnect?: () => void;

  setOnHello(callback: (hello: GatewayHelloOk) => void) {
    this.onHello = callback;
  }

  setOnEvent(callback: (evt: GatewayEventFrame) => void) {
    this.onEvent = callback;
  }

  setOnClose(callback: (info: { code: number; reason: string }) => void) {
    this.onClose = callback;
  }

  setOnConnect(callback: () => void) {
    this.onConnect = callback;
  }

  start() {
    this.closed = false;
    this.connect();
  }

  stop() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private connect() {
    if (this.closed) return;

    try {
      this.connectSent = false;
      // Use the current connectionUrl value
      const wsUrl = connectionUrl.value;
      console.log('[Gateway] Connecting to', wsUrl);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.addEventListener('open', () => {
        console.log('[Gateway] Connected to', wsUrl);
        this.backoffMs = 800;
        this.sendConnect();
        this.onConnect?.();
      });

      this.ws.addEventListener('message', (ev) => this.handleMessage(String(ev.data ?? '')));

      this.ws.addEventListener('close', (ev) => {
        const reason = String(ev.reason ?? '');
        console.log('[Gateway] Closed:', ev.code, reason);
        this.ws = null;
        this.flushPending(new Error(`gateway closed (${ev.code}): ${reason}`));
        this.onClose?.({ code: ev.code, reason });
        this.scheduleReconnect();
      });

      this.ws.addEventListener('error', () => {
        // ignored
      });
    } catch (err) {
      console.error('[Gateway] Connection error:', err);
      this.scheduleReconnect();
    }
  }

  private sendConnect() {
    if (this.connectSent) return;
    this.connectSent = true;

    const connectFrame = {
      type: 'connect',
      protocol: 1,
      role: 'operator',
      scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
      clientId: 'secuclaw-control-ui',
      clientMode: 'webchat',
    };

    this.ws?.send(JSON.stringify(connectFrame));
  }

  private scheduleReconnect() {
    if (this.closed) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15000);
    setTimeout(() => this.connect(), delay);
  }

  private flushPending(err: Error) {
    for (const [, p] of this.pending) {
      p.reject(err);
    }
    this.pending.clear();
  }

  private handleMessage(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const frame = parsed as { type?: unknown };
    
    if (frame.type === 'hello-ok') {
      this.onHello?.(parsed as GatewayHelloOk);
      return;
    }

    if (frame.type === 'event') {
      const evt = parsed as GatewayEventFrame;
      const seq = typeof evt.seq === 'number' ? evt.seq : null;
      if (seq !== null) {
        if (this.lastSeq !== null && seq > this.lastSeq + 1) {
          console.warn('[Gateway] Gap detected:', this.lastSeq + 1, '->', seq);
        }
        this.lastSeq = seq;
      }
      this.onEvent?.(evt);
      return;
    }

    if (frame.type === 'res') {
      const res = parsed as GatewayResponseFrame;
      const pending = this.pending.get(res.id);
      if (!pending) return;
      
      this.pending.delete(res.id);
      if (res.ok) {
        pending.resolve(res.payload);
      } else {
        pending.reject(new Error(res.error?.message ?? 'request failed'));
      }
    }
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('gateway not connected'));
    }

    const id = crypto.randomUUID();
    const frame = { type: 'req', id, method, params };
    
    const p = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (v) => resolve(v as T), reject });
    });
    
    this.ws.send(JSON.stringify(frame));
    return p;
  }
}

export const gateway = new GatewayClient();

type ConnectionListener = (state: 'connecting' | 'connected' | 'disconnected') => void;
const listeners: Set<ConnectionListener> = new Set();

let _connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
let _connectionUrl: string = localStorage.getItem('secuclaw_ws_url') || 'ws://127.0.0.1:21981/ws';

export const connectionState = {
  get value(): 'connecting' | 'connected' | 'disconnected' {
    return _connectionState;
  },
  subscribe(callback: ConnectionListener) {
    listeners.add(callback);
    callback(_connectionState);
    return () => listeners.delete(callback);
  }
};

export const connectionUrl = {
  get value(): string {
    return _connectionUrl;
  },
  set value(url: string) {
    _connectionUrl = url;
    localStorage.setItem('secuclaw_ws_url', url);
  }
};

function notifyListeners() {
  listeners.forEach(cb => cb(_connectionState));
}

export function initGateway() {
  _connectionState = 'disconnected';
  notifyListeners();
  
  gateway.setOnConnect(() => {
    _connectionState = 'connected';
    notifyListeners();
  });
  
  gateway.setOnClose(() => {
    _connectionState = 'disconnected';
    notifyListeners();
  });
}

export function connectGateway() {
  _connectionState = 'connecting';
  notifyListeners();
  gateway.start();
}

// Auto-connect on module load
initGateway();
connectGateway();

