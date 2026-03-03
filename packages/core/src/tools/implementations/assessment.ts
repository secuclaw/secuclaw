import {
  ToolCategory,
  ToolPolicyMode,
  Severity,
  SecurityTool,
  ToolExecutor,
  ToolContext,
  ToolResult,
} from "../types";

const createAssessmentExecutor = (
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

export const assessCompliance: SecurityTool = {
  id: "assessment-compliance",
  name: "assessCompliance",
  description: "Assess compliance against security frameworks, regulations, and internal policies",
  category: ToolCategory.ASSESSMENT,
  schema: {
    name: "assessCompliance",
    description: "Assess security compliance",
    parameters: {
      type: "object",
      properties: {
        framework: {
          name: "framework",
          description: "Compliance framework to assess",
          type: "string",
          required: true,
          enum: ["iso27001", "pci-dss", "gdpr", "hipaa", "nist", "soc2", "custom"],
        },
        scope: {
          name: "scope",
          description: "Scope of the assessment",
          type: "string",
          required: true,
        },
        assessmentType: {
          name: "assessmentType",
          description: "Type of compliance assessment",
          type: "string",
          required: false,
          enum: ["internal", "external", "self-assessment", "certification"],
          default: "self-assessment",
        },
      },
    },
  },
  executor: createAssessmentExecutor("assessCompliance"),
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
    "SCF-APR.1",
    "SCF-APR.2",
  ],
  severity: Severity.MEDIUM,
  tags: ["compliance", "audit", "assessment"],
};

