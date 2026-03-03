/**
 * VulnScanner Hand - Definition
 * 
 * Autonomous vulnerability scanning with CVE matching.
 */

import type { HandDefinition } from "../../hands/types.js";

export const VulnScannerDefinition: HandDefinition = {
  id: "vuln-scanner",
  name: "Vulnerability Scanner",
  description: "Autonomous vulnerability scanning with CVE detection and remediation guidance",
  category: "security",
  version: "1.0.0",
  author: "SecuClaw",
  requirements: [],
  settings: [
    {
      key: "target",
      label: "Scan Target",
      type: "string",
      default: "",
      required: true,
      description: "IP address, hostname, or CIDR range to scan",
    },
    {
      key: "scan-type",
      label: "Scan Type",
      type: "select",
      default: "full",
      required: false,
      options: [
        { value: "quick", label: "Quick Scan" },
        { value: "full", label: "Full Scan" },
        { value: "stealth", label: "Stealth Scan" },
      ],
    },
    {
      key: "severity-threshold",
      label: "Severity Threshold",
      type: "select",
      default: "medium",
      required: false,
      options: [
        { value: "info", label: "Info" },
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "critical", label: "Critical" },
      ],
    },
  ],
  metrics: [
    { label: "Assets Found", memoryKey: "assets_found", format: "number" },
    { label: "Vulnerabilities Found", memoryKey: "vulns_found", format: "number" },
    { label: "Critical Vulns", memoryKey: "critical_vulns", format: "number" },
  ],
  schedule: {
    enabled: false,
    cron: "0 2 * * *", // Daily at 2 AM
  },
  tools: ["nmap-scan", "nuclei-scan", "cve-lookup", "alert-send"],
  systemPrompt: `You are a VulnScanner, an autonomous security analyst specialized in vulnerability detection.

Your capabilities:
- Discover assets and services
- Identify vulnerabilities using CVE database
- Provide remediation recommendations
- Generate vulnerability reports

When scanning:
1. Identify open ports and services
2. Match versions to known CVEs
3. Assess severity based on exploitability
4. Prioritize remediation by risk`,
};

export default VulnScannerDefinition;
