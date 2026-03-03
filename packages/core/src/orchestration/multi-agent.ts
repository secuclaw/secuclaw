import type { ProviderManager } from "../providers/manager.js";
import type { SkillService } from "../skills/service.js";
import type { SessionManager } from "../session/manager.js";
import type { MemoryManager } from "../memory/manager.js";

export type AgentRole =
  | "coordinator"
  | "security-analyst"
  | "threat-hunter"
  | "compliance-auditor"
  | "penetration-tester"
  | "incident-responder";

export type AgentType = "role" | "tool" | "team" | "learn";

export interface BaseAgent {
  id: string;
  name: string;
  type: AgentType;
  enabled: boolean;
}

export interface RoleAgent extends BaseAgent {
  type: "role";
  role: AgentRole;
  skills: string[];
  systemPrompt: string;
}

export interface ToolAgent extends BaseAgent {
  type: "tool";
  toolName: string;
  category: "scanner" | "exploit" | "defense" | "analysis" | "utility";
  executor: (input: Record<string, unknown>) => Promise<unknown>;
  schema: {
    input: Record<string, { type: string; description?: string; required?: boolean }>;
    output: Record<string, { type: string; description?: string }>;
  };
}

export interface TeamAgent extends BaseAgent {
  type: "team";
  roleAgents: AgentRole[];
  toolAgents: string[];
  coordinationStrategy: "sequential" | "parallel" | "hierarchical";
  leader?: AgentRole;
}

export interface LearnAgent extends BaseAgent {
  type: "learn";
  learningMode: "case" | "skill" | "tool" | "strategy";
  trigger: {
    events?: string[];
    schedule?: string;
    conditions?: string[];
  };
  onTrigger: (context: unknown) => Promise<void>;
}

export type Agent = RoleAgent | ToolAgent | TeamAgent | LearnAgent;

export interface AgentTask {
  id: string;
  agentId: string;
  agentType: AgentType;
  query: string;
  context?: Record<string, unknown>;
  priority: "high" | "medium" | "low";
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
  dependencies: string[];
  startedAt?: number;
  completedAt?: number;
}

export interface AgentResult {
  taskId: string;
  agentId: string;
  agentType: AgentType;
  success: boolean;
  result: unknown;
  durationMs: number;
  followUpTasks?: Partial<AgentTask>[];
  learnedInsights?: string[];
}

export interface OrchestrationPlan {
  id: string;
  originalQuery: string;
  tasks: AgentTask[];
  createdAt: number;
  status: "planning" | "executing" | "completed" | "failed";
  results: AgentResult[];
  learnings: string[];
}

export interface TeamConfig {
  id: string;
  name: string;
  roles: AgentRole[];
  tools: string[];
  strategy: "sequential" | "parallel" | "hierarchical";
  description: string;
}

export const DEFAULT_TEAMS: TeamConfig[] = [
  {
    id: "incident-response",
    name: "事件响应团队",
    roles: ["coordinator", "security-analyst", "incident-responder"],
    tools: ["nmap", "log-analyzer", "forensic-toolkit"],
    strategy: "hierarchical",
    description: "快速响应安全事件，协调调查和恢复",
  },
  {
    id: "threat-hunting",
    name: "威胁狩猎团队",
    roles: ["threat-hunter", "security-analyst"],
    tools: ["nuclei", "threat-intel", "siem-query"],
    strategy: "parallel",
    description: "主动发现潜在威胁和攻击迹象",
  },
  {
    id: "compliance-audit",
    name: "合规审计团队",
    roles: ["coordinator", "compliance-auditor"],
    tools: ["compliance-scanner", "policy-checker"],
    strategy: "sequential",
    description: "执行合规评估和审计任务",
  },
  {
    id: "pentest",
    name: "渗透测试团队",
    roles: ["coordinator", "penetration-tester", "security-analyst"],
    tools: ["nmap", "metasploit", "burpsuite", "sqlmap"],
    strategy: "sequential",
    description: "执行授权渗透测试评估",
  },
  {
    id: "red-team",
    name: "红队攻击模拟",
    roles: ["coordinator", "penetration-tester"],
    tools: ["metasploit", "c2-framework", "phishing-simulator"],
    strategy: "hierarchical",
    description: "执行红队演练和攻击模拟",
  },
  {
    id: "blue-team",
    name: "蓝队防御监控",
    roles: ["security-analyst", "incident-responder"],
    tools: ["siem-query", "edr-tool", "firewall-manager"],
    strategy: "parallel",
    description: "持续监控和防御响应",
  },
];

