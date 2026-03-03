/**
 * Doctor Command - System Diagnostic Tool
 * 
 * Check system health, configuration, and connectivity
 */

import type { Command } from "commander";
import type { RuntimeEnv } from "../runtime.js";
import {
  runDiagnostics,
  generateReport,
  generateJsonReport,
  getSystemInfo,
} from "@esc/core/diagnostic";

export function registerDoctorCommand(program: Command, runtime: RuntimeEnv): void {
  // Main doctor command
  const doctorCmd = program
    .command("doctor")
    .description("Run system diagnostics and health checks")
    .option("--json", "Output results as JSON", false)
    .option("--fix", "Automatically fix issues when possible", false)
    .option("-v, --verbose", "Show detailed information", false)
    .option("--checks <checks>", "Comma-separated list of checks to run (node-version,memory,disk-space,config,api-keys,connectivity,security,dependencies)");

  doctorCmd.action(async (opts) => {
    // Check for local --json option or use global option from program
    const useJson = opts.json || program.opts().json || false;
    
    try {
      // Get system info first
      const sysInfo = await getSystemInfo();
      
      if (opts.verbose) {
        runtime.log("\n📊 System Information:");
        runtime.log(`   Platform: ${sysInfo.platform} (${sysInfo.arch})`);
        runtime.log(`   Node.js: ${sysInfo.nodeVersion}`);
        runtime.log(`   CPU Cores: ${sysInfo.cpuCount}`);
        runtime.log(`   Memory: ${sysInfo.totalMemory}GB total, ${sysInfo.freeMemory}GB free`);
        runtime.log("");
      }
      
      // Parse checks if provided
      const checks = opts.checks ? opts.checks.split(",").map((c: string) => c.trim()) : undefined;
      
      // Run diagnostics
      runtime.log("\n🔍 Running diagnostics...\n");
      
      const results = await runDiagnostics({
        checks,
        fix: opts.fix,
        verbose: opts.verbose,
      });
      
      // Output results
      if (useJson) {
        const report = generateJsonReport(results);
        runtime.log(report);
      } else {
        const report = generateReport(results);
        runtime.log(report);
      }
      
      // Exit with error code if any errors
      const hasErrors = results.some(r => r.status === "error");
      if (hasErrors) {
        runtime.exit(1);
      }
      
      // Exit with warning code if any warnings but no errors
      const hasWarnings = results.some(r => r.status === "warning");
      if (hasWarnings) {
        runtime.exit(2);
      }
      
    } catch (err) {
      runtime.error(`\n❌ Diagnostic failed: ${err}`);
      runtime.exit(1);
    }
  });

  // Individual check subcommand for more granular control
  doctorCmd
    .command("check <type>")
    .description("Run a specific diagnostic check")
    .option("--json", "Output results as JSON", false)
    .action(async (type: string, opts) => {
      try {
        const results = await runDiagnostics({ checks: [type] });
        const result = results[0];
        
        if (!result) {
          runtime.log(`Unknown check type: ${type}`);
          runtime.exit(1);
          return;
        }
        
        if (opts.json) {
          runtime.log(JSON.stringify(result, null, 2));
        } else {
          const statusEmoji = {
            ok: "✅",
            warning: "⚠️",
            error: "❌",
          };
          
          runtime.log(`\n${statusEmoji[result.status]} ${result.check}: ${result.message}`);
          
          if (result.details && Object.keys(result.details).length > 0) {
            runtime.log(`   Details: ${JSON.stringify(result.details)}`);
          }
          
          if (result.fixable) {
            runtime.log(`   Run with 'secuclaw doctor --fix' to auto-repair`);
          }
        }
        
        if (result.status === "error") {
          runtime.exit(1);
        } else if (result.status === "warning") {
          runtime.exit(2);
        }
        
      } catch (err) {
        runtime.error(`Check failed: ${err}`);
        runtime.exit(1);
      }
    });
}
