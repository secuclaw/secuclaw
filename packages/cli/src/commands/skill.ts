import type { Command } from "commander";
import type { RuntimeEnv } from "../runtime.js";
import fs from "node:fs";
import path from "node:path";
import {
  getDefaultSkillsDir,
  getBuiltinSkillsDir,
  getSkillDirectories,
  getSkillDirectoryInfo,
  ensureSkillsDirExists,
  getSkillInstallPath,
  isSkillInstalled,
  type SkillDirectorySource,
} from "@esc/core/skills/paths";
import { loadSkillFromDir, listSkillDirectories } from "@esc/core/skills/loader";
import { loadSkillVisualizations } from "@esc/core/skills/visualization-loader";

interface SkillInfo {
  name: string;
  description?: string;
  version?: string;
  source: SkillDirectorySource;
  path: string;
  hasVisualizations: boolean;
  visualizationCount: number;
}

function getSkillsFromDirectory(dirPath: string, source: SkillDirectorySource): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const dirs = listSkillDirectories(dirPath);

  for (const dir of dirs) {
    const skill = loadSkillFromDir(dir);
    if (!skill) continue;

    const viz = loadSkillVisualizations(skill);
    const vizCount = viz?.manifest.visualizations.length || 0;

    skills.push({
      name: skill.name,
      description: skill.description,
      version: skill.content.frontmatter.version,
      source,
      path: dir,
      hasVisualizations: vizCount > 0,
      visualizationCount: vizCount,
    });
  }

  return skills;
}

function getAllSkills(customDir?: string): SkillInfo[] {
  const allSkills: SkillInfo[] = [];
  const seenNames = new Set<string>();

  const directories = getSkillDirectories(customDir);

  for (const dir of directories) {
    if (!dir.exists) continue;

    const skills = getSkillsFromDirectory(dir.path, dir.source);
    for (const skill of skills) {
      if (!seenNames.has(skill.name)) {
        seenNames.add(skill.name);
        allSkills.push(skill);
      }
    }
  }

  return allSkills;
}

const SOURCE_LABELS: Record<SkillDirectorySource, string> = {
  builtin: "内置",
  installed: "已安装",
  custom: "自定义",
};

const SOURCE_EMOJI: Record<SkillDirectorySource, string> = {
  builtin: "📦",
  installed: "✅",
  custom: "🔧",
};

