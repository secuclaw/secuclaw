/**
 * ComplianceAuditor Hand - Definition
 * 
 * Autonomous compliance auditing for ISO27001, GDPR, SOC2, NIST.
 */

import type { HandDefinition } from "../../hands/types.js";

export const ComplianceAuditorDefinition: HandDefinition = {
  id: "compliance-auditor",
  name: "Compliance Auditor",
  description: "Automated compliance auditing for security frameworks",
  category: "security",
  version: "1.0.0",
  author: "SecuClaw",
  requirements: [],
  settings: [
    { key: "frameworks", label: "Frameworks", type: "select", default: "all", required: false,
      options: [{ value: "all", label: "All Frameworks" }, { value: "iso27001", label: "ISO 27001" }, { value: "gdpr", label: "GDPR" }, { value: "soc2", label: "SOC 2" }, { value: "nist", label: "NIST CSF" }] },
    { key: "scope", label: "Audit Scope", type: "string", default: "full", required: false },
  ],
  metrics: [
    { label: "Compliance Score", memoryKey: "compliance_score", format: "percentage" },
    { label: "Issues Found", memoryKey: "issues_found", format: "number" },
    { label: "Gaps Count", memoryKey: "gaps_count", format: "number" },
  ],
  tools: ["config-read", "log-query", "policy-check"],
  systemPrompt: "You are a Compliance Auditor checking security controls against frameworks.",
};

export default ComplianceAuditorDefinition;
