import {
  ToolCategory,
  ToolPolicyMode,
  Severity,
  SecurityTool,
  ToolExecutor,
  ToolContext,
  ToolResult,
} from "../types";

const createAnalysisExecutor = (
  toolName: string
): ToolExecutor<Record<string, unknown>> => {
  return async (
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        tool: toolName,
        params,
        sessionId: context.sessionId,
        message: `${toolName} executed successfully`,
      },
    };
  };
};

export const analyzeLogs: SecurityTool = {
  id: "analysis-logs",
  name: "analyzeLogs",
  description: "Analyze system logs, security events, and audit trails to identify anomalies, threats, and compliance issues",
  category: ToolCategory.ANALYSIS,
  schema: {
    name: "analyzeLogs",
    description: "Analyze system logs",
    parameters: {
      type: "object",
      properties: {
        logSources: {
          name: "logSources",
          description: "Log sources to analyze",
          type: "array",
          required: true,
          items: {
            name: "source",
            description: "Log source identifier",
            type: "string",
            required: false,
          },
        },
        timeRange: {
          name: "timeRange",
          description: "Time range for log analysis",
          type: "string",
          required: false,
          default: "24h",
        },
        analysisType: {
          name: "analysisType",
          description: "Type of analysis to perform",
          type: "string",
          required: false,
          enum: ["anomaly-detection", "pattern-matching", "correlation", "full"],
          default: "full",
        },
        filters: {
          name: "filters",
          description: "Filters to apply to log analysis",
          type: "object",
          required: false,
          properties: {
            severity: {
              name: "severity",
              description: "Filter by severity level",
              type: "string",
              required: false,
            },
            source: {
              name: "source",
              description: "Filter by source",
              type: "string",
              required: false,
            },
          },
        },
      },
    },
  },
  executor: createAnalysisExecutor("analyzeLogs"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [
    "T1005-data-from-local-system",
    "T1007-system-service-discovery",
    "T1010-application-window-discovery",
    "T1012-query-registry",
    "T1018-remote-system-discovery",
    "T1027-obfuscated-files-or-information",
    "T1036-masquerading",
    "T1047-windows-management-instrumentation",
    "T1057-process-discovery",
    "T1070-indicator-removal",
    "T1082-system-information-discovery",
    "T1083-file-and-directory-discovery",
    "T1087-account-discovery",
  ],
  scfControls: [
    "SCF-AUD.1",
    "SCF-AUD.2",
    "SCF-AUD.3",
    "SCF-MON.1",
    "SCF-MON.2",
    "SCF-MON.3",
    "SCF-LOG.1",
    "SCF-LOG.2",
    "SCF-LOG.3",
  ],
  severity: Severity.MEDIUM,
  tags: ["log-analysis", "security-monitoring", "analysis"],
};

export const queryThreatIntel: SecurityTool = {
  id: "analysis-threat-intel",
  name: "queryThreatIntel",
  description: "Query threat intelligence sources for indicators of compromise, threat actors, and emerging threats",
  category: ToolCategory.ANALYSIS,
  schema: {
    name: "queryThreatIntel",
    description: "Query threat intelligence",
    parameters: {
      type: "object",
      properties: {
        query: {
          name: "query",
          description: "Threat intelligence query",
          type: "string",
          required: true,
        },
        queryType: {
          name: "queryType",
          description: "Type of intelligence to query",
          type: "string",
          required: false,
          enum: ["indicator", "threat-actor", "campaign", "vulnerability", "all"],
          default: "all",
        },
        sources: {
          name: "sources",
          description: "Threat intelligence sources to query",
          type: "array",
          required: false,
          items: {
            name: "source",
            description: "Source name",
            type: "string",
            required: false,
          },
        },
        confidence: {
          name: "confidence",
          description: "Minimum confidence level",
          type: "string",
          required: false,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
      },
    },
  },
  executor: createAnalysisExecutor("queryThreatIntel"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [
    "T1005-data-from-local-system",
    "T1083-file-and-directory-discovery",
    "T1590-gather-victim-network-information",
    "T1592-gather-host-information",
    "T1595-active-scan",
  ],
  scfControls: [
    "SCF-INT.1",
    "SCF-INT.2",
    "SCF-INT.3",
    "SCF-MON.1",
    "SCF-MON.2",
    "SCF-ISA.1",
    "SCF-ISA.2",
  ],
  severity: Severity.INFO,
  tags: ["threat-intelligence", "threat-research", "analysis"],
};

export const analyzeRisk: SecurityTool = {
  id: "analysis-risk",
  name: "analyzeRisk",
  description: "Analyze and quantify security risks based on vulnerabilities, threats, and asset criticality",
  category: ToolCategory.ANALYSIS,
  schema: {
    name: "analyzeRisk",
    description: "Analyze security risks",
    parameters: {
      type: "object",
      properties: {
        scope: {
          name: "scope",
          description: "Scope of risk analysis",
          type: "string",
          required: true,
        },
        riskModel: {
          name: "riskModel",
          description: "Risk assessment model to use",
          type: "string",
          required: false,
          enum: ["cvss", "fair", "octave", "custom"],
          default: "cvss",
        },
        assets: {
          name: "assets",
          description: "Assets to include in risk analysis",
          type: "array",
          required: false,
          items: {
            name: "asset",
            description: "Asset identifier",
            type: "string",
            required: false,
          },
        },
        includeThreats: {
          name: "includeThreats",
          description: "Include threat landscape in analysis",
          type: "boolean",
          required: false,
          default: true,
        },
      },
    },
  },
  executor: createAnalysisExecutor("analyzeRisk"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [],
  scfControls: [
    "SCF-RSK.1",
    "SCF-RSK.2",
    "SCF-RSK.3",
    "SCF-RSK.4",
    "SCF-RMG.1",
    "SCF-RMG.2",
    "SCF-ACM.1",
    "SCF-ACM.2",
  ],
  severity: Severity.MEDIUM,
  tags: ["risk-analysis", "security-assessment", "analysis"],
};

export const analyzeCompliance: SecurityTool = {
  id: "analysis-compliance",
  name: "analyzeCompliance",
  description: "Analyze compliance status against security frameworks, regulations, and internal policies",
  category: ToolCategory.ANALYSIS,
  schema: {
    name: "analyzeCompliance",
    description: "Analyze compliance status",
    parameters: {
      type: "object",
      properties: {
        framework: {
          name: "framework",
          description: "Compliance framework to check",
          type: "string",
          required: true,
          enum: ["iso27001", "pci-dss", "gdpr", "hipaa", "nist", "soc2", "custom"],
        },
        scope: {
          name: "scope",
          description: "Scope of compliance analysis",
          type: "string",
          required: true,
        },
        controls: {
          name: "controls",
          description: "Specific controls to analyze",
          type: "array",
          required: false,
          items: {
            name: "control",
            description: "Control identifier",
            type: "string",
            required: false,
          },
        },
        includeRemediation: {
          name: "includeRemediation",
          description: "Include remediation recommendations",
          type: "boolean",
          required: false,
          default: true,
        },
      },
    },
  },
  executor: createAnalysisExecutor("analyzeCompliance"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [],
  scfControls: [
    "SCF-CMP.1",
    "SCF-CMP.2",
    "SCF-CMP.3",
    "SCF-CMP.4",
    "SCF-AUD.1",
    "SCF-AUD.2",
    "SCF-AUD.3",
  ],
  severity: Severity.INFO,
  tags: ["compliance", "audit", "analysis"],
};

export const analysisTools: SecurityTool[] = [
  analyzeLogs,
  queryThreatIntel,
  analyzeRisk,
  analyzeCompliance,
];
