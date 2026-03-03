#!/usr/bin/env bun
import * as XLSX from "xlsx";
import * as fs from "node:fs";
import * as path from "node:path";

const excelPath = "/Users/huangzhou/Documents/work/ai_secuclaw/secuclaw/data/scf/secure-controls-framework-scf.xlsx";
const outputDir = "/Users/huangzhou/Documents/work/ai_secuclaw/secuclaw/data/scf/sheets";

console.log("📊 读取 SCF Excel 文件...");
const workbook = XLSX.readFile(excelPath);

console.log(`📋 发现 ${workbook.SheetNames.length} 个 sheet 页`);

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 遍历每个 sheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n${index + 1}. 处理: ${sheetName}`);

  const sheet = workbook.Sheets[sheetName];

  // 转换为 JSON
  const data = XLSX.utils.sheet_to_json(sheet, {
    defval: null, // 空单元格使用 null
    blankrows: false, // 跳过空行
  });

  console.log(`   - 行数: ${data.length}`);

  // 生成文件名（转换为小写，替换空格为连字符）
  const fileName = sheetName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/-+/g, "-");

  const filePath = path.join(outputDir, `${fileName}.json`);

  // 保存为 JSON
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`   - 保存: ${fileName}.json`);
});

console.log("\n✅ 拆分完成！");
console.log(`📁 输出目录: ${outputDir}`);

// 显示文件列表
console.log("\n📄 生成的文件:");
const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".json"));
files.forEach((file) => {
  const filePath = path.join(outputDir, file);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`   - ${file} (${sizeKB} KB)`);
});