export function registerSkillCommands(program: Command, runtime: RuntimeEnv): void {
  const skill = program.command("skill").description("技能管理命令");

  skill
    .command("list")
    .description("列出所有可用技能")
    .option("--json", "输出JSON格式", false)
    .option("-v, --verbose", "显示详细信息", false)
    .option("--visualizations", "显示可视化支持状态", false)
    .action((opts: { json: boolean; verbose: boolean; visualizations: boolean }) => {
      const skills = getAllSkills();

      if (opts.json) {
        runtime.log(JSON.stringify(skills, null, 2));
        return;
      }

      runtime.log("\n📋 已注册技能列表");
      runtime.log("━".repeat(50));

      if (skills.length === 0) {
        runtime.log("\n⚠️  未找到任何技能");
        runtime.log("\n提示: 使用 'secuclaw skill dirs' 查看技能目录");
        return;
      }

      const showViz = opts.visualizations || opts.verbose;

      for (const skill of skills) {
        const sourceEmoji = SOURCE_EMOJI[skill.source];
        const sourceLabel = SOURCE_LABELS[skill.source];
        const vizBadge = skill.hasVisualizations ? `📊 ${skill.visualizationCount}个可视化` : "";

        runtime.log(`\n  ${sourceEmoji} ${skill.name}`);
        if (opts.verbose) {
          runtime.log(`     来源: ${sourceLabel}`);
          runtime.log(`     路径: ${skill.path}`);
          if (skill.version) runtime.log(`     版本: ${skill.version}`);
          if (skill.description) runtime.log(`     描述: ${skill.description}`);
          if (showViz) runtime.log(`     可视化: ${vizBadge || "无"}`);
        } else {
          const info = [sourceLabel, skill.version, showViz ? vizBadge : ""].filter(Boolean).join(" | ");
          runtime.log(`     ${info}`);
          if (skill.description) runtime.log(`     ${skill.description}`);
        }
      }

      const vizSkills = skills.filter(s => s.hasVisualizations);
      runtime.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      runtime.log(`  总计: ${skills.length} 个技能`);
      if (showViz) {
        runtime.log(`  支持可视化: ${vizSkills.length} 个`);
      }
    });

  skill
    .command("dirs")
    .description("显示技能目录配置")
    .option("--json", "输出JSON格式", false)
    .action((opts: { json: boolean }) => {
      const directories = getSkillDirectories();

      if (opts.json) {
        runtime.log(JSON.stringify(directories, null, 2));
        return;
      }

      runtime.log("\n📁 技能目录配置");
      runtime.log("━".repeat(50));

      runtime.log("\n目录优先级（从高到低）:");
      runtime.log("  1. 环境变量 SECUCLAW_SKILLS_DIR");
      runtime.log("  2. 配置文件 skillsDir 设置");
      runtime.log("  3. 默认目录 ~/.secuclaw/skills");
      runtime.log("  4. 内置技能目录");

      runtime.log("\n当前配置:");
      
      for (let i = 0; i < directories.length; i++) {
        const dir = directories[i];
        const num = i + 1;
        const existsEmoji = dir.exists ? "✅" : "❌";
        const sourceLabel = SOURCE_LABELS[dir.source];

        runtime.log(`\n  ${num}. ${sourceLabel} [${existsEmoji}]`);
        runtime.log(`     路径: ${dir.path}`);
        runtime.log(`     状态: ${dir.exists ? "存在" : "不存在"}`);
        runtime.log(`     技能数: ${dir.skillCount}`);
      }

      const envDir = process.env.SECUCLAW_SKILLS_DIR;
      if (envDir) {
        runtime.log(`\n环境变量:`);
        runtime.log(`  SECUCLAW_SKILLS_DIR = ${envDir}`);
      }

      runtime.log(`\n默认安装目录:`);
      runtime.log(`  ${getDefaultSkillsDir()}`);
    });

  skill
    .command("show <name>")
    .description("显示技能详细信息")
    .option("--json", "输出JSON格式", false)
    .action((name: string, opts: { json: boolean }) => {
      const skills = getAllSkills();
      const skill = skills.find(s => s.name === name || s.name.toLowerCase() === name.toLowerCase());

      if (!skill) {
        runtime.log(`\n❌ 未找到技能: ${name}`);
        runtime.log("\n使用 'secuclaw skill list' 查看所有可用技能");
        return;
      }

      if (opts.json) {
        runtime.log(JSON.stringify(skill, null, 2));
        return;
      }

      const sourceLabel = SOURCE_LABELS[skill.source];
      const sourceEmoji = SOURCE_EMOJI[skill.source];

      runtime.log(`\n${sourceEmoji} 技能详情: ${skill.name}`);
      runtime.log("━".repeat(50));

      runtime.log(`\n  名称: ${skill.name}`);
      if (skill.description) runtime.log(`  描述: ${skill.description}`);
      if (skill.version) runtime.log(`  版本: ${skill.version}`);
      runtime.log(`  来源: ${sourceLabel}`);
      runtime.log(`  路径: ${skill.path}`);
      runtime.log(`  可视化支持: ${skill.hasVisualizations ? `是 (${skill.visualizationCount}个)` : "否"}`);

      if (skill.hasVisualizations) {
        runtime.log(`\n  可视化配置目录:`);
        runtime.log(`     ${skill.path}/visualizations/`);
        runtime.log(`     ${skill.path}/visualizations.yaml`);
        runtime.log(`     ${skill.path}/visualizations.json`);
      }
    });

  skill
    .command("viz <name>")
    .description("显示技能的可视化配置")
    .option("--json", "输出JSON格式", false)
    .action((name: string, opts: { json: boolean }) => {
      const skills = getAllSkills();
      const skillInfo = skills.find(s => s.name === name || s.name.toLowerCase() === name.toLowerCase());

      if (!skillInfo) {
        runtime.log(`\n❌ 未找到技能: ${name}`);
        return;
      }

      const skill = loadSkillFromDir(skillInfo.path);
      if (!skill) {
        runtime.log(`\n❌ 无法加载技能: ${name}`);
        return;
      }

      const viz = loadSkillVisualizations(skill);
      if (!viz) {
        runtime.log(`\n⚠️  技能 ${name} 没有可视化配置`);
        runtime.log("\n可视化配置可通过以下方式定义:");
        runtime.log("  1. SKILL.md frontmatter 中的 visualizations 字段");
        runtime.log("  2. visualizations.yaml 清单文件");
        runtime.log("  3. visualizations/ 目录下的 .json/.yaml 文件");
        return;
      }

      if (opts.json) {
        runtime.log(JSON.stringify(viz, null, 2));
        return;
      }

      runtime.log(`\n📊 ${skill.name} - 可视化配置`);
      runtime.log("━".repeat(50));

      runtime.log(`\n  清单版本: ${viz.manifest.version}`);
      runtime.log(`  加载时间: ${viz.loadedAt.toISOString()}`);
      runtime.log(`  可视化数量: ${viz.manifest.visualizations.length}`);

      runtime.log(`\n  可视化列表:`);
      
      for (const v of viz.manifest.visualizations) {
        const typeEmoji: Record<string, string> = {
          chart: "📈",
          table: "📋",
          timeline: "⏱️",
          graph: "🔗",
          map: "🗺️",
          gauge: "📊",
          heatmap: "🌡️",
          treemap: "🌳",
          sankey: "↔️",
          custom: "⚙️",
        };
        const emoji = typeEmoji[v.type] || "📊";
        const categoryBadge = v.category || "widget";

        runtime.log(`\n    ${emoji} ${v.name} (${v.id})`);
        runtime.log(`       类型: ${v.type} | 类别: ${categoryBadge}`);
        runtime.log(`       数据源: ${v.dataSource}`);
        if (v.description) runtime.log(`       描述: ${v.description}`);
      }

      runtime.log(`\n  配置路径:`);
      runtime.log(`     ${skillInfo.path}/visualizations/`);
    });

  skill
    .command("install-dir")
    .description("显示或设置技能安装目录")
    .option("--set <path>", "设置新的安装目录")
    .action((opts: { set?: string }) => {
      if (opts.set) {
        const newPath = path.resolve(opts.set);
        
        if (!fs.existsSync(newPath)) {
          try {
            fs.mkdirSync(newPath, { recursive: true });
            runtime.log(`\n✅ 已创建目录: ${newPath}`);
          } catch (err) {
            runtime.log(`\n❌ 无法创建目录: ${newPath}`);
            runtime.log(`   错误: ${err}`);
            return;
          }
        }

        const dirInfo = getSkillDirectoryInfo(newPath, "custom");
        runtime.log(`\n📁 技能安装目录已设置`);
        runtime.log("━".repeat(50));
        runtime.log(`\n  路径: ${newPath}`);
        runtime.log(`  存在: ${dirInfo.exists ? "是" : "否"}`);
        runtime.log(`  技能数: ${dirInfo.skillCount}`);
        
        runtime.log(`\n提示: 设置环境变量以持久化配置:`);
        runtime.log(`  export SECUCLAW_SKILLS_DIR="${newPath}"`);
        runtime.log(`\n或在配置文件中设置:`);
        runtime.log(`  secuclaw config set skillsDir "${newPath}"`);
      } else {
        const defaultDir = getDefaultSkillsDir();
        const currentEnvDir = process.env.SECUCLAW_SKILLS_DIR;

        runtime.log(`\n📁 技能安装目录配置`);
        runtime.log("━".repeat(50));
        runtime.log(`\n  默认目录: ${defaultDir}`);
        
        if (currentEnvDir) {
          runtime.log(`  环境变量: ${currentEnvDir}`);
        }

        const dirInfo = getSkillDirectoryInfo(defaultDir, "installed");
        if (dirInfo.exists) {
          runtime.log(`\n  目录状态:`);
          runtime.log(`    存在: 是`);
          runtime.log(`    技能数: ${dirInfo.skillCount}`);
        } else {
          runtime.log(`\n  目录状态: 不存在`);
          runtime.log(`\n  使用以下命令创建:`);
          runtime.log(`    secuclaw skill install-dir --set "${defaultDir}"`);
        }
      }
    });

  skill
    .command("create <name>")
    .description("创建新的可视化技能模板")
    .option("--dir <path>", "指定创建目录", getDefaultSkillsDir())
    .option("--with-viz", "包含可视化模板", true)
    .action((name: string, opts: { dir: string; withViz: boolean }) => {
      const skillDir = path.join(opts.dir, name);
      const skillFile = path.join(skillDir, "SKILL.md");

      if (fs.existsSync(skillDir)) {
        runtime.log(`\n❌ 技能目录已存在: ${skillDir}`);
        return;
      }

      try {
        fs.mkdirSync(skillDir, { recursive: true });

        const skillContent = `---
name: ${name}
description: 新建可视化技能 - 请更新描述
version: "1.0.0"
author: ""
tags: [security, visualization]
visualizations:
  mode: hybrid
  inline:
    - id: example-chart
      name: "示例图表"
      description: "这是一个示例可视化配置"
      type: chart
      category: widget
      dataSource: example.data
      config:
        chart:
          subType: bar
      layout:
        width: 100%
        height: 300
---

# ${name}

请在此处编写技能的详细说明。

## 功能

- 功能1
- 功能2

## 使用方法

描述如何使用这个技能。

## 可视化

此技能支持以下可视化:

1. **示例图表** - 数据展示

## 数据源

- \`example.data\` - 示例数据源
`;

        fs.writeFileSync(skillFile, skillContent, "utf-8");

        if (opts.withViz) {
          const vizDir = path.join(skillDir, "visualizations");
          fs.mkdirSync(vizDir, { recursive: true });

          const exampleViz = {
            id: "example-visualization",
            name: "示例可视化",
            description: "这是一个独立的可视化配置文件示例",
            type: "chart",
            category: "widget",
            dataSource: "example.metrics",
            config: {
              chart: {
                subType: "line",
              },
            },
            layout: {
              width: "100%",
              height: 250,
            },
          };

          fs.writeFileSync(
            path.join(vizDir, "example-visualization.json"),
            JSON.stringify(exampleViz, null, 2),
            "utf-8"
          );
        }

        runtime.log(`\n✅ 技能模板已创建`);
        runtime.log("━".repeat(50));
        runtime.log(`\n  名称: ${name}`);
        runtime.log(`  路径: ${skillDir}`);
        runtime.log(`  文件: ${skillFile}`);
        
        if (opts.withViz) {
          runtime.log(`  可视化: visualizations/example-visualization.json`);
        }

        runtime.log(`\n下一步:`);
        runtime.log(`  1. 编辑 SKILL.md 添加技能内容`);
        runtime.log(`  2. 在 visualizations/ 目录添加可视化配置`);
        runtime.log(`  3. 运行 'secuclaw skill show ${name}' 查看结果`);

      } catch (err) {
        runtime.log(`\n❌ 创建失败: ${err}`);
      }
    });

    skill
      .command("market")
    .description("访问SecuHub技能市场")
    .option("--search <query>", "搜索技能")
    .option("--category <category>", "按类别筛选")
    .option("--sort <field>", "排序字段 (downloads|rating|updated|name)", "downloads")
    .option("--limit <n>", "结果数量", "20")
    .option("--json", "JSON输出")
    .action(async (opts: { search?: string; category?: string; sort?: string; limit?: string; json?: boolean }) => {
      const { skillMarketService } = await import("@esc/core/skills/market-service");
      
      const searchOpts: import("@esc/core/skills/market-service").MarketSearchOptions = {
        query: opts.search,
        category: opts.category,
        sortBy: opts.sort as "downloads" | "rating" | "updated" | "name",
        limit: opts.limit ? parseInt(opts.limit, 10) : 20,
      };
      
      const result = await skillMarketService.search(searchOpts);
      
      if (opts.json) {
        runtime.log(JSON.stringify(result, null, 2));
        return;
      }
      
      runtime.log("\n🏪 SecuHub 技能市场");
      runtime.log("━".repeat(50));
      
      if (result.skills.length === 0) {
        runtime.log("\n未找到匹配的技能");
        return;
      }
      
      for (const s of result.skills) {
        const installedBadge = s.installed ? "✅" : "  ";
        const updateBadge = s.hasUpdate ? "🔄" : "";
        const rating = "⭐".repeat(Math.round(s.rating));
        
        runtime.log(`\n  ${installedBadge} ${s.name} ${updateBadge}`);
        runtime.log(`     ${s.description.slice(0, 60)}${s.description.length > 60 ? "..." : ""}`);
        runtime.log(`     版本: ${s.version} | 下载: ${s.downloads} | ${rating}`);
        runtime.log(`     作者: ${s.author}`);
      }
      
      runtime.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      runtime.log(`  找到 ${result.total} 个技能 (显示 ${result.skills.length} 个)`);
      runtime.log(`\n使用 'secuclaw skill install <name>' 安装技能`);
    });
}
