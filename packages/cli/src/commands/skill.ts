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
import { t } from "@esc/core/i18n";
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
      version: skill.content.frontmatter.version as string | undefined,
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
  builtin: "builtin",
  installed: "installed",
  custom: "custom",
};

const SOURCE_EMOJI: Record<SkillDirectorySource, string> = {
  builtin: "📦",
  installed: "✅",
  custom: "🔧",
};

export function registerSkillCommands(program: Command, runtime: RuntimeEnv): void {
  const skill = program.command("skill").description(t("skill.title"));

  skill
    .command("list")
    .description(t("skill.list"))
    .option("--json", "JSON output", false)
    .option("-v, --verbose", "Verbose", false)
    .option("--visualizations", t("skill.visualizations"), false)
    .action((opts: { json: boolean; verbose: boolean; visualizations: boolean }) => {
      const skills = getAllSkills();

      if (opts.json) {
        runtime.log(JSON.stringify(skills, null, 2));
        return;
      }

      runtime.log(`\n📋 ${t("skill.registered")}`);
      runtime.log("━".repeat(50));

      if (skills.length === 0) {
        runtime.log(`\n⚠️  ${t("skill.notFound")}`);
        runtime.log(`\n${t("skill.tip")}: ${t("skill.useDirsCommand")}`);
        return;
      }

      const showViz = opts.visualizations || opts.verbose;

      for (const skill of skills) {
        const sourceEmoji = SOURCE_EMOJI[skill.source];
        const sourceLabel = SOURCE_LABELS[skill.source];
        const vizBadge = skill.hasVisualizations ? `📊 ${skill.visualizationCount} ${t("skill.visualizations")}` : "";

        runtime.log(`\n  ${sourceEmoji} ${skill.name}`);
        if (opts.verbose) {
          runtime.log(`     ${t("skill.source")}: ${sourceLabel}`);
          runtime.log(`     ${t("skill.path")}: ${skill.path}`);
          if (skill.version) runtime.log(`     ${t("skill.version")}: ${skill.version}`);
          if (skill.description) runtime.log(`     ${t("skill.description")}: ${skill.description}`);
          if (showViz) runtime.log(`     ${t("skill.visualizations")}: ${vizBadge || t("skill.noVisualizations")}`);
        } else {
          const info = [sourceLabel, skill.version, showViz ? vizBadge : ""].filter(Boolean).join(" | ");
          runtime.log(`     ${info}`);
          if (skill.description) runtime.log(`     ${skill.description}`);
        }
      }

      const vizSkills = skills.filter(s => s.hasVisualizations);
      runtime.log(`  ${t("skill.totalCount")}: ${skills.length}`);
      if (showViz) {
        runtime.log(`  ${t("skill.supportVisualization")}: ${vizSkills.length}`);
      }
    });

  skill
    .command("dirs")
    .description(t("skill.dirs"))
    .option("--json", "JSON output", false)
    .action((opts: { json: boolean }) => {
      const directories = getSkillDirectories();

      if (opts.json) {
        runtime.log(JSON.stringify(directories, null, 2));
        return;
      }

      runtime.log(`\n📁 ${t("skill.dirs")}`);
      runtime.log("━".repeat(50));

      runtime.log(`\n${t("skill.directoryPriority")}:`);
      runtime.log(`  1. ${t("skill.envVariable")} SECUCLAW_SKILLS_DIR`);
      runtime.log(`  2. ${t("skill.configFile")} skillsDir`);
      runtime.log(`  3. ${t("skill.defaultDir")} ~/.secuclaw/skills`);
      runtime.log(`  4. ${t("skill.builtinDir")}`);

      runtime.log(`\n${t("skill.currentConfig")}:`);
      
      for (let i = 0; i < directories.length; i++) {
        const dir = directories[i];
        const num = i + 1;
        const existsEmoji = dir.exists ? "✅" : "❌";
        const sourceLabel = SOURCE_LABELS[dir.source];

        runtime.log(`\n  ${num}. ${sourceLabel} [${existsEmoji}]`);
        runtime.log(`     ${t("skill.path")}: ${dir.path}`);
        runtime.log(`     ${t("skill.directoryStatus")}: ${dir.exists ? t("skill.exists") : t("skill.notExists")}`);
        runtime.log(`     ${t("skill.skillCount")}: ${dir.skillCount}`);
      }

      const envDir = process.env.SECUCLAW_SKILLS_DIR;
      if (envDir) {
        runtime.log(`\n${t("skill.envVariable")}:`);
        runtime.log(`  SECUCLAW_SKILLS_DIR = ${envDir}`);
      }

      runtime.log(`\n${t("skill.defaultInstallDir")}:`);
      runtime.log(`  ${getDefaultSkillsDir()}`);
    });

  skill
    .command("show <name>")
    .description(t("skill.show"))
    .option("--json", "JSON output", false)
    .action((name: string, opts: { json: boolean }) => {
      const skills = getAllSkills();
      const skill = skills.find(s => s.name === name || s.name.toLowerCase() === name.toLowerCase());

      if (!skill) {
        runtime.log(`\n❌ ${t("skill.notFound")}: ${name}`);
        runtime.log(`\n${t("skill.useDirsCommand")}`);
        return;
      }

      if (opts.json) {
        runtime.log(JSON.stringify(skill, null, 2));
        return;
      }

      const sourceLabel = SOURCE_LABELS[skill.source];
      const sourceEmoji = SOURCE_EMOJI[skill.source];

      runtime.log(`\n${sourceEmoji} ${t("skill.skillDetails")}: ${skill.name}`);
      runtime.log("━".repeat(50));

      runtime.log(`\n  ${t("skill.name")}: ${skill.name}`);
      if (skill.description) runtime.log(`  ${t("skill.description")}: ${skill.description}`);
      if (skill.version) runtime.log(`  ${t("skill.version")}: ${skill.version}`);
      runtime.log(`  ${t("skill.source")}: ${sourceLabel}`);
      runtime.log(`  ${t("skill.path")}: ${skill.path}`);
      runtime.log(`  ${t("skill.visualizationSupport")}: ${skill.hasVisualizations ? t("common.yes") + ` (${skill.visualizationCount})` : t("common.no")}`);

      if (skill.hasVisualizations) {
        runtime.log(`\n  ${t("skill.visualizationConfigDir")}:`);
        runtime.log(`     ${skill.path}/visualizations/`);
        runtime.log(`     ${skill.path}/visualizations.yaml`);
        runtime.log(`     ${skill.path}/visualizations.json`);
      }
    });

  skill
    .command("viz <name>")
    .description(t("skill.viz"))
    .option("--json", "JSON output", false)
    .action((name: string, opts: { json: boolean }) => {
      const skills = getAllSkills();
      const skillInfo = skills.find(s => s.name === name || s.name.toLowerCase() === name.toLowerCase());

      if (!skillInfo) {
        runtime.log(`\n❌ ${t("skill.notFound")}: ${name}`);
        return;
      }

      const skill = loadSkillFromDir(skillInfo.path);
      if (!skill) {
        runtime.log(`\n❌ ${t("skill.createFailed")}: ${name}`);
        return;
      }

      const viz = loadSkillVisualizations(skill);
      if (!viz) {
        runtime.log(`\n⚠️  ${t("skill.noVisualizationConfig")}`);
        runtime.log(`\n${t("skill.visualizationConfigVia")}:`);
        runtime.log(`  1. ${t("skill.frontmatterField")}`);
        runtime.log(`  2. ${t("skill.yamlManifest")}`);
        runtime.log(`  3. ${t("skill.vizDirectory")}`);
        return;
      }

      if (opts.json) {
        runtime.log(JSON.stringify(viz, null, 2));
        return;
      }

      runtime.log(`\n📊 ${skill.name} - ${t("skill.viz")}`);
      runtime.log("━".repeat(50));

      runtime.log(`\n  ${t("skill.manifestVersion")}: ${viz.manifest.version}`);
      runtime.log(`  ${t("skill.loadedAt")}: ${viz.loadedAt.toISOString()}`);
      runtime.log(`  ${t("skill.visualizationCount")}: ${viz.manifest.visualizations.length}`);

      runtime.log(`\n  ${t("skill.visualizationList")}:`);
      
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
        runtime.log(`       ${t("skill.type")}: ${v.type} | ${t("skill.category")}: ${categoryBadge}`);
        runtime.log(`       ${t("skill.dataSource")}: ${v.dataSource}`);
        if (v.description) runtime.log(`       ${t("skill.description")}: ${v.description}`);
      }

      runtime.log(`\n  ${t("skill.configPath")}:`);
      runtime.log(`     ${skillInfo.path}/visualizations/`);
    });

  skill
    .command("install-dir")
    .description(t("skill.installDir"))
    .option("--set <path>", "Set new install directory")
    .action((opts: { set?: string }) => {
      if (opts.set) {
        const newPath = path.resolve(opts.set);
        
        if (!fs.existsSync(newPath)) {
          try {
            fs.mkdirSync(newPath, { recursive: true });
            runtime.log(`\n✅ ${t("skill.installDirCreated")}: ${newPath}`);
          } catch (err) {
            runtime.log(`\n❌ ${t("skill.installDirFailed")}: ${newPath}`);
            runtime.log(`   ${t("skill.createFailed")}: ${err}`);
            return;
          }
        }

        const dirInfo = getSkillDirectoryInfo(newPath, "custom");
        runtime.log(`\n📁 ${t("skill.installDirSet")}`);
        runtime.log("━".repeat(50));
        runtime.log(`\n  ${t("skill.path")}: ${newPath}`);
        runtime.log(`  ${t("skill.exists")}: ${dirInfo.exists ? t("common.yes") : t("common.no")}`);
        runtime.log(`  ${t("skill.skillCount")}: ${dirInfo.skillCount}`);
        
        runtime.log(`\n${t("skill.tip")}: ${t("skill.setDefaultInstallDir")}:`);
        runtime.log(`  export SECUCLAW_SKILLS_DIR="${newPath}"`);
        runtime.log(`\n${t("skill.orInConfig")}:`);
        runtime.log(`  secuclaw config set skillsDir "${newPath}"`);
      } else {
        const defaultDir = getDefaultSkillsDir();
        const currentEnvDir = process.env.SECUCLAW_SKILLS_DIR;

        runtime.log(`\n📁 ${t("skill.installDir")}`);
        runtime.log("━".repeat(50));
        runtime.log(`\n  ${t("skill.defaultDir")}: ${defaultDir}`);
        
        if (currentEnvDir) {
          runtime.log(`  ${t("skill.envVariable")}: ${currentEnvDir}`);
        }

        const dirInfo = getSkillDirectoryInfo(defaultDir, "installed");
        if (dirInfo.exists) {
          runtime.log(`\n  ${t("skill.directoryStatus")}:`);
          runtime.log(`    ${t("skill.exists")}: ${t("common.yes")}`);
          runtime.log(`    ${t("skill.skillCount")}: ${dirInfo.skillCount}`);
        } else {
          runtime.log(`\n  ${t("skill.directoryStatus")}: ${t("skill.notExists")}`);
          runtime.log(`\n  ${t("skill.useCommandCreate")}:`);
          runtime.log(`    secuclaw skill install-dir --set "${defaultDir}"`);
        }
      }
    });

  skill
    .command("create <name>")
    .description(t("skill.create"))
    .option("--dir <path>", "Directory to create", getDefaultSkillsDir())
    .option("--with-viz", "Include visualization template", true)
    .action((name: string, opts: { dir: string; withViz: boolean }) => {
      const skillDir = path.join(opts.dir, name);
      const skillFile = path.join(skillDir, "SKILL.md");

      if (fs.existsSync(skillDir)) {
        runtime.log(`\n❌ ${t("skill.createSkillExists")}: ${skillDir}`);
        return;
      }

      try {
        fs.mkdirSync(skillDir, { recursive: true });

        const skillContent = `---
name: ${name}
description: New visualization skill - please update description
version: "1.0.0"
author: ""
tags: [security, visualization]
visualizations:
  mode: hybrid
  inline:
    - id: example-chart
      name: "Example Chart"
      description: "This is an example visualization config"
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

Please write detailed skill description here.

## Features

- Feature 1
- Feature 2

## Usage

Describe how to use this skill.

## Visualizations

This skill supports the following visualizations:

1. **Example Chart** - Data display

## Data Sources

- \`example.data\` - Example data source
`;

        fs.writeFileSync(skillFile, skillContent, "utf-8");

        if (opts.withViz) {
          const vizDir = path.join(skillDir, "visualizations");
          fs.mkdirSync(vizDir, { recursive: true });

          const exampleViz = {
            id: "example-visualization",
            name: "Example Visualization",
            description: "This is a standalone visualization config file example",
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

        runtime.log(`\n✅ ${t("skill.createSuccess")}`);
        runtime.log("━".repeat(50));
        runtime.log(`\n  ${t("skill.name")}: ${name}`);
        runtime.log(`  ${t("skill.path")}: ${skillDir}`);
        runtime.log(`  File: ${skillFile}`);
        
        if (opts.withViz) {
          runtime.log(`  ${t("skill.visualizations")}: visualizations/example-visualization.json`);
        }

        runtime.log(`\n${t("skill.nextSteps")}:`);
        runtime.log(`  1. ${t("skill.editSkillFile")}`);
        runtime.log(`  2. ${t("skill.addVizDirectory")}`);
        runtime.log(`  3. ${t("skill.runShowCommand", { name })}`);

      } catch (err) {
        runtime.log(`\n❌ ${t("skill.createFailed")}: ${err}`);
      }
    });

    skill
      .command("market")
    .description(t("skill.market"))
    .option("--search <query>", "Search skills")
    .option("--category <category>", "Filter by category")
    .option("--sort <field>", "Sort field (downloads|rating|updated|name)", "downloads")
    .option("--limit <n>", "Result count", "20")
    .option("--json", "JSON output")
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
      
      runtime.log(`\n🏪 ${t("skill.market")}`);
      runtime.log("━".repeat(50));
      
      if (result.skills.length === 0) {
        runtime.log(`\n${t("skill.noMatchingSkills")}`);
        return;
      }
      
      for (const s of result.skills) {
        const installedBadge = s.installed ? "✅" : "  ";
        const updateBadge = s.hasUpdate ? "🔄" : "";
        const rating = "⭐".repeat(Math.round(s.rating));
        
        runtime.log(`\n  ${installedBadge} ${s.name} ${updateBadge}`);
        runtime.log(`     ${s.description.slice(0, 60)}${s.description.length > 60 ? "..." : ""}`);
        runtime.log(`     ${t("skill.version")}: ${s.version} | Downloads: ${s.downloads} | ${rating}`);
        runtime.log(`     Author: ${s.author}`);
      }
      
      runtime.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      runtime.log(`  ${t("skill.foundSkills", { total: result.total, count: result.skills.length })}`);
      runtime.log(`\n${t("skill.useInstallCommand")}`);
    });
}
