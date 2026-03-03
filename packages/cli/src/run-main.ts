import { Command } from "commander";
import { buildProgram } from "./program.js";
import { createRuntime, type RuntimeEnv } from "./runtime.js";

export async function runCli(argv: string[]): Promise<void> {
  const runtime = createRuntime();
  const program = buildProgram(runtime);
  
  try {
    await program.parseAsync(argv);
  } catch (error) {
    runtime.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    runtime.exit(1);
  }
}
