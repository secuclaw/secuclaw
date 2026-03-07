import * as XLSX from "xlsx";
import * as fs from "node:fs";
import * as path from "node:path";
import type { SCFData, SCFDomain, SCFControl, SCFMapping } from "./types.js";

export class SCFLoaderExtended {
  private data: SCFData | null = null;
  private dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  async load(): Promise<SCFData> {
    if (this.data) return this.data;

    const xlsxPath = path.join(this.dataPath, "secure-controls-framework-scf.xlsx");
    const jsonPath = path.join(this.dataPath, "scf-data.json");

    if (fs.existsSync(jsonPath)) {
      try {
        const content = fs.readFileSync(jsonPath, "utf-8");
        this.data = JSON.parse(content);
        return this.data!;
      } catch {}
    }

    if (!fs.existsSync(xlsxPath)) {
      this.data = { domains: [], version: "2025" };
      return this.data!;
    }

    this.data = this.parseXLSX(xlsxPath);
    
    const outputPath = path.join(this.dataPath, "scf-data.json");
    fs.writeFileSync(outputPath, JSON.stringify(this.data, null, 2), "utf-8");

    return this.data!;
  }

  private parseXLSX(filePath: string): SCFData {
    const workbook = XLSX.readFile(filePath);
    const domainMap = new Map<string, SCFDomain>();
    const allControls: SCFControl[] = [];

    const controlSheet = workbook.SheetNames.find(
      (name) => name.includes("SCF 2025")
    ) || workbook.SheetNames.find((name) => name.toLowerCase().includes("control")) || workbook.SheetNames[0];

    if (controlSheet) {
      const sheet = workbook.Sheets[controlSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      for (const row of rows) {
        const controlId = row["SCF #"] || row["SCF#"] || row["Control ID"] || row["ID"] || "";
        if (!controlId) continue;

        const domainCode = controlId.split("-")[0];
        const domainName = row["SCF Domain"] || domainCode;
        const controlName = row["SCF Control"] || row["Control Name"] || "";
        const description = row["Secure Controls Framework (SCF)\r\nControl Description"] || 
                           row["Control Description"] || 
                           row["Description"] || "";
        
        if (!domainMap.has(domainCode)) {
          domainMap.set(domainCode, {
            code: domainCode,
            name: domainName,
            description: "",
            controls: [],
          });
        }

        const control: SCFControl = {
          id: controlId,
          name: controlName,
          description: description.replace(/\r\n/g, " ").replace(/\n/g, " "),
          category: domainName,
          mappings: this.extractMappings(row),
        };

        domainMap.get(domainCode)!.controls.push(control);
        allControls.push(control);
      }
    }

    console.log(`SCF loaded: ${domainMap.size} domains, ${allControls.length} controls from sheet "${controlSheet}"`);

    return {
      domains: Array.from(domainMap.values()),
      version: "2025",
    };
  }

  private extractMappings(row: Record<string, string>): SCFMapping[] {
    const mappings: SCFMapping[] = [];
    const frameworkPatterns: Array<{ pattern: RegExp; framework: SCFMapping["framework"] }> = [
      { pattern: /NIST.*?800/i, framework: "NIST" },
      { pattern: /ISO.*?27001/i, framework: "ISO 27001" },
      { pattern: /PCI.*?DSS/i, framework: "PCI DSS" },
      { pattern: /SOC.*?2/i, framework: "SOC 2" },
      { pattern: /GDPR/i, framework: "GDPR" },
      { pattern: /COBIT/i, framework: "COBIT" },
      { pattern: /CIS/i, framework: "CIS" },
      { pattern: /HIPAA/i, framework: "HIPAA" },
    ];

    for (const [key, value] of Object.entries(row)) {
      if (!value || typeof value !== "string") continue;

      for (const { pattern, framework } of frameworkPatterns) {
        if (pattern.test(key) || pattern.test(value)) {
          mappings.push({
            framework,
            controlId: value,
          });
          break;
        }
      }
    }

    return mappings;
  }

  getDomain(code: string): SCFDomain | undefined {
    return this.data?.domains.find((d) => d.code === code);
  }

  getControl(id: string): SCFControl | undefined {
    for (const domain of this.data?.domains ?? []) {
      const control = domain.controls.find((c) => c.id === id);
      if (control) return control;
    }
    return undefined;
  }

  searchControls(query: string): SCFControl[] {
    const results: SCFControl[] = [];
    const lowerQuery = query.toLowerCase();

    for (const domain of this.data?.domains ?? []) {
      for (const control of domain.controls) {
        if (
          control.name.toLowerCase().includes(lowerQuery) ||
          control.description.toLowerCase().includes(lowerQuery) ||
          control.id.toLowerCase().includes(lowerQuery)
        ) {
          results.push(control);
        }
      }
    }

    return results;
  }

  getControlsByFramework(framework: string): SCFControl[] {
    const results: SCFControl[] = [];
    for (const domain of this.data?.domains ?? []) {
      for (const control of domain.controls) {
        if (control.mappings.some((m) => m.framework === framework)) {
          results.push(control);
        }
      }
    }
    return results;
  }

  getStats(): { domains: number; controls: number; frameworks: string[] } {
    const frameworks = new Set<string>();
    let controls = 0;

    for (const domain of this.data?.domains ?? []) {
      controls += domain.controls.length;
      for (const control of domain.controls) {
        for (const mapping of control.mappings) {
          frameworks.add(mapping.framework);
        }
      }
    }

    return {
      domains: this.data?.domains.length ?? 0,
      controls,
      frameworks: Array.from(frameworks),
    };
  }

  getDomains(): SCFDomain[] {
    return this.data?.domains ?? [];
  }

  getAllControls(): SCFControl[] {
    const controls: SCFControl[] = [];
    for (const domain of this.data?.domains ?? []) {
      controls.push(...domain.controls);
    }
    return controls;
  }
}
