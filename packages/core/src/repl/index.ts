import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ConfigManager } from "../config/manager.js";
import type { SkillLoader } from "../skills/loader-class.js";
import { CommandRegistry } from "../commands/registry.js";

export interface ReplOptions {
  configManager: ConfigManager;
  skillLoader: SkillLoader;
  dataDir: string;
  prompt?: string;
  historyFile?: string;
}

export interface ReplCommand {
  name: string;
  description: string;
  handler: (args: string[], repl: Repl) => Promise<void> | void;
}

export class Repl {
  private configManager: ConfigManager;
  private skillLoader: SkillLoader;
  private dataDir: string;
  private prompt: string;
  private historyFile: string;
  private commandRegistry: CommandRegistry;
  private customCommands: Map<string, ReplCommand> = new Map();
  private rl: readline.Interface | null = null;
  private running = false;
  private context: Record<string, unknown> = {};

  constructor(options: ReplOptions) {
    this.configManager = options.configManager;
    this.skillLoader = options.skillLoader;
    this.dataDir = options.dataDir;
    this.prompt = options.prompt || "esc> ";
    this.historyFile = options.historyFile || path.join(options.dataDir, ".repl_history");
    this.commandRegistry = new CommandRegistry();
    this.registerBuiltinCommands();
  }

  private registerBuiltinCommands(): void {
    this.registerCommand({
      name: "help",
      description: "Show available commands",
      handler: () => {
        console.log(this.commandRegistry.formatHelp());
        console.log("\nREPL Commands:");
        for (const [name, cmd] of this.customCommands) {
          console.log(`  .${name} - ${cmd.description}`);
        }
        console.log("\nPress Ctrl+C or type .exit to quit\n");
      },
    });

    this.registerCommand({
      name: "exit",
      description: "Exit the REPL",
      handler: () => {
        this.stop();
      },
    });

    this.registerCommand({
      name: "quit",
      description: "Exit the REPL",
      handler: () => {
        this.stop();
      },
    });

    this.registerCommand({
      name: "clear",
      description: "Clear the screen",
      handler: () => {
        console.clear();
      },
    });

    this.registerCommand({
      name: "status",
      description: "Show system status",
      handler: () => {
        this.showStatus();
      },
    });

    this.registerCommand({
      name: "skills",
      description: "List loaded skills",
      handler: () => {
        const skills = this.skillLoader.getAll();
        console.log("\nLoaded Skills:");
        for (const skill of skills) {
          const emoji = skill.metadata?.openclaw?.emoji ?? "📋";
          console.log(`  ${emoji} ${skill.name} - ${skill.description}`);
        }
        console.log(`\nTotal: ${skills.length} skills\n`);
      },
    });

    this.registerCommand({
      name: "config",
      description: "View or set configuration",
      handler: (args) => {
        if (args.length === 0) {
          const all = this.configManager.getAll();
          console.log("\nConfiguration:");
          for (const [k, v] of Object.entries(all)) {
            console.log(`  ${k} = ${JSON.stringify(v)}`);
          }
          console.log();
        } else if (args[0] === "get" && args[1]) {
          const value = this.configManager.get(args[1]);
          console.log(`${args[1]} = ${JSON.stringify(value)}`);
        } else if (args[0] === "set" && args[1] && args[2]) {
          this.configManager.set(args[1], args[2]);
          console.log(`✓ Set ${args[1]} = ${args[2]}`);
        }
      },
    });

    this.registerCommand({
      name: "history",
      description: "Show command history",
      handler: () => {
        if (fs.existsSync(this.historyFile)) {
          const history = fs.readFileSync(this.historyFile, "utf-8").split("\n").filter(Boolean);
          console.log("\nCommand History:");
          history.slice(-20).forEach((line, i) => {
            console.log(`  ${i + 1}. ${line}`);
          });
          console.log();
        }
      },
    });

    this.registerCommand({
      name: "context",
      description: "Show or set context variables",
      handler: (args) => {
        if (args.length === 0) {
          console.log("\nContext Variables:");
          for (const [k, v] of Object.entries(this.context)) {
            console.log(`  ${k} = ${JSON.stringify(v)}`);
          }
          console.log();
        } else if (args[0] === "set" && args[1]) {
          this.context[args[1]] = args.slice(2).join(" ");
          console.log(`✓ Set ${args[1]} = ${this.context[args[1]]}`);
        } else if (args[0] === "clear") {
          this.context = {};
          console.log("✓ Context cleared");
        }
      },
    });

    this.registerCommand({
      name: "reload",
      description: "Reload skills and configuration",
      handler: async () => {
        console.log("Reloading...");
        await this.skillLoader.loadAll();
        await this.configManager.load();
        console.log("✓ Reloaded skills and configuration");
      },
    });

    this.registerCommand({
      name: "use",
      description: "Set active skill",
      handler: (args) => {
        if (args.length === 0) {
          console.log("Usage: .use <skill-name>");
          return;
        }
        const skill = this.skillLoader.get(args[0]);
        if (skill) {
          this.context.activeSkill = args[0];
          console.log(`✓ Active skill: ${args[0]}`);
        } else {
          console.log(`✗ Skill not found: ${args[0]}`);
        }
      },
    });
  }

