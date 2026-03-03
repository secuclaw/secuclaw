import type { SCFDomain, SCFControl, SCFMapping } from "../../knowledge/scf/types.js";

export interface SCFThreatCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  threatType: "NT" | "MT";
  relatedControls: string[];
  mitigations: string[];
  riskLevel: "critical" | "high" | "medium" | "low";
  references: string[];
}

export interface SCFRiskCatalogEntry {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  riskType: "R-AC" | "R-SC" | "R-PI" | "R-CM" | "R-GL";
  likelihood: "high" | "medium" | "low";
  impact: "critical" | "high" | "medium" | "low";
  affectedAssets: string[];
  relatedControls: string[];
  mitigationStrategy: string;
}

export interface SCFExtendedData {
  threatCatalog: SCFThreatCatalogEntry[];
  riskCatalog: SCFRiskCatalogEntry[];
  controlMappings: Map<string, string[]>;
}

const DEFAULT_THREAT_CATALOG: SCFThreatCatalogEntry[] = [
  {
    id: "NT-001",
    name: "Unauthorized Access",
    description: "Threat actors gaining unauthorized access to systems or data",
    category: "Access Control",
    threatType: "NT",
    relatedControls: ["IAM-01", "IAM-02", "IAM-03"],
    mitigations: ["Multi-factor authentication", "Least privilege access", "Access reviews"],
    riskLevel: "high",
    references: ["NIST 800-53 AC-1", "ISO 27001 A.9"],
  },
  {
    id: "NT-002",
    name: "Data Exfiltration",
    description: "Unauthorized transfer of data outside organizational boundaries",
    category: "Data Protection",
    threatType: "NT",
    relatedControls: ["DSP-01", "DSP-02", "NET-01"],
    mitigations: ["DLP solutions", "Network monitoring", "Encryption"],
    riskLevel: "critical",
    references: ["NIST 800-53 SC-8", "ISO 27001 A.13"],
  },
  {
    id: "NT-003",
    name: "Malware Infection",
    description: "Introduction of malicious software into systems",
    category: "Malware",
    threatType: "NT",
    relatedControls: ["MAL-01", "MAL-02", "HRS-01"],
    mitigations: ["Endpoint protection", "Sandboxing", "Regular scanning"],
    riskLevel: "high",
    references: ["NIST 800-53 SI-3", "ISO 27001 A.12"],
  },
  {
    id: "MT-001",
    name: "Insider Threat",
    description: "Malicious actions by privileged internal users",
    category: "Insider Threat",
    threatType: "MT",
    relatedControls: ["HRS-01", "HRS-02", "IAM-01"],
    mitigations: ["User behavior analytics", "Segregation of duties", "Monitoring"],
    riskLevel: "high",
    references: ["NIST 800-53 PS-4", "ISO 27001 A.7"],
  },
  {
    id: "MT-002",
    name: "Advanced Persistent Threat",
    description: "Sophisticated, long-term targeted attacks",
    category: "APT",
    threatType: "MT",
    relatedControls: ["NET-01", "NET-02", "TST-01"],
    mitigations: ["Threat hunting", "Network segmentation", "Zero trust"],
    riskLevel: "critical",
    references: ["NIST 800-53 SI-4", "MITRE ATT&CK"],
  },
];

