/**
 * React hooks for security data fetching
 * Connects frontend to backend APIs
 */
import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../api/client';
import type {
  SystemStats,
  RiskScore,
  AttackResult,
  DefenseResult,
  AuditResult,
} from '../api/client';
import type {
  SecurityEvent,
  Task,
  AgentStatus,
  DashboardMetrics,
} from '../types/dashboard';

// Secure random number generator for mock data (replaces Math.random() for security)
// Using crypto.getRandomValues() which is available in modern browsers
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

function secureRandomInt(min: number, max: number): number {
  return Math.floor(secureRandom() * (max - min + 1)) + min;
}

function secureRandomChoice<T>(arr: readonly T[]): T {
  return arr[secureRandomInt(0, arr.length - 1)];
}

// Hook state types
interface UseSecurityDataState {
  metrics: DashboardMetrics | null;
  events: SecurityEvent[];
  tasks: Task[];
  agents: AgentStatus[];
  riskScore: RiskScore | null;
  stats: SystemStats | null;
  loading: boolean;
  error: string | null;
}

interface UseSecurityDataReturn extends UseSecurityDataState {
  refresh: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshAgents: () => Promise<void>;
}

/**
 * Hook for fetching security dashboard data
 */
export function useSecurityData(autoRefresh = true, refreshInterval = 30000): UseSecurityDataReturn {
  const [state, setState] = useState<UseSecurityDataState>({
    metrics: null,
    events: [],
    tasks: [],
    agents: [],
    riskScore: null,
    stats: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    const api = getApiClient();
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all data in parallel
      const [statsRes, riskRes] = await Promise.all([
        api.getSystemStats(),
        api.getRiskScore(),
      ]);

      // Transform stats to dashboard metrics
      const metrics: DashboardMetrics | null = statsRes.success && statsRes.data
        ? {
            totalEvents: statsRes.data.threatsDetected,
            criticalEvents: Math.floor(statsRes.data.threatsDetected * 0.1),
            openIncidents: statsRes.data.sessions,
            avgResponseTime: 15, // Default response time
            threatLevel: calculateThreatLevel(riskRes.data?.overall || 0),
            systemHealth: 95, // Default health
          }
        : null;

      // Generate mock events based on stats (in real app, fetch from API)
      const events: SecurityEvent[] = generateMockEvents(statsRes.data);
      const tasks: Task[] = generateMockTasks(statsRes.data);
      const agents: AgentStatus[] = generateMockAgents();

      setState({
        metrics,
        events,
        tasks,
        agents,
        riskScore: riskRes.success ? riskRes.data || null : null,
        stats: statsRes.success ? statsRes.data || null : null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch security data',
      }));
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    const api = getApiClient();
    const [statsRes, riskRes] = await Promise.all([
      api.getSystemStats(),
      api.getRiskScore(),
    ]);

      if (statsRes.success && statsRes.data && riskRes.success && riskRes.data) {
        const metrics: DashboardMetrics = {
          totalEvents: statsRes.data.threatsDetected,
          criticalEvents: Math.floor(statsRes.data.threatsDetected * 0.1),
          openIncidents: statsRes.data.sessions,
          avgResponseTime: 15,
          threatLevel: calculateThreatLevel(riskRes.data.overall),
          systemHealth: 95,
        };
        setState(prev => ({ ...prev, metrics, riskScore: riskRes.data ?? null }));
      }
  }, []);

  const refreshEvents = useCallback(async () => {
    // In real implementation, fetch from /api/events endpoint
    const api = getApiClient();
    const statsRes = await api.getSystemStats();
    if (statsRes.success && statsRes.data) {
      const events = generateMockEvents(statsRes.data);
      setState(prev => ({ ...prev, events }));
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    const api = getApiClient();
    const statsRes = await api.getSystemStats();
    if (statsRes.success && statsRes.data) {
      const tasks = generateMockTasks(statsRes.data);
      setState(prev => ({ ...prev, tasks }));
    }
  }, []);

  const refreshAgents = useCallback(async () => {
    const agents = generateMockAgents();
    setState(prev => ({ ...prev, agents }));
  }, []);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    ...state,
    refresh,
    refreshMetrics,
    refreshEvents,
    refreshTasks,
    refreshAgents,
  };
}

// Hook for attack simulation
interface UseAttackSimulationReturn {
  runAttack: (target: string, type: 'network' | 'web' | 'social' | 'cloud' | 'auto', dryRun?: boolean) => Promise<AttackResult | null>;
  history: AttackResult[];
  loading: boolean;
  error: string | null;
}

