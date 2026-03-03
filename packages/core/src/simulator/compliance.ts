import type { SecurityEvent, ThreatActor, AttackChain } from "./security-events";

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  totalControls: number;
  passedControls: number;
  score: number;
  lastAssessment: number;
  nextAssessment: number;
  gaps: ComplianceGap[];
}

export interface ComplianceGap {
  id: string;
  controlId: string;
  framework: string;
  control: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "remediated" | "accepted_risk";
  dueDate: number;
  assignee?: string;
  evidence?: string[];
  remediation?: string;
}

export interface AuditTask {
  id: string;
  title: string;
  description: string;
  type: "finding" | "gap" | "incident" | "risk" | "audit";
  status: "pending" | "in_progress" | "completed" | "verified" | "overdue";
  priority: "critical" | "high" | "medium" | "low";
  assignee?: string;
  createdAt: number;
  dueDate: number;
  completedAt?: number;
  framework?: string;
  relatedControl?: string;
  evidence: string[];
  notes: string[];
}

const FRAMEWORKS = [
  { name: "NIST CSF", version: "2.0", controls: 108 },
  { name: "ISO 27001", version: "2022", controls: 93 },
  { name: "SOC 2", version: "Type II", controls: 117 },
  { name: "PCI DSS", version: "4.0", controls: 264 },
  { name: "GDPR", version: "2018", controls: 99 },
  { name: "HIPAA", version: "HITRUST", controls: 135 },
];

const CONTROL_DOMAINS = [
  "Access Control",
  "Asset Management", 
  "Data Protection",
  "Encryption",
  "Incident Response",
  "Network Security",
  "Physical Security",
  "Risk Assessment",
  "Security Awareness",
  "Vendor Management",
  "Vulnerability Management",
  "Business Continuity",
];

