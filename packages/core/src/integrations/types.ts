export type SIEMType = 'splunk' | 'elastic' | 'qradar' | 'sentinel' | 'chronicle';
export type SOARType = 'phantom' | 'demisto' | 'resilient' | 'swimlane' | 'cortex-xsoar';

export interface SIEMConfig {
  type: SIEMType;
  endpoint: string;
  apiKey?: string;
  username?: string;
  password?: string;
  index?: string;
  timeout: number;
  retryAttempts: number;
}

export interface SOARConfig {
  type: SOARType;
  endpoint: string;
  apiKey: string;
  defaultPlaybook?: string;
  timeout: number;
}

export interface SIEMEvent {
  id: string;
  timestamp: Date;
  source: string;
  sourceType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  raw: Record<string, unknown>;
  host?: string;
  srcIp?: string;
  dstIp?: string;
  user?: string;
  process?: string;
  mitreTechnique?: string;
  mitreTactic?: string;
  customFields?: Record<string, unknown>;
}

export interface SIEMAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in-progress' | 'resolved' | 'false-positive';
  createdTime: Date;
  modifiedTime: Date;
  events: SIEMEvent[];
  assignee?: string;
  notes: string[];
  mitreMapping?: {
    tactic: string;
    technique: string;
  }[];
}

export interface SOARPlaybook {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  severity: ('low' | 'medium' | 'high' | 'critical')[];
  autoRun: boolean;
}

export interface SOARIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'containment' | 'eradication' | 'recovery' | 'closed';
  owner?: string;
  createdTime: Date;
  dueTime?: Date;
  playbookRuns: PlaybookRun[];
  artifacts: IncidentArtifact[];
  relatedAlerts: string[];
}

export interface PlaybookRun {
  id: string;
  playbookId: string;
  playbookName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'pending';
  output?: Record<string, unknown>;
}

export interface IncidentArtifact {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'file' | 'user';
  value: string;
  reputation?: 'malicious' | 'suspicious' | 'unknown' | 'benign';
  source: string;
}

export interface SIEMQueryResult {
  success: boolean;
  events: SIEMEvent[];
  totalCount: number;
  queryTime: number;
  error?: string;
}

export interface IntegrationHealth {
  connected: boolean;
  lastSync: Date | null;
  latency: number;
  errorRate: number;
  eventsPerMinute: number;
  alertsLast24h: number;
  status: 'healthy' | 'degraded' | 'disconnected';
}
