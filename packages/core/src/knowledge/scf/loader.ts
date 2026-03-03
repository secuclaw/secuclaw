import type { SCFData, SCFDomain, SCFControl, SCFMapping, SCFFramework, SCFParserOptions } from "./types";

export class SCFLoader {
  private data: SCFData | null = null;
  private dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  async load(): Promise<SCFData> {
    if (this.data) return this.data;
    this.data = {
      domains: [],
      version: "2025",
    };
    return this.data;
  }

  async loadFromJSON(data: SCFData): Promise<SCFData> {
    this.data = data;
    return this.data;
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

  getControlsByCategory(category: string): SCFControl[] {
    const controls: SCFControl[] = [];
    for (const domain of this.data?.domains ?? []) {
      for (const control of domain.controls) {
        if (control.category === category) {
          controls.push(control);
        }
      }
    }
    return controls;
  }

  getControlsByMapping(framework: string): SCFControl[] {
    const controls: SCFControl[] = [];
    for (const domain of this.data?.domains ?? []) {
      for (const control of domain.controls) {
        if (control.mappings.some((m) => m.framework === framework)) {
          controls.push(control);
        }
      }
    }
    return controls;
  }

  getMappingTarget(framework: SCFFramework, controlId: string): SCFControl | undefined {
    for (const domain of this.data?.domains ?? []) {
      for (const control of domain.controls) {
        const mapping = control.mappings.find(
          (m) => m.framework === framework && m.controlId === controlId
        );
        if (mapping) return control;
      }
    }
    return undefined;
  }

  getAllCategories(): string[] {
    const categories = new Set<string>();
    for (const domain of this.data?.domains ?? []) {
      for (const control of domain.controls) {
        categories.add(control.category);
      }
    }
    return Array.from(categories);
  }
}
