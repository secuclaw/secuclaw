import {
  ToolPolicy,
  ToolPolicyMode,
  ToolContext,
  PolicyChainItem,
  ToolCategory,
  Tool,
} from "./types.js";

export function createToolPolicy(
  mode: ToolPolicyMode,
  allowList?: string[],
  denyList?: string[],
): ToolPolicy {
  return {
    mode,
    allowList: allowList ?? [],
    denyList: denyList ?? [],
  };
}

export function resolveToolPolicy(
  toolName: string,
  tool: Tool,
  context: ToolContext,
  policyChain: PolicyChainItem[],
): ToolPolicyMode {
  const sortedChain = [...policyChain].sort((a, b) => b.priority - a.priority);

  for (const policyItem of sortedChain) {
    const resolved = policyItem.resolver(toolName, context);
    if (resolved !== ToolPolicyMode.NONE) {
      return resolved;
    }
  }

  return tool.policy.mode;
}

export function isToolAllowedByPolicy(
  toolName: string,
  policy: ToolPolicy,
): boolean {
  switch (policy.mode) {
    case ToolPolicyMode.ALLOW:
      if (policy.denyList && policy.denyList.length > 0) {
        return !matchesAnyPattern(toolName, policy.denyList);
      }
      if (policy.allowList && policy.allowList.length > 0) {
        return matchesAnyPattern(toolName, policy.allowList);
      }
      return true;

    case ToolPolicyMode.DENY:
      if (policy.allowList && policy.allowList.length > 0) {
        return matchesAnyPattern(toolName, policy.allowList);
      }
      return !matchesAnyPattern(toolName, policy.denyList ?? []);

    case ToolPolicyMode.NONE:
    default:
      return true;
  }
}

export function mergePolicies(
  base: ToolPolicy,
  override: ToolPolicy,
): ToolPolicy {
  if (override.mode === ToolPolicyMode.NONE) {
    return base;
  }

  return {
    mode: override.mode,
    allowList: [...(base.allowList ?? []), ...(override.allowList ?? [])],
    denyList: [...(base.denyList ?? []), ...(override.denyList ?? [])],
  };
}

export function filterToolsByPolicy(
  tools: Tool[],
  policy: ToolPolicy,
): Tool[] {
  return tools.filter((tool) => isToolAllowedByPolicy(tool.name, policy));
}

export function filterToolsByCategory(
  tools: Tool[],
  categories: ToolCategory[],
): Tool[] {
  if (!categories || categories.length === 0) {
    return tools;
  }
  return tools.filter((tool) => categories.includes(tool.category));
}

export function normalizeToolName(name: string): string {
  return name.toLowerCase().trim().replace(/[-_]/g, "");
}

function matchesAnyPattern(toolName: string, patterns: string[]): boolean {
  const normalized = normalizeToolName(toolName);
  return patterns.some((pattern) => {
    const normalizedPattern = normalizeToolName(pattern);
    if (normalizedPattern.includes("*")) {
      const regex = new RegExp(
        "^" + normalizedPattern.replace(/\*/g, ".*") + "$",
      );
      return regex.test(normalized);
    }
    return normalized === normalizedPattern;
  });
}

export function expandToolGroups(groups: string[]): string[] {
  const expanded: string[] = [];
  const categoryMap: Record<string, string[]> = {
    attack: ["attack"],
    defense: ["defense"],
    analysis: ["analysis"],
    assessment: ["assessment"],
    utility: ["utility"],
    all: ["attack", "defense", "analysis", "assessment", "utility"],
  };

  for (const group of groups) {
    const normalized = group.toLowerCase().trim();
    if (categoryMap[normalized]) {
      expanded.push(...categoryMap[normalized]);
    } else {
      expanded.push(group);
    }
  }

  return expanded;
}

export function createPolicyChain(items: PolicyChainItem[]): PolicyChainItem[] {
  return items.sort((a, b) => b.priority - a.priority);
}

export function addToPolicyChain(
  chain: PolicyChainItem[],
  item: PolicyChainItem,
): PolicyChainItem[] {
  return [...chain, item].sort((a, b) => b.priority - a.priority);
}

export function createDenyAllPolicy(): ToolPolicy {
  return {
    mode: ToolPolicyMode.DENY,
    allowList: [],
    denyList: ["*"],
  };
}

export function createAllowAllPolicy(): ToolPolicy {
  return {
    mode: ToolPolicyMode.ALLOW,
    allowList: [],
    denyList: [],
  };
}
