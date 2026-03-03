import type {
  RemediationItem,
  RemediationStatus,
  RemediationPriority,
  RemediationCategory,
  RemediationSource,
  RemediationDashboard,
  RemediationQuery,
  RemediationPlan,
  RemediationTemplate,
  RemediationSummary,
  SLAComplianceStats,
  AssigneeInfo,
  AffectedAssetInfo,
  RemediationEventHandler,
  WorkflowTransition,
  WorkflowHistoryEntry,
  ApprovalRecord,
  VerificationCheck,
  VerificationEvidence,
  RemediationStep,
  EffortEstimate,
} from './types.js';

export class RemediationEngine {
  private items: Map<string, RemediationItem> = new Map();
  private plans: Map<string, RemediationPlan> = new Map();
  private templates: Map<string, RemediationTemplate> = new Map();
  private eventHandlers: RemediationEventHandler[] = [];

  private defaultSLA = {
    enabled: true,
    resolutionTargetHours: 168,
    verificationTargetHours: 24,
    escalationEnabled: true,
    escalationLevels: [
      { level: 1, triggerAfterHours: 72, notifyUsers: [], autoEscalate: true },
      { level: 2, triggerAfterHours: 120, notifyUsers: [], autoEscalate: true },
      { level: 3, triggerAfterHours: 168, notifyUsers: [], autoEscalate: false },
    ],
  };

