import type { MCPTool, MCPToolResult, MCPConnection } from './types.js';
import type { Transport } from './transport.js';

export interface DiscoveredTool extends MCPTool {
  serverId: string;
  serverName: string;
  connectionId: string;
  lastUpdated: Date;
  usageCount: number;
  successRate: number;
  avgExecutionTime: number;
}

export interface ToolRegistryConfig {
  autoDiscover: boolean;
  discoverInterval: number;
  cacheTimeout: number;
  maxToolsPerServer: number;
}

export const DEFAULT_TOOL_REGISTRY_CONFIG: ToolRegistryConfig = {
  autoDiscover: false,
  discoverInterval: 60000,
  cacheTimeout: 300000,
  maxToolsPerServer: 100,
};

export interface ToolExecutionMetrics {
  toolName: string;
  serverId: string;
  executionTime: number;
  success: boolean;
  timestamp: Date;
  errorMessage?: string;
}

export class MCPToolRegistry {
  private tools: Map<string, DiscoveredTool> = new Map();
  private toolsByServer: Map<string, Set<string>> = new Map();
  private metrics: ToolExecutionMetrics[] = [];
  private config: ToolRegistryConfig;
  private discoverTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<ToolRegistryConfig> = {}) {
    this.config = { ...DEFAULT_TOOL_REGISTRY_CONFIG, ...config };
  }

  registerTool(tool: MCPTool, serverId: string, serverName: string, connectionId: string): void {
    const key = `${serverId}:${tool.name}`;
    
    const discoveredTool: DiscoveredTool = {
      ...tool,
      serverId,
      serverName,
      connectionId,
      lastUpdated: new Date(),
      usageCount: 0,
      successRate: 1,
      avgExecutionTime: 0,
    };

    this.tools.set(key, discoveredTool);

    if (!this.toolsByServer.has(serverId)) {
      this.toolsByServer.set(serverId, new Set());
    }
    this.toolsByServer.get(serverId)!.add(key);
  }

  unregisterToolsFromServer(serverId: string): number {
    const toolKeys = this.toolsByServer.get(serverId);
    if (!toolKeys) return 0;

    const count = toolKeys.size;
    for (const key of toolKeys) {
      this.tools.delete(key);
    }
    this.toolsByServer.delete(serverId);
    return count;
  }

  getTool(name: string, serverId?: string): DiscoveredTool | undefined {
    if (serverId) {
      return this.tools.get(`${serverId}:${name}`);
    }

    for (const tool of this.tools.values()) {
      if (tool.name === name) {
        return tool;
      }
    }
    return undefined;
  }

  listTools(serverId?: string): DiscoveredTool[] {
    if (serverId) {
      const keys = this.toolsByServer.get(serverId);
      if (!keys) return [];
      return Array.from(keys)
        .map(key => this.tools.get(key)!)
        .filter(Boolean);
    }
    return Array.from(this.tools.values());
  }

  searchTools(query: string): DiscoveredTool[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values()).filter(tool => 
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery)
    );
  }

  getToolsByTag(tag: string): DiscoveredTool[] {
    return Array.from(this.tools.values()).filter(tool => {
      const tags = (tool as unknown as Record<string, unknown>).tags;
      return Array.isArray(tags) && tags.includes(tag);
    });
  }

  recordExecution(
    toolName: string,
    serverId: string,
    executionTime: number,
    success: boolean,
    errorMessage?: string
  ): void {
    const metric: ToolExecutionMetrics = {
      toolName,
      serverId,
      executionTime,
      success,
      timestamp: new Date(),
      errorMessage,
    };
    this.metrics.push(metric);

    const key = `${serverId}:${toolName}`;
    const tool = this.tools.get(key);
    if (tool) {
      tool.usageCount++;
      tool.avgExecutionTime = this.calculateAvgExecutionTime(key);
      tool.successRate = this.calculateSuccessRate(key);
      tool.lastUpdated = new Date();
    }

    this.pruneOldMetrics();
  }

  private calculateAvgExecutionTime(toolKey: string): number {
    const toolMetrics = this.metrics.filter(
      m => `${m.serverId}:${m.toolName}` === toolKey
    );
    if (toolMetrics.length === 0) return 0;
    
    const sum = toolMetrics.reduce((acc, m) => acc + m.executionTime, 0);
    return sum / toolMetrics.length;
  }

  private calculateSuccessRate(toolKey: string): number {
    const toolMetrics = this.metrics.filter(
      m => `${m.serverId}:${m.toolName}` === toolKey
    );
    if (toolMetrics.length === 0) return 1;
    
    const successes = toolMetrics.filter(m => m.success).length;
    return successes / toolMetrics.length;
  }

  private pruneOldMetrics(): void {
    const maxMetrics = 10000;
    if (this.metrics.length > maxMetrics) {
      this.metrics = this.metrics.slice(-maxMetrics);
    }
  }

  getMetrics(toolName?: string, serverId?: string): ToolExecutionMetrics[] {
    return this.metrics.filter(m => {
      if (toolName && m.toolName !== toolName) return false;
      if (serverId && m.serverId !== serverId) return false;
      return true;
    });
  }

  getStats(): {
    totalTools: number;
    serversCount: number;
    toolsPerServer: Record<string, number>;
    totalExecutions: number;
    overallSuccessRate: number;
  } {
    const toolsPerServer: Record<string, number> = {};
    for (const [serverId, keys] of this.toolsByServer) {
      toolsPerServer[serverId] = keys.size;
    }

    const totalExecutions = this.metrics.length;
    const successfulExecutions = this.metrics.filter(m => m.success).length;
    const overallSuccessRate = totalExecutions > 0 
      ? successfulExecutions / totalExecutions 
      : 1;

    return {
      totalTools: this.tools.size,
      serversCount: this.toolsByServer.size,
      toolsPerServer,
      totalExecutions,
      overallSuccessRate,
    };
  }

  clear(): void {
    this.tools.clear();
    this.toolsByServer.clear();
    this.metrics = [];
  }
}

