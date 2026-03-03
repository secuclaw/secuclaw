import { EventEmitter } from "node:events";
import { A2UIProtocolCodec, generateA2UIMessageId } from "./protocol.js";
import { validateComponent } from "./validator.js";
import type {
  A2UIAction,
  A2UIMessage,
  A2UIServerConfig,
  BeginRenderingPayload,
  CreateSurfacePayload,
  DataModelUpdatePayload,
  DeleteSurfacePayload,
  Surface,
  SurfaceConfig,
  SurfaceUpdatePayload,
  UIComponent,
  UserAction,
  UserActionEnvelope,
  UserActionHandler,
} from "./types.js";

function createSurfaceState(surfaceId: string, config?: SurfaceConfig): Surface {
  const now = Date.now();
  return {
    id: surfaceId,
    components: new Map(),
    root: config?.root,
    dataModel: config?.dataModel,
    createdAt: now,
    updatedAt: now,
  };
}

export class A2UIServer extends EventEmitter {
  private readonly protocol: A2UIProtocolCodec;
  private readonly config: A2UIServerConfig;
  private readonly surfaces = new Map<string, Surface>();
  private readonly userActionHandlers = new Set<UserActionHandler>();
  private running = false;

  constructor(config: A2UIServerConfig) {
    super();
    this.config = config;
    this.protocol = new A2UIProtocolCodec(config.version ?? "v0.8");
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    if (this.config.transport?.onMessage) {
      this.config.transport.onMessage((raw) => {
        this.handleIncomingMessage(raw);
      });
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.config.transport?.close?.();
  }

  createSurface(surfaceId: string, config?: SurfaceConfig): void {
    if (!this.surfaces.has(surfaceId)) {
      this.surfaces.set(surfaceId, createSurfaceState(surfaceId, config));
    }
    const payload: CreateSurfacePayload = { surfaceId, config };
    this.emitProtocolMessage("createSurface", payload);
  }

  deleteSurface(surfaceId: string): void {
    this.surfaces.delete(surfaceId);
    const payload: DeleteSurfacePayload = { surfaceId };
    this.emitProtocolMessage("deleteSurface", payload);
  }

  pushComponent(surfaceId: string, component: UIComponent): void {
    const validation = validateComponent(component);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }
    const surface = this.requireSurface(surfaceId);
    surface.components.set(component.id, component);
    surface.updatedAt = Date.now();
    const payload: SurfaceUpdatePayload = {
      surfaceId,
      operation: "push",
      component,
    };
    this.emitProtocolMessage("surfaceUpdate", payload);
  }

  updateComponent(surfaceId: string, componentId: string, updates: Partial<UIComponent>): void {
    const surface = this.requireSurface(surfaceId);
    const current = surface.components.get(componentId);
    if (!current) {
      throw new Error(`Component '${componentId}' not found on surface '${surfaceId}'`);
    }
    const merged = { ...current, ...updates, id: componentId } as UIComponent;
    const validation = validateComponent(merged);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }
    surface.components.set(componentId, merged);
    surface.updatedAt = Date.now();
    const payload: SurfaceUpdatePayload = {
      surfaceId,
      operation: "update",
      componentId,
      updates,
    };
    this.emitProtocolMessage("surfaceUpdate", payload);
  }

  deleteComponent(surfaceId: string, componentId: string): void {
    const surface = this.requireSurface(surfaceId);
    surface.components.delete(componentId);
    surface.updatedAt = Date.now();
    const payload: SurfaceUpdatePayload = {
      surfaceId,
      operation: "delete",
      componentId,
    };
    this.emitProtocolMessage("surfaceUpdate", payload);
  }

  beginRendering(surfaceId: string, rootId: string): void {
    const surface = this.requireSurface(surfaceId);
    surface.root = rootId;
    surface.updatedAt = Date.now();
    const payload: BeginRenderingPayload = { surfaceId, rootId };
    this.emitProtocolMessage("beginRendering", payload);
  }

  updateDataModel(surfaceId: string, model: Record<string, unknown>): void {
    const surface = this.requireSurface(surfaceId);
    surface.dataModel = model;
    surface.updatedAt = Date.now();
    const payload: DataModelUpdatePayload = { surfaceId, model };
    this.emitProtocolMessage("dataModelUpdate", payload);
  }

  onUserAction(handler: UserActionHandler): void {
    this.userActionHandlers.add(handler);
  }

  getSurface(surfaceId: string): Surface | undefined {
    return this.surfaces.get(surfaceId);
  }

  private requireSurface(surfaceId: string): Surface {
    const existing = this.surfaces.get(surfaceId);
    if (existing) {
      return existing;
    }
    const created = createSurfaceState(surfaceId);
    this.surfaces.set(surfaceId, created);
    return created;
  }

  private emitProtocolMessage(action: A2UIAction, payload: unknown): void {
    const message: A2UIMessage = {
      id: generateA2UIMessageId(),
      version: this.protocol.version,
      action,
      payload,
    };
    const encoded = this.protocol.encode(message);
    this.config.transport?.send(encoded);
    this.emit("message", message);
  }

  private handleIncomingMessage(raw: string): void {
    if (!this.running) {
      return;
    }

    let decoded: A2UIMessage;
    try {
      decoded = this.protocol.decode(raw);
    } catch {
      return;
    }

    const payload = decoded.payload as UserActionEnvelope;
    if (payload?.type === "userAction" && payload.action) {
      for (const handler of this.userActionHandlers) {
        handler(payload.action as UserAction);
      }
    }
  }
}

export function createA2UIServer(config: A2UIServerConfig): A2UIServer {
  return new A2UIServer(config);
}