export function useAttackSimulation(): UseAttackSimulationReturn {
  const [history, setHistory] = useState<AttackResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load history on mount
    const loadHistory = async () => {
      const api = getApiClient();
      const res = await api.getAttackHistory();
      if (res.success && res.data) {
        setHistory(res.data);
      }
    };
    loadHistory();
  }, []);

  const runAttack = useCallback(async (
    target: string,
    type: 'network' | 'web' | 'social' | 'cloud' | 'auto',
    dryRun = false
  ): Promise<AttackResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const api = getApiClient();
      const res = await api.runAttack({ target, type, dryRun });

      if (res.success && res.data) {
        setHistory(prev => [res.data!, ...prev]);
        return res.data;
      } else {
        setError(res.error || 'Attack simulation failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { runAttack, history, loading, error };
}

// Hook for defense analysis
interface UseDefenseAnalysisReturn {
  runDefense: (target: string, type: 'vulnerability' | 'configuration' | 'threat' | 'comprehensive') => Promise<DefenseResult | null>;
  history: DefenseResult[];
  loading: boolean;
  error: string | null;
}

export function useDefenseAnalysis(): UseDefenseAnalysisReturn {
  const [history, setHistory] = useState<DefenseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      const api = getApiClient();
      const res = await api.getDefenseHistory();
      if (res.success && res.data) {
        setHistory(res.data);
      }
    };
    loadHistory();
  }, []);

  const runDefense = useCallback(async (
    target: string,
    type: 'vulnerability' | 'configuration' | 'threat' | 'comprehensive'
  ): Promise<DefenseResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const api = getApiClient();
      const res = await api.runDefense({ target, type });

      if (res.success && res.data) {
        setHistory(prev => [res.data!, ...prev]);
        return res.data;
      } else {
        setError(res.error || 'Defense analysis failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { runDefense, history, loading, error };
}

// Hook for compliance audit
interface UseComplianceAuditReturn {
  runAudit: (framework: string, domain?: string) => Promise<AuditResult | null>;
  history: AuditResult[];
  loading: boolean;
  error: string | null;
}

export function useComplianceAudit(): UseComplianceAuditReturn {
  const [history, setHistory] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      const api = getApiClient();
      const res = await api.getAuditHistory();
      if (res.success && res.data) {
        setHistory(res.data);
      }
    };
    loadHistory();
  }, []);

  const runAudit = useCallback(async (framework: string, domain?: string): Promise<AuditResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const api = getApiClient();
      const res = await api.runAudit({ framework, domain });

      if (res.success && res.data) {
        setHistory(prev => [res.data!, ...prev]);
        return res.data;
      } else {
        setError(res.error || 'Compliance audit failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { runAudit, history, loading, error };
}

// Helper functions
function calculateThreatLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 80) return 'critical';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 40) return 'medium';
  return 'low';
}

// Mock data generators - using secure random functions
function generateMockEvents(stats: { threatsDetected: number } | null | undefined): SecurityEvent[] {
  const eventTypes = ['alert', 'incident', 'threat', 'vulnerability'] as const;
  const severities = ['critical', 'high', 'medium', 'low'] as const;
  const statuses = ['new', 'investigating', 'contained', 'resolved'] as const;
  const sources = ['SIEM', 'EDR', 'Firewall', 'IDS', 'Threat Intel'];
  
  const count = Math.min(stats?.threatsDetected || 5, 20);
  
  return Array.from({ length: count }, (_, i) => ({
    id: `event-${i + 1}`,
    type: secureRandomChoice(eventTypes),
    severity: secureRandomChoice(severities),
    title: `Security Event #${i + 1}`,
    description: 'Detected suspicious activity requiring investigation',
    source: secureRandomChoice(sources),
    timestamp: new Date(Date.now() - secureRandom() * 86400000),
    status: secureRandomChoice(statuses),
    mitreTactics: ['TA0001', 'TA0002'],
    mitreTechniques: ['T1566', 'T1059'],
    affectedAssets: ['web-server-01', 'db-server-02'],
  }));
}

function generateMockTasks(stats: { sessions: number } | null | undefined): Task[] {
  const priorities = ['critical', 'high', 'medium', 'low'] as const;
  const statuses = ['pending', 'assigned', 'in_progress', 'completed', 'failed'] as const;
  
  const count = Math.min(stats?.sessions || 3, 10);
  
  return Array.from({ length: count }, (_, i) => ({
    id: `task-${i + 1}`,
    title: `Security Task #${i + 1}`,
    description: 'Investigate and remediate security finding',
    priority: secureRandomChoice(priorities),
    status: secureRandomChoice(statuses),
    assignedTo: ['security-analyst-1'],
    createdAt: new Date(Date.now() - secureRandom() * 172800000),
    progress: secureRandomInt(0, 99),
  }));
}

function generateMockAgents(): AgentStatus[] {
  const roles = [
    'Security Commander',
    'Threat Hunter',
    'Incident Responder',
    'Compliance Auditor',
    'Security Architect',
    'Penration Tester',
  ];

  return roles.map((role, i) => ({
    id: `agent-${i + 1}`,
    name: `${role} Agent`,
    role,
    status: secureRandom() > 0.2 ? 'available' : 'busy' as const,
    currentTasks: secureRandomInt(0, 2),
    maxTasks: 5,
    performance: {
      tasksCompleted: secureRandomInt(50, 149),
      successRate: 0.85 + secureRandom() * 0.15,
      avgResponseTime: secureRandomInt(5, 34),
    },
  }));
}

export default {
  useSecurityData,
  useAttackSimulation,
  useDefenseAnalysis,
  useComplianceAudit,
};
