#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const DATA_DIR = join(process.cwd(), "data", "scf");
const REQUIRED_FILES = [
  "scf-data.json",
  "scf-20254.json",
  "lists.json",
];

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getExistingFiles(): string[] {
  return REQUIRED_FILES.filter((name) => existsSync(join(DATA_DIR, name)));
}

function printExistingSummary(files: string[]): void {
  console.log("SCF 数据已存在，跳过下载。");
  for (const file of files) {
    const fullPath = join(DATA_DIR, file);
    const size = statSync(fullPath).size;
    console.log(`  - ${file}: ${(size / 1024 / 1024).toFixed(2)} MB`);
  }
  console.log(`目录: ${DATA_DIR}`);
}

function downloadFromUrl(url: string): void {
  const sanitized = url.trim();
  if (!sanitized) {
    throw new Error("SCF_DOWNLOAD_URL 为空");
  }

  const fileNameFromEnv = process.env.SCF_DOWNLOAD_FILENAME?.trim();
  const fileNameFromUrl = basename(new URL(sanitized).pathname) || "scf-download.bin";
  const fileName = fileNameFromEnv || fileNameFromUrl;
  const destPath = join(DATA_DIR, fileName);

  console.log(`下载 SCF 数据: ${sanitized}`);
  execSync(`curl -fsSL "${sanitized}" -o "${destPath}"`, { stdio: "inherit" });

  const size = statSync(destPath).size;
  console.log(`下载完成: ${destPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);

  const infoPath = join(DATA_DIR, "download-info.json");
  writeFileSync(
    infoPath,
    JSON.stringify(
      {
        downloadedAt: new Date().toISOString(),
        sourceUrl: sanitized,
        fileName,
        sizeBytes: size,
      },
      null,
      2,
    ),
  );
  console.log(`元数据已写入: ${infoPath}`);
}

function main(): void {
  ensureDataDir();

  const force = process.argv.includes("--force");
  const existing = getExistingFiles();
  const sourceUrl = process.env.SCF_DOWNLOAD_URL;

  if (existing.length === REQUIRED_FILES.length && !force && !sourceUrl) {
    printExistingSummary(existing);
    return;
  }

  if (!sourceUrl) {
    throw new Error(
      [
        "未提供 SCF_DOWNLOAD_URL，且当前不满足“使用现有完整数据集”的条件。",
        "处理方式：",
        "1) 直接使用仓库内 data/scf 现有数据（默认）；或",
        "2) 设置 SCF_DOWNLOAD_URL 后重试，例如：",
        "   SCF_DOWNLOAD_URL='https://example.com/scf.json' pnpm run download-scf",
      ].join("\n"),
    );
  }

  downloadFromUrl(sourceUrl);
}

main();
