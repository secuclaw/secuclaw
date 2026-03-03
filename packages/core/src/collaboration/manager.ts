import type {
  TeamAgent,
  AgentRole,
  CollaborationTask,
  TaskStatus,
  TaskPriority,
  TaskAssignment,
  CollaborationMessage,
  TeamState,
} from './types';
import { ROLE_CAPABILITIES } from './types';

export class TeamManager {
  private state: TeamState = {
    agents: new Map(),
    tasks: new Map(),
    messages: [],
    activeWorkflows: [],
  };

  private taskCounter = 0;
  private messageCounter = 0;

  registerAgent(agent: Omit<TeamAgent, 'currentTasks' | 'lastActive' | 'performance'>): TeamAgent {
    const fullAgent: TeamAgent = {
      ...agent,
      currentTasks: 0,
      lastActive: new Date(),
      performance: {
        tasksCompleted: 0,
        successRate: 1.0,
        avgResponseTime: 0,
      },
    };
    
    this.state.agents.set(agent.id, fullAgent);
    return fullAgent;
  }

  unregisterAgent(agentId: string): boolean {
    const agent = this.state.agents.get(agentId);
    if (agent && agent.currentTasks === 0) {
      this.state.agents.delete(agentId);
      return true;
    }
    return false;
  }

  getAgent(agentId: string): TeamAgent | undefined {
    return this.state.agents.get(agentId);
  }

  getAllAgents(): TeamAgent[] {
    return Array.from(this.state.agents.values());
  }

  getAgentsByRole(role: AgentRole): TeamAgent[] {
    return this.getAllAgents().filter(a => a.role === role);
  }

  getAvailableAgents(role?: AgentRole): TeamAgent[] {
    let agents = this.getAllAgents().filter(a => a.status === 'available');
    if (role) {
      agents = agents.filter(a => a.role === role);
    }
    return agents;
  }

  updateAgentStatus(agentId: string, status: TeamAgent['status']): boolean {
    const agent = this.state.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastActive = new Date();
      return true;
    }
    return false;
  }

  findBestAgent(task: CollaborationTask): TeamAgent | null {
    const requiredCapabilities = this.inferRequiredCapabilities(task);
    const candidates = this.getAvailableAgents()
      .filter(a => a.currentTasks < a.maxConcurrentTasks);

    if (candidates.length === 0) return null;

    const scored = candidates.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, task, requiredCapabilities),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].agent;
  }

  private inferRequiredCapabilities(task: CollaborationTask): string[] {
    const capabilities: string[] = [];
    const desc = task.description.toLowerCase();
    
    if (desc.includes('scan') || desc.includes('vulnerability')) capabilities.push('vulnerability_management');
    if (desc.includes('incident') || desc.includes('response')) capabilities.push('incident_response');
    if (desc.includes('threat') || desc.includes('hunt')) capabilities.push('threat_hunting');
    if (desc.includes('compliance') || desc.includes('audit')) capabilities.push('compliance_audit');
    if (desc.includes('log') || desc.includes('analyze')) capabilities.push('log_analysis');
    if (desc.includes('forensic')) capabilities.push('forensics');
    if (desc.includes('architect') || desc.includes('design')) capabilities.push('security_architecture');
    
    return capabilities;
  }

  private calculateAgentScore(
    agent: TeamAgent, 
    task: CollaborationTask, 
    requiredCapabilities: string[]
  ): number {
    let score = 0;

    const agentCapabilityNames = agent.capabilities.map(c => c.name);
    const matchedCapabilities = requiredCapabilities.filter(c => agentCapabilityNames.includes(c));
    score += matchedCapabilities.length * 30;

    score += agent.performance.successRate * 20;

    score -= agent.currentTasks * 5;

    const priorityWeights = { critical: 15, high: 10, medium: 5, low: 0 };
    score += priorityWeights[task.priority];

    if (agent.performance.avgResponseTime > 0) {
      score -= Math.min(agent.performance.avgResponseTime / 1000, 10);
    }

    return score;
  }
}

export class TaskManager {
  private teamManager: TeamManager;
  private state: TeamState;

  constructor(teamManager: TeamManager) {
    this.teamManager = teamManager;
    this.state = { 
      agents: new Map(), 
      tasks: new Map(), 
      messages: [], 
      activeWorkflows: [] 
    };
  }