const DEFAULT_RISK_CATALOG: SCFRiskCatalogEntry[] = [
  {
    id: "R-AC-001",
    code: "R-AC-001",
    name: "Privilege Escalation Risk",
    description: "Risk of users gaining elevated privileges beyond their authorization",
    category: "Access Control Risk",
    riskType: "R-AC",
    likelihood: "medium",
    impact: "high",
    affectedAssets: ["User accounts", "Admin consoles", "Databases"],
    relatedControls: ["IAM-01", "IAM-02", "IAM-03"],
    mitigationStrategy: "Implement RBAC with regular access reviews and monitoring",
  },
  {
    id: "R-SC-001",
    code: "R-SC-001",
    name: "Supply Chain Compromise Risk",
    description: "Risk of compromise through third-party vendors or software",
    category: "Supply Chain Risk",
    riskType: "R-SC",
    likelihood: "medium",
    impact: "critical",
    affectedAssets: ["Third-party software", "Vendor systems", "Integration points"],
    relatedControls: ["VSR-01", "VSR-02", "STA-01"],
    mitigationStrategy: "Vendor risk assessments, SBOM analysis, continuous monitoring",
  },
  {
    id: "R-PI-001",
    code: "R-PI-001",
    name: "Data Breach Risk",
    description: "Risk of sensitive data exposure or theft",
    category: "Privacy Risk",
    riskType: "R-PI",
    likelihood: "medium",
    impact: "critical",
    affectedAssets: ["Customer data", "PII", "Financial data"],
    relatedControls: ["DSP-01", "DSP-02", "PRI-01"],
    mitigationStrategy: "Data classification, encryption, access controls, DLP",
  },
  {
    id: "R-CM-001",
    code: "R-CM-001",
    name: "Compliance Violation Risk",
    description: "Risk of failing to meet regulatory requirements",
    category: "Compliance Risk",
    riskType: "R-CM",
    likelihood: "low",
    impact: "high",
    affectedAssets: ["Business processes", "Data handling", "Reporting"],
    relatedControls: ["GRC-01", "GRC-02", "GRC-03"],
    mitigationStrategy: "Regular compliance audits, automated controls, documentation",
  },
  {
    id: "R-GL-001",
    code: "R-GL-001",
    name: "Geopolitical Risk",
    description: "Risk from geopolitical factors affecting operations",
    category: "Geopolitical Risk",
    riskType: "R-GL",
    likelihood: "low",
    impact: "critical",
    affectedAssets: ["International operations", "Data centers", "Supply chains"],
    relatedControls: ["BRS-01", "BRS-02", "STA-01"],
    mitigationStrategy: "Geographic diversification, regulatory monitoring, incident response",
  },
];

export class SCFExtendedLoader {
  private threatCatalog: SCFThreatCatalogEntry[] = [];
  private riskCatalog: SCFRiskCatalogEntry[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;

    this.threatCatalog = DEFAULT_THREAT_CATALOG;
    this.riskCatalog = DEFAULT_RISK_CATALOG;
    this.loaded = true;
  }

  getThreatCatalog(): SCFThreatCatalogEntry[] {
    return this.threatCatalog;
  }

  getRiskCatalog(): SCFRiskCatalogEntry[] {
    return this.riskCatalog;
  }

  getThreatById(id: string): SCFThreatCatalogEntry | undefined {
    return this.threatCatalog.find(t => t.id === id);
  }

  getRiskById(id: string): SCFRiskCatalogEntry | undefined {
    return this.riskCatalog.find(r => r.id === id || r.code === id);
  }

  searchThreats(query: string): SCFThreatCatalogEntry[] {
    const q = query.toLowerCase();
    return this.threatCatalog.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  searchRisks(query: string): SCFRiskCatalogEntry[] {
    const q = query.toLowerCase();
    return this.riskCatalog.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }

  getThreatsByControl(controlId: string): SCFThreatCatalogEntry[] {
    return this.threatCatalog.filter(t => 
      t.relatedControls.some(c => c.startsWith(controlId.split("-")[0]))
    );
  }

  getRisksByControl(controlId: string): SCFRiskCatalogEntry[] {
    return this.riskCatalog.filter(r =>
      r.relatedControls.some(c => c.startsWith(controlId.split("-")[0]))
    );
  }

  getControlsByRiskLevel(level: SCFThreatCatalogEntry["riskLevel"]): string[] {
    return this.threatCatalog
      .filter(t => t.riskLevel === level)
      .flatMap(t => t.relatedControls);
  }

  getStats(): { threats: number; risks: number; categories: string[] } {
    const categories = new Set<string>();
    this.threatCatalog.forEach(t => categories.add(t.category));
    this.riskCatalog.forEach(r => categories.add(r.category));

    return {
      threats: this.threatCatalog.length,
      risks: this.riskCatalog.length,
      categories: Array.from(categories),
    };
  }
}

let loaderInstance: SCFExtendedLoader | null = null;

export function getSCFExtendedLoader(): SCFExtendedLoader {
  if (!loaderInstance) {
    loaderInstance = new SCFExtendedLoader();
  }
  return loaderInstance;
}

export function resetSCFExtendedLoader(): void {
  loaderInstance = null;
}