  registerCommand(command: ReplCommand): void {
    this.customCommands.set(command.name, command);
  }

  async start(): Promise<void> {
    this.running = true;
    
    console.log("\n🔐 Enterprise Security Commander REPL");
    console.log("Type .help for available commands\n");

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.prompt,
      historySize: 1000,
    });

    // Load history
    this.loadHistory();

    this.rl.prompt();

    this.rl.on("line", async (line) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        this.rl?.prompt();
        return;
      }

      // Save to history
      this.saveToHistory(trimmed);

      try {
        await this.processLine(trimmed);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }

      if (this.running) {
        this.rl?.prompt();
      }
    });

    this.rl.on("close", () => {
      this.stop();
    });

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
      console.log("\n");
      this.stop();
    });

    // Wait until stopped
    return new Promise((resolve) => {
      this.rl?.on("close", resolve);
    });
  }

  stop(): void {
    if (!this.running) return;
    
    this.running = false;
    console.log("\nGoodbye!\n");
    this.rl?.close();
  }

  private async processLine(line: string): Promise<void> {
    // Check for REPL commands (start with .)
    if (line.startsWith(".")) {
      const [cmdName, ...args] = line.slice(1).split(/\s+/);
      const cmd = this.customCommands.get(cmdName);
      
      if (cmd) {
        await cmd.handler(args, this);
      } else {
        console.log(`Unknown command: .${cmdName}. Type .help for available commands.`);
      }
      return;
    }

    // Check for chat commands (start with /)
    if (line.startsWith("/")) {
      await this.processChatCommand(line);
      return;
    }

    // Default: send to agent
    console.log(`[Agent] Processing: ${line}`);
    console.log("Note: Connect to gateway for full agent functionality. Run: esc gateway");
  }

  private async processChatCommand(line: string): Promise<void> {
    const parsed = this.commandRegistry.parse(line);
    
    if (!parsed) {
      console.log("Invalid command");
      return;
    }

    const command = this.commandRegistry.get(parsed.command);
    
    if (!command) {
      console.log(`Unknown command: ${parsed.command}`);
      return;
    }

    // Validate arguments
    const validation = this.commandRegistry.validateArgs(command, parsed.args);
    if (!validation.valid) {
      console.log(`Error: ${validation.error}`);
      return;
    }

    // Handle specific commands
    switch (command.key) {
      case "help":
        console.log(this.commandRegistry.formatHelp());
        break;
      case "status":
        this.showStatus();
        break;
      case "whoami":
        console.log("\nCurrent User: admin");
        console.log("Role: Administrator");
        console.log("Scopes: read, write, execute\n");
        break;
      case "doctor":
        await this.runDoctor();
        break;
      default:
        console.log(`Command /${command.key} requires gateway connection.`);
        console.log("Start gateway with: esc gateway");
    }
  }

  private showStatus(): void {
    console.log("\n📊 System Status\n");
    console.log(`  Version:     1.0.0`);
    console.log(`  Data Dir:    ${this.dataDir}`);
    console.log(`  Skills:      ${this.skillLoader.getAll().length} loaded`);
    console.log(`  Config:      ${Object.keys(this.configManager.getAll()).length} keys`);
    if (this.context.activeSkill) {
      console.log(`  Active Skill: ${this.context.activeSkill}`);
    }
    console.log();
  }

  private async runDoctor(): Promise<void> {
    console.log("\n🔧 System Diagnostics\n");
    
    const checks = [
      { name: "Data directory", ok: fs.existsSync(this.dataDir), path: this.dataDir },
      { name: "Skills directory", ok: true, path: "Loaded in memory" },
    ];

    for (const check of checks) {
      console.log(`  ${check.ok ? "✓" : "✗"} ${check.name}: ${check.path}`);
    }

    console.log(`\n  Skills loaded: ${this.skillLoader.getAll().length}`);
    console.log(`  Config keys: ${Object.keys(this.configManager.getAll()).length}`);
    console.log();
  }

  private loadHistory(): void {
    if (fs.existsSync(this.historyFile)) {
      try {
        const history = fs.readFileSync(this.historyFile, "utf-8").split("\n").filter(Boolean);
        // Note: readline doesn't expose a way to set history directly
        // This is a best-effort approach
        (this.rl as unknown as { history: string[] }).history = history.reverse();
      } catch {
        // Ignore history load errors
      }
    }
  }

  private saveToHistory(line: string): void {
    try {
      const historyDir = path.dirname(this.historyFile);
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }
      fs.appendFileSync(this.historyFile, line + "\n");
    } catch {
      // Ignore history save errors
    }
  }
}