  createTask(params: {
    title: string;
    description: string;
    priority: TaskPriority;
    createdBy: string;
    assignedTo?: string[];
    deadline?: Date;
    dependencies?: string[];
    context?: Record<string, unknown>;
    mitreMapping?: { tactics: string[]; techniques: string[] };
  }): CollaborationTask {
    const task: CollaborationTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: params.title,
      description: params.description,
      priority: params.priority,
      status: 'pending',
      assignedTo: params.assignedTo || [],
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline: params.deadline,
      dependencies: params.dependencies || [],
      subtasks: [],
      context: params.context || {},
      mitreMapping: params.mitreMapping,
    };

    this.state.tasks.set(task.id, task);
    return task;
  }

  assignTask(taskId: string, agentId: string, reason?: string): TaskAssignment | null {
    const task = this.state.tasks.get(taskId);
    const agent = this.teamManager.getAgent(agentId);

    if (!task || !agent) return null;
    if (agent.currentTasks >= agent.maxConcurrentTasks) return null;

    if (task.dependencies.length > 0) {
      const pendingDeps = task.dependencies.filter(depId => {
        const dep = this.state.tasks.get(depId);
        return dep && dep.status !== 'completed';
      });
      if (pendingDeps.length > 0) {
        task.status = 'blocked';
        return null;
      }
    }

    task.assignedTo.push(agentId);
    task.status = 'assigned';
    task.updatedAt = new Date();
    agent.currentTasks++;
    agent.lastActive = new Date();

    return {
      taskId,
      agentId,
      assignedAt: new Date(),
      estimatedDuration: this.estimateTaskDuration(task, agent),
      reason: reason || 'Auto-assigned based on capabilities',
    };
  }

  autoAssignTask(taskId: string): TaskAssignment | null {
    const task = this.state.tasks.get(taskId);
    if (!task) return null;

    const bestAgent = this.teamManager.findBestAgent(task);
    if (!bestAgent) return null;

    return this.assignTask(taskId, bestAgent.id, 'Auto-assigned by system');
  }

  private estimateTaskDuration(task: CollaborationTask, agent: TeamAgent): number {
    const baseTime = {
      critical: 30 * 60 * 1000,
      high: 60 * 60 * 1000,
      medium: 2 * 60 * 60 * 1000,
      low: 4 * 60 * 60 * 1000,
    };

    let estimate = baseTime[task.priority];
    
    if (agent.performance.avgResponseTime > 0) {
      estimate = (estimate + agent.performance.avgResponseTime) / 2;
    }

    return Math.round(estimate);
  }

  startTask(taskId: string): boolean {
    const task = this.state.tasks.get(taskId);
    if (!task || task.status !== 'assigned') return false;

    task.status = 'in_progress';
    task.updatedAt = new Date();
    return true;
  }

  completeTask(taskId: string, result: CollaborationTask['results']): boolean {
    const task = this.state.tasks.get(taskId);
    if (!task) return false;

    task.status = 'completed';
    task.results = result;
    task.updatedAt = new Date();

    for (const agentId of task.assignedTo) {
      const agent = this.teamManager.getAgent(agentId);
      if (agent) {
        agent.currentTasks = Math.max(0, agent.currentTasks - 1);
        agent.performance.tasksCompleted++;
        if (result) {
          const totalTasks = agent.performance.tasksCompleted;
          const previousSuccesses = agent.performance.successRate * (totalTasks - 1);
          agent.performance.successRate = (previousSuccesses + (result.success ? 1 : 0)) / totalTasks;
        }
      }
    }

    this.unblockDependentTasks(taskId);

    return true;
  }

  failTask(taskId: string, error: string): boolean {
    const task = this.state.tasks.get(taskId);
    if (!task) return false;

    task.status = 'failed';
    task.results = {
      success: false,
      summary: error,
      details: { error },
      artifacts: [],
      followUpActions: [],
    };
    task.updatedAt = new Date();

    for (const agentId of task.assignedTo) {
      const agent = this.teamManager.getAgent(agentId);
      if (agent) {
        agent.currentTasks = Math.max(0, agent.currentTasks - 1);
      }
    }

    return true;
  }

  private unblockDependentTasks(completedTaskId: string): void {
    for (const task of this.state.tasks.values()) {
      if (task.dependencies.includes(completedTaskId) && task.status === 'blocked') {
        const stillBlocked = task.dependencies.some(depId => {
          const dep = this.state.tasks.get(depId);
          return dep && dep.status !== 'completed';
        });

        if (!stillBlocked) {
          task.status = task.assignedTo.length > 0 ? 'assigned' : 'pending';
          task.updatedAt = new Date();
        }
      }
    }
  }

  getTask(taskId: string): CollaborationTask | undefined {
    return this.state.tasks.get(taskId);
  }

  getTasksByStatus(status: TaskStatus): CollaborationTask[] {
    return Array.from(this.state.tasks.values()).filter(t => t.status === status);
  }

  getTasksByAgent(agentId: string): CollaborationTask[] {
    return Array.from(this.state.tasks.values()).filter(t => t.assignedTo.includes(agentId));
  }

  createSubtask(parentTaskId: string, params: Parameters<TaskManager['createTask']>[0]): CollaborationTask | null {
    const parent = this.state.tasks.get(parentTaskId);
    if (!parent) return null;

    const subtask = this.createTask({
      ...params,
      createdBy: params.createdBy || parent.createdBy,
    });

    subtask.parentTask = parentTaskId;
    parent.subtasks.push(subtask.id);
    parent.updatedAt = new Date();

    return subtask;
  }
}

