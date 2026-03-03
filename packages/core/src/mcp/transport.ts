/**
 * MCP Transport Layer - Multiple transport implementations
 * Supports: stdio, HTTP, WebSocket
 */

import type { MCPRequest, MCPResponse, MCPNotification, MCPMessage } from './types.js';

export interface TransportConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export const DEFAULT_TRANSPORT_CONFIG: TransportConfig = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Base transport interface
 */
export interface Transport {
  readonly type: 'stdio' | 'http' | 'websocket';
  readonly connected: boolean;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(request: MCPRequest): Promise<MCPResponse>;
  subscribe(handler: (message: MCPMessage) => void): () => void;
}

/**
 * HTTP Transport implementation
 */
export class HttpTransport implements Transport {
  readonly type = 'http' as const;
  private _connected = false;
  private subscribers: Set<(message: MCPMessage) => void> = new Set();
  private messageId = 0;

  constructor(
    private endpoint: string,
    private config: TransportConfig = DEFAULT_TRANSPORT_CONFIG
  ) {}

  get connected() { return this._connected; }

  async connect(): Promise<void> {
    // HTTP is connectionless, but we verify endpoint is reachable
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: this.nextId(), method: 'ping' }),
      });
      this._connected = response.ok;
    } catch {
      this._connected = false;
      throw new Error(`Failed to connect to HTTP endpoint: ${this.endpoint}`);
    }
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.subscribers.clear();
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    if (!this._connected) {
      throw new Error('Transport not connected');
    }

    let lastError: Error | null = null;
    const attempts = this.config.retryAttempts ?? 3;

    for (let i = 0; i < attempts; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as MCPResponse;
        
        // Notify subscribers
        this.subscribers.forEach(handler => handler(result));
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < attempts - 1) {
          await this.delay(this.config.retryDelay ?? 1000);
        }
      }
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: lastError?.message ?? 'Transport error',
      },
    };
  }

  subscribe(handler: (message: MCPMessage) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  private nextId(): number {
    return ++this.messageId;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * WebSocket Transport implementation
 */
export class WebSocketTransport implements Transport {
  readonly type = 'websocket' as const;
  private _connected = false;
  private ws: WebSocket | null = null;
  private subscribers: Set<(message: MCPMessage) => void> = new Set();
  private pendingRequests: Map<string | number, {
    resolve: (response: MCPResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private messageId = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private endpoint: string,
    private config: TransportConfig = DEFAULT_TRANSPORT_CONFIG
  ) {}

  get connected() { return this._connected; }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.endpoint);

        this.ws.onopen = () => {
          this._connected = true;
          this.notifySubscribers({ jsonrpc: '2.0', method: 'transport/connected' });
          resolve();
        };

        this.ws.onclose = () => {
          this._connected = false;
          this.notifySubscribers({ jsonrpc: '2.0', method: 'transport/disconnected' });
          this.rejectAllPending('Connection closed');
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          if (!this._connected) {
            reject(new Error('WebSocket connection failed'));
          }
          this.notifySubscribers({ 
            jsonrpc: '2.0', 
            method: 'transport/error',
            params: { error: String(error) }
          });
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data.toString()) as MCPMessage;
            this.handleMessage(message);
          } catch {
            console.error('Failed to parse WebSocket message:', event.data);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this._connected = false;
    this.subscribers.clear();
    this.rejectAllPending('Disconnected');
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    if (!this._connected || !this.ws) {
      throw new Error('Transport not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });
      this.ws!.send(JSON.stringify(request));
    });
  }

  subscribe(handler: (message: MCPMessage) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  private handleMessage(message: MCPMessage): void {
    // Check if this is a response to a pending request
    if ('id' in message && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);
      
      if ('error' in message) {
        pending.reject(new Error((message as MCPResponse).error?.message ?? 'Unknown error'));
      } else {
        pending.resolve(message as MCPResponse);
      }
    }

    // Notify all subscribers
    this.notifySubscribers(message);
  }

  private notifySubscribers(message: MCPMessage): void {
    this.subscribers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }

  private rejectAllPending(reason: string): void {
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error(reason));
    });
    this.pendingRequests.clear();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch {
        // Reconnect failed, will try again on next close
      }
    }, this.config.retryDelay ?? 1000);
  }

  private nextId(): number {
    return ++this.messageId;
  }
}

/**
 * Stdio Transport implementation (for subprocess communication)
 * Uses child_process to spawn and communicate with MCP servers
 */
