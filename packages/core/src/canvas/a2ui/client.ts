import { EventEmitter } from "node:events";
import { A2UIProtocolCodec, generateA2UIMessageId } from "./protocol.js";
import type {
  A2UIClientConfig,
  A2UIMessage,
  MessageHandler,
  Surface,
  SurfaceUpdateHandler,
  SurfaceUpdatePayload,
  UIComponent,
  UserAction,
  UserActionEnvelope,
} from "./types.js";

type AndroidBridge =
  | ((payload: string) => unknown)
  | { postMessage: (payload: string) => unknown };

interface IOSWebkitBridge {
  messageHandlers?: {
    openclawCanvasA2UIAction?: {
      postMessage: (payload: string) => unknown;
    };
    secuclawA2UIAction?: {
      postMessage: (payload: string) => unknown;
    };
  };
}

function createSurface(surfaceId: string): Surface {
  const now = Date.now();
  return {
    id: surfaceId,
    components: new Map(),
    createdAt: now,
    updatedAt: now,
  };
}

export class A2UIClient extends EventEmitter {
  private readonly protocol: A2UIProtocolCodec;
  private readonly config: A2UIClientConfig;
  private readonly surfaces = new Map<string, Surface>();
  private readonly messageHandlers = new Set<MessageHandler>();
  private readonly surfaceUpdateHandlers = new Set<SurfaceUpdateHandler>();
  private connected = false;

  constructor(config: A2UIClientConfig) {
    super();
    this.config = config;
    this.protocol = new A2UIProtocolCodec(config.version ?? "v0.8");
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    this.connected = true;
    if (this.config.transport?.onMessage) {
      this.config.transport.onMessage((raw) => {
        this.handleIncoming(raw);
      });
    }
  }

  disconnect(): void {
    this.connected = false;
    this.config.transport?.close?.();
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.add(handler);
  }

  onSurfaceUpdate(handler: SurfaceUpdateHandler): void {
    this.surfaceUpdateHandlers.add(handler);
  }

  sendUserAction(action: UserAction): boolean {
    const payload = JSON.stringify(action);
    if (this.sendViaBridge(payload)) {
      return true;
    }
    if (!this.connected || !this.config.transport) {
      return false;
    }

    const envelope: UserActionEnvelope = {
      type: "userAction",
      action,
    };
    const message: A2UIMessage = {
      id: generateA2UIMessageId(),
      version: this.protocol.version,
      action: "surfaceUpdate",
      payload: envelope,
    };
    this.config.transport.send(this.protocol.encode(message));
    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSurface(surfaceId: string): Surface | undefined {
    return this.surfaces.get(surfaceId);
  }

  private sendViaBridge(payload: string): boolean {
    const globalRecord = globalThis as unknown as Record<string, unknown>;
    const webkit = globalRecord.webkit as IOSWebkitBridge | undefined;
    const iosOpenClaw = webkit?.messageHandlers?.openclawCanvasA2UIAction;
    if (iosOpenClaw) {
      iosOpenClaw.postMessage(payload);
      return true;
    }
    const iosSecuClaw = webkit?.messageHandlers?.secuclawA2UIAction;
    if (iosSecuClaw) {
      iosSecuClaw.postMessage(payload);
      return true;
    }

    const android = globalRecord.openclawCanvasA2UIAction as AndroidBridge | undefined;
    if (typeof android === "function") {
      android(payload);
      return true;
    }
    if (android && typeof android === "object" && "postMessage" in android && typeof android.postMessage === "function") {
      android.postMessage(payload);
      return true;
    }

    const androidCompat = globalRecord.secuclawA2UIAction as AndroidBridge | undefined;
    if (typeof androidCompat === "function") {
      androidCompat(payload);
      return true;
    }
    if (
      androidCompat &&
      typeof androidCompat === "object" &&
      "postMessage" in androidCompat &&
      typeof androidCompat.postMessage === "function"
    ) {
      androidCompat.postMessage(payload);
      return true;
    }

    return false;
  }

  private handleIncoming(raw: string): void {
    let message: A2UIMessage;
    try {
      message = this.protocol.decode(raw);
    } catch {
      return;
    }

    this.applyMessage(message);
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  private applyMessage(message: A2UIMessage): void {
    switch (message.action) {
      case "createSurface":
        this.handleCreateSurface(message.payload);
        break;
      case "deleteSurface":
        this.handleDeleteSurface(message.payload);
        break;
      case "beginRendering":
        this.handleBeginRendering(message.payload);
        break;
      case "dataModelUpdate":
        this.handleDataModelUpdate(message.payload);
        break;
      case "surfaceUpdate":
        this.handleSurfaceUpdate(message.payload);
        break;
      default:
        break;
    }
  }

  private handleCreateSurface(payload: unknown): void {
    const data = payload as { surfaceId?: string; config?: { root?: string; dataModel?: Record<string, unknown> } };
    if (!data.surfaceId) {
      return;
    }
    const surface = createSurface(data.surfaceId);
    surface.root = data.config?.root;
    surface.dataModel = data.config?.dataModel;
    surface.updatedAt = Date.now();
    this.surfaces.set(surface.id, surface);
  }

  private handleDeleteSurface(payload: unknown): void {
    const data = payload as { surfaceId?: string };
    if (!data.surfaceId) {
      return;
    }
    this.surfaces.delete(data.surfaceId);
  }

  private handleBeginRendering(payload: unknown): void {
    const data = payload as { surfaceId?: string; rootId?: string };
    if (!data.surfaceId || !data.rootId) {
      return;
    }
    const surface = this.surfaces.get(data.surfaceId) ?? createSurface(data.surfaceId);
    surface.root = data.rootId;
    surface.updatedAt = Date.now();
    this.surfaces.set(surface.id, surface);
  }

  private handleDataModelUpdate(payload: unknown): void {
    const data = payload as { surfaceId?: string; model?: Record<string, unknown> };
    if (!data.surfaceId || !data.model) {
      return;
    }
    const surface = this.surfaces.get(data.surfaceId) ?? createSurface(data.surfaceId);
    surface.dataModel = data.model;
    surface.updatedAt = Date.now();
    this.surfaces.set(surface.id, surface);
  }

  private handleSurfaceUpdate(payload: unknown): void {
    const data = payload as SurfaceUpdatePayload;
    if (!data.surfaceId) {
      return;
    }
    const surface = this.surfaces.get(data.surfaceId) ?? createSurface(data.surfaceId);

    if (data.operation === "push" && data.component) {
      surface.components.set(data.component.id, data.component);
    } else if (data.operation === "update" && data.componentId && data.updates) {
      const current = surface.components.get(data.componentId);
      if (current) {
        const merged = { ...current, ...data.updates, id: data.componentId } as UIComponent;
        surface.components.set(data.componentId, merged);
      }
    } else if (data.operation === "delete" && data.componentId) {
      surface.components.delete(data.componentId);
    }

    surface.updatedAt = Date.now();
    this.surfaces.set(surface.id, surface);

    for (const handler of this.surfaceUpdateHandlers) {
      handler(data);
    }
  }
}

export function createA2UIClient(config: A2UIClientConfig): A2UIClient {
  return new A2UIClient(config);
}
