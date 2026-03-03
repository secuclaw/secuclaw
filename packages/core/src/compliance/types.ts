export type ComplianceStatus =
  | "compliant"
  | "partially_compliant"
  | "non_compliant"
  | "not_applicable"
  | "not_assessed";

export type ComplianceSeverity = "critical" | "high" | "medium" | "low";

export type AssessmentType =
  | "self_assessment"
  | "automated_scan"
  | "third_party_audit"
  | "continuous_monitoring";

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  domains: string[];
  totalControls: number;
  mandatoryControls: number;
}

export interface ComplianceControl {
  id: string;
  domain: string;
  name: string;
  description: string;
  requirement: string;
  guidance?: string;
  severity: ComplianceSeverity;
  mandatory: boolean;
  mappings: Array<{
    framework: string;
    controlId: string;
  }>;
}

export interface ComplianceAssessment {
  id: string;
  controlId: string;
  status: ComplianceStatus;
  score: number;
  evidence?: string[];
  gaps: ComplianceGap[];
  remediation?: string;
  assessedAt: number;
  assessedBy: string;
  assessmentType: AssessmentType;
  nextReviewAt?: number;
}

export interface ComplianceGap {
  id: string;
  controlId: string;
  controlName: string;
  domain: string;
  severity: ComplianceSeverity;
  description: string;
  impact: string;
  recommendation: string;
  effort: "low" | "medium" | "high";
  cost: "low" | "medium" | "high";
  priority: number;
  relatedControls: string[];
  mitreMappings?: string[];
}

export interface ComplianceReport {
  id: string;
  name: string;
  framework: string;
  generatedAt: number;
  summary: {
    totalControls: number;
    compliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
    notApplicable: number;
    notAssessed: number;
    overallScore: number;
    complianceRate: number;
  };
  domainScores: Array<{
    domain: string;
    score: number;
    compliantCount: number;
    totalCount: number;
  }>;
  criticalGaps: ComplianceGap[];
  recommendations: string[];
  timeline: Array<{
    date: string;
    action: string;
    owner?: string;
  }>;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  controls: string[];
  exceptions: Array<{
    controlId: string;
    reason: string;
    expiresAt: number;
    approvedBy: string;
  }>;
  owner: string;
  version: string;
  effectiveDate: number;
  reviewDate: number;
}

export interface ComplianceConfig {
  frameworks: ComplianceFramework[];
  assessmentFrequency: number;
  autoAssessment: boolean;
  alertThreshold: number;
  reportingEnabled: boolean;
  notificationChannels: string[];
}

export const SCF_DOMAINS = [
  { code: "GOV", name: "网络安全与数据保护治理", priority: 1 },
  { code: "IAM", name: "身份与认证", priority: 2 },
  { code: "AAT", name: "人工智能与自动化技术", priority: 3 },
  { code: "IR", name: "事件响应", priority: 4 },
  { code: "AST", name: "资产管理", priority: 5 },
  { code: "IA", name: "信息保障", priority: 6 },
  { code: "BCD", name: "业务连续性与灾难恢复", priority: 7 },
  { code: "MA", name: "维护", priority: 8 },
  { code: "CHG", name: "变更管理", priority: 9 },
  { code: "CLD", name: "云安全", priority: 10 },
  { code: "PES", name: "物理与环境安全", priority: 11 },
  { code: "CPL", name: "合规", priority: 12 },
  { code: "PRV", name: "数据隐私", priority: 13 },
  { code: "CFG", name: "配置管理", priority: 14 },
  { code: "PRJ", name: "项目与资源管理", priority: 15 },
  { code: "MON", name: "持续监控", priority: 16 },
  { code: "RSK", name: "风险管理", priority: 17 },
  { code: "CRY", name: "加密保护", priority: 18 },
  { code: "SEA", name: "安全工程与架构", priority: 19 },
  { code: "DCH", name: "数据分类与处理", priority: 20 },
  { code: "OPS", name: "安全运营", priority: 21 },
  { code: "EMB", name: "嵌入式技术", priority: 22 },
  { code: "SAT", name: "安全意识与培训", priority: 23 },
  { code: "END", name: "端点安全", priority: 24 },
  { code: "TDA", name: "技术开发与采购", priority: 25 },
  { code: "HRS", name: "人力资源安全", priority: 26 },
  { code: "TPM", name: "第三方管理", priority: 27 },
  { code: "THM", name: "威胁管理", priority: 28 },
  { code: "VPM", name: "漏洞与补丁管理", priority: 29 },
  { code: "WEB", name: "Web安全", priority: 30 },
  { code: "CAP", name: "容量与性能规划", priority: 31 },
  { code: "MDM", name: "移动设备管理", priority: 32 },
  { code: "NET", name: "网络安全", priority: 33 },
];

export const FRAMEWORK_MAPPINGS = {
  NIST_CSF: {
    name: "NIST Cybersecurity Framework",
    version: "2.0",
    domains: ["ID", "PR", "DE", "RS", "RC"],
  },
  ISO_27001: {
    name: "ISO/IEC 27001",
    version: "2022",
    domains: ["A.5", "A.6", "A.7", "A.8"],
  },
  SOC2: {
    name: "SOC 2",
    version: "2017",
    domains: ["CC", "P", "C", "A"],
  },
  PCI_DSS: {
    name: "PCI DSS",
    version: "4.0",
    domains: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
  GDPR: {
    name: "GDPR",
    version: "2018",
    domains: ["Art.5", "Art.6", "Art.7", "Art.32", "Art.33"],
  },
  CSL: {
    name: "网络安全法",
    version: "2017",
    domains: ["网络运行安全", "网络信息安全", "监测预警"],
  },
  DSL: {
    name: "数据安全法",
    version: "2021",
    domains: ["数据安全制度", "数据分类分级", "数据安全保护"],
  },
  PIPL: {
    name: "个人信息保护法",
    version: "2021",
    domains: ["处理规则", "跨境提供", "权利保护"],
  },
};
