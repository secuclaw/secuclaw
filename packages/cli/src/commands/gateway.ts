import type { Command } from "commander";
import { t } from "@esc/core/i18n";
import type { RuntimeEnv } from "../runtime.js";
import { Gateway } from "@esc/core/gateway/wrapper.js";
import { ConfigManager } from "@esc/core/config/manager.js";
import { SkillLoader } from "@esc/core/skills/loader-class.js";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServeOptions {
  port?: number;
  host?: string;
  dataDir?: string;
}

export function registerGatewayCommands(program: Command, runtime: RuntimeEnv): void {
  const gateway = program
    .command("gateway")
    .description(t("gateway.title"));

  gateway
    .command("start")
    .description(t("gateway.start"))
    .option("-p, --port <port>", t("gateway.port"), "21000")
    .option("-h, --host <host>", t("gateway.host"), "0.0.0.0")
    .option("-d, --data-dir <dir>", t("gateway.dataDir"), path.join(os.homedir(), ".secuclaw"))
    .option("--force", t("gateway.force"), false)
  .action(async (opts: ServeOptions & { force: boolean }) => {
    const port = parseInt(String(opts.port) || "21000", 10);
    const host = opts.host || "0.0.0.0";
    const dataDir = opts.dataDir || path.join(os.homedir(), ".secuclaw");

      runtime.log(`\n🛡️  SecuClaw Gateway ${t("gateway.starting")}...`);
      runtime.log(`   ${t("gateway.port")}: ${port}`);
      runtime.log(`   ${t("gateway.host")}: ${host}`);
      runtime.log(`   ${t("gateway.dataDir")}: ${dataDir}`);

      try {
        const configManager = new ConfigManager(path.join(dataDir, "config"));
        await configManager.load();

        const skillLoader = new SkillLoader(path.join(dataDir, "skills"));
        await skillLoader.loadAll();

        const gateway = new Gateway({
          port,
          host,
          dataDir,
          configManager,
          skillLoader,
          webDistDir: path.join(__dirname, "..", "..", "..", "web", "dist"),
        });

        await gateway.start();

        runtime.log(`\n✅ ${t("gateway.started")}`);
        runtime.log(`   ${t("gateway.http")}: http://${host}:${port}`);
        runtime.log(`   ${t("gateway.websocket")}: ws://${host}:${port}`);
        runtime.log(`   ${t("gateway.healthCheck")}: http://${host}:${port}/health`);
        runtime.log(`\n${t("gateway.pressCtrlC")}`);

        process.on("SIGINT", async () => {
        runtime.log("\n\n🛑 "+t("gateway.shuttingDown"));
          await gateway.stop();
          runtime.log(`✅ ${t("gateway.stopped")}`);
          process.exit(0);
        });
      } catch (err) {
        runtime.log(`\n❌ ${t("gateway.startFailed")}: ${err}`);
        runtime.exit(1);
      }
    });

  gateway
    .command("stop")
    .description(t("gateway.stop"))
  .action(() => {
      runtime.log(t("gateway.useCtrlC"));
      runtime.log(t("gateway.useSystemService"));
    });

  gateway
    .command("status")
    .description(t("gateway.status"))
  .action(() => {
      runtime.log(t("gateway.needRunningServer"));
      runtime.log(t("gateway.useStartCommand"));
    });

  gateway
    .option("--follow", t("gateway.follow"), false)
    .option("--lines <n>", t("gateway.lines"), "50")
  .action((opts: { follow: boolean; lines: string }) => {
      runtime.log(t("gateway.logsNeedServer"));
      runtime.log(t("gateway.useStartCommand"));
    });
}