export interface ToolExecutorConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const DEFAULT_EXECUTOR_CONFIG: ToolExecutorConfig = {
  timeout: 30000,
  retryAttempts: 2,
  retryDelay: 500,
};

export class ToolExecutor {
  private registry: MCPToolRegistry;
  private config: ToolExecutorConfig;
  private transports: Map<string, Transport> = new Map();

  constructor(
    registry: MCPToolRegistry,
    config: Partial<ToolExecutorConfig> = {}
  ) {
    this.registry = registry;
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
  }

  registerTransport(serverId: string, transport: Transport): void {
    this.transports.set(serverId, transport);
  }

  unregisterTransport(serverId: string): void {
    this.transports.delete(serverId);
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    serverId?: string
  ): Promise<MCPToolResult> {
    const tool = this.registry.getTool(toolName, serverId);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${toolName}` }],
        isError: true,
      };
    }

    const transport = this.transports.get(tool.serverId);
    if (!transport) {
      return {
        content: [{ type: 'text', text: `No transport for server: ${tool.serverId}` }],
        isError: true,
      };
    }

    const startTime = Date.now();
    let lastError: string | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await this.executeWithTimeout(transport, {
          jsonrpc: '2.0',
          id: `${toolName}-${Date.now()}`,
          method: 'tools/call',
          params: { name: toolName, arguments: args },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const result = response.result as MCPToolResult;
        const executionTime = Date.now() - startTime;

        this.registry.recordExecution(toolName, tool.serverId, executionTime, true);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    this.registry.recordExecution(toolName, tool.serverId, executionTime, false, lastError ?? undefined);

    return {
      content: [{ type: 'text', text: lastError ?? 'Execution failed' }],
      isError: true,
    };
  }

  private async executeWithTimeout(
    transport: Transport,
    request: { jsonrpc: '2.0'; id: string; method: string; params?: unknown }
  ): Promise<{ result?: unknown; error?: { message: string } }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await transport.send(request as Parameters<Transport['send']>[0]);
      clearTimeout(timeoutId);
      return {
        result: response.result,
        error: response.error,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        error: { message: error instanceof Error ? error.message : 'Timeout' },
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createToolRegistry(config?: Partial<ToolRegistryConfig>): MCPToolRegistry {
  return new MCPToolRegistry(config);
}

export function createToolExecutor(
  registry: MCPToolRegistry,
  config?: Partial<ToolExecutorConfig>
): ToolExecutor {
  return new ToolExecutor(registry, config);
}