export const assessVulnerability: SecurityTool = {
  id: "assessment-vulnerability",
  name: "assessVulnerability",
  description: "Assess vulnerabilities to determine risk level, exploitation potential, and remediation priority",
  category: ToolCategory.ASSESSMENT,
  schema: {
    name: "assessVulnerability",
    description: "Assess vulnerability risks",
    parameters: {
      type: "object",
      properties: {
        vulnerabilities: {
          name: "vulnerabilities",
          description: "Vulnerabilities to assess",
          type: "array",
          required: true,
          items: {
            name: "vulnerability",
            description: "Vulnerability identifier (CVE or internal ID)",
            type: "string",
            required: false,
          },
        },
        assessmentMethod: {
          name: "assessmentMethod",
          description: "Assessment methodology",
          type: "string",
          required: false,
          enum: ["cvss", "vpr", "ssvc", "custom"],
          default: "cvss",
        },
        context: {
          name: "context",
          description: "Environmental context for assessment",
          type: "object",
          required: false,
          properties: {
            assetCriticality: {
              name: "assetCriticality",
              description: "Criticality of affected assets",
              type: "string",
              required: false,
            },
            exposure: {
              name: "exposure",
              description: "External exposure level",
              type: "string",
              required: false,
            },
          },
        },
      },
    },
  },
  executor: createAssessmentExecutor("assessVulnerability"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [
    "T1046-network-service-discovery",
    "T1082-system-information-discovery",
    "T1083-file-and-directory-discovery",
    "T1592-gather-host-information",
  ],
  scfControls: [
    "SCF-VPM.1",
    "SCF-VPM.2",
    "SCF-VPM.3",
    "SCF-VPM.4",
    "SCF-RSK.1",
    "SCF-RSK.2",
    "SCF-RSK.3",
    "SCF-DIA.1",
    "SCF-DIA.2",
  ],
  severity: Severity.HIGH,
  tags: ["vulnerability-assessment", "risk-assessment", "assessment"],
};

export const assessControl: SecurityTool = {
  id: "assessment-control",
  name: "assessControl",
  description: "Assess the effectiveness of security controls and countermeasures",
  category: ToolCategory.ASSESSMENT,
  schema: {
    name: "assessControl",
    description: "Assess security controls",
    parameters: {
      type: "object",
      properties: {
        controlType: {
          name: "controlType",
          description: "Type of security control",
          type: "string",
          required: true,
          enum: ["technical", "administrative", "physical", "preventive", "detective", "corrective"],
        },
        controls: {
          name: "controls",
          description: "Specific controls to assess",
          type: "array",
          required: true,
          items: {
            name: "control",
            description: "Control identifier",
            type: "string",
            required: false,
          },
        },
        assessmentMethod: {
          name: "assessmentMethod",
          description: "Method for control assessment",
          type: "string",
          required: false,
          enum: ["testing", "interview", "documentation", "observation", "automated"],
          default: "automated",
        },
      },
    },
  },
  executor: createAssessmentExecutor("assessControl"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [],
  scfControls: [
    "SCF-ACR.1",
    "SCF-ACR.2",
    "SCF-ACM.1",
    "SCF-ACM.2",
    "SCF-ACM.3",
    "SCF-ACS.1",
    "SCF-ACS.2",
    "SCF-ASD.1",
    "SCF-ASD.2",
  ],
  severity: Severity.MEDIUM,
  tags: ["control-assessment", "security-controls", "assessment"],
};

export const assessArchitecture: SecurityTool = {
  id: "assessment-architecture",
  name: "assessArchitecture",
  description: "Assess security architecture for design flaws, misconfigurations, and improvement opportunities",
  category: ToolCategory.ASSESSMENT,
  schema: {
    name: "assessArchitecture",
    description: "Assess security architecture",
    parameters: {
      type: "object",
      properties: {
        architectureType: {
          name: "architectureType",
          description: "Type of architecture",
          type: "string",
          required: true,
          enum: ["network", "application", "cloud", "hybrid", "zero-trust"],
        },
        scope: {
          name: "scope",
          description: "Scope of architecture assessment",
          type: "string",
          required: true,
        },
        assessmentFramework: {
          name: "assessmentFramework",
          description: "Framework to use for assessment",
          type: "string",
          required: false,
          enum: ["sabsa", "toGAF", "zeff", "custom"],
          default: "sabsa",
        },
      },
    },
  },
  executor: createAssessmentExecutor("assessArchitecture"),
  policy: {
    mode: ToolPolicyMode.ALLOW,
  },
  mitreTechniques: [],
  scfControls: [
    "SCF-DES.1",
    "SCF-DES.2",
    "SCF-ACM.1",
    "SCF-ACM.2",
    "SCF-ACM.3",
    "SCF-ACS.1",
    "SCF-ACS.2",
    "SCF-RSK.1",
    "SCF-RSK.2",
  ],
  severity: Severity.MEDIUM,
  tags: ["architecture-assessment", "security-design", "assessment"],
};

export const assessBusiness: SecurityTool = {
  id: "assessment-business",
  name: "assessBusiness",
  description: "Assess business risks, impact analysis, and security requirements for business processes",
  category: ToolCategory.ASSESSMENT,
  schema: {
    name: "assessBusiness",
    description: "Assess business security risks",
    parameters: {
      type: "object",
      properties: {
        businessProcesses: {
          name: "businessProcesses",
          description: "Business processes to assess",
          type: "array",
          required: true,
          items: {
            name: "process",
            description: "Business process identifier",
            type: "string",
            required: false,
          },
        },
        assessmentType: {
          name: "assessmentType",
          description: "Type of business assessment",
          type: "string",
          required: false,
          enum: ["bia", "risk-analysis", "threat-modeling", "full"],
          default: "bia",
        },
        includeCountermeasures: {
          name: "includeCountermeasures",
          description: "Include existing countermeasures in analysis",
          type: "boolean",
          required: false,
          default: true,
        },
      },
    },
  },
  executor: createAssessmentExecutor("assessBusiness"),
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
  tags: ["business-assessment", "bia", "risk-assessment", "assessment"],
};

export const assessmentTools: SecurityTool[] = [
  assessCompliance,
  assessVulnerability,
  assessControl,
  assessArchitecture,
  assessBusiness,
];
