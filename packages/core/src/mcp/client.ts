import type {
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPToolResult,
  MCPClientCapabilities,
  MCPConnection,
  MCPRequest,
  MCPResponse,
} from "./types.js";

export interface MCPClientConfig {
  name: string;
  version: string;
  capabilities?: MCPClientCapabilities;
}

export interface MCPServerConnection {
  id: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export class MCPClient {
  private config: MCPClientConfig;
  private connections: Map<string, MCPConnection> = new Map();
  private messageId = 0;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  async connectStdio(id: string, command: string, args: string[] = [], env?: Record<string, string>): Promise<MCPConnection> {
    const connection: MCPConnection = {
      id,
      transport: "stdio",
      status: "connecting",
    };

    this.connections.set(id, connection);

    return connection;
  }

  async connectHttp(id: string, url: string): Promise<MCPConnection> {
    const connection: MCPConnection = {
      id,
      transport: "http",
      status: "connecting",
    };

    this.connections.set(id, connection);

    try {
      const initResponse = await this.sendHttpRequest(url, {
        jsonrpc: "2.0",
        id: this.nextId(),
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: this.config.capabilities ?? {},
          clientInfo: {
            name: this.config.name,
            version: this.config.version,
          },
        },
      });

      if (initResponse.error) {
        connection.status = "error";
        throw new Error(`Initialize failed: ${initResponse.error.message}`);
      }

      const result = initResponse.result as {
        serverInfo?: { name: string; version: string };
        capabilities?: unknown;
      };

      connection.status = "connected";
      connection.serverInfo = result.serverInfo;
      connection.capabilities = result.capabilities as MCPConnection["capabilities"];
      connection.lastActivity = Date.now();

      return connection;
    } catch (error) {
      connection.status = "error";
      throw error;
    }
  }

  async disconnect(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) {
      connection.status = "disconnected";
      this.connections.delete(id);
    }
  }

  async listTools(connectionId: string, url?: string): Promise<MCPTool[]> {
    const connection = this.getConnection(connectionId);

    if (connection.transport === "http" && url) {
      const response = await this.sendHttpRequest(url, {
        jsonrpc: "2.0",
        id: this.nextId(),
        method: "tools/list",
      });

      if (response.error) {
        throw new Error(`Failed to list tools: ${response.error.message}`);
      }

      const result = response.result as { tools?: MCPTool[] };
      return result.tools ?? [];
    }

    return [];
  }

  async callTool(connectionId: string, url: string, name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const connection = this.getConnection(connectionId);

    if (connection.transport === "http") {
      const response = await this.sendHttpRequest(url, {
        jsonrpc: "2.0",
        id: this.nextId(),
        method: "tools/call",
        params: { name, arguments: args },
      });

      if (response.error) {
        return {
          content: [{ type: "text", text: response.error.message }],
          isError: true,
        };
      }

      return response.result as MCPToolResult;
    }

    return {
      content: [{ type: "text", text: "Tool call not supported for this transport" }],
      isError: true,
    };
  }

  async listResources(connectionId: string, url: string): Promise<MCPResource[]> {
    const connection = this.getConnection(connectionId);

    if (connection.transport === "http") {
      const response = await this.sendHttpRequest(url, {
        jsonrpc: "2.0",
        id: this.nextId(),
        method: "resources/list",
      });

      if (response.error) {
        throw new Error(`Failed to list resources: ${response.error.message}`);
      }

      const result = response.result as { resources?: MCPResource[] };
      return result.resources ?? [];
    }

    return [];
  }

  async listPrompts(connectionId: string, url: string): Promise<MCPPrompt[]> {
    const connection = this.getConnection(connectionId);

    if (connection.transport === "http") {
      const response = await this.sendHttpRequest(url, {
        jsonrpc: "2.0",
        id: this.nextId(),
        method: "prompts/list",
      });

      if (response.error) {
        throw new Error(`Failed to list prompts: ${response.error.message}`);
      }

      const result = response.result as { prompts?: MCPPrompt[] };
      return result.prompts ?? [];
    }

    return [];
  }

  getConnection(id: string): MCPConnection {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }
    return connection;
  }

  listConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  private async sendHttpRequest(url: string, request: MCPRequest): Promise<MCPResponse> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: response.status,
          message: `HTTP error: ${response.statusText}`,
        },
      };
    }

    return response.json() as Promise<MCPResponse>;
  }

  private nextId(): number {
    return ++this.messageId;
  }
}

export function createMCPClient(config: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}
