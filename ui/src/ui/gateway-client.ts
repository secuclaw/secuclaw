/**
 * SecuClaw Gateway WebSocket Client
 * 
 * Implements the WebSocket protocol for communication with the SecuClaw Gateway.
 * Based on OpenClaw's GatewayClient pattern.
 */

export interface GatewayClientOptions {
  url?: string;
  token?: string;
  password?: string;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onEvent?: (event: GatewayEvent) => void;
}

export interface GatewayRequest {
  type: 'req';
  seq: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface GatewayResponse {
  type: 'res';
  seq: number;
  result?: unknown;
  error?: { code: string; message: string };
}

export interface GatewayEvent {
  type: 'event';
  event: string;
  data?: unknown;
}

export type GatewayMessage = GatewayRequest | GatewayResponse | GatewayEvent;

const PROTOCOL_VERSION = 1;

export class SecuClawGatewayClient {
  private ws: WebSocket | null = null;
  private opts: GatewayClientOptions;
  private pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (err: unknown) => void;
  }>();
  private seq = 0;
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;

  constructor(opts: GatewayClientOptions = {}) {
    this.opts = {
      url: 'ws://127.0.0.1:21000/ws',
      ...opts,
    };
  }

  connect(): void {
    if (this.closed || this.ws) {
      return;
    }

    const url = this.opts.url!;

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => this._onOpen();
      this.ws.onmessage = (event) => this._onMessage(event.data);
      this.ws.onclose = (event) => this._onClose(event.code, event.reason);
      this.ws.onerror = () => this._onError(new Error('WebSocket error'));
    } catch (error) {
      this._onError(error as Error);
    }
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client closing');
      this.ws = null;
    }
  }

  /**
   * Call a gateway method and wait for the response
   */
  async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const seq = ++this.seq;
      const request: GatewayRequest = {
        type: 'req',
        seq,
        method,
        params,
      };

      this.pending.set(seq, { resolve: resolve as (value: unknown) => void, reject });

      this.ws.send(JSON.stringify(request));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pending.has(seq)) {
          this.pending.delete(seq);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Subscribe to gateway events
   */
  subscribe(event: string, handler: (data: unknown) => void): () => void {
    // TODO: Implement event subscription
    console.log('Subscribing to event:', event);
    return () => {
      console.log('Unsubscribing from event:', event);
    };
  }

  private _onOpen(): void {
    console.log('Gateway connected');
    this.reconnectDelay = 1000;
    
    // Send hello message
    this._sendHello();
    
    this.opts.onConnect?.();
  }

  private _sendHello(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const hello = {
      type: 'hello',
      version: PROTOCOL_VERSION,
      client: 'secuclaw-control-ui',
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(hello));
  }

  private _onMessage(data: string): void {
    try {
      const message: GatewayMessage = JSON.parse(data);

      if (message.type === 'res') {
        this._handleResponse(message);
      } else if (message.type === 'event') {
        this._handleEvent(message);
      } else if ((message as { type?: string }).type === 'hello_ok') {
        console.log('Gateway hello acknowledged');
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private _handleResponse(response: GatewayResponse): void {
    const pending = this.pending.get(response.seq);
    if (!pending) {
      return;
    }

    this.pending.delete(response.seq);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  private _handleEvent(event: GatewayEvent): void {
    this.opts.onEvent?.(event);
  }

  private _onClose(code: number, reason: string): void {
    console.log('Gateway disconnected:', code, reason);
    this.ws = null;
    this.opts.onDisconnect?.(code, reason);

    // Reject all pending requests
    for (const [, pending] of this.pending) {
      pending.reject(new Error('Connection closed'));
    }
    this.pending.clear();

    // Attempt reconnection
    if (!this.closed) {
      this._scheduleReconnect();
    }
  }

  private _onError(error: Error): void {
    console.error('Gateway error:', error);
    this.opts.onError?.(error);
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.connect();
    }, this.reconnectDelay);
  }
}

export default SecuClawGatewayClient;
