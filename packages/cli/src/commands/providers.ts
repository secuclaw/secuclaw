import type { Command } from "commander";
import type { RuntimeEnv } from "../runtime.js";

export function registerProviderCommands(program: Command, runtime: RuntimeEnv): void {
  const providers = program.command("providers").description("LLM Provider management");

  providers
    .command("list")
    .description("List available providers")
    .option("--json", "Output as JSON", false)
    .action(async (opts: { json: boolean }) => {
      try {
        const { getProviderManager } = await import("@esc/core/providers");
        const manager = getProviderManager();
        const available = manager.listAvailable();
        
        if (opts.json) {
          runtime.log(JSON.stringify({ providers: available }, null, 2));
        } else {
          runtime.log("Available LLM Providers:");
          for (const name of available) {
            const provider = manager.get(name);
            const status = provider?.isAvailable() ? "✓" : "✗";
            runtime.log(`  ${status} ${name}`);
          }
        }
      } catch (error) {
        runtime.error(`Failed to list providers: ${error}`);
      }
    });

  providers
    .command("test <name>")
    .description("Test a provider connection")
    .action(async (name: string) => {
      try {
        const { getProviderManager } = await import("@esc/core/providers");
        const manager = getProviderManager();
        const provider = manager.get(name);
        
        if (!provider) {
          runtime.error(`Provider "${name}" not found`);
          return;
        }
        
        const available = provider.isAvailable();
        runtime.log(`Provider "${name}": ${available ? "available" : "not available"}`);
      } catch (error) {
        runtime.error(`Failed to test provider: ${error}`);
      }
    });
}
