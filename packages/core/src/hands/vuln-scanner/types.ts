/**
 * VulnScanner Hand - Types
 */

export type VulnSeverity = "info" | "low" | "medium" | "high" | "critical";
export type VulnStatus = "open" | "confirmed" | "false-positive" | "mitigated";

export interface Vulnerability {
  id: string;
  cve?: string;
  title: string;
  description: string;
  severity: VulnSeverity;
  status: VulnStatus;
  affectedComponent: string;
  port?: number;
  protocol?: string;
  cvss?: number;
  cvssVector?: string;
 解决方案?: string;
  references: string[];
}

export interface Asset {
  id: string;
  host: string;
  hostname?: string;
  os?: string;
  ports: Port[];
  services: Service[];
  tags: string[];
}

export interface Port {
  number: number;
  protocol: string;
  state: string;
  service?: string;
  version?: string;
}

export interface Service {
  name: string;
  version?: string;
  product?: string;
  vendor?: string;
}

export interface CVEDatabase {
  cveId: string;
  description: string;
  cvss: number;
  published: Date;
  references: string[];
  affectedProducts: string[];
}

export interface ScanResult {
  success: boolean;
  target: string;
  scanType: string;
  assets: Asset[];
  vulnerabilities: Vulnerability[];
  duration: number;
  summary: ScanSummary;
}

export interface ScanSummary {
  totalAssets: number;
  totalVulns: number;
  bySeverity: Record<VulnSeverity, number>;
  criticalVulns: Vulnerability[];
}