export class CollaborationHub {
  private teamManager: TeamManager;
  private taskManager: TaskManager;
  private messageCounter = 0;

  constructor() {
    this.teamManager = new TeamManager();
    this.taskManager = new TaskManager(this.teamManager);
  }

  getTeam(): TeamManager {
    return this.teamManager;
  }

  getTasks(): TaskManager {
    return this.taskManager;
  }

  broadcast(fromAgent: string, taskId: string, content: string, priority: TaskPriority = 'medium'): CollaborationMessage {
    const message: CollaborationMessage = {
      id: `msg-${Date.now()}-${this.messageCounter++}`,
      taskId,
      fromAgent,
      toAgent: 'broadcast',
      type: 'notification',
      content,
      timestamp: new Date(),
      requiresResponse: false,
      priority,
    };

    return message;
  }

  sendRequest(
    fromAgent: string, 
    toAgent: string, 
    taskId: string, 
    content: string,
    priority: TaskPriority = 'medium'
  ): CollaborationMessage {
    const message: CollaborationMessage = {
      id: `msg-${Date.now()}-${this.messageCounter++}`,
      taskId,
      fromAgent,
      toAgent,
      type: 'request',
      content,
      timestamp: new Date(),
      requiresResponse: true,
      priority,
    };

    return message;
  }

  sendResponse(
    fromAgent: string,
    toAgent: string,
    taskId: string,
    content: string,
    originalMessageId: string
  ): CollaborationMessage {
    const message: CollaborationMessage = {
      id: `msg-${Date.now()}-${this.messageCounter++}`,
      taskId,
      fromAgent,
      toAgent,
      type: 'response',
      content,
      timestamp: new Date(),
      requiresResponse: false,
      priority: 'medium',
    };

    return message;
  }

  escalate(
    fromAgent: string,
    taskId: string,
    content: string,
    targetRole?: AgentRole
  ): CollaborationMessage {
    const targetAgents = targetRole 
      ? this.teamManager.getAgentsByRole(targetRole)
      : this.teamManager.getAgentsByRole('commander');

    const targetId = targetAgents.length > 0 ? targetAgents[0].id : 'broadcast';

    const message: CollaborationMessage = {
      id: `msg-${Date.now()}-${this.messageCounter++}`,
      taskId,
      fromAgent,
      toAgent: targetId,
      type: 'escalation',
      content,
      timestamp: new Date(),
      requiresResponse: true,
      priority: 'critical',
    };

    return message;
  }

  async orchestrateWorkflow(workflow: {
    name: string;
    tasks: Array<{
      title: string;
      description: string;
      priority: TaskPriority;
      role?: AgentRole;
      dependencies?: string[];
    }>;
  }): Promise<CollaborationTask[]> {
    const createdTasks: CollaborationTask[] = [];
    const taskIds: string[] = [];

    for (const taskDef of workflow.tasks) {
      const task = this.taskManager.createTask({
        title: taskDef.title,
        description: taskDef.description,
        priority: taskDef.priority,
        createdBy: 'system',
        dependencies: taskDef.dependencies?.map(d => taskIds[taskDef.dependencies!.indexOf(d)]),
      });

      createdTasks.push(task);
      taskIds.push(task.id);

      if (taskDef.role) {
        const agents = this.teamManager.getAvailableAgents(taskDef.role);
        if (agents.length > 0) {
          this.taskManager.assignTask(task.id, agents[0].id);
        }
      } else {
        this.taskManager.autoAssignTask(task.id);
      }
    }

    return createdTasks;
  }
}

export const globalCollaborationHub = new CollaborationHub();
