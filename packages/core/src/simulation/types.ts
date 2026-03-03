export type SimulationStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type AttackPhase =
  | "reconnaissance"
  | "resource_development"
  | "initial_access"
  | "execution"
  | "persistence"
  | "privilege_escalation"
  | "defense_evasion"
  | "credential_access"
  | "discovery"
  | "lateral_movement"
  | "collection"
  | "command_and_control"
  | "exfiltration"
  | "impact";

export type SimulationMode =
  | "red_team"
  | "blue_team"
  | "purple_team"
  | "atomic"
  | "apt_simulation";

export interface AttackTechnique {
  id: string;
  mitreId: string;
  name: string;
  phase: AttackPhase;
  description: string;
  platforms: string[];
  permissions_required: string[];
  detection: string[];
  mitigation: string[];
  metasploitModules?: string[];
  atomicTests?: AtomicTest[];
}

export interface AtomicTest {
  name: string;
  description: string;
  command: string;
  executor: "command_prompt" | "powershell" | "bash" | "sh";
  elevation_required: boolean;
}

export interface SimulationTarget {
  id: string;
  hostname?: string;
  ipAddress: string;
  osType: "windows" | "linux" | "macos" | "unknown";
  osVersion?: string;
  services: Array<{
    port: number;
    protocol: string;
    service: string;
    version?: string;
  }>;
  vulnerabilities: string[];
  tags: string[];
}

export interface SimulationStep {
  id: string;
  order: number;
  technique: AttackTechnique;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  startTime?: number;
  endTime?: number;
  output?: string;
  error?: string;
  artifacts?: string[];
  detectionTriggered: boolean;
  detectionDetails?: string;
}

export interface SimulationConfig {
  id: string;
  name: string;
  description: string;
  mode: SimulationMode;
  techniques: AttackTechnique[];
  targets: SimulationTarget[];
  timeout: number;
  stopOnDetection: boolean;
  generateReport: boolean;
  cleanupAfter: boolean;
  notifyOnComplete: boolean;
}

export interface SimulationResult {
  id: string;
  configId: string;
  status: SimulationStatus;
  startTime: number;
  endTime?: number;
  duration: number;
  steps: SimulationStep[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    detectedSteps: number;
    detectionRate: number;
    successRate: number;
  };
  detections: Array<{
    stepId: string;
    technique: string;
    detectionTime: number;
    detectionMethod: string;
    severity: "high" | "medium" | "low";
  }>;
  recommendations: string[];
  mitreCoverage: {
    tactics: string[];
    techniques: string[];
    coveragePercent: number;
  };
  timeline: Array<{
    timestamp: number;
    event: string;
    phase: AttackPhase;
    details: string;
  }>;
}

export interface SimulationTemplate {
  id: string;
  name: string;
  description: string;
  mode: SimulationMode;
  aptGroup?: string;
  techniques: string[];
  targetProfile: {
    osTypes: string[];
    services: string[];
  };
  estimatedDuration: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
}

export const MITRE_TACTICS: Record<AttackPhase, { name: string; id: string }> = {
  reconnaissance: { name: "侦察", id: "TA0043" },
  resource_development: { name: "资源开发", id: "TA0042" },
  initial_access: { name: "初始访问", id: "TA0001" },
  execution: { name: "执行", id: "TA0002" },
  persistence: { name: "持久化", id: "TA0003" },
  privilege_escalation: { name: "权限提升", id: "TA0004" },
  defense_evasion: { name: "防御规避", id: "TA0005" },
  credential_access: { name: "凭证访问", id: "TA0006" },
  discovery: { name: "发现", id: "TA0007" },
  lateral_movement: { name: "横向移动", id: "TA0008" },
  collection: { name: "收集", id: "TA0009" },
  command_and_control: { name: "命令与控制", id: "TA0011" },
  exfiltration: { name: "渗出", id: "TA0010" },
  impact: { name: "影响", id: "TA0040" },
};

export const DEFAULT_TEMPLATES: SimulationTemplate[] = [
  {
    id: "apt29-simulation",
    name: "APT29 模拟",
    description: "模拟APT29(舒适熊)攻击手法，包含鱼叉钓鱼、凭证窃取、横向移动",
    mode: "apt_simulation",
    aptGroup: "APT29",
    techniques: ["T1566.001", "T1078", "T1003", "T1021.001", "T1055", "T1071"],
    targetProfile: {
      osTypes: ["windows"],
      services: ["smb", "ldap", "kerberos"],
    },
    estimatedDuration: 3600,
    difficulty: "hard",
  },
  {
    id: "ransomware-simulation",
    name: "勒索软件模拟",
    description: "模拟勒索软件攻击链，从初始访问到数据加密",
    mode: "red_team",
    techniques: ["T1190", "T1059.001", "T1486", "T1490", "T1041"],
    targetProfile: {
      osTypes: ["windows", "linux"],
      services: ["rdp", "smb", "http"],
    },
    estimatedDuration: 1800,
    difficulty: "expert",
  },
  {
    id: "lateral-movement-test",
    name: "横向移动测试",
    description: "测试网络横向移动能力与检测效果",
    mode: "purple_team",
    techniques: ["T1021.001", "T1021.002", "T1550", "T1560", "T1072"],
    targetProfile: {
      osTypes: ["windows"],
      services: ["smb", "winrm", "wmi"],
    },
    estimatedDuration: 1200,
    difficulty: "medium",
  },
  {
    id: "credential-access-test",
    name: "凭证访问测试",
    description: "测试凭证窃取技术与检测效果",
    mode: "purple_team",
    techniques: ["T1003", "T1003.001", "T1003.002", "T1558", "T1110"],
    targetProfile: {
      osTypes: ["windows"],
      services: ["ldap", "kerberos", "smb"],
    },
    estimatedDuration: 900,
    difficulty: "medium",
  },
  {
    id: "initial-access-baseline",
    name: "初始访问基线测试",
    description: "基础初始访问技术测试，适合安全基线评估",
    mode: "atomic",
    techniques: ["T1566", "T1190", "T1133", "T1078"],
    targetProfile: {
      osTypes: ["windows", "linux"],
      services: ["http", "https", "smtp"],
    },
    estimatedDuration: 600,
    difficulty: "easy",
  },
];