export class StdioTransport implements Transport {
  readonly type = 'stdio' as const;
  private _connected = false;
  private subscribers: Set<(message: MCPMessage) => void> = new Set();
  private pendingRequests: Map<string | number, {
    resolve: (response: MCPResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private messageId = 0;
  private buffer = '';
  private process: {
    stdin: unknown;
    stdout: unknown;
    stderr: unknown;
    kill: () => void;
    exited: boolean;
  } | null = null;

  constructor(
    private command: string,
    private args: string[] = [],
    private env: Record<string, string> = {},
    private config: TransportConfig = DEFAULT_TRANSPORT_CONFIG
  ) {}

  get connected() { return this._connected; }

  async connect(): Promise<void> {
    if (typeof Bun !== 'undefined') {
      await this.connectBun();
    } else {
      await this.connectNode();
    }
  }

  private async connectBun(): Promise<void> {
    const proc = Bun.spawn([this.command, ...this.args], {
      env: { ...process.env, ...this.env },
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    this.process = {
      stdin: proc.stdin,
      stdout: proc.stdout,
      stderr: proc.stderr,
      kill: () => proc.kill(),
      exited: false,
    };

    this.setupStreamReader(proc.stdout as ReadableStream<Uint8Array>);
    this.setupErrorReader(proc.stderr as ReadableStream<Uint8Array>);

    proc.exited.then(() => {
      if (this.process) this.process.exited = true;
      this._connected = false;
      this.rejectAllPending('Process exited');
      this.notifySubscribers({ jsonrpc: '2.0', method: 'transport/disconnected' });
    });

    this._connected = true;
    this.notifySubscribers({ jsonrpc: '2.0', method: 'transport/connected' });
  }

  private async connectNode(): Promise<void> {
    const { spawn } = await import('node:child_process');
    const proc = spawn(this.command, this.args, {
      env: { ...process.env, ...this.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process = {
      stdin: proc.stdin,
      stdout: proc.stdout,
      stderr: proc.stderr,
      kill: () => proc.kill(),
      exited: false,
    };

    proc.stdout?.on('data', (data: Buffer) => {
      this.handleData(data.toString());
    });

    proc.stderr?.on('data', (data: Buffer) => {
      console.error('[MCP Server stderr]', data.toString());
    });

    proc.on('exit', () => {
      if (this.process) this.process.exited = true;
      this._connected = false;
      this.rejectAllPending('Process exited');
      this.notifySubscribers({ jsonrpc: '2.0', method: 'transport/disconnected' });
    });

    this._connected = true;
    this.notifySubscribers({ jsonrpc: '2.0', method: 'transport/connected' });
  }

  private setupStreamReader(stream: ReadableStream<Uint8Array>): void {
    const reader = stream.getReader();
    const readChunk = async () => {
      while (this._connected) {
        try {
          const { done, value } = await reader.read();
          if (done) break;
          this.handleData(new TextDecoder().decode(value));
        } catch {
          break;
        }
      }
    };
    readChunk();
  }

  private setupErrorReader(stream: ReadableStream<Uint8Array>): void {
    const reader = stream.getReader();
    const readChunk = async () => {
      while (this._connected) {
        try {
          const { done, value } = await reader.read();
          if (done) break;
          console.error('[MCP Server stderr]', new TextDecoder().decode(value));
        } catch {
          break;
        }
      }
    };
    readChunk();
  }

  private handleData(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line) as MCPMessage;
        this.handleMessage(message);
      } catch {
        console.error('Failed to parse MCP message:', line);
      }
    }
  }

  private handleMessage(message: MCPMessage): void {
    if ('id' in message && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);
      
      if ('error' in message) {
        pending.reject(new Error((message as MCPResponse).error?.message ?? 'Unknown error'));
      } else {
        pending.resolve(message as MCPResponse);
      }
    }
    this.notifySubscribers(message);
  }

  async disconnect(): Promise<void> {
    if (this.process && !this.process.exited) {
      this.process.kill();
    }
    this.process = null;
    this._connected = false;
    this.buffer = '';
    this.subscribers.clear();
    this.rejectAllPending('Disconnected');
    this.notifySubscribers({ jsonrpc: '2.0', method: 'transport/disconnected' });
  }

  async send(request: MCPRequest): Promise<MCPResponse> {
    if (!this._connected || !this.process?.stdin) {
      throw new Error('Transport not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });
      
      const message = JSON.stringify(request) + '\n';
      const stdin = this.process?.stdin;
      
      if (stdin && typeof (stdin as WritableStream<unknown>).getWriter === 'function') {
        const writer = (stdin as WritableStream<unknown>).getWriter();
        writer.write(new TextEncoder().encode(message));
        writer.releaseLock();
      } else if (stdin && typeof (stdin as NodeJS.WritableStream).write === 'function') {
        ((stdin as NodeJS.WritableStream).write as (data: string) => boolean)(message);
      }
    });
  }

  subscribe(handler: (message: MCPMessage) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  private notifySubscribers(message: MCPMessage): void {
    this.subscribers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }

  private rejectAllPending(reason: string): void {
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error(reason));
    });
    this.pendingRequests.clear();
  }
}

/**
 * Transport factory
 */
export function createTransport(
  type: 'http' | 'websocket' | 'stdio',
  endpoint: string,
  config?: TransportConfig,
  options?: { command?: string; args?: string[]; env?: Record<string, string> }
): Transport {
  switch (type) {
    case 'http':
      return new HttpTransport(endpoint, config);
    case 'websocket':
      return new WebSocketTransport(endpoint, config);
    case 'stdio':
      return new StdioTransport(
        options?.command ?? endpoint,
        options?.args ?? [],
        options?.env ?? {},
        config
      );
    default:
      throw new Error(`Unknown transport type: ${type}`);
  }
}
