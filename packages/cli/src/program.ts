import { Command } from "commander";
import type { RuntimeEnv } from "./runtime.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerProviderCommands } from "./commands/providers.js";
import { registerSecurityCommands } from "./commands/security.js";
import { registerSkillCommands } from "./commands/skill.js";
import { registerGatewayCommands } from "./commands/gateway.js";
import { registerDoctorCommand } from "./commands/doctor.js";

const VERSION = "1.0.0";

export function buildProgram(runtime: RuntimeEnv): Command {
  const program = new Command();
  
  program
    .name("secuclaw")
    .description("SecuClaw - AI驱动全域安全专家系统 CLI")
    .version(VERSION)
    .option("--json", "Output as JSON", false)
    .option("--debug", "Enable debug output", false);
  
  registerConfigCommands(program, runtime);
  registerProviderCommands(program, runtime);
  registerSecurityCommands(program, runtime);
  registerSkillCommands(program, runtime);
  registerGatewayCommands(program, runtime);
  registerDoctorCommand(program, runtime);
  
  program.command("status")
    .description("Show system status")
    .action(async () => {
      runtime.log("SecuClaw v" + VERSION);
      runtime.log("Status: Running");
    });
  
  return program;
}
