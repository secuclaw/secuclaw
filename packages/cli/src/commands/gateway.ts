import type { Command } from "commander";
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
    .description("Gateway 服务控制");

  gateway
    .command("start")
    .description("启动 Gateway 服务器")
    .option("-p, --port <port>", "端口号", "21000")
    .option("-h, --host <host>", "主机地址", "0.0.0.0")
    .option("-d, --data-dir <dir>", "数据目录", path.join(os.homedir(), ".secuclaw"))
    .option("--force", "强制启动，终止占用端口的进程", false)
    .action(async (opts: ServeOptions & { force: boolean }) => {
      const port = parseInt(String(opts.port) || "21000", 10);
      const host = opts.host || "0.0.0.0";
      const dataDir = opts.dataDir || path.join(os.homedir(), ".secuclaw");

      runtime.log(`\n🛡️  SecuClaw Gateway 启动中...`);
      runtime.log(`   端口: ${port}`);
      runtime.log(`   主机: ${host}`);
      runtime.log(`   数据目录: ${dataDir}`);

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

        runtime.log(`\n✅ Gateway 已启动`);
        runtime.log(`   HTTP: http://${host}:${port}`);
        runtime.log(`   WebSocket: ws://${host}:${port}`);
        runtime.log(`   健康检查: http://${host}:${port}/health`);
        runtime.log(`\n按 Ctrl+C 停止服务器`);

        process.on("SIGINT", async () => {
          runtime.log("\n\n🛑 正在关闭 Gateway...");
          await gateway.stop();
          runtime.log("✅ Gateway 已停止");
          process.exit(0);
        });
      } catch (err) {
        runtime.log(`\n❌ 启动失败: ${err}`);
        runtime.exit(1);
      }
    });

  gateway
    .command("stop")
    .description("停止 Gateway 服务器")
    .action(() => {
      runtime.log("使用 Ctrl+C 或关闭终端停止 Gateway");
      runtime.log("如需后台运行，请使用系统服务管理");
    });

  gateway
    .command("status")
    .description("查看 Gateway 状态")
    .action(() => {
      runtime.log("Gateway 状态检查需要服务器运行中");
      runtime.log("使用 'secuclaw gateway start' 启动服务器");
    });

  gateway
    .command("logs")
    .description("查看 Gateway 日志")
    .option("--follow", "实时日志", false)
    .option("--lines <n>", "行数", "50")
    .action((opts: { follow: boolean; lines: string }) => {
      runtime.log("日志功能需要服务器运行中");
      runtime.log("使用 'secuclaw gateway start' 启动服务器");
    });
}
