export type RemediationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RemediationStatus = 
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'pending_verification'
  | 'completed'
  | 'verified'
  | 'closed'
  | 'cancelled';
export type RemediationSource = 'audit' | 'assessment' | 'incident' | 'vulnerability' | 'compliance' | 'risk' | 'manual';
export type RemediationCategory = 
  | 'patch'
  | 'configuration'
  | 'access_control'
  | 'network_security'
  | 'data_protection'
  | 'monitoring'
  | 'policy'
  | 'training'
  | 'process'
  | 'technology'
  | 'other';

export interface RemediationItem {
  id: string;
  title: string;
  description: string;
  category: RemediationCategory;
  source: RemediationSource;
  status: RemediationStatus;
  priority: RemediationPriority;
  
  riskScore: number;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  urgencyLevel: 'immediate' | 'high' | 'medium' | 'low';
  
  sourceReference?: SourceReference;
  affectedAssets: AffectedAssetInfo[];
  
  assignee?: AssigneeInfo;
  owner?: AssigneeInfo;
  reviewer?: AssigneeInfo;
  
  timeline: RemediationTimeline;
  sla: SLAConfig;
  
  solution?: RemediationSolution;
  verification?: VerificationInfo;
  
  workflow: WorkflowState;
  metrics: RemediationMetrics;
  
  tags: string[];
  customFields: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SourceReference {
  type: 'audit_finding' | 'vulnerability' | 'incident' | 'control_gap' | 'risk_finding';
  id: string;
  name: string;
  url?: string;
}

export interface AffectedAssetInfo {
  type: 'host' | 'application' | 'network' | 'data' | 'user' | 'process' | 'service';
  identifier: string;
  name?: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  environment: 'production' | 'staging' | 'development' | 'testing';
}

export interface AssigneeInfo {
  id: string;
  name: string;
  email: string;
  department?: string;
  team?: string;
}

export interface RemediationTimeline {
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  targetDate: Date;
  dueDate: Date;
  completedAt?: Date;
  verifiedAt?: Date;
  closedAt?: Date;
  lastStatusChangeAt?: Date;
}

export interface SLAConfig {
  enabled: boolean;
  resolutionTargetHours: number;
  verificationTargetHours: number;
  escalationEnabled: boolean;
  escalationLevels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  triggerAfterHours: number;
  notifyUsers: string[];
  autoEscalate: boolean;
  message?: string;
}

export interface RemediationSolution {
  description: string;
  steps: RemediationStep[];
  estimatedEffort: EffortEstimate;
  prerequisites?: string[];
  risks?: string[];
  references?: string[];
}

export interface RemediationStep {
  order: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export interface EffortEstimate {
  minHours: number;
  maxHours: number;
  actualHours?: number;
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex';
}

export interface VerificationInfo {
  method: 'automated' | 'manual' | 'hybrid';
  checklist: VerificationCheck[];
  evidence: VerificationEvidence[];
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
}

export interface VerificationCheck {
  id: string;
  description: string;
  passed: boolean | null;
  checkedAt?: Date;
  checkedBy?: string;
  notes?: string;
}

export interface VerificationEvidence {
  id: string;
  type: 'screenshot' | 'log' | 'report' | 'configuration' | 'test_result' | 'other';
  name: string;
  description?: string;
  path?: string;
  content?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface WorkflowState {
  currentStage: string;
  availableTransitions: WorkflowTransition[];
  history: WorkflowHistoryEntry[];
  approvals: ApprovalRecord[];
  pendingApprovals: string[];
}

export interface WorkflowTransition {
  from: string;
  to: string;
  label: string;
  requiresApproval: boolean;
  approvers?: string[];
  autoTrigger?: {
    condition: string;
    afterHours?: number;
  };
}

export interface WorkflowHistoryEntry {
  id: string;
  fromStage: string;
  toStage: string;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

export interface ApprovalRecord {
  id: string;
  requestedAt: Date;
  requestedBy: string;
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  respondedAt?: Date;
  comment?: string;
}

export interface RemediationMetrics {
  timeToAssign?: number;
  timeToStart?: number;
  timeToComplete?: number;
  timeToVerify?: number;
  totalCycleTime?: number;
  overdueDays: number;
  reopenCount: number;
  reopenReasons: string[];
  effortVariance?: number;
}

export interface RemediationDashboard {
  summary: RemediationSummary;
  byStatus: Record<RemediationStatus, number>;
  byPriority: Record<RemediationPriority, number>;
  byCategory: Record<RemediationCategory, number>;
  bySource: Record<RemediationSource, number>;
  overdue: RemediationItem[];
  upcomingDeadlines: RemediationItem[];
  recentlyCompleted: RemediationItem[];
  assigneeWorkload: Array<{ assignee: string; count: number; criticalCount: number }>;
  slaCompliance: SLAComplianceStats;
  trendData: RemediationTrend[];
}

export interface RemediationSummary {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  verified: number;
  overdue: number;
  blocked: number;
  avgResolutionTime: number;
  avgCycleTime: number;
}

export interface SLAComplianceStats {
  withinSLA: number;
  breachedSLA: number;
  atRisk: number;
  complianceRate: number;
  avgBreachTime: number;
}

export interface RemediationTrend {
  date: string;
  created: number;
  completed: number;
  open: number;
  overdue: number;
}

export interface RemediationQuery {
  status?: RemediationStatus[];
  priority?: RemediationPriority[];
  category?: RemediationCategory[];
  source?: RemediationSource[];
  assigneeId?: string;
  ownerId?: string;
  assetIdentifier?: string;
  overdue?: boolean;
  dueWithinDays?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
  textSearch?: string;
  minRiskScore?: number;
  maxRiskScore?: number;
}

export interface RemediationPlan {
  id: string;
  name: string;
  description: string;
  items: string[];
  owner: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RemediationTemplate {
  id: string;
  name: string;
  description: string;
  category: RemediationCategory;
  defaultPriority: RemediationPriority;
  defaultSla: SLAConfig;
  solutionTemplate: Partial<RemediationSolution>;
  verificationTemplate: Partial<VerificationInfo>;
  tags: string[];
}

export type RemediationEventHandler = (eventType: string, data: unknown) => void | Promise<void>;
