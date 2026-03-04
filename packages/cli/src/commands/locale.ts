/**
 * Locale Command
 * 
 * Manage interface language settings
 */

import type { Command } from "commander";
import type { RuntimeEnv } from "../runtime.js";
import { getAvailableLocales, isLocaleSupported, getLocaleConfig } from "@esc/core/i18n";

export function registerLocaleCommand(program: Command, runtime: RuntimeEnv): void {
  const locale = program.command("locale").description("Interface language management");

  locale
    .command("list")
    .description("List available languages")
    .action(() => {
      const locales = getAvailableLocales();
      
      runtime.log("\n🌐 Available Languages");
      runtime.log("━".repeat(50));
      
      for (const loc of locales) {
        const isDefault = loc.code === "zh-CN";
        const defaultBadge = isDefault ? " (default)" : "";
        
        runtime.log(`\n  ${loc.code}`);
        runtime.log(`     Name: ${loc.name}${defaultBadge}`);
        runtime.log(`     Native: ${loc.nativeName}`);
        runtime.log(`     Direction: ${loc.direction.toUpperCase()}`);
      }
      
      runtime.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      runtime.log("  Use 'secuclaw config set locale <code>' to change language");
      runtime.log("  Example: secuclaw config set locale en-US\n");
    });

  locale
    .command("set <code>")
    .description("Set interface language")
    .action((code: string) => {
      if (!isLocaleSupported(code)) {
        runtime.log(`\n❌ Unsupported language: ${code}`);
        runtime.log("\nAvailable languages:");
        for (const loc of getAvailableLocales()) {
          runtime.log(`  - ${loc.code} (${loc.nativeName})`);
        }
        return;
      }

      const config = getLocaleConfig(code);
      if (config) {
        // Set the locale for current session
        process.env.SECUCLAW_LOCALE = code;
        
        runtime.log(`\n✅ Language set to: ${config.nativeName} (${config.code})`);
        runtime.log("\nTo make this change permanent, run:");
        runtime.log(`  secuclaw config set locale "${config.code}"`);
        runtime.log("\nOr set environment variable:");
        runtime.log(`  export SECUCLAW_LOCALE="${config.code}"`);
        runtime.log("\nNote: Restart CLI for changes to take effect.\n");
      }
    });

  locale
    .command("current")
    .description("Show current language setting")
    .action(() => {
      const envLocale = process.env.SECUCLAW_LOCALE;
      
      runtime.log("\n🌐 Current Language Setting");
      runtime.log("━".repeat(50));
      
      if (envLocale) {
        const config = getLocaleConfig(envLocale);
        if (config) {
          runtime.log(`\n  Environment: ${config.nativeName} (${config.code})`);
        } else {
          runtime.log(`\n  Environment: ${envLocale} (unsupported)`);
        }
      }
      
      runtime.log("\n  Default: 简体中文 (zh-CN)");
      runtime.log("\nTo change language:");
      runtime.log("  secuclaw locale set <code>");
      runtime.log("  secuclaw config set locale <code>\n");
    });
}
