import type {
  PlaybookDefinition,
  PlaybookRun,
  PlaybookTrigger,
  ResponseAction,
  ActionExecution,
  ApprovalRequest,
  ResponseIncident,
  ResponseDashboard,
  ExecutionStatus,
  ApprovalStatus,
  ActionResult,
  ResponseExecutor,
  TriggerType,
} from './types.js';

export class SOARPlaybookEngine {
  private playbooks: Map<string, PlaybookDefinition> = new Map();
  private runs: Map<string, PlaybookRun> = new Map();
  private incidents: Map<string, ResponseIncident> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private executors: Map<string, ResponseExecutor> = new Map();
  private eventHandlers: SOAREventHandler[] = [];

  constructor() {
    this.registerDefaultExecutors();
    this.registerDefaultPlaybooks();
  }

  private registerDefaultExecutors(): void {
    this.executors.set('block_ip', new BlockIPExecutor());
    this.executors.set('block_domain', new BlockDomainExecutor());
    this.executors.set('isolate_host', new IsolateHostExecutor());
    this.executors.set('disable_user', new DisableUserExecutor());
    this.executors.set('quarantine_file', new QuarantineFileExecutor());
    this.executors.set('collect_evidence', new CollectEvidenceExecutor());
    this.executors.set('send_notification', new SendNotificationExecutor());
    this.executors.set('webhook', new WebhookExecutor());
  }

