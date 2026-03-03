import {
  ToolCategory,
  ToolPolicyMode,
  SecurityTool,
  ToolContext,
  ToolResult,
} from "../types.js";
import {
  createSuccessResult,
  createErrorResult,
  readStringParam,
  readNumberParam,
} from "../common.js";
import type { MemorySource } from "../../memory/types.js";

interface MemorySearchParams {
  query: string;
  limit?: number;
  minScore?: number;
  sources?: string[];
  tags?: string[];
}

const memorySearchExecutor = async (
  params: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> => {
  const query = readStringParam(params, "query", { required: true });
  if (!query) {
    return createErrorResult("Query is required", 400);
  }

  const limit = readNumberParam(params, "limit") ?? 10;
  const minScore = readNumberParam(params, "minScore") ?? 0.5;
  const sources = params.sources as MemorySource[] | undefined;
  const tags = params.tags as string[] | undefined;

  try {
    const { getMemoryManager } = await import("../../memory/manager.js");
    const manager = getMemoryManager();
    
    const results = await manager.search({
      query,
      limit,
      minImportance: minScore,
      sources,
      tags,
    });

    return createSuccessResult({
      query,
      totalResults: results.length,
      results: results.map(r => ({
        id: r.entry.id,
        content: r.entry.content.length > 500 ? r.entry.content.substring(0, 500) + "..." : r.entry.content,
        score: r.score,
        source: r.entry.metadata.source,
        tags: r.entry.metadata.tags,
        timestamp: r.entry.metadata.timestamp,
      })),
    });
  } catch (error) {
    return createSuccessResult({
      query,
      totalResults: 0,
      results: [],
      message: "Memory system not available or no results found",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const memorySearch: SecurityTool = {
  id: "utility-memory-search",
  name: "memorySearch",
  description: "Search through accumulated memory and knowledge base using semantic similarity",
  category: ToolCategory.UTILITY,
  schema: {
    name: "memorySearch",
    description: "Search memory and knowledge base",
    parameters: {
      type: "object",
      properties: {
        query: {
          name: "query",
          description: "Search query",
          type: "string",
          required: true,
        },
        limit: {
          name: "limit",
          description: "Maximum number of results",
          type: "number",
          required: false,
          default: 10,
        },
        minScore: {
          name: "minScore",
          description: "Minimum similarity score (0-1)",
          type: "number",
          required: false,
          default: 0.5,
        },
        sources: {
          name: "sources",
          description: "Filter by memory sources",
          type: "array",
          required: false,
        },
        tags: {
          name: "tags",
          description: "Filter by tags",
          type: "array",
          required: false,
        },
      },
    },
  },
  executor: memorySearchExecutor,
  policy: { mode: ToolPolicyMode.ALLOW },
  tags: ["memory", "search", "knowledge"],
};

interface MemoryAddParams {
  content: string;
  source?: string;
  tags?: string[];
  importance?: number;
}

const memoryAddExecutor = async (
  params: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> => {
  const content = readStringParam(params, "content", { required: true });
  if (!content) {
    return createErrorResult("Content is required", 400);
  }

  const source = readStringParam(params, "source") ?? "manual";
  const tags = (params.tags as string[] | undefined) ?? [];
  const importance = readNumberParam(params, "importance") ?? 0.5;

  try {
    const { getMemoryManager } = await import("../../memory/manager.js");
    const manager = getMemoryManager();
    
    const entry = await manager.add(content, {
      source: source as import("../../memory/types.js").MemorySource,
      tags,
      importance,
    });


    return createSuccessResult({
      id: entry.id,
      content: content.length > 100 ? content.substring(0, 100) + "..." : content,
      source,
      tags,
      importance,
      message: "Memory entry added successfully",
    });
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Failed to add memory entry",
      500
    );
  }
};



export const memoryAdd: SecurityTool = {
  id: "utility-memory-add",
  name: "memoryAdd",
  description: "Add new information to the memory and knowledge base for future retrieval",
  category: ToolCategory.UTILITY,
  schema: {
    name: "memoryAdd",
    description: "Add information to memory",
    parameters: {
      type: "object",
      properties: {
        content: {
          name: "content",
          description: "Content to store in memory",
          type: "string",
          required: true,
        },
        source: {
          name: "source",
          description: "Source identifier",
          type: "string",
          required: false,
          default: "manual",
        },
        tags: {
          name: "tags",
          description: "Tags for categorization",
          type: "array",
          required: false,
        },
        importance: {
          name: "importance",
          description: "Importance score (0-1)",
          type: "number",
          required: false,
          default: 0.5,
        },
      },
    },
  },
  executor: memoryAddExecutor,
  policy: { mode: ToolPolicyMode.ALLOW },
  tags: ["memory", "knowledge", "storage"],
};

export const memoryTools: SecurityTool[] = [memorySearch, memoryAdd];
