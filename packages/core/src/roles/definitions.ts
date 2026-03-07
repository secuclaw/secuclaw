import type {
  RoleConfig,
  RoleDimension,
  Capability,
} from "./types.js";

const SEC: RoleDimension = "SEC";
const LEG: RoleDimension = "LEG";
const IT: RoleDimension = "IT";
const BIZ: RoleDimension = "BIZ";

const securityLightCapabilities: Capability[] = [
  {
    id: "threat-detection",
    name: "Threat Detection",
    nameZh: "威胁检测",
    description: "实时检测网络流量、日志、终端行为中的安全威胁",
    side: "light",
    sourceDimension: SEC,
    mitreTechniques: ["T1059", "T1566", "T1190", "T1133"],
    scfDomains: ["MON", "OPS"],
    requiredSkills: ["threat-analysis", "log-analysis"],
    requiredTools: ["siem", "ids", "edr"],
    proficiency: 5,
  },
  {
    id: "vulnerability-assessment",
    name: "Vulnerability Assessment",
    nameZh: "漏洞评估",
    description: "系统漏洞扫描、评估、优先级排序",
    side: "light",
    sourceDimension: SEC,
    mitreTechniques: ["T1190", "T1133"],
    scfDomains: ["VPM", "NET"],
    requiredSkills: ["vulnerability-scanning", "risk-assessment"],
    requiredTools: ["nessus", "openvas", "qualys"],
    proficiency: 5,
  },
  {
    id: "incident-response",
    name: "Incident Response",
    nameZh: "事件响应",
    description: "安全事件调查、遏制、恢复、复盘",
    side: "light",
    sourceDimension: SEC,
    mitreTechniques: ["T1078", "T1485", "T1486", "T1490"],
    scfDomains: ["IR", "OPS"],
    requiredSkills: ["forensics", "incident-handling"],
    requiredTools: ["splunk", "volatility", "autopsy"],
    proficiency: 5,
  },
  {
    id: "security-architecture",
    name: "Security Architecture",
    nameZh: "安全架构设计",
    description: "设计纵深防御体系、零信任架构",
    side: "light",
    sourceDimension: SEC,
    scfDomains: ["SEA", "NET", "END"],
    requiredSkills: ["architecture-design", "zero-trust"],
    requiredTools: ["diagrams", "arch-tool"],
    proficiency: 4,
  },
  {
    id: "identity-access-management",
    name: "Identity & Access Management",
    nameZh: "身份与访问管理",
    description: "IAM策略设计、权限最小化、访问控制",
    side: "light",
    sourceDimension: SEC,
    mitreTechniques: ["T1078", "T1098"],
    scfDomains: ["IAM", "END"],
    requiredSkills: ["iam-policy", "least-privilege"],
    requiredTools: ["ldap", "okta", "azure-ad"],
    proficiency: 4,
  },
];

