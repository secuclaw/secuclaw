import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ImportResult {
  domain: string;
  totalObjects: number;
  tactics: number;
  techniques: number;
  subtechniques: number;
  mitigations: number;
  groups: number;
  software: number;
  relationships: number;
  duration: number;
}

export interface FullImportResult {
  success: boolean;
  domains: ImportResult[];
  totalObjects: number;
  totalRelationships: number;
  importedAt: string;
}

export class MITREDataImporter {
  private dataDir: string;
  private outputDir: string;

  constructor(dataDir?: string, outputDir?: string) {
    this.dataDir = dataDir || join(process.cwd(), 'data', 'mitre-attack');
    this.outputDir = outputDir || join(process.cwd(), 'data', 'mitre-attack-processed');
  }

  async importAll(): Promise<FullImportResult> {
    const startTime = Date.now();
    const results: ImportResult[] = [];

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    const files = readdirSync(this.dataDir).filter(f => f.endsWith('.json') && f !== 'info.json');

    const allObjects: Map<string, unknown> = new Map();
    const allRelationships: Array<{ source_ref: string; target_ref: string; relationship_type: string }> = [];

    for (const file of files) {
      const domainName = file.replace('.json', '');
      console.log(`Processing ${domainName}...`);

      const result = await this.importDomain(domainName);
      results.push(result);

      const domainFile = join(this.dataDir, file);
      const content = JSON.parse(readFileSync(domainFile, 'utf-8'));

      if (content.objects && Array.isArray(content.objects)) {
        for (const obj of content.objects) {
          if (obj.id && !obj.x_mitre_deprecated && !obj.x_mitre_revoked) {
            allObjects.set(obj.id, obj);
          }
        }

        for (const obj of content.objects) {
          if (obj.type === 'relationship' && obj.source_ref && obj.target_ref) {
            allRelationships.push({
              source_ref: obj.source_ref,
              target_ref: obj.target_ref,
              relationship_type: obj.relationship_type,
            });
          }
        }
      }
    }

    const tactics = Array.from(allObjects.values()).filter((obj: any) => obj.type === 'x-mitre-tactic');
    const techniques = Array.from(allObjects.values()).filter((obj: any) => obj.type === 'attack-pattern' && !obj.x_mitre_is_subtechnique);
    const subtechniques = Array.from(allObjects.values()).filter((obj: any) => obj.type === 'attack-pattern' && obj.x_mitre_is_subtechnique);
    const mitigations = Array.from(allObjects.values()).filter((obj: any) => obj.type === 'course-of-action');
    const groups = Array.from(allObjects.values()).filter((obj: any) => obj.type === 'intrusion-set');
    const software = Array.from(allObjects.values()).filter((obj: any) => obj.type === 'tool' || obj.type === 'malware');

    const tacticsPath = join(this.outputDir, 'tactics.json');
    const techniquesPath = join(this.outputDir, 'techniques.json');
    const subtechniquesPath = join(this.outputDir, 'subtechniques.json');
    const mitigationsPath = join(this.outputDir, 'mitigations.json');
    const groupsPath = join(this.outputDir, 'groups.json');
    const softwarePath = join(this.outputDir, 'software.json');
    const relationshipsPath = join(this.outputDir, 'relationships.json');

    writeFileSync(tacticsPath, JSON.stringify(tactics, null, 2));
    writeFileSync(techniquesPath, JSON.stringify(techniques, null, 2));
    writeFileSync(subtechniquesPath, JSON.stringify(subtechniques, null, 2));
    writeFileSync(mitigationsPath, JSON.stringify(mitigations, null, 2));
    writeFileSync(groupsPath, JSON.stringify(groups, null, 2));
    writeFileSync(softwarePath, JSON.stringify(software, null, 2));
    writeFileSync(relationshipsPath, JSON.stringify(allRelationships, null, 2));

    const endTime = Date.now();

    const fullResult: FullImportResult = {
      success: true,
      domains: results,
      totalObjects: allObjects.size,
      totalRelationships: allRelationships.length,
      importedAt: new Date().toISOString(),
    };

    const summaryPath = join(this.outputDir, 'import-summary.json');
    writeFileSync(summaryPath, JSON.stringify(fullResult, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('Import Summary');
    console.log('='.repeat(60));
    console.log(`Total Objects: ${allObjects.size}`);
    console.log(`  Tactics: ${tactics.length}`);
    console.log(`  Techniques: ${techniques.length}`);
    console.log(`  Subtechniques: ${subtechniques.length}`);
    console.log(`  Mitigations: ${mitigations.length}`);
    console.log(`  Groups: ${groups.length}`);
    console.log(`  Software: ${software.length}`);
    console.log(`  Relationships: ${allRelationships.length}`);
    console.log(`Duration: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    console.log(`Output: ${this.outputDir}`);

    return fullResult;
  }

  private async importDomain(domainName: string): Promise<ImportResult> {
    const startTime = Date.now();
    const filePath = join(this.dataDir, `${domainName}.json`);

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    const objects = content.objects || [];

    let tactics = 0;
    let techniques = 0;
    let subtechniques = 0;
    let mitigations = 0;
    let groups = 0;
    let software = 0;
    let relationships = 0;

    for (const obj of objects) {
      if (obj.x_mitre_deprecated || obj.x_mitre_revoked) continue;

      switch (obj.type) {
        case 'x-mitre-tactic':
          tactics++;
          break;
        case 'attack-pattern':
          if (obj.x_mitre_is_subtechnique) subtechniques++;
          else techniques++;
          break;
        case 'course-of-action':
          mitigations++;
          break;
        case 'intrusion-set':
          groups++;
          break;
        case 'tool':
        case 'malware':
          software++;
          break;
        case 'relationship':
          relationships++;
          break;
      }
    }

    return {
      domain: domainName,
      totalObjects: objects.length,
      tactics,
      techniques,
      subtechniques,
      mitigations,
      groups,
      software,
      relationships,
      duration: Date.now() - startTime,
    };
  }
}

async function main() {
  const importer = new MITREDataImporter();
  await importer.importAll();
}

main().catch(console.error);
