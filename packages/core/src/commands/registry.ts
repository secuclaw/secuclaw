import * as fs from "node:fs";
import * as path from "node:path";

export interface CommandDefinition {
  key: string;
  nativeName?: string;
  description: string;
  textAlias?: string;
  category: "status" | "management" | "session" | "tools" | "attack" | "defense" | "compliance";
  args?: CommandArg[];
  handler?: (args: string[]) => Promise<CommandResult>;
}

export interface CommandArg {
  name: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface CommandCategory {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const COMMAND_CATEGORIES: CommandCategory[] = [
  { id: "status", name: "Status", description: "System status commands", emoji: "📊" },
  { id: "management", name: "Management", description: "Configuration management", emoji: "⚙️" },
  { id: "session", name: "Session", description: "Session management", emoji: "💬" },
  { id: "tools", name: "Tools", description: "Security tools", emoji: "🔧" },
  { id: "attack", name: "Attack", description: "Red team operations", emoji: "🔴" },
  { id: "defense", name: "Defense", description: "Blue team operations", emoji: "🛡️" },
  { id: "compliance", name: "Compliance", description: "Compliance audit", emoji: "📋" },
];

export const BUILTIN_COMMANDS: CommandDefinition[] = [
  {
    key: "help",
    nativeName: "help",
    description: "Show available commands",
    textAlias: "/help",
    category: "status",
  },
  {
    key: "status",
    nativeName: "status",
    description: "Show system status",
    textAlias: "/status",
    category: "status",
  },
  {
    key: "whoami",
    nativeName: "whoami",
    description: "Show current user and permissions",
    textAlias: "/whoami",
    category: "status",
  },
  {
    key: "config",
    nativeName: "config",
    description: "Get or set configuration",
    textAlias: "/config",
    category: "management",
    args: [
      { name: "action", type: "string", required: true, description: "get|set|list" },
      { name: "key", type: "string", required: false },
      { name: "value", type: "string", required: false },
    ],
  },
  {
    key: "skill",
    nativeName: "skill",
    description: "Manage skills",
    textAlias: "/skill",
    category: "tools",
    args: [
      { name: "action", type: "string", required: true, description: "list|load|unload|info" },
      { name: "skillId", type: "string", required: false },
    ],
  },
  {
    key: "attack",
    nativeName: "attack",
    description: "Simulate attack scenarios",
    textAlias: "/attack",
    category: "attack",
    args: [
      { name: "target", type: "string", required: true, description: "Target system" },
      { name: "type", type: "string", required: false, default: "auto", description: "Attack type" },
    ],
  },
  {
    key: "defend",
    nativeName: "defend",
    description: "Run defense analysis",
    textAlias: "/defend",
    category: "defense",
    args: [
      { name: "target", type: "string", required: true, description: "Target to defend" },
    ],
  },
  {
    key: "audit",
    nativeName: "audit",
    description: "Run compliance audit",
    textAlias: "/audit",
    category: "compliance",
    args: [
      { name: "framework", type: "string", required: false, description: "NIST|ISO|GDPR|SOC2" },
    ],
  },
  {
    key: "new",
    nativeName: "new",
    description: "Start new session",
    textAlias: "/new",
    category: "session",
  },
  {
    key: "reset",
    nativeName: "reset",
    description: "Reset current session",
    textAlias: "/reset",
    category: "session",
  },
  {
    key: "think",
    nativeName: "think",
    description: "Set thinking mode",
    textAlias: "/think",
    category: "session",
    args: [{ name: "mode", type: "string", required: false, default: "high" }],
  },
  {
    key: "model",
    nativeName: "model",
    description: "Switch LLM model",
    textAlias: "/model",
    category: "management",
    args: [{ name: "provider", type: "string", required: false }],
  },
  {
    key: "doctor",
    nativeName: "doctor",
    description: "Diagnose system issues",
    textAlias: "/doctor",
    category: "status",
  },
  {
    key: "restart",
    nativeName: "restart",
    description: "Restart the system",
    textAlias: "/restart",
    category: "management",
  },
];

export class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();
  private aliases: Map<string, string> = new Map();
  private categories: Map<string, CommandDefinition[]> = new Map();

  constructor() {
    this.loadBuiltinCommands();
  }

  private loadBuiltinCommands(): void {
    for (const cmd of BUILTIN_COMMANDS) {
      this.register(cmd);
    }
  }

  register(command: CommandDefinition): void {
    this.commands.set(command.key, command);

    if (command.nativeName) {
      this.aliases.set(command.nativeName, command.key);
    }
    if (command.textAlias) {
      this.aliases.set(command.textAlias, command.key);
    }

    const category = this.categories.get(command.category) ?? [];
    category.push(command);
    this.categories.set(command.category, category);
  }

  get(key: string): CommandDefinition | undefined {
    return this.commands.get(key) ?? this.commands.get(this.aliases.get(key) ?? "");
  }

  getByCategory(category: string): CommandDefinition[] {
    return this.categories.get(category) ?? [];
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  getCategories(): CommandCategory[] {
    return COMMAND_CATEGORIES;
  }

  parse(input: string): { command: string; args: string[] } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const resolvedKey = this.commands.has(cmdName)
      ? cmdName
      : this.aliases.get(cmdName);

    if (!resolvedKey) {
      return { command: "unknown", args: [cmdName, ...args] };
    }

    return { command: resolvedKey, args };
  }

  validateArgs(command: CommandDefinition, args: string[]): { valid: boolean; error?: string; parsed?: Record<string, unknown> } {
    if (!command.args || command.args.length === 0) {
      return { valid: true, parsed: {} };
    }

    const parsed: Record<string, unknown> = {};
    let argIndex = 0;

    for (const argDef of command.args) {
      if (argIndex < args.length) {
        let value: unknown = args[argIndex];

        if (argDef.type === "number") {
          value = parseFloat(value as string);
          if (isNaN(value as number)) {
            return { valid: false, error: `Invalid number for ${argDef.name}` };
          }
        } else if (argDef.type === "boolean") {
          value = value === "true" || value === "1" || value === "yes";
        }

        parsed[argDef.name] = value;
        argIndex++;
      } else if (argDef.required && argDef.default === undefined) {
        return { valid: false, error: `Missing required argument: ${argDef.name}` };
      } else if (argDef.default !== undefined) {
        parsed[argDef.name] = argDef.default;
      }
    }

    return { valid: true, parsed };
  }

  formatHelp(): string {
    const lines: string[] = ["\n📚 Available Commands:\n"];

    for (const category of COMMAND_CATEGORIES) {
      const commands = this.getByCategory(category.id);
      if (commands.length === 0) continue;

      lines.push(`${category.emoji} ${category.name}`);
      for (const cmd of commands) {
        const alias = cmd.textAlias ? ` (${cmd.textAlias})` : "";
        lines.push(`  ${cmd.key}${alias} - ${cmd.description}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
