import {
  Tool,
  SecurityTool,
  ToolCategory,
  ToolRegistry,
  ToolRegistration,
  ToolFilter,
  ToolPolicy,
  ToolPolicyMode,
} from "./types.js";
import { isToolAllowedByPolicy, filterToolsByCategory, createAllowAllPolicy } from "./policy.js";
import type { ITool } from "./trait.js";

export function createToolRegistry(): ToolRegistry {
  return {
    tools: new Map<string, ToolRegistration>(),
    categories: new Map<ToolCategory, Set<string>>(),
  };
}

export function registerTool(
  registry: ToolRegistry,
  tool: Tool | SecurityTool,
  version: string = "1.0.0",
): void {
  const registration: ToolRegistration = {
    tool,
    version,
    registeredAt: Date.now(),
  };

  registry.tools.set(tool.id, registration);

  let categorySet = registry.categories.get(tool.category);
  if (!categorySet) {
    categorySet = new Set<string>();
    registry.categories.set(tool.category, categorySet);
  }
  categorySet.add(tool.id);
}

export function unregisterTool(registry: ToolRegistry, toolId: string): boolean {
  const registration = registry.tools.get(toolId);
  if (!registration) {
    return false;
  }

  registry.tools.delete(toolId);

  const categorySet = registry.categories.get(registration.tool.category);
  if (categorySet) {
    categorySet.delete(toolId);
    if (categorySet.size === 0) {
      registry.categories.delete(registration.tool.category);
    }
  }

  return true;
}

export function getTool(registry: ToolRegistry, toolId: string): Tool | undefined {
  const registration = registry.tools.get(toolId);
  return registration?.tool;
}

export function getToolByName(registry: ToolRegistry, name: string): Tool | undefined {
  for (const [, registration] of registry.tools) {
    if (registration.tool.name === name) {
      return registration.tool;
    }
  }
  return undefined;
}

export function listTools(registry: ToolRegistry): Tool[] {
  return Array.from(registry.tools.values()).map((r) => r.tool);
}

export function listToolsByCategory(
  registry: ToolRegistry,
  category: ToolCategory,
): Tool[] {
  const categorySet = registry.categories.get(category);
  if (!categorySet) {
    return [];
  }

  return Array.from(categorySet)
    .map((id) => registry.tools.get(id)?.tool)
    .filter((t): t is Tool => t !== undefined);
}

export function filterTools(
  registry: ToolRegistry,
  filter: ToolFilter,
  policy?: ToolPolicy,
): Tool[] {
  let tools = listTools(registry);

  if (filter.categories && filter.categories.length > 0) {
    tools = filterToolsByCategory(tools, filter.categories);
  }

  if (filter.search && filter.search.trim()) {
    const searchLower = filter.search.toLowerCase().trim();
    tools = tools.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower),
    );
  }

  const tagsFilter = filter.tags;
  if (tagsFilter && tagsFilter.length > 0) {
    tools = tools.filter((t) => {
      const toolTags = "tags" in t ? (t as SecurityTool).tags : undefined;
      if (!toolTags || !Array.isArray(toolTags)) {
        return false;
      }
      return tagsFilter.some((tag) => toolTags.includes(tag));
    });
  }

  if (policy) {
    tools = tools.filter((tool) => isToolAllowedByPolicy(tool.name, policy));
  }

  return tools;
}

export function getToolCount(registry: ToolRegistry): number {
  return registry.tools.size;
}

export function getCategories(registry: ToolRegistry): ToolCategory[] {
  return Array.from(registry.categories.keys());
}

export function isToolEnabled(tool: Tool): boolean {
  return tool.enabled !== false;
}

export function enableTool(tool: Tool): void {
  tool.enabled = true;
}

export function disableTool(tool: Tool): void {
  tool.enabled = false;
}

export function updateToolPolicy(
  registry: ToolRegistry,
  toolId: string,
  policy: ToolPolicy,
): boolean {
  const registration = registry.tools.get(toolId);
  if (!registration) {
    return false;
  }
  registration.tool.policy = policy;
  return true;
}

export function cloneRegistry(registry: ToolRegistry): ToolRegistry {
  const cloned = createToolRegistry();

  for (const [id, reg] of registry.tools) {
    cloned.tools.set(id, {
      ...reg,
      tool: { ...reg.tool },
    });
  }

  for (const [cat, ids] of registry.categories) {
    cloned.categories.set(cat, new Set(ids));
  }

  return cloned;
}

export function getDefaultPolicy(): ToolPolicy {
  return createAllowAllPolicy();
}

export class ToolRegistryV2 {
  private readonly tools = new Map<string, ITool<unknown, unknown>>();

  register(tool: ITool<unknown, unknown>): void {
    this.tools.set(tool.id, tool);
  }

  get(id: string): ITool<unknown, unknown> | undefined {
    return this.tools.get(id);
  }

  list(): ITool<unknown, unknown>[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): ITool<unknown, unknown>[] {
    return this.list().filter((tool) => tool.category === category);
  }

  search(query: string): ITool<unknown, unknown>[] {
    const normalized = query.trim().toLowerCase();
    return this.list().filter((tool) => {
      return (
        tool.name.toLowerCase().includes(normalized) ||
        tool.description.toLowerCase().includes(normalized)
      );
    });
  }
}
