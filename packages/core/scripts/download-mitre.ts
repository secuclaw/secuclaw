#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data', 'mitre-attack');
const MITRE_VERSION = 'v16.1';

const MITRE_DOMAINS = [
  {
    name: 'enterprise-attack',
    url: `https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json`,
    description: 'Enterprise ATT&CK',
  },
  {
    name: 'mobile-attack',
    url: `https://raw.githubusercontent.com/mitre/cti/master/mobile-attack/mobile-attack.json`,
    description: 'Mobile ATT&CK',
  },
  {
    name: 'ics-attack',
    url: `https://raw.githubusercontent.com/mitre/cti/master/ics-attack/ics-attack.json`,
    description: 'ICS ATT&CK',
  },
];

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    console.log(`Downloading: ${url}`);
    execSync(`curl -sL "${url}" -o "${dest}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to download ${url}:`, error);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('MITRE ATT&CK Data Download Script');
  console.log(`Version: ${MITRE_VERSION}`);
  console.log('='.repeat(60));

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DATA_DIR}`);
  }

  const results: Array<{ domain: string; success: boolean; size?: number }> = [];

  for (const domain of MITRE_DOMAINS) {
    console.log(`\n[${domain.description}]`);
    
    const destPath = join(DATA_DIR, `${domain.name}.json`);
    const success = await downloadFile(domain.url, destPath);
    
    let size: number | undefined;
    if (success && existsSync(destPath)) {
      const stats = statSync(destPath);
      size = stats.size;
      console.log(`  ✓ Downloaded: ${(size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log(`  ✗ Failed`);
    }

    results.push({
      domain: domain.name,
      success,
      size,
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('Download Summary');
  console.log('='.repeat(60));

  let totalSize = 0;
  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    const sizeStr = result.size ? `${(result.size / 1024 / 1024).toFixed(2)} MB` : 'N/A';
    console.log(`  ${status} ${result.domain}: ${sizeStr}`);
    if (result.size) totalSize += result.size;
  }

  console.log(`\nTotal: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Location: ${DATA_DIR}`);

  const infoPath = join(DATA_DIR, 'info.json');
  writeFileSync(infoPath, JSON.stringify({
    version: MITRE_VERSION,
    downloadedAt: new Date().toISOString(),
    domains: results,
  }, null, 2));

  console.log('\nDone!');
}

main().catch(console.error);