const securityDarkCapabilities: Capability[] = [
  {
    id: "attack-path-discovery",
    name: "Attack Path Discovery",
    nameZh: "攻击路径发现",
    description: "识别从外网到核心资产的潜在攻击路径",
    side: "dark",
    sourceDimension: SEC,
    mitreTechniques: ["T1595", "T1591", "T1589"],
    scfDomains: ["THM", "VPM"],
    requiredSkills: ["reconnaissance", "network-mapping"],
    requiredTools: ["nmap", "masscan", "shodan"],
    proficiency: 5,
  },
  {
    id: "exploit-validation",
    name: "Exploit Validation",
    nameZh: "漏洞利用验证",
    description: "验证漏洞是否可被实际利用，评估真实风险",
    side: "dark",
    sourceDimension: SEC,
    mitreTechniques: ["T1190", "T1203", "T1068"],
    scfDomains: ["VPM", "NET"],
    requiredSkills: ["exploitation", "poc-development"],
    requiredTools: ["metasploit", "burpsuite", "cobalt-strike"],
    proficiency: 5,
  },
  {
    id: "attack-simulation",
    name: "Attack Simulation (AAS)",
    nameZh: "攻击模拟",
    description: "自动化模拟APT攻击链，检验防御有效性",
    side: "dark",
    sourceDimension: SEC,
    mitreTechniques: ["T1566", "T1059", "T1078", "T1021"],
    scfDomains: ["THM", "OPS"],
    requiredSkills: ["red-team-ops", "apt-simulation"],
    requiredTools: ["metasploit", "caldera", "atomic-red-team"],
    proficiency: 4,
  },
  {
    id: "penetration-testing",
    name: "Penetration Testing",
    nameZh: "渗透测试",
    description: "Web/网络/内网/云环境渗透测试",
    side: "dark",
    sourceDimension: SEC,
    mitreTechniques: ["T1190", "T1133", "T1021", "T1558"],
    scfDomains: ["VPM", "NET", "CLD"],
    requiredSkills: ["web-pentest", "network-pentest", "cloud-pentest"],
    requiredTools: ["burpsuite", "nmap", "metasploit", "pacu"],
    proficiency: 5,
  },
  {
    id: "threat-hunting",
    name: "Threat Hunting",
    nameZh: "威胁狩猎",
    description: "主动搜索环境中潜伏的威胁和异常行为",
    side: "dark",
    sourceDimension: SEC,
    mitreTechniques: ["T1059", "T1053", "T1078", "T1003"],
    scfDomains: ["THM", "MON"],
    requiredSkills: ["behavior-analysis", "hunt-methodology"],
    requiredTools: ["splunk", "elastic", "crowdstrike"],
    proficiency: 4,
  },
];

const legalCapabilities: Capability[] = [
  {
    id: "privacy-protection",
    name: "Privacy Protection",
    nameZh: "隐私保护",
    description: "PII识别、脱敏、GDPR/个人信息保护法合规",
    side: "light",
    sourceDimension: LEG,
    scfDomains: ["PRV", "DCH"],
    requiredSkills: ["data-classification", "privacy-compliance"],
    requiredTools: ["data-scanner", "dlp"],
    proficiency: 4,
  },
  {
    id: "data-security-compliance",
    name: "Data Security Compliance",
    nameZh: "数据安全合规",
    description: "数据安全法、网络安全法合规检查与建议",
    side: "light",
    sourceDimension: LEG,
    scfDomains: ["CPL", "GOV"],
    requiredSkills: ["compliance-audit", "regulatory-analysis"],
    requiredTools: ["compliance-checklist", "audit-tool"],
    proficiency: 4,
  },
];

const itCapabilities: Capability[] = [
  {
    id: "infrastructure-security",
    name: "Infrastructure Security",
    nameZh: "基础设施安全",
    description: "网络设备、服务器、云基础设施安全加固",
    side: "light",
    sourceDimension: IT,
    mitreTechniques: ["T1190", "T1133", "T1021"],
    scfDomains: ["NET", "CLD", "END"],
    requiredSkills: ["hardening", "network-security"],
    requiredTools: ["ansible", "terraform", "cis-benchmark"],
    proficiency: 4,
  },
  {
    id: "code-security-audit",
    name: "Code Security Audit",
    nameZh: "代码安全审计",
    description: "SAST/DAST代码安全扫描与审计",
    side: "light",
    sourceDimension: IT,
    mitreTechniques: ["T1190", "T1059"],
    scfDomains: ["SEA", "OPS"],
    requiredSkills: ["secure-coding", "code-review"],
    requiredTools: ["sonarqube", "snyk", "checkmarx"],
    proficiency: 4,
  },
  {
    id: "cloud-attack-ops",
    name: "Cloud Attack Operations",
    nameZh: "云环境攻击",
    description: "AWS/Azure/GCP环境渗透测试与攻击模拟",
    side: "dark",
    sourceDimension: IT,
    mitreTechniques: ["T1078", "T1535", "T1552", "T1098"],
    scfDomains: ["CLD", "IAM"],
    requiredSkills: ["cloud-pentest", "iam-exploitation"],
    requiredTools: ["pacu", "cloudsploit", "scoutSuite"],
    proficiency: 4,
  },
];