  private workflowTransitions: WorkflowTransition[] = [
    { from: 'draft', to: 'open', label: 'Submit', requiresApproval: false },
    { from: 'open', to: 'assigned', label: 'Assign', requiresApproval: false },
    { from: 'assigned', to: 'in_progress', label: 'Start Work', requiresApproval: false },
    { from: 'in_progress', to: 'pending_verification', label: 'Submit for Verification', requiresApproval: true, approvers: ['reviewer'] },
    { from: 'in_progress', to: 'blocked', label: 'Mark Blocked', requiresApproval: false },
    { from: 'blocked', to: 'in_progress', label: 'Unblock', requiresApproval: false },
    { from: 'pending_verification', to: 'completed', label: 'Approve', requiresApproval: true, approvers: ['reviewer'] },
    { from: 'pending_verification', to: 'in_progress', label: 'Reject & Reopen', requiresApproval: true, approvers: ['reviewer'] },
    { from: 'completed', to: 'verified', label: 'Verify', requiresApproval: true, approvers: ['owner'] },
    { from: 'completed', to: 'in_progress', label: 'Reopen', requiresApproval: true, approvers: ['owner'] },
    { from: 'verified', to: 'closed', label: 'Close', requiresApproval: false },
  ];

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    const templates: RemediationTemplate[] = [
      {
        id: 'tpl_patch',
        name: 'Security Patch',
        description: 'Template for security patching remediation',
        category: 'patch',
        defaultPriority: 'high',
        defaultSla: { ...this.defaultSLA, resolutionTargetHours: 72 },
        solutionTemplate: {
          description: 'Apply security patch',
          steps: [
            { order: 1, description: 'Identify affected systems', status: 'pending' },
            { order: 2, description: 'Test patch in non-production', status: 'pending' },
            { order: 3, description: 'Schedule maintenance window', status: 'pending' },
            { order: 4, description: 'Apply patch to production', status: 'pending' },
            { order: 5, description: 'Verify patch applied correctly', status: 'pending' },
          ],
          estimatedEffort: { minHours: 2, maxHours: 8, complexity: 'simple' },
        },
        verificationTemplate: {
          method: 'automated',
          checklist: [
            { id: 'check1', description: 'Verify patch is applied', passed: null },
          ],
          evidence: [],
        },
        tags: ['security', 'patch', 'vulnerability'],
      },
      {
        id: 'tpl_access',
        name: 'Access Control Remediation',
        description: 'Template for access control issues',
        category: 'access_control',
        defaultPriority: 'high',
        defaultSla: this.defaultSLA,
        solutionTemplate: {
          description: 'Remediate access control violation',
          steps: [
            { order: 1, description: 'Review current access', status: 'pending' },
            { order: 2, description: 'Identify inappropriate permissions', status: 'pending' },
            { order: 3, description: 'Remove or modify access', status: 'pending' },
            { order: 4, description: 'Document changes', status: 'pending' },
          ],
          estimatedEffort: { minHours: 1, maxHours: 4, complexity: 'simple' },
        },
        verificationTemplate: {
          method: 'automated',
          checklist: [
            { id: 'check1', description: 'Verify access is corrected', passed: null },
          ],
          evidence: [],
        },
        tags: ['access', 'permission', 'compliance'],
      },
      {
        id: 'tpl_config',
        name: 'Configuration Fix',
        description: 'Template for configuration remediation',
        category: 'configuration',
        defaultPriority: 'medium',
        defaultSla: this.defaultSLA,
        solutionTemplate: {
          description: 'Fix misconfiguration',
          steps: [
            { order: 1, description: 'Document current configuration', status: 'pending' },
            { order: 2, description: 'Identify secure configuration', status: 'pending' },
            { order: 3, description: 'Apply configuration change', status: 'pending' },
            { order: 4, description: 'Verify configuration', status: 'pending' },
          ],
          estimatedEffort: { minHours: 1, maxHours: 6, complexity: 'moderate' },
        },
        verificationTemplate: {
          method: 'automated',
          checklist: [
            { id: 'check1', description: 'Verify configuration is correct', passed: null },
          ],
          evidence: [],
        },
        tags: ['configuration', 'hardening'],
      },
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  createItem(options: {
    title: string;
    description: string;
    category: RemediationCategory;
    source: RemediationSource;
    priority: RemediationPriority;
    riskScore: number;
    impactLevel: 'critical' | 'high' | 'medium' | 'low';
    urgencyLevel: 'immediate' | 'high' | 'medium' | 'low';
    affectedAssets: AffectedAssetInfo[];
    sourceReference?: { type: 'audit_finding' | 'vulnerability' | 'incident' | 'control_gap' | 'risk_finding'; id: string; name: string };
    assignee?: AssigneeInfo;
    owner?: AssigneeInfo;
    templateId?: string;
    tags?: string[];
    createdBy: string;
  }): RemediationItem {
    const id = this.generateId('item');
    const now = new Date();
    const template = options.templateId ? this.templates.get(options.templateId) : undefined;

    const slaConfig = template?.defaultSla || this.defaultSLA;
    const targetDays = this.calculateTargetDays(options.priority, options.urgencyLevel);

    const item: RemediationItem = {
      id,
      title: options.title,
      description: options.description,
      category: options.category,
      source: options.source,
      status: 'draft',
      priority: options.priority,
      riskScore: options.riskScore,
      impactLevel: options.impactLevel,
      urgencyLevel: options.urgencyLevel,
      sourceReference: options.sourceReference,
      affectedAssets: options.affectedAssets,
      assignee: options.assignee,
      owner: options.owner,
      timeline: {
        createdAt: now,
        targetDate: new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + slaConfig.resolutionTargetHours * 60 * 60 * 1000),
      },
      sla: slaConfig,
      solution: template?.solutionTemplate ? {
        description: template.solutionTemplate.description || '',
        steps: template.solutionTemplate.steps?.map(s => ({ ...s })) || [],
        estimatedEffort: template.solutionTemplate.estimatedEffort as EffortEstimate || { minHours: 1, maxHours: 4, complexity: 'simple' },
      } : undefined,
      workflow: {
        currentStage: 'draft',
        availableTransitions: this.getAvailableTransitions('draft'),
        history: [],
        approvals: [],
        pendingApprovals: [],
      },
      metrics: {
        overdueDays: 0,
        reopenCount: 0,
        reopenReasons: [],
      },
      tags: options.tags || template?.tags || [],
      customFields: {},
      createdAt: now,
      updatedAt: now,
      createdBy: options.createdBy,
    };

    this.items.set(id, item);
    this.emit('item_created', item);
    return item;
  }

  private calculateTargetDays(priority: RemediationPriority, urgency: string): number {
    const baseDays: Record<RemediationPriority, number> = {
      critical: 3,
      high: 7,
      medium: 14,
      low: 30,
    };

    const urgencyMultiplier: Record<string, number> = {
      immediate: 0.5,
      high: 0.75,
      medium: 1,
      low: 1.5,
    };

    return Math.ceil(baseDays[priority] * (urgencyMultiplier[urgency] || 1));
  }

  private getAvailableTransitions(currentStage: string): WorkflowTransition[] {
    return this.workflowTransitions.filter(t => t.from === currentStage);
  }

