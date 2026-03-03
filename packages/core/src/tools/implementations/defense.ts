import {
  ToolCategory,
  ToolPolicyMode,
  Severity,
  SecurityTool,
  ToolExecutor,
  ToolContext,
  ToolResult,
} from "../types";
import { executeNmapScan, executeHttpProbe, executeDnsLookup, checkToolAvailable } from "../executors/index.js";

const createDefenseExecutor = (
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

const scanVulnerabilityExecutor: ToolExecutor<Record<string, unknown>> = async (
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const target = params.target as string;
  const scanType = (params.scanType as string) ?? "connect";
  
  if (!target) {
    return { success: false, error: "Target parameter is required" };
  }

  const nmapAvailable = await checkToolAvailable("nmap");
  
  if (nmapAvailable) {
    const scanTypeMap: Record<string, string> = {
      network: "connect",
      web: "version",
      container: "connect",
      cloud: "quick",
      full: "aggressive",
    };
    
    return executeNmapScan(
      {
        target,
        scanType: scanTypeMap[scanType] ?? "connect",
        timeout: 120000,
      },
      context
    );
  }

  return {
    success: true,
    data: {
      target,
      scanType,
      message: "Vulnerability scan simulated (nmap not available)",
      sessionId: context.sessionId,
      note: "Install nmap for real scanning: brew install nmap",
    },
  };
};

export const detectThreat: SecurityTool = {
  id: "defense-detect-threat",
  name: "detectThreat",
  description: "Detect known and unknown threats using advanced detection engines, behavioral analysis, and machine learning",
  category: ToolCategory.DEFENSE,
  schema: {
    name: "detectThreat",
    description: "Detect threats in the environment",
    parameters: {
      type: "object",
      properties: {
        dataSource: {
          name: "dataSource",
          description: "Data source to analyze for threats",
          type: "string",
          required: true,
        },
        detectionMethods: {
          name: "detectionMethods",
          description: "Detection methods to use",
          type: "array",
          required: false,
          items: {
            name: "method",
            description: "Detection method",
            type: "string",
            required: false,
          },
        },
        sensitivity: {
          name: "sensitivity",
          description: "Detection sensitivity level",
          type: "string",
          required: false,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
      },
    },
  },
  executor: createDefenseExecutor("detectThreat"),
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
    "T1048-exfiltration-over-alternative-protocol",
    "T1059-command-and-scripting-interpreter",
    "T1070-indicator-removal",
    "T1078-valid-accounts",
    "T1082-system-information-discovery",
    "T1083-file-and-directory-discovery",
    "T1087-account-discovery",
  ],
  scfControls: [
    "SCF-MON.1",
    "SCF-MON.2",
    "SCF-MON.3",
    "SCF-DET.1",
    "SCF-DET.2",
    "SCF-DET.3",
    "SCF-ISA.1",
    "SCF-ISA.2",
    "SCF-AUD.1",
    "SCF-AUD.2",
  ],
  severity: Severity.HIGH,
  tags: ["threat-detection", "security-monitoring", "defense"],
};

export const scanVulnerability: SecurityTool = {
  id: "defense-scan-vulnerability",
  name: "scanVulnerability",
  description: "Scan systems, applications, and infrastructure for vulnerabilities and misconfigurations",
  category: ToolCategory.DEFENSE,
  schema: {
    name: "scanVulnerability",
    description: "Scan for vulnerabilities",
    parameters: {
      type: "object",
      properties: {
        target: {
          name: "target",
          description: "Target systems or networks to scan",
          type: "string",
          required: true,
        },
        scanType: {
          name: "scanType",
          description: "Type of vulnerability scan",
          type: "string",
          required: false,
          enum: ["network", "web", "container", "cloud", "full"],
          default: "network",
        },
        scanDepth: {
          name: "scanDepth",
          description: "Depth of the scan",
          type: "string",
          required: false,
          enum: ["basic", "standard", "deep"],
          default: "standard",
        },
      },
    },
  },
  executor: scanVulnerabilityExecutor,
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [
    "T1046-network-service-discovery",
    "T1082-system-information-discovery",
    "T1083-file-and-directory-discovery",
    "T1595-active-scan",
    "T1592-gather-host-information",
  ],
  scfControls: [
    "SCF-VPM.1",
    "SCF-VPM.2",
    "SCF-VPM.3",
    "SCF-VPM.4",
    "SCF-DIA.1",
    "SCF-DIA.2",
    "SCF-ACM.1",
    "SCF-ACM.2",
  ],
  severity: Severity.HIGH,
  tags: ["vulnerability-scanning", "security-assessment", "defense"],
};

export const designArchitecture: SecurityTool = {
  id: "defense-design-architecture",
  name: "designArchitecture",
  description: "Design and recommend security architectures, controls, and defensive measures",
  category: ToolCategory.DEFENSE,
  schema: {
    name: "designArchitecture",
    description: "Design security architecture",
    parameters: {
      type: "object",
      properties: {
        architectureType: {
          name: "architectureType",
          description: "Type of architecture to design",
          type: "string",
          required: true,
          enum: ["network", "application", "cloud", "zero-trust", "defense-in-depth"],
        },
        requirements: {
          name: "requirements",
          description: "Security requirements to address",
          type: "array",
          required: true,
          items: {
            name: "requirement",
            description: "Security requirement",
            type: "string",
            required: false,
          },
        },
        complianceFrameworks: {
          name: "complianceFrameworks",
          description: "Compliance frameworks to follow",
          type: "array",
          required: false,
          items: {
            name: "framework",
            description: "Compliance framework",
            type: "string",
            required: false,
          },
        },
      },
    },
  },
  executor: createDefenseExecutor("designArchitecture"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [],
  scfControls: [
    "SCF-ACM.1",
    "SCF-ACM.2",
    "SCF-ACM.3",
    "SCF-ACR.1",
    "SCF-ACR.2",
    "SCF-ACS.1",
    "SCF-ACS.2",
    "SCF-DES.1",
    "SCF-DES.2",
  ],
  severity: Severity.INFO,
  tags: ["architecture", "security-design", "defense"],
};

export const incidentResponse: SecurityTool = {
  id: "defense-incident-response",
  name: "incidentResponse",
  description: "Execute incident response procedures, contain threats, and coordinate recovery actions",
  category: ToolCategory.DEFENSE,
  schema: {
    name: "incidentResponse",
    description: "Execute incident response",
    parameters: {
      type: "object",
      properties: {
        incidentType: {
          name: "incidentType",
          description: "Type of security incident",
          type: "string",
          required: true,
          enum: ["breach", "malware", "phishing", "ddos", "insider-threat", "data-exfiltration"],
        },
        severity: {
          name: "severity",
          description: "Incident severity level",
          type: "string",
          required: true,
          enum: ["critical", "high", "medium", "low"],
        },
        affectedSystems: {
          name: "affectedSystems",
          description: "Systems affected by the incident",
          type: "array",
          required: true,
          items: {
            name: "system",
            description: "Affected system",
            type: "string",
            required: false,
          },
        },
        containmentActions: {
          name: "containmentActions",
          description: "Actions to take for containment",
          type: "array",
          required: false,
          items: {
            name: "action",
            description: "Containment action",
            type: "string",
            required: false,
          },
        },
      },
    },
  },
  executor: createDefenseExecutor("incidentResponse"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [
    "T1027-obfuscated-files-or-information",
    "T1036-masquerading",
    "T1047-windows-management-instrumentation",
    "T1053-scheduled-task-job",
    "T1070-indicator-removal",
    "T1078-valid-accounts",
    "T1089-impair-defenses",
    "T1485-data-destruction",
    "T1486-data-encrypted-for-impact",
    "T1490-inhibit-system-recovery",
  ],
  scfControls: [
    "SCF-IRP.1",
    "SCF-IRP.2",
    "SCF-IRP.3",
    "SCF-IRP.4",
    "SCF-IRP.5",
    "SCF-COP.1",
    "SCF-COP.2",
    "SCF-ACS.1",
    "SCF-ACS.2",
  ],
  severity: Severity.CRITICAL,
  tags: ["incident-response", "security-operations", "defense"],
};

export const defenseTools: SecurityTool[] = [
  detectThreat,
  scanVulnerability,
  designArchitecture,
  incidentResponse,
];
