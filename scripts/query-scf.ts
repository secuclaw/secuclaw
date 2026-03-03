#!/usr/bin/env bun
/**
 * SCF 知识库查询工具
 *
 * 使用方式:
 *   bun query-scf.ts --domain GOV          # 查询特定域
 *   bun query-scf.ts --control GOV-01      # 查询特定控制
 *   bun query-scf.ts --search "governance" # 搜索关键词
 *   bun query-scf.ts --domains             # 列出所有域
 *   bun query-scf.ts --stats               # 显示统计信息
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SCF_DATA_DIR = path.join(process.cwd(), "data", "scf", "sheets");
const CONTROLS_FILE = path.join(SCF_DATA_DIR, "scf-20254.json");
const DOMAINS_FILE = path.join(SCF_DATA_DIR, "scf-domains-principles.json");

interface SCFControl {
  "SCF #": string;
  "SCF Control": string;
  "SCF Domain": string;
  "Secure Controls Framework (SCF)\r\nControl Description": string;
  "NIST CSF\r\nFunction Grouping"?: string;
  "Relative Control Weighting"?: number;
  [key: string]: any;
}

interface SCFDomain {
  "# ": number;
  "SCF Domain": string;
  "SCF Identifier": string;
  "Cybersecurity & Data Privacy by Design (C|P) Principles": string;
  "Principle Intent": string;
}

function loadControls(): SCFControl[] {
  if (!fs.existsSync(CONTROLS_FILE)) {
    console.error(`❌ 控制文件不存在: ${CONTROLS_FILE}`);
    process.exit(1);
  }
  const content = fs.readFileSync(CONTROLS_FILE, "utf-8");
  return JSON.parse(content);
}

function loadDomains(): SCFDomain[] {
  if (!fs.existsSync(DOMAINS_FILE)) {
    console.error(`❌ 域文件不存在: ${DOMAINS_FILE}`);
    process.exit(1);
  }
  const content = fs.readFileSync(DOMAINS_FILE, "utf-8");
  return JSON.parse(content);
}

function listDomains(): void {
  const domains = loadDomains();
  console.log("\n📋 SCF 控制域列表:\n");
  domains.forEach((domain) => {
    console.log(`   ${domain["SCF Identifier"]} - ${domain["SCF Domain"]}`);
  });
  console.log(`\n总计: ${domains.length} 个域\n`);
}

function showStats(): void {
  const controls = loadControls();
  const domains = loadDomains();

  // 统计每个域的控制数量
  const domainCounts: Record<string, number> = {};
  controls.forEach((control) => {
    const domainCode = control["SCF #"].split("-")[0];
    domainCounts[domainCode] = (domainCounts[domainCode] || 0) + 1;
  });

  console.log("\n📊 SCF 2025.4 统计信息\n");
  console.log(`   总控制数: ${controls.length}`);
  console.log(`   总域数: ${domains.length}`);
  console.log(`   总行数: ${controls.length + domains.length}`);
  console.log("\n   各域控制数量:");
  Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([code, count]) => {
      const domain = domains.find((d) => d["SCF Identifier"] === code);
      console.log(`      ${code}: ${count.toString().padStart(4)} - ${domain?.["SCF Domain"] || "Unknown"}`);
    });
  console.log("");
}

function queryByDomain(domainCode: string): void {
  const controls = loadControls();
  const domains = loadDomains();

  const domainInfo = domains.find((d) => d["SCF Identifier"].toUpperCase() === domainCode.toUpperCase());
  if (!domainInfo) {
    console.error(`❌ 未找到域: ${domainCode}`);
    process.exit(1);
  }

  const domainControls = controls.filter((c) => c["SCF #"].toUpperCase().startsWith(domainCode.toUpperCase()));

  console.log(`\n🔍 域: ${domainInfo["SCF Domain"]} (${domainInfo["SCF Identifier"]})`);
  console.log(`📝 原则: ${domainInfo["Cybersecurity & Data Privacy by Design (C|P) Principles"]}\n`);
  console.log(`📊 控制项 (${domainControls.length} 个):\n`);

  domainControls.forEach((control) => {
    console.log(`   ${control["SCF #"]} - ${control["SCF Control"]}`);
    if (control["Relative Control Weighting"]) {
      console.log(`      权重: ${control["Relative Control Weighting"]}`);
    }
  });
  console.log("");
}

function queryByControl(controlId: string): void {
  const controls = loadControls();
  const control = controls.find((c) => c["SCF #"].toUpperCase() === controlId.toUpperCase());

  if (!control) {
    console.error(`❌ 未找到控制: ${controlId}`);
    process.exit(1);
  }

  console.log(`\n🔍 SCF 控制: ${control["SCF #"]}\n`);
  console.log(`📝 名称: ${control["SCF Control"]}`);
  console.log(`🏷️  域: ${control["SCF Domain"]}`);
  console.log(`⚖️  权重: ${control["Relative Control Weighting"] || "N/A"}`);

  if (control["NIST CSF\r\nFunction Grouping"]) {
    console.log(`📊 NIST CSF: ${control["NIST CSF\r\nFunction Grouping"]}`);
  }

  const description = control["Secure Controls Framework (SCF)\r\nControl Description"];
  if (description) {
    console.log(`\n📖 描述:\n   ${description.replace(/\r\n/g, "\n   ").substring(0, 300)}...`);
  }

  console.log("");
}

function searchControls(keyword: string): void {
  const controls = loadControls();
  const lowerKeyword = keyword.toLowerCase();

  const results = controls.filter(
    (c) =>
      c["SCF #"].toLowerCase().includes(lowerKeyword) ||
      c["SCF Control"].toLowerCase().includes(lowerKeyword) ||
      c["SCF Domain"].toLowerCase().includes(lowerKeyword) ||
      (c["Secure Controls Framework (SCF)\r\nControl Description"]?.toLowerCase().includes(lowerKeyword))
  );

  console.log(`\n🔍 搜索结果: "${keyword}" (${results.length} 个)\n`);

  results.slice(0, 20).forEach((control) => {
    console.log(`   ${control["SCF #"]} - ${control["SCF Control"]} [${control["SCF Domain"]}]`);
  });

  if (results.length > 20) {
    console.log(`\n   ... 还有 ${results.length - 20} 个结果`);
  }
  console.log("");
}

// CLI 解析
const args = process.argv.slice(2);
const command = args[0];
const value = args[1];

switch (command) {
  case "--domains":
  case "-d":
    listDomains();
    break;

  case "--stats":
  case "-s":
    showStats();
    break;

  case "--domain":
    if (!value) {
      console.error("❌ 请指定域代码，例如: --domain GOV");
      process.exit(1);
    }
    queryByDomain(value);
    break;

  case "--control":
  case "-c":
    if (!value) {
      console.error("❌ 请指定控制ID，例如: --control GOV-01");
      process.exit(1);
    }
    queryByControl(value);
    break;

  case "--search":
  case "-q":
    if (!value) {
      console.error("❌ 请指定搜索关键词，例如: --search governance");
      process.exit(1);
    }
    searchControls(value);
    break;

  case "--help":
  case "-h":
    console.log(`
SCF 知识库查询工具

使用方式:
  bun query-scf.ts --domains              列出所有域
  bun query-scf.ts --stats                显示统计信息
  bun query-scf.ts --domain <CODE>        查询特定域的控制 (例如: GOV)
  bun query-scf.ts --control <ID>         查询特定控制 (例如: GOV-01)
  bun query-scf.ts --search <KEYWORD>     搜索关键词
  bun query-scf.ts --help                 显示帮助信息

示例:
  bun query-scf.ts --domains
  bun query-scf.ts --domain GOV
  bun query-scf.ts --control GOV-01
  bun query-scf.ts --search "governance"
`);
    break;

  default:
    console.error("❌ 未知命令。使用 --help 查看帮助信息。");
    process.exit(1);
}