  transition(itemId: string, targetStatus: RemediationStatus, options?: {
    userId?: string;
    reason?: string;
    bypassApproval?: boolean;
  }): RemediationItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const transition = this.workflowTransitions.find(
      t => t.from === item.status && t.to === targetStatus
    );

    if (!transition) {
      throw new Error(`Invalid transition from ${item.status} to ${targetStatus}`);
    }

    if (transition.requiresApproval && !options?.bypassApproval) {
      return this.requestApproval(item, transition, options?.userId);
    }

    return this.executeTransition(item, targetStatus, options);
  }

  private requestApproval(
    item: RemediationItem,
    transition: WorkflowTransition,
    requestedBy?: string
  ): RemediationItem {
    const approvalId = this.generateId('approval');
    const approval: ApprovalRecord = {
      id: approvalId,
      requestedAt: new Date(),
      requestedBy: requestedBy || 'system',
      approver: transition.approvers?.[0] || 'reviewer',
      status: 'pending',
    };

    item.workflow.approvals.push(approval);
    item.workflow.pendingApprovals.push(approvalId);
    item.updatedAt = new Date();

    this.emit('approval_requested', { item, approval, transition });
    return item;
  }

  private executeTransition(
    item: RemediationItem,
    targetStatus: RemediationStatus,
    options?: { userId?: string; reason?: string }
  ): RemediationItem {
    const previousStatus = item.status;
    const now = new Date();

    item.status = targetStatus;
    item.updatedAt = now;
    item.timeline.lastStatusChangeAt = now;

    const historyEntry: WorkflowHistoryEntry = {
      id: this.generateId('history'),
      fromStage: previousStatus,
      toStage: targetStatus,
      changedAt: now,
      changedBy: options?.userId || 'system',
      reason: options?.reason,
    };
    item.workflow.history.push(historyEntry);

    item.workflow.currentStage = targetStatus;
    item.workflow.availableTransitions = this.getAvailableTransitions(targetStatus);

    this.updateTimelineMetrics(item, targetStatus, now);

    this.emit('item_transitioned', { item, previousStatus, newStatus: targetStatus });
    return item;
  }

  private updateTimelineMetrics(item: RemediationItem, status: RemediationStatus, now: Date): void {
    switch (status) {
      case 'assigned':
        item.timeline.assignedAt = now;
        item.metrics.timeToAssign = now.getTime() - item.createdAt.getTime();
        break;
      case 'in_progress':
        if (!item.timeline.startedAt) {
          item.timeline.startedAt = now;
          item.metrics.timeToStart = now.getTime() - item.createdAt.getTime();
        }
        break;
      case 'completed':
        item.timeline.completedAt = now;
        item.metrics.timeToComplete = now.getTime() - item.createdAt.getTime();
        break;
      case 'verified':
        item.timeline.verifiedAt = now;
        item.metrics.timeToVerify = now.getTime() - (item.timeline.completedAt?.getTime() || now.getTime());
        item.metrics.totalCycleTime = now.getTime() - item.createdAt.getTime();
        break;
      case 'closed':
        item.timeline.closedAt = now;
        break;
    }
  }

  approve(itemId: string, approvalId: string, options: {
    approver: string;
    approved: boolean;
    comment?: string;
  }): RemediationItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const approval = item.workflow.approvals.find(a => a.id === approvalId);
    if (!approval || approval.status !== 'pending') {
      throw new Error('Approval not found or already processed');
    }

    approval.status = options.approved ? 'approved' : 'rejected';
    approval.respondedAt = new Date();
    approval.comment = options.comment;

    const pendingIndex = item.workflow.pendingApprovals.indexOf(approvalId);
    if (pendingIndex > -1) {
      item.workflow.pendingApprovals.splice(pendingIndex, 1);
    }

    if (options.approved) {
      const transition = this.workflowTransitions.find(
        t => t.from === item.status && t.approvers?.includes('reviewer')
      );
      if (transition) {
        this.executeTransition(item, transition.to as RemediationStatus, { userId: options.approver });
      }
    }

    this.emit('approval_processed', { item, approval, approved: options.approved });
    return item;
  }

  assign(itemId: string, assignee: AssigneeInfo): RemediationItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    item.assignee = assignee;
    item.updatedAt = new Date();

    if (item.status === 'open') {
      this.executeTransition(item, 'assigned', { userId: assignee.id });
    }

    this.emit('item_assigned', { item, assignee });
    return item;
  }

  updateSolution(itemId: string, solution: {
    description?: string;
    steps?: RemediationStep[];
    estimatedEffort?: { minHours: number; maxHours: number; complexity: string };
  }): RemediationItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    if (!item.solution) {
      item.solution = {
        description: solution.description || '',
        steps: solution.steps || [],
        estimatedEffort: solution.estimatedEffort as EffortEstimate || { minHours: 1, maxHours: 4, complexity: 'simple' },
      };
    } else {
      if (solution.description) item.solution.description = solution.description;
      if (solution.steps) item.solution.steps = solution.steps;
      if (solution.estimatedEffort && item.solution) item.solution.estimatedEffort = solution.estimatedEffort as EffortEstimate;
    }

    item.updatedAt = new Date();
    this.emit('solution_updated', { item });
    return item;
  }

  completeStep(itemId: string, stepOrder: number, completedBy: string, notes?: string): RemediationItem {
    const item = this.items.get(itemId);
    if (!item || !item.solution) {
      throw new Error(`Item or solution not found: ${itemId}`);
    }

    const step = item.solution.steps.find(s => s.order === stepOrder);
    if (!step) {
      throw new Error(`Step not found: ${stepOrder}`);
    }

    step.status = 'completed';
    step.completedAt = new Date();
    step.completedBy = completedBy;
    step.notes = notes;

    item.updatedAt = new Date();
    this.emit('step_completed', { item, step });
    return item;
  }

  addVerificationEvidence(itemId: string, evidence: Omit<VerificationEvidence, 'id' | 'uploadedAt' | 'uploadedBy'>, uploadedBy: string): RemediationItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    if (!item.verification) {
      item.verification = {
        method: 'hybrid',
        checklist: [],
        evidence: [],
      };
    }

    const fullEvidence: VerificationEvidence = {
      id: this.generateId('evidence'),
      ...evidence,
      uploadedAt: new Date(),
      uploadedBy,
    };

    item.verification.evidence.push(fullEvidence);
    item.updatedAt = new Date();

    this.emit('evidence_added', { item, evidence: fullEvidence });
    return item;
  }

  addVerificationCheck(itemId: string, check: Omit<VerificationCheck, 'id'>): RemediationItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    if (!item.verification) {
      item.verification = {
        method: 'manual',
        checklist: [],
        evidence: [],
      };
    }

    const fullCheck: VerificationCheck = {
      id: this.generateId('check'),
      ...check,
    };

    item.verification.checklist.push(fullCheck);
    item.updatedAt = new Date();

    return item;
  }

  query(query: RemediationQuery): RemediationItem[] {
    let items = Array.from(this.items.values());

    if (query.status?.length) {
      items = items.filter(i => query.status!.includes(i.status));
    }
    if (query.priority?.length) {
      items = items.filter(i => query.priority!.includes(i.priority));
    }
    if (query.category?.length) {
      items = items.filter(i => query.category!.includes(i.category));
    }
    if (query.source?.length) {
      items = items.filter(i => query.source!.includes(i.source));
    }
    if (query.assigneeId) {
      items = items.filter(i => i.assignee?.id === query.assigneeId);
    }
    if (query.ownerId) {
      items = items.filter(i => i.owner?.id === query.ownerId);
    }
    if (query.assetIdentifier) {
      items = items.filter(i =>
        i.affectedAssets.some(a => a.identifier === query.assetIdentifier)
      );
    }
    if (query.overdue) {
      const now = new Date();
      items = items.filter(i =>
        i.timeline.dueDate < now &&
        !['completed', 'verified', 'closed', 'cancelled'].includes(i.status)
      );
    }
    if (query.dueWithinDays) {
      const now = new Date();
      const future = new Date(now.getTime() + query.dueWithinDays * 24 * 60 * 60 * 1000);
      items = items.filter(i =>
        i.timeline.dueDate >= now && i.timeline.dueDate <= future
      );
    }
    if (query.createdAfter) {
      items = items.filter(i => i.createdAt >= query.createdAfter!);
    }
    if (query.createdBefore) {
      items = items.filter(i => i.createdAt <= query.createdBefore!);
    }
    if (query.tags?.length) {
      items = items.filter(i =>
        query.tags!.some(t => i.tags.includes(t))
      );
    }
    if (query.textSearch) {
      const search = query.textSearch.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search)
      );
    }
    if (query.minRiskScore !== undefined) {
      items = items.filter(i => i.riskScore >= query.minRiskScore!);
    }
    if (query.maxRiskScore !== undefined) {
      items = items.filter(i => i.riskScore <= query.maxRiskScore!);
    }

    return this.sortItems(items);
  }

  private sortItems(items: RemediationItem[]): RemediationItem[] {
    const priorityOrder: Record<RemediationPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return items.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timeline.dueDate.getTime() - b.timeline.dueDate.getTime();
    });
  }

  getItem(itemId: string): RemediationItem | undefined {
    return this.items.get(itemId);
  }

  getDashboard(): RemediationDashboard {
    const items = Array.from(this.items.values());
    const now = new Date();

    const summary = this.calculateSummary(items);
    const byStatus = this.groupBy(items, 'status') as Record<RemediationStatus, number>;
    const byPriority = this.groupBy(items, 'priority') as Record<RemediationPriority, number>;
    const byCategory = this.groupBy(items, 'category') as Record<RemediationCategory, number>;
    const bySource = this.groupBy(items, 'source') as Record<RemediationSource, number>;

    const overdue = items.filter(i =>
      i.timeline.dueDate < now &&
      !['completed', 'verified', 'closed', 'cancelled'].includes(i.status)
    );

    const upcomingDeadlines = items
      .filter(i => {
        const daysUntilDue = (i.timeline.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
        return daysUntilDue > 0 && daysUntilDue <= 7 && !['completed', 'verified', 'closed'].includes(i.status);
      })
      .slice(0, 10);

    const recentlyCompleted = items
      .filter(i => i.timeline.completedAt)
      .sort((a, b) => b.timeline.completedAt!.getTime() - a.timeline.completedAt!.getTime())
      .slice(0, 10);

    const assigneeWorkload = this.calculateAssigneeWorkload(items);
    const slaCompliance = this.calculateSLACompliance(items);
    const trendData = this.calculateTrendData(items);

    return {
      summary,
      byStatus,
      byPriority,
      byCategory,
      bySource,
      overdue,
      upcomingDeadlines,
      recentlyCompleted,
      assigneeWorkload,
      slaCompliance,
      trendData,
    };
  }

  private calculateSummary(items: RemediationItem[]): RemediationSummary {
    const now = new Date();
    const completed = items.filter(i => ['completed', 'verified', 'closed'].includes(i.status));
    const withCycleTime = completed.filter(i => i.metrics.totalCycleTime);

    return {
      total: items.length,
      open: items.filter(i => ['draft', 'open', 'assigned'].includes(i.status)).length,
      inProgress: items.filter(i => i.status === 'in_progress').length,
      completed: completed.length,
      verified: items.filter(i => i.status === 'verified').length,
      overdue: items.filter(i =>
        i.timeline.dueDate < now &&
        !['completed', 'verified', 'closed', 'cancelled'].includes(i.status)
      ).length,
      blocked: items.filter(i => i.status === 'blocked').length,
      avgResolutionTime: withCycleTime.length > 0
        ? withCycleTime.reduce((sum, i) => sum + (i.metrics.totalCycleTime || 0), 0) / withCycleTime.length / (60 * 60 * 1000)
        : 0,
      avgCycleTime: withCycleTime.length > 0
        ? withCycleTime.reduce((sum, i) => sum + (i.metrics.totalCycleTime || 0), 0) / withCycleTime.length / (60 * 60 * 1000)
        : 0,
    };
  }

  private calculateAssigneeWorkload(items: RemediationItem[]): Array<{ assignee: string; count: number; criticalCount: number }> {
    const workload = new Map<string, { count: number; criticalCount: number }>();

    for (const item of items) {
      if (item.assignee && !['completed', 'verified', 'closed', 'cancelled'].includes(item.status)) {
        const current = workload.get(item.assignee.name) || { count: 0, criticalCount: 0 };
        current.count++;
        if (item.priority === 'critical') current.criticalCount++;
        workload.set(item.assignee.name, current);
      }
    }

    return Array.from(workload.entries())
      .map(([assignee, data]) => ({ assignee, ...data }))
      .sort((a, b) => b.criticalCount - a.criticalCount || b.count - a.count);
  }

  private calculateSLACompliance(items: RemediationItem[]): SLAComplianceStats {
    const completedItems = items.filter(i => i.timeline.completedAt);

    const withinSLA = completedItems.filter(i =>
      i.timeline.completedAt! <= i.timeline.dueDate
    ).length;

    const breachedSLA = completedItems.filter(i =>
      i.timeline.completedAt! > i.timeline.dueDate
    ).length;

    const atRisk = items.filter(i =>
      !['completed', 'verified', 'closed', 'cancelled'].includes(i.status) &&
      i.timeline.dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000
    ).length;

    const breachTimes = completedItems
      .filter(i => i.timeline.completedAt! > i.timeline.dueDate)
      .map(i => i.timeline.completedAt!.getTime() - i.timeline.dueDate.getTime());

    return {
      withinSLA,
      breachedSLA,
      atRisk,
      complianceRate: completedItems.length > 0 ? withinSLA / completedItems.length : 1,
      avgBreachTime: breachTimes.length > 0
        ? breachTimes.reduce((a, b) => a + b, 0) / breachTimes.length / (60 * 60 * 1000)
        : 0,
    };
  }

  private calculateTrendData(items: RemediationItem[]): Array<{ date: string; created: number; completed: number; open: number; overdue: number }> {
    const trend: Array<{ date: string; created: number; completed: number; open: number; overdue: number }> = [];
    const today = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const createdOnDay = items.filter(item => {
        const created = new Date(item.createdAt);
        return created >= dayStart && created <= dayEnd;
      }).length;

      const completedOnDay = items.filter(item => {
        const completed = item.timeline.completedAt;
        return completed && completed >= dayStart && completed <= dayEnd;
      }).length;

      const openAtEndOfDay = items.filter(item => {
        const created = new Date(item.createdAt);
        const completed = item.timeline.completedAt;
        return created <= dayEnd && (!completed || completed > dayEnd);
      }).length;

      const overdueAtEndOfDay = items.filter(item => {
        const created = new Date(item.createdAt);
        const completed = item.timeline.completedAt;
        const due = item.timeline.dueDate;
        return created <= dayEnd && (!completed || completed > dayEnd) && due < dayEnd;
      }).length;

      trend.push({
        date: dateStr,
        created: createdOnDay,
        completed: completedOnDay,
        open: openAtEndOfDay,
        overdue: overdueAtEndOfDay,
      });
    }

    return trend;
  }

  createPlan(options: {
    name: string;
    description: string;
    owner: string;
    startDate: Date;
    endDate: Date;
    itemIds?: string[];
  }): RemediationPlan {
    const plan: RemediationPlan = {
      id: this.generateId('plan'),
      name: options.name,
      description: options.description,
      items: options.itemIds || [],
      owner: options.owner,
      startDate: options.startDate,
      endDate: options.endDate,
      status: 'planning',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.plans.set(plan.id, plan);
    this.emit('plan_created', plan);
    return plan;
  }

  addItemToPlan(planId: string, itemId: string): RemediationPlan {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (!plan.items.includes(itemId)) {
      plan.items.push(itemId);
      plan.updatedAt = new Date();
      this.updatePlanProgress(plan);
    }

    return plan;
  }

  private updatePlanProgress(plan: RemediationPlan): void {
    const planItems = plan.items
      .map(id => this.items.get(id))
      .filter(Boolean) as RemediationItem[];

    if (planItems.length === 0) {
      plan.progress = 0;
      return;
    }

    const completed = planItems.filter(i =>
      ['completed', 'verified', 'closed'].includes(i.status)
    ).length;

    plan.progress = Math.round((completed / planItems.length) * 100);
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of items) {
      const value = String(item[key]);
      result[value] = (result[value] || 0) + 1;
    }
    return result;
  }

  addEventHandler(handler: RemediationEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(eventType: string, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(eventType, data);
      } catch {
        // Intentionally ignoring handler errors to prevent cascading failures
      }
    }
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `rem_${prefix}_${timestamp}_${random}`;
  }
}

export function createRemediationEngine(): RemediationEngine {
  return new RemediationEngine();
}
