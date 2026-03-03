import {
  ToolCategory,
  ToolPolicyMode,
  Severity,
  SecurityTool,
  ToolExecutor,
  ToolContext,
  ToolResult,
} from "../types";

const createAttackExecutor = (
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

export const discoverAttackPath: SecurityTool = {
  id: "attack-discover-path",
  name: "discoverAttackPath",
  description: "Discover potential attack paths in the target environment by analyzing network topology, trust relationships, and vulnerabilities",
  category: ToolCategory.ATTACK,
  schema: {
    name: "discoverAttackPath",
    description: "Discover potential attack paths in the target environment",
    parameters: {
      type: "object",
      properties: {
        target: {
          name: "target",
          description: "Target system or network range to analyze",
          type: "string",
          required: true,
        },
        depth: {
          name: "depth",
          description: "Maximum depth for attack path discovery",
          type: "number",
          required: false,
          default: 3,
        },
        includePublicExposure: {
          name: "includePublicExposure",
          description: "Include publicly exposed attack vectors",
          type: "boolean",
          required: false,
          default: false,
        },
      },
    },
  },
  executor: createAttackExecutor("discoverAttackPath"),
  policy: {
    mode: ToolPolicyMode.DENY,
    denyList: ["production", "critical-infrastructure"],
  },
  mitreTechniques: [
    "TA0001-initial-access",
    "TA0002-execution",
    "TA0003-persistence",
    "TA0004-privilege-escalation",
    "TA0005-defense-evasion",
    "TA0006-credential-access",
    "TA0007-discovery",
    "TA0008-lateral-movement",
    "TA0009-collection",
    "TA0010-exfiltration",
    "T1087-account-discovery",
    "T1082-system-information-discovery",
    "T1046-network-service-discovery",
    "T1136-create-account",
    "T1547-boot-or-logon-autostart-execution",
  ],
  scfControls: [
    "SCF-ACM.1",
    "SCF-ACM.2",
    "SCF-ACM.3",
    "SCF-AMI.1",
    "SCF-ASD.1",
    "SCF-ASD.2",
    "SCF-AUD.1",
    "SCF-AUD.2",
    "SCF-AUD.3",
  ],
  severity: Severity.HIGH,
  tags: ["attack-simulation", "red-team", "attack-path"],
};

export const validateExploit: SecurityTool = {
  id: "attack-validate-exploit",
  name: "validateExploit",
  description: "Validate if a specific exploit is applicable and effective against the target system",
  category: ToolCategory.ATTACK,
  schema: {
    name: "validateExploit",
    description: "Validate exploit effectiveness against target",
    parameters: {
      type: "object",
      properties: {
        exploitId: {
          name: "exploitId",
          description: "CVE or exploit identifier to validate",
          type: "string",
          required: true,
        },
        target: {
          name: "target",
          description: "Target system information",
          type: "string",
          required: true,
        },
        checkOnly: {
          name: "checkOnly",
          description: "Only check applicability without executing",
          type: "boolean",
          required: false,
          default: true,
        },
      },
    },
  },
  executor: createAttackExecutor("validateExploit"),
  policy: {
    mode: ToolPolicyMode.DENY,
    denyList: ["production"],
  },
  mitreTechniques: [
    "T1190-exploit-public-facing-application",
    "T1200-adversary-in-the-middle",
    "T1210-exploitation-of-remote-services",
    "T1211-exploitation-for-defense-evasion",
    "T1212-exploitation-for-credential-access",
    "T1213-data-from-information-repositories",
  ],
  scfControls: [
    "SCF-ACM.1",
    "SCF-ACR.1",
    "SCF-ACR.2",
    "SCF-ASD.1",
    "SCF-ASD.2",
    "SCF-DIA.1",
    "SCF-DIA.2",
  ],
  severity: Severity.CRITICAL,
  tags: ["exploit", "vulnerability", "validation"],
};

export const simulateAttack: SecurityTool = {
  id: "attack-simulate",
  name: "simulateAttack",
  description: "Execute a controlled attack simulation to test security controls and incident response procedures",
  category: ToolCategory.ATTACK,
  schema: {
    name: "simulateAttack",
    description: "Execute controlled attack simulation",
    parameters: {
      type: "object",
      properties: {
        scenario: {
          name: "scenario",
          description: "Attack scenario to simulate",
          type: "string",
          required: true,
          enum: ["phishing", "ransomware", "insider-threat", "supply-chain", "ddos"],
        },
        scope: {
          name: "scope",
          description: "Systems or users in scope",
          type: "array",
          required: true,
          items: {
            name: "target",
            description: "Target identifier",
            type: "string",
            required: false,
          },
        },
        intensity: {
          name: "intensity",
          description: "Simulation intensity level",
          type: "string",
          required: false,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
        notifyDefenders: {
          name: "notifyDefenders",
          description: "Notify security team during simulation",
          type: "boolean",
          required: false,
          default: true,
        },
      },
    },
  },
  executor: createAttackExecutor("simulateAttack"),
  policy: {
    mode: ToolPolicyMode.DENY,
    denyList: ["production"],
  },
  mitreTechniques: [
    "T1566-phishing",
    "T1486-data-encrypted-for-impact",
    "T1195-supply-chain-compromise",
    "T1498-network-denial-of-service",
    "T1133-external-remote-services",
    "T1078-valid-accounts",
  ],
  scfControls: [
    "SCF-ACM.1",
    "SCF-ACM.2",
    "SCF-ACM.3",
    "SCF-AUD.1",
    "SCF-AUD.2",
    "SCF-AUD.3",
    "SCF-APR.1",
    "SCF-APR.2",
    "SCF-IRP.1",
    "SCF-IRP.2",
  ],
  severity: Severity.HIGH,
  tags: ["attack-simulation", "red-team", "testing"],
};

export const penetrationTest: SecurityTool = {
  id: "attack-penetration-test",
  name: "penetrationTest",
  description: "Conduct comprehensive penetration testing to identify exploitable vulnerabilities",
  category: ToolCategory.ATTACK,
  schema: {
    name: "penetrationTest",
    description: "Conduct penetration testing",
    parameters: {
      type: "object",
      properties: {
        targetType: {
          name: "targetType",
          description: "Type of target to test",
          type: "string",
          required: true,
          enum: ["web", "network", "mobile", "api", "cloud", "full"],
        },
        scope: {
          name: "scope",
          description: "Target scope for penetration test",
          type: "array",
          required: true,
          items: {
            name: "target",
            description: "Target identifier",
            type: "string",
            required: false,
          },
        },
        methodology: {
          name: "methodology",
          description: "Testing methodology to follow",
          type: "string",
          required: false,
          enum: ["owasp", "ptes", "nist", "custom"],
          default: "owasp",
        },
        includeAuthenticated: {
          name: "includeAuthenticated",
          description: "Include authenticated testing scenarios",
          type: "boolean",
          required: false,
          default: false,
        },
      },
    },
  },
  executor: createAttackExecutor("penetrationTest"),
  policy: {
    mode: ToolPolicyMode.DENY,
    denyList: ["production", "critical-infrastructure"],
  },
  mitreTechniques: [
    "T1190-exploit-public-facing-application",
    "T1210-exploitation-of-remote-services",
    "T1059-command-and-scripting-interpreter",
    "T1055-process-injection",
    "T1005-data-from-local-system",
    "T1041-exfiltration-over-c2-channel",
  ],
  scfControls: [
    "SCF-ACM.1",
    "SCF-ACM.2",
    "SCF-ACR.1",
    "SCF-ACR.2",
    "SCF-ASD.1",
    "SCF-ASD.2",
    "SCF-DIA.1",
    "SCF-DIA.2",
    "SCF-VPM.1",
    "SCF-VPM.2",
  ],
  severity: Severity.HIGH,
  tags: ["penetration-test", "vulnerability-assessment", "security-testing"],
};

export const threatHunt: SecurityTool = {
  id: "attack-threat-hunt",
  name: "threatHunt",
  description: "Proactively search for indicators of compromise and hidden threats in the environment",
  category: ToolCategory.ATTACK,
  schema: {
    name: "threatHunt",
    description: "Conduct threat hunting operations",
    parameters: {
      type: "object",
      properties: {
        hypothesis: {
          name: "hypothesis",
          description: "Threat hypothesis to investigate",
          type: "string",
          required: true,
        },
        huntType: {
          name: "huntType",
          description: "Type of threat hunt",
          type: "string",
          required: false,
          enum: ["apt", "insider", "malware", "behavioral", "intelligence-driven"],
          default: "behavioral",
        },
        dataSources: {
          name: "dataSources",
          description: "Data sources to analyze",
          type: "array",
          required: false,
          items: {
            name: "datasource",
            description: "Data source name",
            type: "string",
            required: false,
          },
        },
        timeRange: {
          name: "timeRange",
          description: "Time range to analyze (e.g., 7d, 30d)",
          type: "string",
          required: false,
          default: "30d",
        },
      },
    },
  },
  executor: createAttackExecutor("threatHunt"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [
    "T1005-data-from-local-system",
    "T1007-system-service-discovery",
    "T1010-application-window-discovery",
    "T1012-query-registry",
    "T1018-remote-system-discovery",
    "T1021-remote-services",
    "T1047-windows-management-instrumentation",
    "T1057-process-discovery",
    "T1082-system-information-discovery",
    "T1083-file-and-directory-discovery",
    "T1087-account-discovery",
    "T1124-system-service-discovery",
    "T1204-user-execution",
    "T1569-service-execution",
  ],
  scfControls: [
    "SCF-AUD.1",
    "SCF-AUD.2",
    "SCF-AUD.3",
    "SCF-MON.1",
    "SCF-MON.2",
    "SCF-MON.3",
    "SCF-ISA.1",
    "SCF-ISA.2",
  ],
  severity: Severity.MEDIUM,
  tags: ["threat-hunting", "threat-intelligence", "incident-detection"],
};

export const attackTools: SecurityTool[] = [
  discoverAttackPath,
  validateExploit,
  simulateAttack,
  penetrationTest,
  threatHunt,
];