const ASSIGNEES = ["张三", "李四", "王五", "赵六", "钱七", "孙八"];

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export class ComplianceSimulator {
  private frameworks: ComplianceFramework[] = [];
  private gaps: ComplianceGap[] = [];
  private tasks: AuditTask[] = [];
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    for (const fw of FRAMEWORKS) {
      const passed = randomInt(Math.floor(fw.controls * 0.6), Math.floor(fw.controls * 0.9));
      const score = Math.round((passed / fw.controls) * 100);
      
      this.frameworks.push({
        id: randomId(),
        name: fw.name,
        version: fw.version,
        totalControls: fw.controls,
        passedControls: passed,
        score,
        lastAssessment: daysAgo(randomInt(7, 90)),
        nextAssessment: daysFromNow(randomInt(30, 365)),
        gaps: [],
      });
    }

    this.generateGaps(25);
    this.generateTasks(15);

    this.initialized = true;
  }

  private generateGaps(count: number): void {
    const gapTemplates = [
      { desc: "访问控制策略缺少多因素认证要求", remediation: "实施MFA策略覆盖所有特权账户" },
      { desc: "日志保留期限不符合合规要求", remediation: "配置日志系统保留365天以上" },
      { desc: "漏洞扫描频率不满足月度要求", remediation: "建立自动化月度扫描计划" },
      { desc: "第三方供应商安全评估流程缺失", remediation: "建立供应商风险评估框架" },
      { desc: "安全意识培训覆盖率未达标", remediation: "强制全员完成年度安全培训" },
      { desc: "数据分类标记不完整", remediation: "完成全量数据资产分类" },
      { desc: "应急响应计划测试不足", remediation: "每季度执行桌面演练" },
      { desc: "变更管理流程存在例外", remediation: "关闭紧急变更流程例外通道" },
    ];

    for (let i = 0; i < count; i++) {
      const template = randomChoice(gapTemplates);
      const framework = randomChoice(this.frameworks);
      const domain = randomChoice(CONTROL_DOMAINS);
      
      this.gaps.push({
        id: randomId(),
        controlId: `${framework.name.substring(0, 4).toUpperCase()}-${domain.substring(0, 3).toUpperCase()}-${randomInt(1, 99).toString().padStart(2, "0")}`,
        framework: framework.name,
        control: domain,
        description: template.desc,
        severity: randomChoice(["critical", "high", "medium", "low"]),
        status: randomChoice(["open", "in_progress", "remediated", "accepted_risk"]),
        dueDate: daysFromNow(randomInt(-30, 90)),
        assignee: Math.random() > 0.2 ? randomChoice(ASSIGNEES) : undefined,
        remediation: template.remediation,
        evidence: Math.random() > 0.5 ? ["截图证据", "配置文件"] : [],
      });
    }
  }

  private generateTasks(count: number): void {
    const taskTemplates = [
      { title: "完成季度渗透测试", type: "audit" as const },
      { title: "更新访问控制矩阵", type: "gap" as const },
      { title: "修复高危漏洞CVE-2024-XXXX", type: "finding" as const },
      { title: "审查第三方合同安全条款", type: "risk" as const },
      { title: "实施网络分段方案", type: "gap" as const },
      { title: "完成安全架构评审", type: "audit" as const },
      { title: "部署端点检测响应", type: "gap" as const },
      { title: "更新业务连续性计划", type: "audit" as const },
      { title: "调查异常登录事件", type: "incident" as const },
      { title: "完成数据资产盘点", type: "audit" as const },
    ];

    for (let i = 0; i < count; i++) {
      const template = randomChoice(taskTemplates);
      const priority = randomChoice(["critical", "high", "medium", "low"] as const);
      const status = randomChoice(["pending", "in_progress", "completed", "verified", "overdue"] as const);
      const createdAt = daysAgo(randomInt(1, 60));
      
      this.tasks.push({
        id: randomId(),
        title: template.title,
        description: `详细描述: ${template.title}相关工作和要求`,
        type: template.type,
        status,
        priority,
        assignee: Math.random() > 0.3 ? randomChoice(ASSIGNEES) : undefined,
        createdAt,
        dueDate: createdAt + randomInt(7, 30) * 24 * 60 * 60 * 1000,
        completedAt: status === "completed" || status === "verified" ? daysAgo(randomInt(1, 10)) : undefined,
        framework: Math.random() > 0.5 ? randomChoice(FRAMEWORKS).name : undefined,
        evidence: status === "completed" || status === "verified" ? ["完成证明", "测试报告"] : [],
        notes: status === "in_progress" ? ["进行中..."] : [],
      });
    }
  }

  getFrameworks(): ComplianceFramework[] {
    return this.frameworks;
  }

  getGaps(limit = 50): ComplianceGap[] {
    return this.gaps.slice(0, limit);
  }

  getTasks(filters?: {
    status?: AuditTask["status"];
    priority?: AuditTask["priority"];
    type?: AuditTask["type"];
  }): AuditTask[] {
    let result = [...this.tasks];
    
    if (filters) {
      if (filters.status) result = result.filter(t => t.status === filters.status);
      if (filters.priority) result = result.filter(t => t.priority === filters.priority);
      if (filters.type) result = result.filter(t => t.type === filters.type);
    }
    
    return result.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  getOverallScore(): number {
    const total = this.frameworks.reduce((sum, fw) => sum + fw.score * fw.totalControls, 0);
    const controls = this.frameworks.reduce((sum, fw) => sum + fw.totalControls, 0);
    return Math.round(total / controls);
  }

  getStats() {
    return {
      overallScore: this.getOverallScore(),
      frameworks: this.frameworks.length,
      totalGaps: this.gaps.length,
      openGaps: this.gaps.filter(g => g.status === "open").length,
      criticalGaps: this.gaps.filter(g => g.severity === "critical").length,
      totalTasks: this.tasks.length,
      pendingTasks: this.tasks.filter(t => t.status === "pending").length,
      overdueTasks: this.tasks.filter(t => t.status === "overdue" || (t.dueDate < Date.now() && t.status !== "completed" && t.status !== "verified")).length,
      completedTasks: this.tasks.filter(t => t.status === "completed" || t.status === "verified").length,
    };
  }

  refresh(): void {
    for (const task of this.tasks) {
      if (task.status === "pending" && Math.random() > 0.7) {
        task.status = "in_progress";
        task.notes.push("已开始处理");
      }
      if (task.status === "in_progress" && Math.random() > 0.8) {
        task.status = "completed";
        task.completedAt = Date.now();
        task.evidence.push("完成证据");
      }
    }
  }
}

export const complianceSimulator = new ComplianceSimulator();
