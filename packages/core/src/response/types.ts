export type PlaybookStatus = 'draft' | 'published' | 'deprecated' | 'testing';

export type ActionType = 
  | 'block_ip'
  | 'block_domain'
  | 'block_url'
  | 'isolate_host'
  | 'disable_user'
  | 'reset_password'
  | 'kill_process'
  | 'quarantine_file'
  | 'collect_evidence'
  | 'run_script'
  | 'send_notification'
  | 'create_ticket'
  | 'update_ticket'
  | 'escalate'
  | 'webhook'
  | 'custom';

export type ActionCategory = 
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'notification'
  | 'investigation'
  | 'remediation';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type ExecutionStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled'
  | 'skipped';

export type TriggerType = 
  | 'manual'
  | 'alert'
  | 'incident'
  | 'threshold'
  | 'schedule'
  | 'webhook'
  | 'api';

export interface ResponseAction {
  id: string;
  type: ActionType;
  category: ActionCategory;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresApproval: boolean;
  approvalTimeout?: number;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  continueOnFailure: boolean;
  condition?: string;
  order: number;
}

export interface ActionExecution {
  id: string;
  actionId: string;
  playbookRunId: string;
  status: ExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryAttempts: number;
  approvedBy?: string;
  approvedAt?: Date;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  playbookRunId: string;
  actionId: string;
  actionName: string;
  actionType: ActionType;
  parameters: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  justification?: string;
  requestedBy: string;
  requestedAt: Date;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  expiresAt: Date;
  approvers: string[];
  notifiedApprovers: string[];
}

export interface PlaybookDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  status: PlaybookStatus;
  category: ActionCategory;
  triggers: PlaybookTrigger[];
  actions: ResponseAction[];
  variables: PlaybookVariable[];
  successConditions?: string[];
  failureConditions?: string[];
  maxExecutionTime: number;
  requireApproval: boolean;
  approvers?: string[];
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaybookTrigger {
  type: TriggerType;
  conditions: TriggerCondition[];
  enabled: boolean;
  cooldown?: number;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists';
  value: string | number | boolean;
}

export interface PlaybookVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  validation?: string;
}

export interface PlaybookRun {
  id: string;
  playbookId: string;
  playbookName: string;
  trigger: TriggerType;
  triggeredBy: string;
  triggeredAt: Date;
  status: ExecutionStatus;
  context: Record<string, unknown>;
  variables: Record<string, unknown>;
  actionExecutions: ActionExecution[];
  currentActionIndex: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  result?: 'success' | 'partial' | 'failure';
  summary?: string;
  metrics: ExecutionMetrics;
}

export interface ExecutionMetrics {
  totalActions: number;
  completedActions: number;
  failedActions: number;
  skippedActions: number;
  totalDuration: number;
  approvalWaitTime: number;
  errorCount: number;
  retryCount: number;
}

export interface ResponseIncident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'investigating' | 'contained' | 'eradicated' | 'recovered' | 'closed';
  source: string;
  sourceId?: string;
  iocs: IOCData[];
  affectedAssets: AffectedAsset[];
  playbookRuns: string[];
  assignedTo?: string;
  assignedTeam?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  timeline: IncidentTimelineEvent[];
}

export interface IOCData {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email';
  value: string;
  confidence: number;
  firstSeen?: Date;
  lastSeen?: Date;
  context?: string;
}

export interface AffectedAsset {
  type: 'host' | 'user' | 'network' | 'application' | 'data';
  identifier: string;
  name?: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  status: 'affected' | 'contained' | 'remediated' | 'unknown';
}

export interface IncidentTimelineEvent {
  id: string;
  timestamp: Date;
  type: 'created' | 'status_change' | 'playbook_run' | 'action_taken' | 'note' | 'escalation';
  description: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export interface ResponseDashboard {
  activeIncidents: number;
  incidentsBySeverity: Record<string, number>;
  incidentsByStatus: Record<string, number>;
  playbookRunsToday: number;
  playbookSuccessRate: number;
  avgResponseTime: number;
  actionsExecutedToday: number;
  pendingApprovals: number;
  topPlaybooks: Array<{ name: string; runs: number; successRate: number }>;
  recentRuns: PlaybookRun[];
}

export interface ResponseExecutor {
  execute(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult>;
  validate(action: ResponseAction): Promise<boolean>;
  dryRun(action: ResponseAction, context: Record<string, unknown>): Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  duration: number;
  sideEffects?: string[];
}
