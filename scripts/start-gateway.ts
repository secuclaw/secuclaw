#!/usr/bin/env bun
import { Gateway } from "../packages/core/src/gateway/wrapper.js";
import { ConfigManager } from "../packages/core/src/config/manager.js";
import { SkillLoader } from "../packages/core/src/skills/loader-class.js";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const port = 21000;
  const host = "0.0.0.0";
  const dataDir = path.join(os.homedir(), ".secuclaw");
  const projectDataDir = path.join(__dirname, "..", "data");

  console.log(`\n🛡️  SecuClaw Gateway 启动中...`);
  console.log(`   端口: ${port}`);
  console.log(`   主机: ${host}`);
  console.log(`   数据目录: ${dataDir}`);
  console.log(`   项目数据目录: ${projectDataDir}`);

  try {
    const configManager = new ConfigManager(path.join(dataDir, "config"));
    await configManager.load();

    const skillLoader = new SkillLoader(path.join(dataDir, "skills"));
    await skillLoader.loadAll();

    const webDistDir = path.join(__dirname, "..", "packages", "web", "dist");

    const gateway = new Gateway({
      port,
      host,
      dataDir,
      projectDataDir,
      configManager,
      skillLoader,
      webDistDir,
    });

    await gateway.start();

    console.log(`\n✅ Gateway 已启动`);
    console.log(`   HTTP: http://${host}:${port}`);
    console.log(`   WebSocket: ws://${host}:${port}/ws`);
    console.log(`   健康检查: http://localhost:${port}/health`);
    console.log(`\n按 Ctrl+C 停止服务器`);

    process.on("SIGINT", async () => {
      console.log("\n\n🛑 正在关闭 Gateway...");
      await gateway.stop();
      console.log("✅ Gateway 已停止");
      process.exit(0);
    });
  } catch (err) {
    console.error(`\n❌ 启动失败:`, err);
    process.exit(1);
  }
}

main();