  private registerDefaultPlaybooks(): void {
    const defaultPlaybooks: PlaybookDefinition[] = [
      {
        id: 'pb_malware_response',
        name: 'Malware Incident Response',
        description: 'Automated response to malware detection',
        version: '1.0',
        status: 'published',
        category: 'containment',
        triggers: [
          { type: 'alert', conditions: [{ field: 'alert.type', operator: 'equals', value: 'malware' }], enabled: true, cooldown: 300 },
        ],
        actions: [
          { id: 'action_1', type: 'isolate_host', category: 'containment', name: 'Isolate affected host', description: 'Network isolation', parameters: {}, requiresApproval: true, timeout: 60000, retryCount: 2, retryDelay: 5000, continueOnFailure: false, order: 1 },
          { id: 'action_2', type: 'quarantine_file', category: 'containment', name: 'Quarantine malware', description: 'Quarantine detected file', parameters: {}, requiresApproval: false, timeout: 30000, retryCount: 1, retryDelay: 3000, continueOnFailure: true, order: 2 },
          { id: 'action_3', type: 'collect_evidence', category: 'investigation', name: 'Collect forensic evidence', description: 'Gather artifacts', parameters: {}, requiresApproval: false, timeout: 120000, retryCount: 1, retryDelay: 5000, continueOnFailure: true, order: 3 },
          { id: 'action_4', type: 'send_notification', category: 'notification', name: 'Notify security team', description: 'Alert security', parameters: { recipients: ['security@company.com'], template: 'malware_alert' }, requiresApproval: false, timeout: 10000, retryCount: 3, retryDelay: 2000, continueOnFailure: true, order: 4 },
        ],
        variables: [{ name: 'hostname', type: 'string', required: true, description: 'Affected hostname' }],
        maxExecutionTime: 300000,
        requireApproval: true,
        approvers: ['security-lead@company.com'],
        tags: ['malware', 'automated', 'containment'],
        author: 'security-team',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'pb_brute_force',
        name: 'Brute Force Attack Response',
        description: 'Response to brute force login attempts',
        version: '1.0',
        status: 'published',
        category: 'containment',
        triggers: [
          { type: 'threshold', conditions: [{ field: 'failed_logins', operator: 'gte', value: 10 }], enabled: true, cooldown: 600 },
        ],
        actions: [
          { id: 'action_1', type: 'block_ip', category: 'containment', name: 'Block attacker IP', description: 'Block source IP', parameters: { duration: 3600 }, requiresApproval: false, timeout: 10000, retryCount: 2, retryDelay: 2000, continueOnFailure: false, order: 1 },
          { id: 'action_2', type: 'disable_user', category: 'containment', name: 'Lock targeted account', description: 'Disable potentially compromised account', parameters: {}, requiresApproval: true, timeout: 30000, retryCount: 1, retryDelay: 3000, continueOnFailure: true, order: 2 },
          { id: 'action_3', type: 'send_notification', category: 'notification', name: 'Alert SOC', description: 'Notify SOC team', parameters: { recipients: ['soc@company.com'], template: 'brute_force_alert' }, requiresApproval: false, timeout: 10000, retryCount: 2, retryDelay: 2000, continueOnFailure: true, order: 3 },
        ],
        variables: [{ name: 'source_ip', type: 'string', required: true }, { name: 'target_user', type: 'string', required: true }],
        maxExecutionTime: 180000,
        requireApproval: false,
        tags: ['brute-force', 'authentication', 'automated'],
        author: 'security-team',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const playbook of defaultPlaybooks) {
      this.playbooks.set(playbook.id, playbook);
    }
  }

  registerPlaybook(playbook: PlaybookDefinition): void {
    this.playbooks.set(playbook.id, playbook);
  }

  registerExecutor(actionType: string, executor: ResponseExecutor): void {
    this.executors.set(actionType, executor);
  }

  async runPlaybook(
    playbookId: string,
    options: {
      triggeredBy: string;
      trigger: TriggerType;
      variables?: Record<string, unknown>;
      context?: Record<string, unknown>;
      requiresApproval?: boolean;
    }
  ): Promise<PlaybookRun> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`Playbook not found: ${playbookId}`);
    }

    if (playbook.status !== 'published') {
      throw new Error(`Playbook is not published: ${playbookId}`);
    }

    const run: PlaybookRun = {
      id: this.generateId('run'),
      playbookId,
      playbookName: playbook.name,
      trigger: options.trigger,
      triggeredBy: options.triggeredBy,
      triggeredAt: new Date(),
      status: 'pending',
      context: options.context || {},
      variables: options.variables || {},
      actionExecutions: [],
      currentActionIndex: 0,
      metrics: {
        totalActions: playbook.actions.length,
        completedActions: 0,
        failedActions: 0,
        skippedActions: 0,
        totalDuration: 0,
        approvalWaitTime: 0,
        errorCount: 0,
        retryCount: 0,
      },
    };

    this.runs.set(run.id, run);
    this.emit('run_started', run);

    try {
      run.status = 'running';
      run.startedAt = new Date();

      const sortedActions = [...playbook.actions].sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        run.currentActionIndex = action.order;
        const execution = await this.executeAction(action, run);

        run.actionExecutions.push(execution);
        run.metrics.totalDuration += execution.duration || 0;

        if (execution.status === 'completed') {
          run.metrics.completedActions++;
        } else if (execution.status === 'failed') {
          run.metrics.failedActions++;
          run.metrics.errorCount++;

          if (!action.continueOnFailure) {
            run.status = 'failed';
            run.result = 'failure';
            break;
          }
        } else if (execution.status === 'skipped') {
          run.metrics.skippedActions++;
        }

        this.emit('action_completed', { run, action, execution });
      }

      if (run.status !== 'failed') {
        run.status = 'completed';
        run.result = run.metrics.failedActions > 0 ? 'partial' : 'success';
      }
    } catch (error) {
      run.status = 'failed';
      run.result = 'failure';
      run.metrics.errorCount++;
    }

    run.completedAt = new Date();
    run.duration = run.completedAt.getTime() - run.startedAt!.getTime();

    this.emit('run_completed', run);
    return run;
  }

  private async executeAction(
    action: ResponseAction,
    run: PlaybookRun
  ): Promise<ActionExecution> {
    const execution: ActionExecution = {
      id: this.generateId('exec'),
      actionId: action.id,
      playbookRunId: run.id,
      status: 'pending',
      input: { ...action.parameters, ...run.variables },
      retryAttempts: 0,
      logs: [],
    };

    const log = (level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: Record<string, unknown>) => {
      execution.logs.push({ timestamp: new Date(), level, message, details });
    };

    log('info', `Starting action: ${action.name}`);

    if (action.requiresApproval) {
      log('info', 'Action requires approval, creating request');
      
      const approvalRequest = this.createApprovalRequest(action, run);
      this.approvalRequests.set(approvalRequest.id, approvalRequest);
      
      this.emit('approval_required', approvalRequest);

      execution.status = 'queued';
      log('info', 'Waiting for approval', { requestId: approvalRequest.id });
      
      return execution;
    }

    const executor = this.executors.get(action.type);
    if (!executor) {
      execution.status = 'failed';
      execution.error = `No executor registered for action type: ${action.type}`;
      log('error', execution.error);
      return execution;
    }

    execution.status = 'running';
    execution.startedAt = new Date();
    log('info', 'Executing action');

    let attempts = 0;
    let lastError: string | undefined;

    while (attempts <= action.retryCount) {
      try {
        const result = await executor.execute(action, { ...run.context, ...execution.input });
        
        execution.status = result.success ? 'completed' : 'failed';
        execution.output = result.output;
        execution.error = result.error;
        execution.duration = result.duration;
        
        if (result.success) {
          log('info', 'Action completed successfully', result.output);
        } else {
          log('error', `Action failed: ${result.error}`);
        }
        
        break;
      } catch (error) {
        attempts++;
        execution.retryAttempts = attempts;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        log('warn', `Attempt ${attempts} failed: ${lastError}`);

        if (attempts <= action.retryCount) {
          log('info', `Retrying in ${action.retryDelay}ms`);
          await this.delay(action.retryDelay);
        }
      }
    }

    if (execution.status === 'running') {
      execution.status = 'failed';
      execution.error = lastError;
    }

    execution.completedAt = new Date();
    return execution;
  }

  private createApprovalRequest(action: ResponseAction, run: PlaybookRun): ApprovalRequest {
    const playbook = this.playbooks.get(run.playbookId);
    
    return {
      id: this.generateId('approval'),
      playbookRunId: run.id,
      actionId: action.id,
      actionName: action.name,
      actionType: action.type,
      parameters: action.parameters,
      riskLevel: this.determineRiskLevel(action),
      requestedBy: run.triggeredBy,
      requestedAt: new Date(),
      status: 'pending',
      expiresAt: new Date(Date.now() + (action.approvalTimeout || 3600000)),
      approvers: playbook?.approvers || [],
      notifiedApprovers: [],
    };
  }

  private determineRiskLevel(action: ResponseAction): 'low' | 'medium' | 'high' | 'critical' {
    const highRiskTypes = ['isolate_host', 'disable_user', 'kill_process'];
    const mediumRiskTypes = ['block_ip', 'block_domain', 'quarantine_file'];
    
    if (highRiskTypes.includes(action.type)) return 'high';
    if (mediumRiskTypes.includes(action.type)) return 'medium';
    return 'low';
  }

  async approveAction(approvalId: string, approvedBy: string): Promise<void> {
    const request = this.approvalRequests.get(approvalId);
    if (!request) {
      throw new Error(`Approval request not found: ${approvalId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request is not pending: ${request.status}`);
    }

    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      throw new Error('Approval request has expired');
    }

    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvedAt = new Date();

    this.emit('action_approved', request);

    const run = this.runs.get(request.playbookRunId);
    if (run) {
      const pendingExecution = run.actionExecutions.find(
        e => e.actionId === request.actionId && e.status === 'queued'
      );
      
      if (pendingExecution) {
        const playbook = this.playbooks.get(run.playbookId);
        const action = playbook?.actions.find(a => a.id === request.actionId);
        
        if (action) {
          const completedExecution = await this.executeAction(action, run);
          Object.assign(pendingExecution, completedExecution);
        }
      }
    }
  }

  rejectAction(approvalId: string, rejectedBy: string, reason: string): void {
    const request = this.approvalRequests.get(approvalId);
    if (!request) {
      throw new Error(`Approval request not found: ${approvalId}`);
    }

    request.status = 'rejected';
    request.rejectedBy = rejectedBy;
    request.rejectedAt = new Date();
    request.rejectionReason = reason;

    this.emit('action_rejected', request);

    const run = this.runs.get(request.playbookRunId);
    if (run) {
      const execution = run.actionExecutions.find(
        e => e.actionId === request.actionId && e.status === 'queued'
      );
      
      if (execution) {
        execution.status = 'cancelled';
        execution.error = `Rejected by ${rejectedBy}: ${reason}`;
      }
    }
  }

  createIncident(options: Partial<ResponseIncident>): ResponseIncident {
    const incident: ResponseIncident = {
      id: this.generateId('incident'),
      title: options.title || 'Untitled Incident',
      description: options.description || '',
      severity: options.severity || 'medium',
      status: 'new',
      source: options.source || 'manual',
      sourceId: options.sourceId,
      iocs: options.iocs || [],
      affectedAssets: options.affectedAssets || [],
      playbookRuns: [],
      assignedTo: options.assignedTo,
      assignedTeam: options.assignedTeam,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [{
        id: this.generateId('event'),
        timestamp: new Date(),
        type: 'created',
        description: 'Incident created',
      }],
    };

    this.incidents.set(incident.id, incident);
    this.emit('incident_created', incident);
    return incident;
  }

  getRun(runId: string): PlaybookRun | undefined {
    return this.runs.get(runId);
  }

  getPlaybook(playbookId: string): PlaybookDefinition | undefined {
    return this.playbooks.get(playbookId);
  }

  listPlaybooks(status?: string): PlaybookDefinition[] {
    const playbooks = Array.from(this.playbooks.values());
    if (status) {
      return playbooks.filter(p => p.status === status);
    }
    return playbooks;
  }

  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values())
      .filter(r => r.status === 'pending');
  }

  getDashboard(): ResponseDashboard {
    const runs = Array.from(this.runs.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const runsToday = runs.filter(r => r.triggeredAt >= today);
    const completedRunsToday = runsToday.filter(r => r.status === 'completed');

    const incidents = Array.from(this.incidents.values());
    const activeIncidents = incidents.filter(i => 
      i.status !== 'closed' && i.status !== 'recovered'
    );

    const playbookStats = new Map<string, { runs: number; successes: number }>();
    for (const run of runsToday) {
      const stats = playbookStats.get(run.playbookName) || { runs: 0, successes: 0 };
      stats.runs++;
      if (run.result === 'success') stats.successes++;
      playbookStats.set(run.playbookName, stats);
    }

    const topPlaybooks = Array.from(playbookStats.entries())
      .map(([name, stats]) => ({
        name,
        runs: stats.runs,
        successRate: stats.runs > 0 ? stats.successes / stats.runs : 0,
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);

    return {
      activeIncidents: activeIncidents.length,
      incidentsBySeverity: this.groupBy(incidents, 'severity'),
      incidentsByStatus: this.groupBy(incidents, 'status'),
      playbookRunsToday: runsToday.length,
      playbookSuccessRate: completedRunsToday.length > 0 
        ? completedRunsToday.filter(r => r.result === 'success').length / completedRunsToday.length 
        : 0,
      avgResponseTime: this.calculateAvgResponseTime(runsToday),
      actionsExecutedToday: runsToday.reduce((sum, r) => sum + r.metrics.completedActions, 0),
      pendingApprovals: this.getPendingApprovals().length,
      topPlaybooks,
      recentRuns: runs.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime()).slice(0, 10),
    };
  }

  addEventHandler(handler: SOAREventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(eventType: string, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(eventType, data);
      } catch {
        // Intentionally ignoring handler errors to prevent one handler from breaking others
      }
    }
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of items) {
      const value = String(item[key]);
      result[value] = (result[value] || 0) + 1;
    }
    return result;
  }

  private calculateAvgResponseTime(runs: PlaybookRun[]): number {
    const completed = runs.filter(r => r.duration !== undefined);
    if (completed.length === 0) return 0;
    return completed.reduce((sum, r) => sum + (r.duration || 0), 0) / completed.length;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `soar_${prefix}_${timestamp}_${random}`;
  }
}

