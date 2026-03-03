import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Command } from "commander";
import type { RuntimeEnv } from "../runtime.js";

const CONFIG_DIR = ".secuclaw";
const CONFIG_FILE = "config.json";

interface ConfigValue {
  key: string;
  value: unknown;
  updatedAt: string;
}

interface SecuClawConfig {
  version: string;
  values: Record<string, ConfigValue>;
}

function getConfigPath(): string {
  return path.join(os.homedir(), CONFIG_DIR, CONFIG_FILE);
}

function ensureConfigDir(): void {
  const configDir = path.join(os.homedir(), CONFIG_DIR);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
}

function loadConfig(): SecuClawConfig {
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    return {
      version: "1.0.0",
      values: {},
    };
  }
  
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      version: parsed.version || "1.0.0",
      values: parsed.values || {},
    };
  } catch {
    return {
      version: "1.0.0",
      values: {},
    };
  }
}

function saveConfig(config: SecuClawConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

function parseValue(value: string): unknown {
  // Try to parse as JSON for complex values
  if (value.startsWith("{") || value.startsWith("[") || value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  // Boolean parsing
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  
  // Number parsing
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  
  return value;
}

function formatValue(value: unknown): string {
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

// Default configuration keys with descriptions
const CONFIG_KEYS: Record<string, { description: string; default?: unknown }> = {
  "provider.default": {
    description: "Default LLM provider (anthropic, openai, ollama, etc.)",
    default: "ollama",
  },
  "provider.model": {
    description: "Default model name for the provider",
  },
  "provider.apiKey": {
    description: "API key for the default provider (stored securely)",
  },
  "provider.baseUrl": {
    description: "Base URL for API requests (for custom endpoints)",
  },
  "gateway.port": {
    description: "Gateway server port",
    default: 21000,
  },
  "gateway.host": {
    description: "Gateway server host",
    default: "localhost",
  },
  "memory.enabled": {
    description: "Enable persistent memory",
    default: true,
  },
  "memory.maxEntries": {
    description: "Maximum memory entries to store",
    default: 1000,
  },
  "skills.layer": {
    description: "Preferred skills layer (workspace, user, system, bundled)",
    default: "hybrid",
  },
  "output.format": {
    description: "Output format (text, json, markdown)",
    default: "text",
  },
  "output.color": {
    description: "Enable colored output",
    default: true,
  },
  "log.level": {
    description: "Log level (debug, info, warn, error)",
    default: "info",
  },
  "workspace.path": {
    description: "Default workspace path",
  },
};

export function registerConfigCommands(program: Command, runtime: RuntimeEnv): void {
  const config = program.command("config").description("Configuration management");

  config
    .command("get <key>")
    .description("Get configuration value")
    .option("--show-default", "Show default value if not set")
    .action((key: string, options: { showDefault?: boolean }) => {
      const cfg = loadConfig();
      
      if (cfg.values[key]) {
        const entry = cfg.values[key];
        runtime.log(`${key} = ${formatValue(entry.value)}`);
        runtime.log(`  Updated: ${entry.updatedAt}`);
      } else if (options.showDefault && CONFIG_KEYS[key]?.default !== undefined) {
        runtime.log(`${key} = ${formatValue(CONFIG_KEYS[key].default)} (default)`);
      } else {
        runtime.log(`Config '${key}' is not set`);
        if (CONFIG_KEYS[key]) {
          runtime.log(`  Description: ${CONFIG_KEYS[key].description}`);
          if (CONFIG_KEYS[key].default !== undefined) {
            runtime.log(`  Default: ${formatValue(CONFIG_KEYS[key].default)}`);
          }
        }
      }
    });

  config
    .command("set <key> <value>")
    .description("Set configuration value")
    .action((key: string, value: string) => {
      const cfg = loadConfig();
      const parsedValue = parseValue(value);
      
      cfg.values[key] = {
        key,
        value: parsedValue,
        updatedAt: new Date().toISOString(),
      };
      
      saveConfig(cfg);
      runtime.log(`Set ${key} = ${formatValue(parsedValue)}`);
      
      // Warn about sensitive keys
      if (key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password")) {
        runtime.log("  ⚠️  Warning: Sensitive value stored in plain text");
        runtime.log("  Consider using environment variables instead");
      }
    });

  config
    .command("list")
    .description("List all configuration")
    .option("--all", "Show all keys including defaults")
    .action((options: { all?: boolean }) => {
      const cfg = loadConfig();
      const configPath = getConfigPath();
      
      runtime.log(`Configuration file: ${configPath}`);
      runtime.log(`Version: ${cfg.version}`);
      runtime.log("");
      
      const keys = Object.keys(cfg.values);
      
      if (keys.length === 0 && !options.all) {
        runtime.log("No configuration values set.");
        runtime.log("");
        runtime.log("Use 'secuclaw config set <key> <value>' to set a value.");
        runtime.log("Use 'secuclaw config keys' to see available keys.");
        return;
      }
      
      // Group by prefix
      const grouped: Record<string, Array<{ key: string; entry: ConfigValue }>> = {};
      
      for (const key of keys.sort()) {
        const prefix = key.split(".")[0];
        if (!grouped[prefix]) {
          grouped[prefix] = [];
        }
        grouped[prefix].push({ key, entry: cfg.values[key] });
      }
      
      for (const [prefix, entries] of Object.entries(grouped).sort()) {
        runtime.log(`[${prefix}]`);
        for (const { key, entry } of entries) {
          runtime.log(`  ${key.substring(prefix.length + 1)} = ${formatValue(entry.value)}`);
        }
        runtime.log("");
      }
      
      if (options.all) {
        runtime.log("[Default Values]");
        for (const [key, info] of Object.entries(CONFIG_KEYS)) {
          if (!cfg.values[key] && info.default !== undefined) {
            runtime.log(`  ${key} = ${formatValue(info.default)} (default)`);
          }
        }
      }
    });

  config
    .command("delete <key>")
    .description("Delete a configuration value")
    .action((key: string) => {
      const cfg = loadConfig();
      
      if (cfg.values[key]) {
        delete cfg.values[key];
        saveConfig(cfg);
        runtime.log(`Deleted: ${key}`);
      } else {
        runtime.log(`Config '${key}' is not set`);
      }
    });

  config
    .command("keys")
    .description("List available configuration keys")
    .option("--prefix <prefix>", "Filter by prefix")
    .action((options: { prefix?: string }) => {
      runtime.log("Available configuration keys:");
      runtime.log("");
      
      const keys = Object.entries(CONFIG_KEYS);
      let currentPrefix = "";
      
      for (const [key, info] of keys.sort()) {
        const prefix = key.split(".")[0];
        
        if (options.prefix && prefix !== options.prefix) {
          continue;
        }
        
        if (prefix !== currentPrefix) {
          currentPrefix = prefix;
          runtime.log(`[${prefix}]`);
        }
        
        runtime.log(`  ${key.substring(prefix.length + 1)}`);
        runtime.log(`    ${info.description}`);
        if (info.default !== undefined) {
          runtime.log(`    Default: ${formatValue(info.default)}`);
        }
      }
    });

  config
    .command("path")
    .description("Show configuration file path")
    .action(() => {
      const configPath = getConfigPath();
      runtime.log(`Configuration file: ${configPath}`);
      
      if (fs.existsSync(configPath)) {
        const stat = fs.statSync(configPath);
        runtime.log(`File exists: Yes`);
        runtime.log(`Last modified: ${stat.mtime.toISOString()}`);
      } else {
        runtime.log(`File exists: No (will be created on first set)`);
      }
    });

  config
    .command("reset")
    .description("Reset all configuration to defaults")
    .option("--force", "Skip confirmation")
    .action((options: { force?: boolean }) => {
      if (!options.force) {
        runtime.log("This will delete all configuration values.");
        runtime.log("Use --force to confirm.");
        return;
      }
      
      const cfg: SecuClawConfig = {
        version: "1.0.0",
        values: {},
      };
      
      saveConfig(cfg);
      runtime.log("Configuration reset to defaults.");
    });

  config
    .command("export <file>")
    .description("Export configuration to a file")
    .action((file: string) => {
      const cfg = loadConfig();
      fs.writeFileSync(file, JSON.stringify(cfg, null, 2), "utf-8");
      runtime.log(`Configuration exported to: ${file}`);
    });

  config
    .command("import <file>")
    .description("Import configuration from a file")
    .option("--merge", "Merge with existing configuration")
    .action((file: string, options: { merge?: boolean }) => {
      if (!fs.existsSync(file)) {
        runtime.log(`File not found: ${file}`);
        return;
      }
      
      try {
        const content = fs.readFileSync(file, "utf-8");
        const imported = JSON.parse(content) as SecuClawConfig;
        
        if (options.merge) {
          const cfg = loadConfig();
          cfg.values = { ...cfg.values, ...imported.values };
          saveConfig(cfg);
          runtime.log(`Configuration imported and merged from: ${file}`);
        } else {
          saveConfig(imported);
          runtime.log(`Configuration imported from: ${file}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        runtime.log(`Failed to import: ${message}`);
      }
    });
}
