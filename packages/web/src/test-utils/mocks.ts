import { vi } from 'vitest';

export interface MockApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function createMockApiClient() {
  return {
    login: vi.fn().mockResolvedValue({ success: true, data: { token: 'mock-token', user: { id: '1', email: 'test@test.com', displayName: 'Test User', tenantId: 'tenant-1', roleIds: ['admin'] }, expiresAt: new Date().toISOString() } }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    getCurrentUser: vi.fn().mockResolvedValue({ success: true, data: { id: '1', email: 'test@test.com', displayName: 'Test User', tenantId: 'tenant-1', roleIds: ['admin'], status: 'active', lastLogin: new Date().toISOString() } }),
    getSessions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getSystemStats: vi.fn().mockResolvedValue({ success: true, data: { sessions: 5, attacks: 3, defenses: 8, audits: 2, activeUsers: 10, threatsDetected: 15 } }),
    getRiskScore: vi.fn().mockResolvedValue({ success: true, data: { overall: 45, attackSurface: 30, vulnerabilities: 50, threats: 40, compliance: 60 } }),
    runAttack: vi.fn().mockResolvedValue({ success: true, data: { target: '192.168.1.1', attackType: 'network', duration: 120, summary: { totalTests: 10, successful: 3, detected: 5, vulnerabilitiesFound: 2 }, findings: [], recommendations: [] } }),
    runDefense: vi.fn().mockResolvedValue({ success: true, data: { target: '192.168.1.1', scanType: 'vulnerability', duration: 60, summary: { riskScore: 50, critical: 1, high: 2, medium: 5, low: 10 }, findings: [], compliance: [] } }),
    runAudit: vi.fn().mockResolvedValue({ success: true, data: { framework: 'ISO27001', timestamp: new Date().toISOString(), summary: { overallScore: 78, complianceRate: 0.78, totalControls: 114, compliant: 89, partiallyCompliant: 13, nonCompliant: 12 }, domainResults: [], criticalGaps: [], timeline: [] } }),
    getTactics: vi.fn().mockResolvedValue({ success: true, data: [
      { id: 'TA0001', name: 'Reconnaissance', description: 'Adversary is trying to gather information' },
      { id: 'TA0002', name: 'Resource Development', description: 'Adversary is trying to establish resources' },
      { id: 'TA0003', name: 'Initial Access', description: 'Adversary is trying to get into your network' },
    ]}),
    getTechniques: vi.fn().mockResolvedValue({ success: true, data: [
      { id: 'T1566', name: 'Phishing', tacticId: 'TA0001', description: 'Adversary may send phishing emails', detection: 'Monitor email logs', mitigations: [] },
    ]}),
    searchTechniques: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getSCFDomains: vi.fn().mockResolvedValue({ success: true, data: [
      { id: 'GOV', code: 'GOV', name: 'Governance', description: 'Cybersecurity governance', controlCount: 25 },
      { id: 'IAM', code: 'IAM', name: 'Identity & Access', description: 'Identity management', controlCount: 22 },
    ]}),
    getSCFControls: vi.fn().mockResolvedValue({ success: true, data: [] }),
    healthCheck: vi.fn().mockResolvedValue({ success: true, data: { status: 'ok', version: '1.0.0' } }),
    setToken: vi.fn(),
  };
}

export function createMockWebSocket() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  
  return {
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn((eventType: string, callback: (event: unknown) => void) => {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }
      listeners.get(eventType)!.add(callback);
      return () => listeners.get(eventType)?.delete(callback);
    }),
    emit: vi.fn((eventType: string, data: unknown) => {
      listeners.get(eventType)?.forEach(cb => cb(data));
      listeners.get('*')?.forEach(cb => cb({ type: eventType, data }));
    }),
  };
}

export function createMockSecurityData() {
  return {
    metrics: {
      totalEvents: 156,
      criticalEvents: 12,
      openIncidents: 8,
      avgResponseTime: 15,
      threatLevel: 'medium' as const,
      systemHealth: 95,
    },
    events: [
      { id: 'event-1', type: 'alert' as const, severity: 'high' as const, title: 'Suspicious Login', description: 'Unusual login detected', source: 'SIEM', timestamp: new Date(), status: 'new' as const },
      { id: 'event-2', type: 'incident' as const, severity: 'critical' as const, title: 'Malware Detected', description: 'Malware found on endpoint', source: 'EDR', timestamp: new Date(), status: 'investigating' as const },
    ],
    tasks: [
      { id: 'task-1', title: 'Investigate Alert', description: 'Review suspicious activity', priority: 'high' as const, status: 'in_progress' as const, assignedTo: ['analyst-1'], createdAt: new Date(), progress: 50 },
    ],
    agents: [
      { id: 'agent-1', name: 'Threat Hunter', role: 'Threat Detection', status: 'available' as const, currentTasks: 1, maxTasks: 5, performance: { tasksCompleted: 100, successRate: 0.95, avgResponseTime: 10 } },
    ],
  };
}

export function createMockMITREData() {
  return {
    tactics: [
      { id: 'TA0001', name: 'Reconnaissance', description: 'Gathering information' },
      { id: 'TA0002', name: 'Resource Development', description: 'Establishing resources' },
    ],
    techniques: [
      { id: 'T1566', name: 'Phishing', tacticId: 'TA0001', description: 'Phishing attacks', detection: 'Email monitoring', mitigations: ['User training'] },
    ],
    loading: false,
    error: null,
  };
}

export function createMockSCFData() {
  return {
    domains: [
      { id: 'GOV', code: 'GOV', name: 'Governance', description: 'Security governance', controlCount: 25 },
      { id: 'IAM', code: 'IAM', name: 'Identity & Access', description: 'IAM controls', controlCount: 22 },
    ],
    controls: [
      { id: 'scf-gov-01', domainCode: 'GOV', name: 'Security Policy', description: 'Security policy management', requirements: [], maturityLevel: 3, priority: 'high' as const, categories: [], mappings: [], threats: [], risks: [], relatedControls: [] },
    ],
    loading: false,
    error: null,
  };
}

export const mockUtils = {
  createMockApiClient,
  createMockWebSocket,
  createMockSecurityData,
  createMockMITREData,
  createMockSCFData,
};

export default mockUtils;