export type SOAREventHandler = (eventType: string, data: unknown) => void | Promise<void>;

export function createSOARPlaybookEngine(): SOARPlaybookEngine {
  return new SOARPlaybookEngine();
}

class BlockIPExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    const ip = context.ip || action.parameters.ip;
    
    return {
      success: true,
      output: { blockedIp: ip, action: 'block', timestamp: new Date().toISOString() },
      duration: Date.now() - start,
    };
  }
  
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}

class BlockDomainExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    const domain = context.domain || action.parameters.domain;
    return { success: true, output: { blockedDomain: domain }, duration: Date.now() - start };
  }
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}

class IsolateHostExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    const hostname = context.hostname || action.parameters.hostname;
    return { success: true, output: { isolatedHost: hostname, method: 'network' }, duration: Date.now() - start };
  }
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}

class DisableUserExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    const username = context.username || action.parameters.username;
    return { success: true, output: { disabledUser: username }, duration: Date.now() - start };
  }
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}

class QuarantineFileExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    const filePath = context.filePath || action.parameters.filePath;
    return { success: true, output: { quarantinedFile: filePath }, duration: Date.now() - start };
  }
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}

class CollectEvidenceExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    return { 
      success: true, 
      output: { evidenceCollected: ['memory_dump', 'process_list', 'network_connections'], collectedAt: new Date().toISOString() },
      duration: Date.now() - start 
    };
  }
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}

class SendNotificationExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    const recipients = action.parameters.recipients || [];
    return { success: true, output: { sentTo: recipients }, duration: Date.now() - start };
  }
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}

class WebhookExecutor implements ResponseExecutor {
  async execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult> {
    const start = Date.now();
    const url = String(action.parameters.url || '');
    try {
      if (url) {
        await fetch(url, { method: 'POST', body: JSON.stringify(context) });
      }
      return { success: true, output: { webhookCalled: url }, duration: Date.now() - start };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Webhook failed', duration: Date.now() - start };
    }
  }
  async validate(): Promise<boolean> { return true; }
  async dryRun(): Promise<ActionResult> { return { success: true, duration: 0 }; }
}
