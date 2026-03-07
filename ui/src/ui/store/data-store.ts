/**
 * SecuClaw Data Store
 * 
 * Manages real-time data synchronization via WebSocket
 */

import { signal, computed } from '@lit-labs/signals';

// Types
export interface Threat {
  id: string;
  name: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'mitigated' | 'false-positive';
  source: string;
  lastSeen: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  updatedAt: string;
}

export interface Vulnerability {
  id: string;
  cve: string;
  name: string;
  cvss: number;
  patched: boolean;
}

export interface DashboardStats {
  totalThreats: number;
  activeIncidents: number;
  vulnerabilities: number;
  complianceScore: number;
}

// State signals
const threats = signal<Threat[]>([]);
const incidents = signal<Incident[]>([]);
const vulnerabilities = signal<Vulnerability[]>([]);
const dashboardStats = signal<DashboardStats>({
  totalThreats: 0,
  activeIncidents: 0,
  vulnerabilities: 0,
  complianceScore: 0,
});
const connectionStatus = signal<'connected' | 'disconnected' | 'connecting'>('disconnected');
const lastUpdate = signal<Date | null>(null);

// Computed values
export const threatCount = computed(() => threats.get().length);
export const activeIncidentCount = computed(() => 
  incidents.get().filter(i => i.status !== 'resolved').length
);
export const criticalThreats = computed(() => 
  threats.get().filter(t => t.severity === 'critical')
);

// Data store
export const dataStore = {
  // Getters
  getThreats: () => threats.get(),
  getIncidents: () => incidents.get(),
  getVulnerabilities: () => vulnerabilities.get(),
  getDashboardStats: () => dashboardStats.get(),
  getConnectionStatus: () => connectionStatus.get(),
  getLastUpdate: () => lastUpdate.get(),

  // Setters (called by WebSocket client)
  setThreats: (data: Threat[]) => {
    threats.set(data);
    lastUpdate.set(new Date());
  },

  addThreat: (threat: Threat) => {
    threats.set([...threats.get(), threat]);
    lastUpdate.set(new Date());
  },

  updateThreat: (id: string, updates: Partial<Threat>) => {
    threats.set(
      threats.get().map(t => t.id === id ? { ...t, ...updates } : t)
    );
    lastUpdate.set(new Date());
  },

  setIncidents: (data: Incident[]) => {
    incidents.set(data);
    lastUpdate.set(new Date());
  },

  addIncident: (incident: Incident) => {
    incidents.set([...incidents.get(), incident]);
    lastUpdate.set(new Date());
  },

  setVulnerabilities: (data: Vulnerability[]) => {
    vulnerabilities.set(data);
    lastUpdate.set(new Date());
  },

  setDashboardStats: (stats: DashboardStats) => {
    dashboardStats.set(stats);
    lastUpdate.set(new Date());
  },

  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => {
    connectionStatus.set(status);
  },

  // Initialize with mock data
  initializeMockData: () => {
    threats.set([
      { id: 'T001', name: 'APT28 钓鱼攻击活动', type: 'APT', severity: 'critical', status: 'active', source: '威胁情报源', lastSeen: '5分钟前' },
      { id: 'T002', name: 'CVE-2024-1234 漏洞利用', type: 'Vulnerability', severity: 'high', status: 'active', source: '漏洞扫描', lastSeen: '15分钟前' },
      { id: 'T003', name: '异常登录行为检测', type: 'Behavior', severity: 'medium', status: 'active', source: 'SIEM', lastSeen: '1小时前' },
      { id: 'T004', name: '恶意软件签名更新', type: 'Malware', severity: 'low', status: 'mitigated', source: '防病毒系统', lastSeen: '2小时前' },
      { id: 'T005', name: 'DDoS 攻击预警', type: 'DDoS', severity: 'high', status: 'active', source: '网络监控', lastSeen: '3小时前' },
    ]);

    incidents.set([
      { id: 'INC-001', title: '检测到可疑横向移动行为', severity: 'critical', status: 'investigating', updatedAt: '10分钟前' },
      { id: 'INC-002', title: '勒索软件感染事件', severity: 'critical', status: 'contained', updatedAt: '1小时前' },
      { id: 'INC-003', title: '钓鱼邮件攻击', severity: 'high', status: 'resolved', updatedAt: '2小时前' },
    ]);

    vulnerabilities.set([
      { id: 'V001', cve: 'CVE-2024-1234', name: 'Log4j 远程代码执行漏洞', cvss: 10.0, patched: false },
      { id: 'V002', cve: 'CVE-2024-2345', name: 'Spring Framework RCE', cvss: 9.8, patched: true },
      { id: 'V003', cve: 'CVE-2024-3456', name: 'OpenSSL 缓冲区溢出', cvss: 7.5, patched: false },
    ]);

    dashboardStats.set({
      totalThreats: 156,
      activeIncidents: 8,
      vulnerabilities: 42,
      complianceScore: 94,
    });

    lastUpdate.set(new Date());
  },

  // Subscribe to real-time updates
  subscribe: (eventType: string, callback: (data: unknown) => void) => {
    // In real implementation, this would set up WebSocket event listeners
    console.log(`Subscribed to ${eventType}`);
    return () => {
      console.log(`Unsubscribed from ${eventType}`);
    };
  },
};

// Initialize mock data on load
dataStore.initializeMockData();

export default dataStore;
