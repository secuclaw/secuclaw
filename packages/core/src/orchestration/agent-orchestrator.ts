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

export interface AgentTask {
  id: string;
  role: AgentRole;
  skill: string;
  query: string;
  context?: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  assignedProvider?: string;
  dependencies: string[];
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  result: string;
  provider: string;
  model: string;
  duration: number;
  followUpTasks?: Partial<AgentTask>[];
}

export interface OrchestrationPlan {
  id: string;
  originalQuery: string;
  tasks: AgentTask[];
  createdAt: number;
  status: "planning" | "executing" | "completed" | "failed";
  results: AgentResult[];
}

export interface AgentTeam {
  id: string;
  name: string;
  roles: AgentRole[];
  description: string;
}

export const SECURITY_TEAMS: AgentTeam[] = [
  {
    id: "incident-response",
    name: "事件响应团队",
    roles: ["coordinator", "security-analyst", "incident-responder"],
    description: "快速响应安全事件，协调调查和恢复",
  },
  {
    id: "threat-hunting",
    name: "威胁狩猎团队",
    roles: ["threat-hunter", "security-analyst"],
    description: "主动发现潜在威胁和攻击迹象",
  },
  {
    id: "compliance-audit",
    name: "合规审计团队",
    roles: ["coordinator", "compliance-auditor"],
    description: "执行合规评估和审计任务",
  },
  {
    id: "pentest",
    name: "渗透测试团队",
    roles: ["coordinator", "penetration-tester", "security-analyst"],
    description: "执行授权渗透测试评估",
  },
];

export class AgentOrchestrator {
  private providerManager: ProviderManager;
  private skillService: SkillService;
  private sessionManager: SessionManager;
  private memoryManager: MemoryManager;
  private activePlans: Map<string, OrchestrationPlan> = new Map();

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
  }

  analyzeQuery(query: string): { 
    category: string; 
    suggestedTeam: string; 
    complexity: "simple" | "medium" | "complex";
  } {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("事件") || lowerQuery.includes("incident") || 
        lowerQuery.includes("响应") || lowerQuery.includes("response")) {
      return { category: "incident-response", suggestedTeam: "incident-response", complexity: "medium" };
    }
    
    if (lowerQuery.includes("威胁") || lowerQuery.includes("threat") || 
        lowerQuery.includes("狩猎") || lowerQuery.includes("hunting")) {
      return { category: "threat-hunting", suggestedTeam: "threat-hunting", complexity: "medium" };
    }
    
    if (lowerQuery.includes("合规") || lowerQuery.includes("compliance") || 
        lowerQuery.includes("审计") || lowerQuery.includes("audit")) {
      return { category: "compliance", suggestedTeam: "compliance-audit", complexity: "medium" };
    }
    
    if (lowerQuery.includes("渗透") || lowerQuery.includes("pentest") || 
        lowerQuery.includes("攻击模拟") || lowerQuery.includes("red team")) {
      return { category: "penetration-testing", suggestedTeam: "pentest", complexity: "complex" };
    }
    
    if (lowerQuery.includes("分析") || lowerQuery.includes("analyze") ||
        lowerQuery.includes("评估") || lowerQuery.includes("assess")) {
      return { category: "analysis", suggestedTeam: "threat-hunting", complexity: "simple" };
    }
    
    return { category: "general", suggestedTeam: "threat-hunting", complexity: "simple" };
  }

  createPlan(query: string, teamId?: string): OrchestrationPlan {
    const analysis = this.analyzeQuery(query);
    const team = SECURITY_TEAMS.find((t) => t.id === (teamId ?? analysis.suggestedTeam)) ?? SECURITY_TEAMS[0];
    
    const tasks: AgentTask[] = [];
    let taskId = 1;

    if (team.roles.includes("coordinator")) {
      tasks.push({
        id: `task-${taskId++}`,
        role: "coordinator",
        skill: "enterprise-commander",
        query: `作为协调员，分析以下请求并制定执行计划：${query}`,
        priority: "high",
        status: "pending",
        dependencies: [],
      });
    }

    if (team.roles.includes("security-analyst")) {
      tasks.push({
        id: `task-${taskId++}`,
        role: "security-analyst",
        skill: "security-expert",
        query: `作为安全分析师，深入分析：${query}`,
        priority: "high",
        status: "pending",
        dependencies: team.roles.includes("coordinator") ? ["task-1"] : [],
      });
    }

    if (team.roles.includes("threat-hunter")) {
      tasks.push({
        id: `task-${taskId++}`,
        role: "threat-hunter",
        skill: "security-expert",
        query: `作为威胁猎手，主动搜索与以下请求相关的威胁指标：${query}`,
        priority: "medium",
        status: "pending",
        dependencies: ["task-2"],
      });
    }

    if (team.roles.includes("compliance-auditor")) {
      tasks.push({
        id: `task-${taskId++}`,
        role: "compliance-auditor",
        skill: "ciso",
        query: `作为合规审计员，评估以下请求的合规要求：${query}`,
        priority: "medium",
        status: "pending",
        dependencies: team.roles.includes("coordinator") ? ["task-1"] : [],
      });
    }

    if (team.roles.includes("penetration-tester")) {
      tasks.push({
        id: `task-${taskId++}`,
        role: "penetration-tester",
        skill: "security-expert",
        query: `作为渗透测试员，模拟攻击场景：${query}`,
        priority: "medium",
        status: "pending",
        dependencies: ["task-2"],
      });
    }

    if (team.roles.includes("incident-responder")) {
      tasks.push({
        id: `task-${taskId++}`,
        role: "incident-responder",
        skill: "security-ops",
        query: `作为事件响应员，制定响应方案：${query}`,
        priority: "high",
        status: "pending",
        dependencies: ["task-2"],
      });
    }

    const plan: OrchestrationPlan = {
      id: `plan-${Date.now().toString(36)}`,
      originalQuery: query,
      tasks,
      createdAt: Date.now(),
      status: "planning",
      results: [],
    };

    this.activePlans.set(plan.id, plan);
    return plan;
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
        
        try {
          const systemPrompt = this.skillService.getSystemPrompt(task.skill);
          
          const response = await this.providerManager.chat({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: task.query },
            ],
          });

          task.result = response.content;
          task.status = "completed";
          completedTasks.add(task.id);

          plan.results.push({
            taskId: task.id,
            success: true,
            result: response.content,
            provider: "default",
            model: response.model,
            duration: 0,
          });
        } catch (err) {
          task.status = "failed";
          task.result = err instanceof Error ? err.message : "Unknown error";
          
          plan.results.push({
            taskId: task.id,
            success: false,
            result: task.result,
            provider: "unknown",
            model: "unknown",
            duration: 0,
          });
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    plan.status = completedTasks.size === plan.tasks.length ? "completed" : "failed";
    return plan;
  }

  getPlan(planId: string): OrchestrationPlan | undefined {
    return this.activePlans.get(planId);
  }

  listPlans(): OrchestrationPlan[] {
    return Array.from(this.activePlans.values());
  }

  getTeamRecommendations(query: string): { team: AgentTeam; relevance: number }[] {
    const analysis = this.analyzeQuery(query);
    
    return SECURITY_TEAMS.map((team) => ({
      team,
      relevance: team.id === analysis.suggestedTeam ? 1 : 0.5,
    })).sort((a, b) => b.relevance - a.relevance);
  }
}