export class MultiAgentOrchestrator {
  private providerManager: ProviderManager;
  private skillService: SkillService;
  private sessionManager: SessionManager;
  private memoryManager: MemoryManager;

  private roleAgents: Map<string, RoleAgent> = new Map();
  private toolAgents: Map<string, ToolAgent> = new Map();
  private teamAgents: Map<string, TeamAgent> = new Map();
  private learnAgents: Map<string, LearnAgent> = new Map();

  private activePlans: Map<string, OrchestrationPlan> = new Map();
  private learningQueue: Array<{ event: string; context: unknown }> = [];

  constructor(
    providerManager: ProviderManager,
    skillService: SkillService,
    sessionManager: SessionManager,
    memoryManager: MemoryManager
  ) {
    this.providerManager = providerManager;
    this.skillService = skillService;
    this.sessionManager = sessionManager;
    this.memoryManager = memoryManager;

    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents(): void {
    this.registerRoleAgent({
      id: "coordinator",
      name: "协调员",
      type: "role",
      role: "coordinator",
      enabled: true,
      skills: ["enterprise-commander"],
      systemPrompt: "你是安全团队的协调员，负责分析请求、分配任务和整合结果。",
    });

    this.registerRoleAgent({
      id: "security-analyst",
      name: "安全分析师",
      type: "role",
      role: "security-analyst",
      enabled: true,
      skills: ["security-expert"],
      systemPrompt: "你是资深安全分析师，负责深入分析安全事件和威胁情报。",
    });

    this.registerRoleAgent({
      id: "threat-hunter",
      name: "威胁猎手",
      type: "role",
      role: "threat-hunter",
      enabled: true,
      skills: ["security-expert"],
      systemPrompt: "你是威胁猎手，主动搜索和发现潜在威胁。",
    });

    this.registerRoleAgent({
      id: "compliance-auditor",
      name: "合规审计员",
      type: "role",
      role: "compliance-auditor",
      enabled: true,
      skills: ["ciso"],
      systemPrompt: "你是合规审计员，评估系统和流程的安全合规性。",
    });

    this.registerRoleAgent({
      id: "penetration-tester",
      name: "渗透测试员",
      type: "role",
      role: "penetration-tester",
      enabled: true,
      skills: ["security-expert"],
      systemPrompt: "你是渗透测试专家，执行授权的安全评估和攻击模拟。",
    });

    this.registerRoleAgent({
      id: "incident-responder",
      name: "事件响应员",
      type: "role",
      role: "incident-responder",
      enabled: true,
      skills: ["security-ops"],
      systemPrompt: "你是事件响应专家，快速响应和处理安全事件。",
    });

    this.registerToolAgent({
      id: "nmap-scanner",
      name: "Nmap扫描器",
      type: "tool",
      enabled: true,
      toolName: "nmap",
      category: "scanner",
      executor: async (input) => ({ tool: "nmap", target: input.target, status: "simulated" }),
      schema: {
        input: { target: { type: "string", description: "扫描目标", required: true } },
        output: { result: { type: "object", description: "扫描结果" } },
      },
    });

    this.registerToolAgent({
      id: "nuclei-scanner",
      name: "Nuclei扫描器",
      type: "tool",
      enabled: true,
      toolName: "nuclei",
      category: "scanner",
      executor: async (input) => ({ tool: "nuclei", target: input.target, status: "simulated" }),
      schema: {
        input: { target: { type: "string", description: "扫描目标", required: true } },
        output: { findings: { type: "array", description: "发现的问题" } },
      },
    });

    this.registerLearnAgent({
      id: "case-learner",
      name: "案例学习器",
      type: "learn",
      enabled: true,
      learningMode: "case",
      trigger: { events: ["incident-resolved", "threat-detected"] },
      onTrigger: async (context) => {
        this.learningQueue.push({ event: "case-learn", context });
      },
    });

    this.registerLearnAgent({
      id: "skill-evolver",
      name: "技能进化器",
      type: "learn",
      enabled: true,
      learningMode: "skill",
      trigger: { events: ["skill-used", "task-completed"] },
      onTrigger: async (context) => {
        this.learningQueue.push({ event: "skill-evolve", context });
      },
    });

    for (const team of DEFAULT_TEAMS) {
      this.registerTeamAgent({
        id: team.id,
        name: team.name,
        type: "team",
        enabled: true,
        roleAgents: team.roles,
        toolAgents: team.tools,
        coordinationStrategy: team.strategy,
      });
    }
  }

  registerRoleAgent(agent: RoleAgent): void {
    this.roleAgents.set(agent.id, agent);
  }

  registerToolAgent(agent: ToolAgent): void {
    this.toolAgents.set(agent.id, agent);
  }

  registerTeamAgent(agent: TeamAgent): void {
    this.teamAgents.set(agent.id, agent);
  }

  registerLearnAgent(agent: LearnAgent): void {
    this.learnAgents.set(agent.id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return (
      this.roleAgents.get(id) ??
      this.toolAgents.get(id) ??
      this.teamAgents.get(id) ??
      this.learnAgents.get(id)
    );
  }

  listAgents(type?: AgentType): Agent[] {
    if (type === "role") return Array.from(this.roleAgents.values());
    if (type === "tool") return Array.from(this.toolAgents.values());
    if (type === "team") return Array.from(this.teamAgents.values());
    if (type === "learn") return Array.from(this.learnAgents.values());

    return [
      ...this.roleAgents.values(),
      ...this.toolAgents.values(),
      ...this.teamAgents.values(),
      ...this.learnAgents.values(),
    ];
  }

  analyzeQuery(query: string): {
    category: string;
    suggestedTeam: string;
    complexity: "simple" | "medium" | "complex";
    requiredTools: string[];
  } {
    const lowerQuery = query.toLowerCase();
    const requiredTools: string[] = [];

    if (lowerQuery.includes("扫描") || lowerQuery.includes("scan")) {
      requiredTools.push("nmap", "nuclei");
    }
    if (lowerQuery.includes("漏洞") || lowerQuery.includes("vulnerability")) {
      requiredTools.push("nuclei", "sqlmap");
    }
    if (lowerQuery.includes("渗透") || lowerQuery.includes("pentest")) {
      requiredTools.push("metasploit", "burpsuite");
    }
    if (lowerQuery.includes("日志") || lowerQuery.includes("log")) {
      requiredTools.push("log-analyzer");
    }

    if (lowerQuery.includes("事件") || lowerQuery.includes("incident") ||
        lowerQuery.includes("响应") || lowerQuery.includes("response")) {
      return { category: "incident-response", suggestedTeam: "incident-response", complexity: "medium", requiredTools };
    }

    if (lowerQuery.includes("威胁") || lowerQuery.includes("threat") ||
        lowerQuery.includes("狩猎") || lowerQuery.includes("hunting")) {
      return { category: "threat-hunting", suggestedTeam: "threat-hunting", complexity: "medium", requiredTools };
    }

    if (lowerQuery.includes("合规") || lowerQuery.includes("compliance") ||
        lowerQuery.includes("审计") || lowerQuery.includes("audit")) {
      return { category: "compliance", suggestedTeam: "compliance-audit", complexity: "medium", requiredTools };
    }

    if (lowerQuery.includes("渗透") || lowerQuery.includes("pentest") ||
        lowerQuery.includes("攻击模拟") || lowerQuery.includes("red team")) {
      return { category: "penetration-testing", suggestedTeam: "pentest", complexity: "complex", requiredTools };
    }

    return { category: "general", suggestedTeam: "threat-hunting", complexity: "simple", requiredTools };
  }

  createPlan(query: string, teamId?: string): OrchestrationPlan {
    const analysis = this.analyzeQuery(query);
    const team = this.teamAgents.get(teamId ?? analysis.suggestedTeam) ?? Array.from(this.teamAgents.values())[0];

    if (!team) {
      throw new Error("No team available");
    }

    const tasks: AgentTask[] = [];
    let taskId = 1;

    for (const roleId of team.roleAgents) {
      const roleAgent = this.roleAgents.get(roleId);
      if (!roleAgent || !roleAgent.enabled) continue;

      const dependencies: string[] = [];
      if (team.coordinationStrategy === "hierarchical" && roleId !== "coordinator") {
        dependencies.push("task-1");
      } else if (team.coordinationStrategy === "sequential" && taskId > 1) {
        dependencies.push(`task-${taskId - 1}`);
      }

      tasks.push({
        id: `task-${taskId++}`,
        agentId: roleId,
        agentType: "role",
        query: this.buildRoleQuery(roleId, query),
        priority: roleId === "coordinator" ? "high" : "medium",
        status: "pending",
        dependencies,
      });
    }

    for (const toolId of team.toolAgents) {
      const toolAgent = this.toolAgents.get(toolId);
      if (!toolAgent || !toolAgent.enabled) continue;

      tasks.push({
        id: `task-${taskId++}`,
        agentId: toolId,
        agentType: "tool",
        query: `Execute ${toolId} for: ${query}`,
        context: { target: query },
        priority: "medium",
        status: "pending",
        dependencies: team.coordinationStrategy === "sequential" ? [`task-${taskId - 2}`] : [],
      });
    }

    const plan: OrchestrationPlan = {
      id: `plan-${Date.now().toString(36)}`,
      originalQuery: query,
      tasks,
      createdAt: Date.now(),
      status: "planning",
      results: [],
      learnings: [],
    };

    this.activePlans.set(plan.id, plan);
    return plan;
  }

  private buildRoleQuery(role: string, query: string): string {
    const rolePrompts: Record<string, string> = {
      coordinator: `作为协调员，分析以下请求并制定执行计划：${query}`,
      "security-analyst": `作为安全分析师，深入分析：${query}`,
      "threat-hunter": `作为威胁猎手，主动搜索与以下请求相关的威胁指标：${query}`,
      "compliance-auditor": `作为合规审计员，评估以下请求的合规要求：${query}`,
      "penetration-tester": `作为渗透测试员，模拟攻击场景：${query}`,
      "incident-responder": `作为事件响应员，制定响应方案：${query}`,
    };

    return rolePrompts[role] ?? query;
  }

  async executePlan(planId: string): Promise<OrchestrationPlan> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    plan.status = "executing";
    const completedTasks = new Set<string>();

    const maxIterations = plan.tasks.length * 2;
    let iterations = 0;

    while (completedTasks.size < plan.tasks.length && iterations < maxIterations) {
      iterations++;

      for (const task of plan.tasks) {
        if (task.status !== "pending") continue;

        const depsComplete = task.dependencies.every((dep) => completedTasks.has(dep));
        if (!depsComplete) continue;

        task.status = "running";
        task.startedAt = Date.now();

        try {
          let result: unknown;

          if (task.agentType === "role") {
            result = await this.executeRoleAgent(task);
          } else if (task.agentType === "tool") {
            result = await this.executeToolAgent(task);
          } else {
            throw new Error(`Unknown agent type: ${task.agentType}`);
          }

          task.result = result;
          task.status = "completed";
          task.completedAt = Date.now();
          completedTasks.add(task.id);

          plan.results.push({
            taskId: task.id,
            agentId: task.agentId,
            agentType: task.agentType,
            success: true,
            result,
            durationMs: task.completedAt - (task.startedAt ?? 0),
          });

          this.triggerLearnAgents("task-completed", { task, result });
        } catch (err) {
          task.status = "failed";
          task.result = err instanceof Error ? err.message : "Unknown error";
          task.completedAt = Date.now();

          plan.results.push({
            taskId: task.id,
            agentId: task.agentId,
            agentType: task.agentType,
            success: false,
            result: task.result,
            durationMs: 0,
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    plan.status = completedTasks.size === plan.tasks.length ? "completed" : "failed";
    plan.learnings = this.extractLearnings(plan);

    return plan;
  }

  private async executeRoleAgent(task: AgentTask): Promise<unknown> {
    const agent = this.roleAgents.get(task.agentId);
    if (!agent) {
      throw new Error(`Role agent not found: ${task.agentId}`);
    }

    const skillPrompt = this.skillService.getSystemPrompt(agent.skills[0] ?? "security-expert");

    const response = await this.providerManager.chat({
      messages: [
        { role: "system", content: `${skillPrompt}\n\n${agent.systemPrompt}` },
        { role: "user", content: task.query },
      ],
    });

    return response.content;
  }

  private async executeToolAgent(task: AgentTask): Promise<unknown> {
    const agent = this.toolAgents.get(task.agentId);
    if (!agent) {
      throw new Error(`Tool agent not found: ${task.agentId}`);
    }

    return agent.executor(task.context ?? {});
  }

  private triggerLearnAgents(event: string, context: unknown): void {
    for (const agent of this.learnAgents.values()) {
      if (!agent.enabled) continue;
      if (agent.trigger.events?.includes(event)) {
        agent.onTrigger(context).catch(() => {});
      }
    }
  }

  private extractLearnings(plan: OrchestrationPlan): string[] {
    const learnings: string[] = [];

    for (const result of plan.results) {
      if (!result.success) {
        learnings.push(`Task ${result.taskId} failed: need better error handling`);
      }

      if (result.agentType === "tool" && result.success) {
        learnings.push(`Tool ${result.agentId} was effective for ${plan.originalQuery.slice(0, 50)}`);
      }
    }

    return learnings;
  }

  getPlan(planId: string): OrchestrationPlan | undefined {
    return this.activePlans.get(planId);
  }

  listPlans(): OrchestrationPlan[] {
    return Array.from(this.activePlans.values());
  }

  getLearningQueue(): Array<{ event: string; context: unknown }> {
    return [...this.learningQueue];
  }

  async processLearnings(): Promise<void> {
    while (this.learningQueue.length > 0) {
      const item = this.learningQueue.shift();
      if (item) {
        await this.memoryManager.add(
          JSON.stringify(item),
          {
            source: "system",
            tags: ["learning", item.event],
            importance: 0.5,
          },
        );
      }
    }
  }

  getTeamRecommendations(query: string): { team: TeamConfig; relevance: number }[] {
    const analysis = this.analyzeQuery(query);

    return DEFAULT_TEAMS.map((team) => ({
      team,
      relevance: team.id === analysis.suggestedTeam ? 1 : 0.5,
    })).sort((a, b) => b.relevance - a.relevance);
  }
}

export function createMultiAgentOrchestrator(
  providerManager: ProviderManager,
  skillService: SkillService,
  sessionManager: SessionManager,
  memoryManager: MemoryManager
): MultiAgentOrchestrator {
  return new MultiAgentOrchestrator(providerManager, skillService, sessionManager, memoryManager);
}
