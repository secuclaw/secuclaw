export interface SCFControl {
  id: string;
  name: string;
  description: string;
  category: string;
  mappings: SCFMapping[];
}

export interface SCFMapping {
  framework: string;
  controlId: string;
  description?: string;
}

export interface SCFDomain {
  code: string;
  name: string;
  description: string;
  controls: SCFControl[];
}

export interface SCFData {
  domains: SCFDomain[];
  version: string;
  source?: string;
}

export type SCFFramework = "NIST" | "ISO27001" | "CIS" | "PCI-DSS" | "SOC2";

export interface SCFParserOptions {
  framework?: SCFFramework;
  version?: string;
}
