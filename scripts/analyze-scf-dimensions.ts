#!/usr/bin/env bun
/**
 * SCF 知识库维度分析工具
 *
 * 分析 SCF 数据目录中的所有 JSON 文件，识别数据维度、字段结构和关系
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SCF_DATA_DIR = "/Users/huangzhou/Documents/work/ai_secuclaw/secuclaw/data/scf";

interface DimensionInfo {
  file: string;
  name: string;
  recordCount: number;
  size: string;
  fields: string[];
  sampleRecord: Record<string, any>;
  categories: Record<string, any[]>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function analyzeCategories(data: any[], fieldName: string): Record<string, any[]> {
  const categories: Record<string, any[]> = {};

  data.forEach(record => {
    const value = record[fieldName];
    if (value) {
      const key = String(value);
      if (!categories[key]) {
        categories[key] = [];
      }
      categories[key].push(record);
    }
  });

  return categories;
}

function analyzeDimension(filePath: string): DimensionInfo {
  const fileName = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const fields = data.length > 0 ? Object.keys(data[0]) : [];
  const sampleRecord = data.length > 0 ? data[0] : {};

  // 识别分类字段
  const categories: Record<string, any[]> = {};

  // 尝试识别可能的分类字段
  const categoryFields = fields.filter(f =>
    f.toLowerCase().includes("domain") ||
    f.toLowerCase().includes("category") ||
    f.toLowerCase().includes("type") ||
    f.toLowerCase().includes("applicability") ||
    f.toLowerCase().includes("geography") ||
    f.toLowerCase().includes("source")
  );

  categoryFields.forEach(field => {
    const cats = analyzeCategories(data.slice(0, 100), field); // 只分析前100条
    const uniqueValues = Object.keys(cats);
    if (uniqueValues.length > 1 && uniqueValues.length < 50) {
      categories[field] = uniqueValues;
    }
  });

  return {
    file: fileName,
    name: fileName.replace(".json", "").replace(/-/g, " "),
    recordCount: data.length,
    size: formatFileSize(stats.size),
    fields,
    sampleRecord,
    categories,
  };
}

function generateDimensionReport(dimensions: DimensionInfo[]): string {
  let report = "";

  report += "╔══════════════════════════════════════════════════════════════╗\n";
  report += "║          SCF 知识库维度分析报告                              ║\n";
  report += "╚══════════════════════════════════════════════════════════════╝\n\n";

  // 总体统计
  const totalRecords = dimensions.reduce((sum, d) => sum + d.recordCount, 0);
  const totalSize = dimensions.reduce((sum, d) => {
    const size = parseFloat(d.size);
    const unit = d.size.split(" ")[1];
    if (unit === "MB") return sum + size * 1024 * 1024;
    if (unit === "KB") return sum + size * 1024;
    return sum + size;
  }, 0);

  report += "📊 总体统计\n";
  report += "─────────────────────────────────────────────────────────────\n";
  report += `维度数量: ${dimensions.length}\n`;
  report += `总记录数: ${totalRecords.toLocaleString()}\n`;
  report += `总大小: ${formatFileSize(totalSize)}\n\n`;

  // 各维度详情
  report += "📋 维度详情\n";
  report += "══════════════════════════════════════════════════════════════\n\n";

  dimensions.forEach((dim, index) => {
    report += `${index + 1}. ${dim.name}\n`;
    report += `   文件: ${dim.file}\n`;
    report += `   记录数: ${dim.recordCount.toLocaleString()}\n`;
    report += `   大小: ${dim.size}\n`;
    report += `   字段数: ${dim.fields.length}\n`;

    if (dim.fields.length > 0) {
      report += `   字段: ${dim.fields.slice(0, 5).join(", ")}${dim.fields.length > 5 ? "..." : ""}\n`;
    }

    if (Object.keys(dim.categories).length > 0) {
      report += `   分类字段:\n`;
      Object.entries(dim.categories).forEach(([field, values]) => {
        report += `      • ${field}: ${values.length} 个值\n`;
      });
    }

    report += "\n";
  });

  // 关系推断
  report += "🔗 维度关系推断\n";
  report += "══════════════════════════════════════════════════════════════\n\n";

  // scf-20254.json 是核心，其他维度都与它相关
  const controlsDim = dimensions.find(d => d.file === "scf-20254.json");
  if (controlsDim) {
    report += "核心维度: 安全控制 (scf-20254.json)\n";
    report += "─────────────────────────────────────────────────────────────\n";
    report += "其他维度与安全控制的关系:\n\n";

    dimensions
      .filter(d => d.file !== "scf-20254.json")
      .forEach(dim => {
        const relationships: string[] = [];

        // 检查是否有 SCF # 字段（引用控制ID）
        if (dim.fields.some(f => f.includes("SCF #"))) {
          relationships.push(`  → 通过 "SCF #" 字段关联到安全控制`);
        }

        // 检查是否有 ERL # 字段
        if (dim.fields.some(f => f.includes("ERL #"))) {
          relationships.push(`  → 通过 "ERL #" 字段关联到证据请求`);
        }

        // 检查是否有 SCF Domain 字段
        if (dim.fields.some(f => f.includes("SCF Domain"))) {
          relationships.push(`  → 通过 "SCF Domain" 字段关联到控制域`);
        }

        if (relationships.length > 0) {
          report += `• ${dim.name} (${dim.recordCount} 条记录)\n`;
          relationships.forEach(r => report += r + "\n");
          report += "\n";
        }
      });
  }

  // 使用建议
  report += "💡 使用建议\n";
  report += "══════════════════════════════════════════════════════════════\n\n";
  report += "1. 安全控制 (scf-20254.json) - 核心维度，包含所有 SCF 控制\n";
  report += "2. 控制域 (scf-domains-principles.json) - 按域浏览控制\n";
  report += "3. 评估目标 (assessment-objectives-20254.json) - 合规评估依据\n";
  report += "4. 证据请求 (evidence-request-list-20254.json) - 审计证据清单\n";
  report += "5. 权威来源 (authoritative-sources.json) - 合规框架映射\n";
  report += "6. 隐私原则 (data-privacy-mgmt-principles.json) - GDPR/CCPA 指导\n";
  report += "7. 风险目录 (risk-catalog.json) - 风险分类参考\n";
  report += "8. 威胁目录 (threat-catalog.json) - 威胁分类参考\n";
  report += "9. 参考列表 (lists.json) - 辅助参考数据\n";

  return report;
}

function main() {
  console.log("🔍 分析 SCF 知识库维度...\n");

  const jsonFiles = fs
    .readdirSync(SCF_DATA_DIR)
    .filter(f => f.endsWith(".json") && f !== "dimensions-config.json")
    .map(f => path.join(SCF_DATA_DIR, f));

  const dimensions: DimensionInfo[] = jsonFiles.map(analyzeDimension);

  // 按记录数排序
  dimensions.sort((a, b) => b.recordCount - a.recordCount);

  // 生成并打印报告
  const report = generateDimensionReport(dimensions);
  console.log(report);

  // 保存报告
  const reportPath = path.join(SCF_DATA_DIR, "DIMENSIONS-ANALYSIS.txt");
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`📄 报告已保存到: ${reportPath}`);

  // 保存 JSON 配置
  const configPath = path.join(SCF_DATA_DIR, "dimensions-analysis.json");
  fs.writeFileSync(configPath, JSON.stringify(dimensions, null, 2), "utf-8");
  console.log(`📊 JSON 配置已保存到: ${configPath}`);
}

main();
