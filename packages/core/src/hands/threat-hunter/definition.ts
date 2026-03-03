/**
 * ThreatHunter Hand - Definition
 * 
 * Autonomous threat hunting with MITRE ATT&CK mapping and IOC detection.
 */

import type { HandDefinition } from "../../hands/types.js";

export const ThreatHunterDefinition: HandDefinition = {
  id: "threat-hunter",
  name: "Threat Hunter",
  description: "Autonomous threat hunting with MITRE ATT&CK mapping and IOC detection",
  category: "security",
  version: "1.0.0",
  author: "SecuClaw",
  requirements: [],
  settings: [
    {
      key: "severity-threshold",
      label: "Severity Threshold",
      type: "select",
      default: "medium",
      required: false,
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "critical", label: "Critical" },
      ],
    },
    {
      key: "correlation-window",
      label: "Correlation Window (hours)",
      type: "number",
      default: 24,
      required: false,
    },
    {
      key: "mitre-enabled",
      label: "Enable MITRE ATT&CK Mapping",
      type: "boolean",
      default: true,
      required: false,
    },
  ],
  metrics: [
    { label: "Threats Detected", memoryKey: "threats_detected", format: "number" },
    { label: "IOCs Found", memoryKey: "iocs_found", format: "number" },
    { label: "MITRE Techniques", memoryKey: "mitre_techniques", format: "number" },
    { label: "Risk Score", memoryKey: "risk_score", format: "number" },
  ],
  schedule: {
    enabled: false,
    cron: "0 6 * * *", // Daily at 6 AM
  },
  tools: ["log-query", "ioc-lookup", "mitre-search", "alert-send"],
  systemPrompt: `You are a ThreatHunter, an autonomous security analyst specialized in threat detection and analysis.

Your capabilities:
- Detect indicators of compromise (IOCs) in logs and data
- Correlate security events to identify attack patterns
- Map threats to MITRE ATT&CK framework
- Generate actionable threat reports

When analyzing:
1. Focus on suspicious patterns: unusual IPs, domain access, file hashes
2. Look for behavioral indicators: lateral movement, privilege escalation
3. Correlate events across time windows
4. Assign severity based on MITRE techniques identified`,
};

export default ThreatHunterDefinition;
