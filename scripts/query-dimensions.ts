#!/usr/bin/env bun
/**
 * SCF 多维度查询工具
 *
 * 支持跨多个 JSON 维度的联合查询
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SCF_DATA_DIR = "/Users/huangzhou/Documents/work/ai_secuclaw/secuclaw/data/scf";

// 数据缓存
const dataCache = new Map<string, any>();

function loadData(fileName: string): any[] {
  if (dataCache.has(fileName)) {
    return dataCache.get(fileName);
  }

  const filePath = path.join(SCF_DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${fileName}`);
    return [];
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  dataCache.set(fileName, data);
  return data;
}

// 清理文本中的换行符
function cleanText(text: string): string {
  return text?.replace(/\r\n/g, " ").replace(/\n/g, " ").trim() || "";
}

// 显示分隔线
function separator() {
  console.log("\n" + "─".repeat(80) + "\n");
}

// ========== 查询命令 ==========

// 1. 按控制域查询
function queryByDomain(domainCode: string) {
  console.log(`\n🔍 查询控制域: ${domainCode}\n`);

  // 加载控制域定义
  const domains = loadData("scf-domains-principles.json");
  const domain = domains.find((d: any) => d["SCF Identifier"]?.toUpperCase() === domainCode.toUpperCase());

  if (!domain) {
    console.error(`❌ 未找到域: ${domainCode}`);
    return;
  }

  console.log("📋 域信息:");
  console.log(`   名称: ${domain["SCF Domain"]}`);
  console.log(`   标识符: ${domain["SCF Identifier"]}`);
  console.log(`   原则: ${cleanText(domain["Cybersecurity & Data Privacy by Design (C|P) Principles"]).substring(0, 100)}...`);
  console.log(`   意图: ${cleanText(domain["Principle Intent"]).substring(0, 100)}...`);

  // 加载该域的控制
  const controls = loadData("scf-20254.json");
  const domainControls = controls.filter((c: any) => c["SCF #"]?.startsWith(domainCode.toUpperCase()));

  console.log(`\n📊 包含的控制 (${domainControls.length} 个):`);
  domainControls.slice(0, 10).forEach((c: any) => {
    console.log(`   ${c["SCF #"]} - ${c["SCF Control"]}`);
  });

  if (domainControls.length > 10) {
    console.log(`   ... 还有 ${domainControls.length - 10} 个控制`);
  }

  // 显示统计
  const highWeight = domainControls.filter((c: any) => c["Relative Control Weighting"] >= 8).length;
  const mediumWeight = domainControls.filter((c: any) => c["Relative Control Weighting"] >= 5 && c["Relative Control Weighting"] < 8).length;

  console.log(`\n⚖️ 权重分布:`);
  console.log(`   高优先级 (≥8): ${highWeight}`);
  console.log(`   中优先级 (5-7): ${mediumWeight}`);
  console.log(`   标准优先级 (<5): ${domainControls.length - highWeight - mediumWeight}`);
}

// 2. 查询控制的完整信息
function queryControl(controlId: string) {
  console.log(`\n🔍 查询控制: ${controlId}\n`);

  const controls = loadData("scf-20254.json");
  const control = controls.find((c: any) => c["SCF #"]?.toUpperCase() === controlId.toUpperCase());

  if (!control) {
    console.error(`❌ 未找到控制: ${controlId}`);
    return;
  }

  console.log("📋 基本信息:");
  console.log(`   编号: ${control["SCF #"]}`);
  console.log(`   名称: ${control["SCF Control"]}`);
  console.log(`   域: ${control["SCF Domain"]}`);
  console.log(`   权重: ${control["Relative Control Weighting"] || "N/A"}`);

  if (control["NIST CSF\r\nFunction Grouping"]) {
    console.log(`   NIST 功能: ${control["NIST CSF\r\nFunction Grouping"]}`);
  }

  console.log(`\n📖 描述:`);
  const desc = cleanText(control["Secure Controls Framework (SCF)\r\nControl Description"]);
  console.log(`   ${desc.substring(0, 300)}...`);

  // 查找评估目标
  console.log(`\n📝 评估目标:`);
  const objectives = loadData("assessment-objectives-20254.json");
  const controlObjectives = objectives.filter((o: any) => o["SCF #"] === control["SCF #"]);
  console.log(`   找到 ${controlObjectives.length} 个评估目标`);

  // 查找证据请求
  if (control["Evidence Request List (ERL) #"]) {
    console.log(`\n📄 证据请求:`);
    const erlRefs = control["Evidence Request List (ERL) #"].split(/\r\n/).filter(Boolean);
    const evidenceList = loadData("evidence-request-list-20254.json");

    erlRefs.slice(0, 5).forEach((ref: string) => {
      const evidence = evidenceList.find((e: any) => e["ERL #"] === ref);
      if (evidence) {
        console.log(`   ${ref}: ${e["Area of Focus"]}`);
      }
    });

    if (erlRefs.length > 5) {
      console.log(`   ... 还有 ${erlRefs.length - 5} 个证据请求`);
    }
  }

  // 查找隐私原则
  console.log(`\n🔐 隐私原则:`);
  const privacy = loadData("data-privacy-mgmt-principles.json");
  const controlPrivacy = privacy.filter((p: any) => p["SCF #"] === control["SCF #"]);

  if (controlPrivacy.length > 0) {
    console.log(`   找到 ${controlPrivacy.length} 个相关隐私原则`);
    controlPrivacy.slice(0, 3).forEach((p: any) => {
      console.log(`   • ${p["Principle Name"]}`);
    });
  } else {
    console.log(`   无直接相关隐私原则`);
  }
}

// 3. 按框架查询
function queryByFramework(framework: string) {
  console.log(`\n🔍 查询框架: ${framework}\n`);

  const sources = loadData("authoritative-sources.json");
  const frameworkSources = sources.filter((s: any) =>
    s["Source"]?.toUpperCase().includes(framework.toUpperCase()) ||
    s["Authoritative Source - Law, Regulation or Framework (LRF)"]?.toUpperCase().includes(framework.toUpperCase())
  );

  if (frameworkSources.length === 0) {
    console.error(`❌ 未找到框架: ${framework}`);
    console.log(`\n💡 可用框架: NIST, ISO, PCI, CIS, SOC2, HIPAA, GDPR`);
    return;
  }

  console.log(`📚 框架信息:`);
  console.log(`   来源: ${framework}`);
  console.log(`   映射数: ${frameworkSources.length}`);

  // 统计地理分布
  const geoCount: Record<string, number> = {};
  frameworkSources.forEach((s: any) => {
    const geo = s["Geography"] || "Unknown";
    geoCount[geo] = (geoCount[geo] || 0) + 1;
  });

  console.log(`\n🌍 地理分布:`);
  Object.entries(geoCount).forEach(([geo, count]) => {
    console.log(`   ${geo}: ${count}`);
  });
}

// 4. 跨维度搜索
function searchAll(query: string) {
  console.log(`\n🔍 跨维度搜索: "${query}"\n`);

  const results: Record<string, any[]> = {};

  // 搜索控制
  const controls = loadData("scf-20254.json");
  results["controls"] = controls.filter((c: any) =>
    c["SCF #"]?.toUpperCase().includes(query.toUpperCase()) ||
    c["SCF Control"]?.toUpperCase().includes(query.toUpperCase()) ||
    c["SCF Domain"]?.toUpperCase().includes(query.toUpperCase())
  );

  // 搜索控制域
  const domains = loadData("scf-domains-principles.json");
  results["domains"] = domains.filter((d: any) =>
    d["SCF Domain"]?.toUpperCase().includes(query.toUpperCase()) ||
    d["SCF Identifier"]?.toUpperCase().includes(query.toUpperCase())
  );

  // 搜索隐私原则
  const privacy = loadData("data-privacy-mgmt-principles.json");
  results["privacy"] = privacy.filter((p: any) =>
    p["Principle Name"]?.toUpperCase().includes(query.toUpperCase())
  );

  // 显示结果
  let totalResults = 0;

  for (const [dimension, items] of Object.entries(results)) {
    if (items.length > 0) {
      console.log(`📁 ${dimension} (${items.length} 条结果):`);
      items.slice(0, 5).forEach((item: any) => {
        if (dimension === "controls") {
          console.log(`   ${item["SCF #"]} - ${item["SCF Control"]}`);
        } else if (dimension === "domains") {
          console.log(`   ${item["SCF Identifier"]} - ${item["SCF Domain"]}`);
        } else if (dimension === "privacy") {
          console.log(`   ${item["Principle Name"]}`);
        }
      });

      if (items.length > 5) {
        console.log(`   ... 还有 ${items.length - 5} 条`);
      }

      totalResults += items.length;
      console.log("");
    }
  }

  console.log(`📊 总计: ${totalResults} 条结果`);
}

// 5. 维度统计
function showDimensionStats() {
  console.log(`\n📊 SCF 知识库维度统计\n`);

  const files = [
    "scf-20254.json",
    "scf-domains-principles.json",
    "assessment-objectives-20254.json",
    "evidence-request-list-20254.json",
    "authoritative-sources.json",
    "data-privacy-mgmt-principles.json",
    "risk-catalog.json",
    "threat-catalog.json",
    "lists.json"
  ];

  let totalRecords = 0;
  let totalSize = 0;

  files.forEach(file => {
    const data = loadData(file);
    const stats = fs.statSync(path.join(SCF_DATA_DIR, file));
    const size = stats.size;

    totalRecords += data.length;
    totalSize += size;

    const sizeMB = (size / 1024 / 1024).toFixed(2);
    console.log(`📄 ${file}`);
    console.log(`   记录数: ${data.length.toLocaleString()}`);
    console.log(`   大小: ${sizeMB} MB`);
    console.log("");
  });

  console.log(`📊 汇总:`);
  console.log(`   维度数: ${files.length}`);
  console.log(`   总记录: ${totalRecords.toLocaleString()}`);
  console.log(`   总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

// ========== 主程序 ==========

const args = process.argv.slice(2);
const command = args[0];
const value = args[1];

switch (command) {
  case "domain":
  case "-d":
  case "--domain":
    if (!value) {
      console.error("❌ 请指定域代码，例如: --domain GOV");
      process.exit(1);
    }
    queryByDomain(value);
    break;

  case "control":
  case "-c":
  case "--control":
    if (!value) {
      console.error("❌ 请指定控制ID，例如: --control GOV-01");
      process.exit(1);
    }
    queryControl(value);
    break;

  case "framework":
  case "-f":
  case "--framework":
    if (!value) {
      console.error("❌ 请指定框架，例如: --framework NIST");
      process.exit(1);
    }
    queryByFramework(value);
    break;

  case "search":
  case "-s":
  case "--search":
    if (!value) {
      console.error("❌ 请指定搜索关键词，例如: --search governance");
      process.exit(1);
    }
    searchAll(value);
    break;

  case "stats":
  case "--stats":
  case "-stats":
    showDimensionStats();
    break;

  case "help":
  case "--help":
  case "-h":
    console.log(`
SCF 多维度查询工具

使用方式:
  bun query-dimensions.ts --domain <CODE>      查询控制域 (例如: GOV)
  bun query-dimensions.ts --control <ID>       查询控制 (例如: GOV-01)
  bun query-dimensions.ts --framework <NAME>   查询框架 (例如: NIST)
  bun query-dimensions.ts --search <KEYWORD>   跨维度搜索
  bun query-dimensions.ts --stats              显示维度统计
  bun query-dimensions.ts --help               显示帮助信息

示例:
  bun query-dimensions.ts --domain GOV
  bun query-dimensions.ts --control GOV-01
  bun query-dimensions.ts --framework NIST
  bun query-dimensions.ts --search "governance"
  bun query-dimensions.ts --stats

快捷方式:
  -d, -c, -f, -s 分别对应 --domain, --control, --framework, --search
`);
    break;

  default:
    console.error("❌ 未知命令。使用 --help 查看帮助信息。");
    process.exit(1);
}
