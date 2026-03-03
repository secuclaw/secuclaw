export interface SecurityEvent {
  id: string;
  type: 'alert' | 'incident' | 'threat' | 'vulnerability';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  assignee?: string;
  mitreTactics?: string[];
  mitreTechniques?: string[];
  affectedAssets?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  assignedTo: string[];
  createdAt: Date;
  deadline?: Date;
  progress: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'offline';
  currentTasks: number;
  maxTasks: number;
  performance: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface DashboardMetrics {
  totalEvents: number;
  criticalEvents: number;
  openIncidents: number;
  avgResponseTime: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  systemHealth: number;
}

export interface ThreatIntel {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url';
  value: string;
  reputation: 'malicious' | 'suspicious' | 'unknown' | 'benign';
  confidence: number;
  sources: string[];
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
}

export interface RiskScore {
  overall: number;
  categories: {
    name: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export interface ComplianceStatus {
  framework: string;
  score: number;
  lastAudit: Date;
  gaps: number;
  controls: {
    total: number;
    passed: number;
    failed: number;
    warning: number;
  };
}
