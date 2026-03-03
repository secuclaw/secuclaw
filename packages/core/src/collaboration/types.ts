import { Type } from '@sinclair/typebox';

export type AgentRole = 
  | 'commander'      
  | 'analyst'        
  | 'hunter'         
  | 'responder'      
  | 'engineer'       
  | 'architect'      
  | 'compliance'     
  | 'intelligence';  

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus = 
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentCapability {
  name: string;
  description: string;
  tools: string[];
  frameworks: string[];
}

export interface TeamAgent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  maxConcurrentTasks: number;
  currentTasks: number;
  status: 'available' | 'busy' | 'offline';
  lastActive: Date;
  performance: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface CollaborationTask {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  dependencies: string[];
  subtasks: string[];
  parentTask?: string;
  context: Record<string, unknown>;
  results?: TaskResult;
  mitreMapping?: {
    tactics: string[];
    techniques: string[];
  };
}

export interface TaskResult {
  success: boolean;
  summary: string;
  details: Record<string, unknown>;
  artifacts: TaskArtifact[];
  followUpActions: string[];
}

export interface TaskArtifact {
  type: 'report' | 'evidence' | 'ioc' | 'log' | 'config' | 'other';
  name: string;
  content: string;
  mimeType?: string;
}

export interface CollaborationMessage {
  id: string;
  taskId: string;
  fromAgent: string;
  toAgent: string | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'escalation';
  content: string;
  timestamp: Date;
  requiresResponse: boolean;
  priority: TaskPriority;
}

export interface TeamState {
  agents: Map<string, TeamAgent>;
  tasks: Map<string, CollaborationTask>;
  messages: CollaborationMessage[];
  activeWorkflows: string[];
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  assignedAt: Date;
  estimatedDuration: number;
  reason: string;
}

export const TaskPrioritySchema = Type.Union([
  Type.Literal('critical'),
  Type.Literal('high'),
  Type.Literal('medium'),
  Type.Literal('low'),
]);

export const AgentRoleSchema = Type.Union([
  Type.Literal('commander'),
  Type.Literal('analyst'),
  Type.Literal('hunter'),
  Type.Literal('responder'),
  Type.Literal('engineer'),
  Type.Literal('architect'),
  Type.Literal('compliance'),
  Type.Literal('intelligence'),
]);

export const CreateTaskSchema = Type.Object({
  title: Type.String(),
  description: Type.String(),
  priority: TaskPrioritySchema,
  assignedTo: Type.Optional(Type.Array(Type.String())),
  deadline: Type.Optional(Type.String()),
  dependencies: Type.Optional(Type.Array(Type.String())),
  context: Type.Optional(Type.Record(Type.String(), Type.Any())),
  mitreTactics: Type.Optional(Type.Array(Type.String())),
  mitreTechniques: Type.Optional(Type.Array(Type.String())),
});

export const AssignTaskSchema = Type.Object({
  taskId: Type.String(),
  agentId: Type.String(),
  reason: Type.Optional(Type.String()),
});

export const SendMessageSchema = Type.Object({
  taskId: Type.String(),
  toAgent: Type.String(),
  type: Type.Union([
    Type.Literal('request'),
    Type.Literal('response'),
    Type.Literal('notification'),
    Type.Literal('escalation'),
  ]),
  content: Type.String(),
  requiresResponse: Type.Optional(Type.Boolean()),
  priority: Type.Optional(TaskPrioritySchema),
});

export const ROLE_CAPABILITIES: Record<AgentRole, AgentCapability[]> = {
  commander: [
    { name: 'orchestration', description: '协调多Agent工作流', tools: ['task_assign', 'workflow_create'], frameworks: ['MITRE', 'NIST'] },
    { name: 'decision_making', description: '关键决策制定', tools: ['risk_assess', 'approve_action'], frameworks: ['SCF'] },
  ],
  analyst: [
    { name: 'log_analysis', description: '日志和事件分析', tools: ['log_analysis', 'ioc_search'], frameworks: ['MITRE'] },
    { name: 'threat_assessment', description: '威胁评估', tools: ['risk_assessment', 'impact_analysis'], frameworks: ['NIST'] },
  ],
  hunter: [
    { name: 'threat_hunting', description: '主动威胁狩猎', tools: ['ioc_search', 'behavioral_analysis', 'yara_scan'], frameworks: ['MITRE'] },
    { name: 'forensics', description: '取证分析', tools: ['memory_forensics', 'evidence_collection'], frameworks: ['NIST'] },
  ],
  responder: [
    { name: 'incident_response', description: '事件响应', tools: ['incident_create', 'host_isolation', 'containment'], frameworks: ['NIST', 'ISO'] },
    { name: 'containment', description: '威胁遏制', tools: ['block_indicator', 'account_disable'], frameworks: ['MITRE'] },
  ],
  engineer: [
    { name: 'vulnerability_management', description: '漏洞管理', tools: ['network_vuln_scan', 'web_app_scan', 'container_scan'], frameworks: ['CVE', 'CWE'] },
    { name: 'security_testing', description: '安全测试', tools: ['sql_injection_test', 'xss_test', 'ddos_simulate'], frameworks: ['OWASP'] },
  ],
  architect: [
    { name: 'security_architecture', description: '安全架构设计', tools: ['threat_modeling', 'attack_path_analysis'], frameworks: ['TOGAF', 'SABSA'] },
    { name: 'risk_management', description: '风险管理', tools: ['risk_assessment', 'compliance_check'], frameworks: ['ISO27001', 'NIST'] },
  ],
  compliance: [
    { name: 'compliance_audit', description: '合规审计', tools: ['compliance_check', 'config_audit'], frameworks: ['GDPR', 'PCI-DSS', 'HIPAA'] },
    { name: 'policy_review', description: '策略审查', tools: ['security_gap', 'compliance_check'], frameworks: ['SCF', 'CIS'] },
  ],
  intelligence: [
    { name: 'threat_intelligence', description: '威胁情报', tools: ['threat_intel_query', 'ioc_search'], frameworks: ['STIX', 'TAXII'] },
    { name: 'reconnaissance', description: '情报收集', tools: ['dns_enumeration', 'subdomain_enumeration'], frameworks: ['MITRE'] },
  ],
};