const businessCapabilities: Capability[] = [
  {
    id: "supply-chain-security",
    name: "Supply Chain Security",
    nameZh: "供应链安全",
    description: "第三方供应商安全评估、供应链攻击防护",
    side: "light",
    sourceDimension: BIZ,
    mitreTechniques: ["T1195", "T1199"],
    scfDomains: ["TPM", "RSK"],
    requiredSkills: ["vendor-assessment", "supply-chain-risk"],
    requiredTools: ["vendor-questionnaire", "risk-matrix"],
    proficiency: 3,
  },
  {
    id: "business-continuity",
    name: "Business Continuity",
    nameZh: "业务连续性保障",
    description: "BCP/DRP规划、演练、持续改进",
    side: "light",
    sourceDimension: BIZ,
    scfDomains: ["BCD", "OPS"],
    requiredSkills: ["bcp-planning", "dr-exercises"],
    requiredTools: ["bcp-template", "dr-tool"],
    proficiency: 3,
  },
];

export const ROLE_DEFINITIONS: RoleConfig[] = [
  {
    id: "security-expert",
    name: "Security Expert",
    nameZh: "安全专家",
    description: "纯安全角色，完整具备光明/黑暗攻防能力。专注于威胁检测、漏洞评估、事件响应、安全架构设计，同时具备攻击路径发现、渗透测试、威胁狩猎等进攻能力。",
    dimensions: [SEC],
    combinationType: "single",
    lightCapabilities: securityLightCapabilities,
    darkCapabilities: securityDarkCapabilities,
    priority: 1,
    icon: "🛡️",
    tags: ["security", "defense", "offense", "core"],
  },
  {
    id: "privacy-security-officer",
    name: "Privacy Security Officer",
    nameZh: "隐私安全官",
    description: "安全攻防能力 + 隐私保护/数据安全合规延伸。既能够检测数据泄露风险，又能确保隐私法规合规。",
    dimensions: [SEC, LEG],
    combinationType: "binary",
    lightCapabilities: [
      ...securityLightCapabilities.filter((c) =>
        ["threat-detection", "vulnerability-assessment", "incident-response"].includes(c.id)
      ),
      ...legalCapabilities,
    ],
    darkCapabilities: [
      ...securityDarkCapabilities.filter((c) =>
        ["attack-path-discovery", "penetration-testing"].includes(c.id)
      ),
    ],
    priority: 2,
    icon: "🔒",
    tags: ["security", "legal", "privacy", "compliance"],
  },
  {
    id: "security-architect",
    name: "Security Architect",
    nameZh: "安全架构师",
    description: "安全攻防能力 + 基础设施/代码/网络安全延伸。能够设计整体安全架构，同时验证架构的攻击面。",
    dimensions: [SEC, IT],
    combinationType: "binary",
    lightCapabilities: [
      ...securityLightCapabilities.filter((c) =>
        ["security-architecture", "identity-access-management", "threat-detection"].includes(c.id)
      ),
      ...itCapabilities.filter((c) => c.side === "light"),
    ],
    darkCapabilities: [
      ...securityDarkCapabilities.filter((c) =>
        ["attack-path-discovery", "attack-simulation", "exploit-validation"].includes(c.id)
      ),
      itCapabilities.find((c) => c.id === "cloud-attack-ops")!,
    ],
    priority: 2,
    icon: "🏗️",
    tags: ["security", "it", "architecture", "infrastructure"],
  },
  {
    id: "business-security-officer",
    name: "Business Security Officer",
    nameZh: "业务安全官",
    description: "安全攻防能力 + 供应链安全/业务连续性延伸。保护业务运营，管理供应链风险。",
    dimensions: [SEC, BIZ],
    combinationType: "binary",
    lightCapabilities: [
      ...securityLightCapabilities.filter((c) =>
        ["incident-response", "threat-detection", "security-architecture"].includes(c.id)
      ),
      ...businessCapabilities,
    ],
    darkCapabilities: [
      ...securityDarkCapabilities.filter((c) =>
        ["threat-hunting", "attack-path-discovery"].includes(c.id)
      ),
    ],
    priority: 2,
    icon: "💼",
    tags: ["security", "business", "supply-chain", "continuity"],
  },
  {
    id: "chief-security-architect",
    name: "Chief Security Architect",
    nameZh: "首席安全架构官",
    description: "安全攻防 + 合规延伸 + 技术安全延伸。全面负责企业安全架构，确保合规与技术实现的一致性。",
    dimensions: [SEC, LEG, IT],
    combinationType: "ternary",
    lightCapabilities: [
      ...securityLightCapabilities,
      ...legalCapabilities,
      ...itCapabilities.filter((c) => c.side === "light"),
    ],
    darkCapabilities: [
      ...securityDarkCapabilities.filter((c) =>
        ["attack-simulation", "penetration-testing", "attack-path-discovery"].includes(c.id)
      ),
      itCapabilities.find((c) => c.id === "cloud-attack-ops")!,
    ],
    priority: 3,
    icon: "👔",
    tags: ["security", "legal", "it", "leadership", "architecture"],
  },
  {
    id: "supply-chain-security-officer",
    name: "Supply Chain Security Officer",
    nameZh: "供应链安全官",
    description: "安全攻防 + 隐私合规延伸 + 供应链安全延伸。专注于供应链攻击防护与第三方风险管理。",
    dimensions: [SEC, LEG, BIZ],
    combinationType: "ternary",
    lightCapabilities: [
      ...securityLightCapabilities.filter((c) =>
        ["threat-detection", "vulnerability-assessment", "incident-response"].includes(c.id)
      ),
      ...legalCapabilities,
      ...businessCapabilities,
    ],
    darkCapabilities: [
      ...securityDarkCapabilities.filter((c) =>
        ["attack-path-discovery", "threat-hunting"].includes(c.id)
      ),
    ],
    priority: 3,
    icon: "🔗",
    tags: ["security", "legal", "business", "supply-chain", "third-party"],
  },
  {
    id: "business-security-operations",
    name: "Business Security Operations Officer",
    nameZh: "业务安全运营官",
    description: "安全攻防 + 技术安全延伸 + 业务连续性延伸。确保业务运营安全与持续可用。",
    dimensions: [SEC, IT, BIZ],
    combinationType: "ternary",
    lightCapabilities: [
      ...securityLightCapabilities.filter((c) =>
        ["incident-response", "threat-detection", "security-architecture", "identity-access-management"].includes(c.id)
      ),
      ...itCapabilities.filter((c) => c.side === "light"),
      ...businessCapabilities,
    ],
    darkCapabilities: [
      ...securityDarkCapabilities.filter((c) =>
        ["attack-simulation", "threat-hunting"].includes(c.id)
      ),
      itCapabilities.find((c) => c.id === "cloud-attack-ops")!,
    ],
    priority: 3,
    icon: "⚙️",
    tags: ["security", "it", "business", "operations", "continuity"],
  },
  {
    id: "secuclaw",
    name: "Secuclaw Security Commander",
    nameZh: "全域安全指挥官",
    description: "完整的安全攻防能力 + 全维度安全属性延伸。以安全角色的光明/黑暗极致攻防能力为核心，延伸覆盖隐私保护、技术安全、供应链安全、业务连续性等全领域。",
    dimensions: [SEC, LEG, IT, BIZ],
    combinationType: "quaternary",
    lightCapabilities: [
      ...securityLightCapabilities,
      ...legalCapabilities,
      ...itCapabilities.filter((c) => c.side === "light"),
      ...businessCapabilities,
    ],
    darkCapabilities: [
      ...securityDarkCapabilities,
      itCapabilities.find((c) => c.id === "cloud-attack-ops")!,
    ],
    priority: 4,
    icon: "🎖️",
    tags: ["security", "legal", "it", "business", "commander", "leadership", "full-spectrum"],
  },
];

export const ROLE_MAP = new Map(ROLE_DEFINITIONS.map((r) => [r.id, r]));

export function getRoleById(id: string): RoleConfig | undefined {
  return ROLE_MAP.get(id);
}

export function getRolesByDimension(dimension: RoleDimension): RoleConfig[] {
  return ROLE_DEFINITIONS.filter((r) => r.dimensions.includes(dimension));
}

export function getRolesByCombinationType(
  type: RoleConfig["combinationType"]
): RoleConfig[] {
  return ROLE_DEFINITIONS.filter((r) => r.combinationType === type);
}

export function getDefaultRole(): RoleConfig {
  return ROLE_DEFINITIONS[0];
}
