import type {
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPToolCall,
  MCPToolResult,
  MCPServerInfo,
  MCPServerCapabilities,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPMessage,
} from "./types.js";

export type ToolHandler = (args: Record<string, unknown>) => Promise<MCPToolResult>;
export type ResourceHandler = (uri: string) => Promise<string | Buffer>;
export type PromptHandler = (args: Record<string, unknown>) => Promise<string>;

export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
}

export class MCPServer {
  private config: MCPServerConfig;
  private tools: Map<string, { tool: MCPTool; handler: ToolHandler }> = new Map();
  private resources: Map<string, { resource: MCPResource; handler?: ResourceHandler }> = new Map();
  private prompts: Map<string, { prompt: MCPPrompt; handler?: PromptHandler }> = new Map();
  private requestHandlers: Map<string, (params: unknown) => Promise<unknown>> = new Map();
  private notificationHandlers: Map<string, (params: unknown) => void> = new Map();

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers(): void {
    this.requestHandlers.set("initialize", async (params) => {
      const p = params as { capabilities?: unknown; clientInfo?: unknown };
      return {
        protocolVersion: "2024-11-05",
        capabilities: this.getCapabilities(),
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
        },
      };
    });

    this.requestHandlers.set("tools/list", async () => ({
      tools: Array.from(this.tools.values()).map((t) => t.tool),
    }));

    this.requestHandlers.set("tools/call", async (params) => {
      const p = params as { name: string; arguments?: Record<string, unknown> };
      return this.handleToolCall(p.name, p.arguments ?? {});
    });

    this.requestHandlers.set("resources/list", async () => ({
      resources: Array.from(this.resources.values()).map((r) => r.resource),
    }));

    this.requestHandlers.set("resources/read", async (params) => {
      const p = params as { uri: string };
      const content = await this.handleResourceRead(p.uri);
      return {
        contents: [
          {
            uri: p.uri,
            mimeType: "text/plain",
            text: typeof content === "string" ? content : content.toString("base64"),
          },
        ],
      };
    });

    this.requestHandlers.set("prompts/list", async () => ({
      prompts: Array.from(this.prompts.values()).map((p) => p.prompt),
    }));

    this.requestHandlers.set("prompts/get", async (params) => {
      const p = params as { name: string; arguments?: Record<string, unknown> };
      const result = await this.handlePromptGet(p.name, p.arguments ?? {});
      return {
        description: `Prompt: ${p.name}`,
        messages: [
          {
            role: "user",
            content: { type: "text", text: result },
          },
        ],
      };
    });

    this.requestHandlers.set("ping", async () => ({}));
  }

  registerTool(tool: MCPTool, handler: ToolHandler): void {
    this.tools.set(tool.name, { tool, handler });
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  registerResource(resource: MCPResource, handler?: ResourceHandler): void {
    this.resources.set(resource.uri, { resource, handler });
  }

  unregisterResource(uri: string): boolean {
    return this.resources.delete(uri);
  }

  registerPrompt(prompt: MCPPrompt, handler?: PromptHandler): void {
    this.prompts.set(prompt.name, { prompt, handler });
  }

  unregisterPrompt(name: string): boolean {
    return this.prompts.delete(name);
  }

  getCapabilities(): MCPServerCapabilities {
    return {
      tools: { listChanged: true },
      resources: { subscribe: false, listChanged: true },
      prompts: { listChanged: true },
      logging: {},
    };
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const handler = this.requestHandlers.get(request.method);

    if (!handler) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
        },
      };
    }

    try {
      const result = await handler(request.params);
      return {
        jsonrpc: "2.0",
        id: request.id,
        result,
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
      };
    }
  }

  handleNotification(notification: MCPNotification): void {
    const handler = this.notificationHandlers.get(notification.method);
    if (handler) {
      handler(notification.params);
    }
  }

  createNotification(method: string, params?: Record<string, unknown>): MCPNotification {
    return {
      jsonrpc: "2.0",
      method,
      params,
    };
  }

  notifyToolsChanged(): MCPNotification {
    return this.createNotification("notifications/tools/list_changed");
  }

  notifyResourcesChanged(): MCPNotification {
    return this.createNotification("notifications/resources/list_changed");
  }

  notifyPromptsChanged(): MCPNotification {
    return this.createNotification("notifications/prompts/list_changed");
  }

  private async handleToolCall(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const entry = this.tools.get(name);

    if (!entry) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      return await entry.handler(args);
    } catch (error) {
      return {
        content: [{ type: "text", text: error instanceof Error ? error.message : "Tool execution failed" }],
        isError: true,
      };
    }
  }

  private async handleResourceRead(uri: string): Promise<string | Buffer> {
    const entry = this.resources.get(uri);

    if (!entry) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    if (entry.handler) {
      return entry.handler(uri);
    }

    return "";
  }

  private async handlePromptGet(name: string, args: Record<string, unknown>): Promise<string> {
    const entry = this.prompts.get(name);

    if (!entry) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    if (entry.handler) {
      return entry.handler(args);
    }

    return `Execute ${name} with arguments: ${JSON.stringify(args)}`;
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values()).map((t) => t.tool);
  }

  listResources(): MCPResource[] {
    return Array.from(this.resources.values()).map((r) => r.resource);
  }

  listPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values()).map((p) => p.prompt);
  }

  getServerInfo(): MCPServerInfo {
    return {
      name: this.config.name,
      version: this.config.version,
      protocolVersion: "2024-11-05",
    };
  }
}

export function createMCPServer(config: MCPServerConfig): MCPServer {
  return new MCPServer(config);
}
