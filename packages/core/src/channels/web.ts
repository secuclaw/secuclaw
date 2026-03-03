import { BaseChannel } from "./base.js";
import type { ChannelConfig, ChannelMessage, ChannelResponse, ChannelContext } from "./types.js";

export interface WebConfig extends ChannelConfig {
  type: "web";
  port?: number;
  path?: string;
  corsOrigins?: string[];
}

interface WebSocketLike {
  send: (data: string) => void;
  close: () => void;
  onmessage?: ((event: { data: string }) => void) | null;
  onclose?: (() => void) | null;
  onerror?: ((error: Error) => void) | null;
}

export class WebChannel extends BaseChannel {
  type = "web" as const;
  private port: number;
  private path: string;
  private corsOrigins: string[];
  private connections: Map<string, WebSocketLike> = new Map();
  private sessionToConnection: Map<string, string> = new Map();

  constructor(config: WebConfig) {
    super(config);
    this.port = config.port ?? 3000;
    this.path = config.path ?? "/ws";
    this.corsOrigins = config.corsOrigins ?? ["*"];
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    for (const [id, ws] of this.connections) {
      try {
        ws.close();
      } catch {
      }
      this.connections.delete(id);
    }
    this.connected = false;
  }

  registerConnection(connectionId: string, ws: WebSocketLike, sessionId?: string): void {
    this.connections.set(connectionId, ws);
    
    if (sessionId) {
      this.sessionToConnection.set(sessionId, connectionId);
    }

    ws.onmessage = (event: { data: string }) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(connectionId, data);
      } catch {
        this.recordError();
      }
    };

    ws.onclose = () => {
      this.connections.delete(connectionId);
      for (const [sessionId, connId] of this.sessionToConnection) {
        if (connId === connectionId) {
          this.sessionToConnection.delete(sessionId);
        }
      }
    };
  }

  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    const connectionId = this.sessionToConnection.get(context.sessionId) ?? 
      (typeof context.metadata?.connectionId === "string" ? context.metadata.connectionId : null);
    
    if (!connectionId) {
      throw new Error("No WebSocket connection found for session");
    }

    const ws = this.connections.get(connectionId);
    if (!ws) {
      throw new Error("WebSocket connection not found");
    }

    const payload = JSON.stringify({
      type: "message",
      content: message.content,
      attachments: message.attachments,
      replyTo: message.replyTo,
      timestamp: Date.now(),
    });

    ws.send(payload);
    this.recordSend();
  }

  broadcast(message: ChannelResponse): void {
    const payload = JSON.stringify({
      type: "broadcast",
      content: message.content,
      attachments: message.attachments,
      timestamp: Date.now(),
    });

    for (const ws of this.connections.values()) {
      try {
        ws.send(payload);
        this.recordSend();
      } catch {
        this.recordError();
      }
    }
  }

  private handleMessage(connectionId: string, data: { type?: string; content?: string; sessionId?: string }): void {
    if (data.type === "ping") {
      const ws = this.connections.get(connectionId);
      if (ws) {
        ws.send(JSON.stringify({ type: "pong" }));
      }
      return;
    }

    if (data.type === "message" && data.content) {
      if (data.sessionId) {
        this.sessionToConnection.set(data.sessionId, connectionId);
      }

      this.emitMessage({
        id: this.generateId(),
        channelId: connectionId,
        channelType: "web",
        userId: connectionId,
        content: data.content,
        timestamp: Date.now(),
        metadata: {
          sessionId: data.sessionId,
        },
      });
    }
  }

  getPort(): number {
    return this.port;
  }

  getPath(): string {
    return this.path;
  }

  getCorsOrigins(): string[] {
    return this.corsOrigins;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

export function createWebChannel(config: WebConfig): WebChannel {
  return new WebChannel(config);
}
