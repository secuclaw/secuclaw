import type {
  HuntingHypothesis,
  HuntingSession,
  HuntingFinding,
  HuntingEvidence,
  HuntingQuery,
  HuntingRule,
  HuntingPlaybook,
  HuntingDashboard,
  HuntingStatistics,
  HuntingHypothesisStatus,
  HuntingPriority,
  HuntingTechnique,
  IOCInput,
} from './types.js';

const HUNTING_TECHNIQUE_TO_MITRE: Record<HuntingTechnique, string[]> = {
  'behavioral_analysis': ['TA0001', 'TA0002', 'TA0005'],
  'ioc_correlation': ['TA0001', 'TA0007'],
  'log_correlation': ['TA0007', 'TA0008'],
  'network_analysis': ['TA0006', 'TA0007', 'TA0011'],
  'endpoint_forensics': ['TA0003', 'TA0005', 'TA0007'],
  'memory_analysis': ['TA0005', 'TA0006'],
  'threat_intel_matching': ['TA0001', 'TA0007'],
  'anomaly_detection': ['TA0001', 'TA0007'],
  'signature_based': ['TA0008'],
  'ml_based': ['TA0001', 'TA0007'],
};

export class ThreatHuntingEngine {
  private sessions: Map<string, HuntingSession> = new Map();
  private hypotheses: Map<string, HuntingHypothesis> = new Map();
  private rules: Map<string, HuntingRule> = new Map();
  private playbooks: Map<string, HuntingPlaybook> = new Map();
  private eventHandlers: HuntingEventHandler[] = [];

  constructor() {
    this.loadDefaultRules();
  }

  private loadDefaultRules(): void {
    const defaultRules: HuntingRule[] = [
      {
        id: 'rule_lateral_movement',
        name: 'Detect Lateral Movement Patterns',
        description: 'Detect potential lateral movement through RDP/SMB/WinRM',
        enabled: true,
        technique: 'network_analysis',
        mitre_mapping: {
          tactics: ['TA0008'],
          techniques: ['T1021', 'T1563'],
        },
        conditions: [
          { field: 'destination.port', operator: 'equals', value: ['3389', '445', '5985', '5986'], data_source: 'network' },
          { field: 'event.count', operator: 'greater_than', value: 10, data_source: 'logs' },
        ],
        actions: [
          { type: 'create_hypothesis', parameters: { priority: 'high', title: 'Potential Lateral Movement Detected' } },
        ],
        trigger_count: 0,
      },
      {
        id: 'rule_c2_beacon',
        name: 'Detect C2 Beacon Behavior',
        description: 'Detect command and control beacon patterns in network traffic',
        enabled: true,
        technique: 'anomaly_detection',
        mitre_mapping: {
          tactics: ['TA0011'],
          techniques: ['T1071', 'T1568'],
        },
        conditions: [
          { field: 'traffic.interval_regularity', operator: 'greater_than', value: 0.8, data_source: 'network' },
          { field: 'traffic.packet_size_variance', operator: 'less_than', value: 100, data_source: 'network' },
        ],
        actions: [
          { type: 'create_hypothesis', parameters: { priority: 'critical', title: 'Potential C2 Beacon Activity' } },
          { type: 'collect_evidence', parameters: { type: 'network_flow', duration_minutes: 30 } },
        ],
        trigger_count: 0,
      },
      {
        id: 'rule_credential_access',
        name: 'Detect Credential Dumping',
        description: 'Detect potential credential dumping attempts',
        enabled: true,
        technique: 'endpoint_forensics',
        mitre_mapping: {
          tactics: ['TA0006'],
          techniques: ['T1003', 'T1558'],
        },
        conditions: [
          { field: 'process.name', operator: 'equals', value: ['lsass.exe', 'mimikatz.exe', 'procdump.exe'], data_source: 'endpoint' },
          { field: 'process.access_rights', operator: 'contains', value: 'PROCESS_VM_READ', data_source: 'endpoint' },
        ],
        actions: [
          { type: 'create_hypothesis', parameters: { priority: 'critical', title: 'Potential Credential Dumping' } },
          { type: 'alert', parameters: { severity: 'critical' } },
        ],
        trigger_count: 0,
      },
      {
        id: 'rule_persistence',
        name: 'Detect Persistence Mechanisms',
        description: 'Detect registry and scheduled task persistence',
        enabled: true,
        technique: 'behavioral_analysis',
        mitre_mapping: {
          tactics: ['TA0003'],
          techniques: ['T1053', 'T1547', 'T1112'],
        },
        conditions: [
          { field: 'registry.key', operator: 'contains', value: 'Run', data_source: 'registry' },
          { field: 'event.action', operator: 'equals', value: 'scheduled_task_created', data_source: 'logs' },
        ],
        actions: [
          { type: 'create_hypothesis', parameters: { priority: 'high', title: 'Persistence Mechanism Detected' } },
        ],
        trigger_count: 0,
      },
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }
  }

  createSession(options: {
    name: string;
    description: string;
    leadHunter: string;
    teamMembers?: string[];
    scope: HuntingSession['scope'];
  }): HuntingSession {
    const session: HuntingSession = {
      id: this.generateId('session'),
      name: options.name,
      description: options.description,
      hypotheses: [],
      status: 'active',
      started_at: new Date(),
      lead_hunter: options.leadHunter,
      team_members: options.teamMembers || [],
      scope: options.scope,
      statistics: this.createEmptyStatistics(),
    };

    this.sessions.set(session.id, session);
    this.emit('session_created', session);
    return session;
  }

  createHypothesis(options: {
    sessionId: string;
    title: string;
    description: string;
    mitreTactics?: string[];
    mitreTechniques?: string[];
    technique: HuntingTechnique;
    priority?: HuntingPriority;
    createdBy: string;
    dataSources?: string[];
    tags?: string[];
  }): HuntingHypothesis {
    const hypothesis: HuntingHypothesis = {
      id: this.generateId('hyp'),
      title: options.title,
      description: options.description,
      mitreTactics: options.mitreTactics || [],
      mitreTechniques: options.mitreTechniques || [],
      technique: options.technique,
      status: 'proposed',
      priority: options.priority || 'medium',
      created_by: options.createdBy,
      created_at: new Date(),
      updated_at: new Date(),
      confidence: 0,
      iocs: [],
      data_sources: options.dataSources || [],
      queries: [],
      findings: [],
      evidence: [],
      timeline: [],
      tags: options.tags || [],
    };

    this.hypotheses.set(hypothesis.id, hypothesis);

    const session = this.sessions.get(options.sessionId);
    if (session) {
      session.hypotheses.push(hypothesis);
      this.updateSessionStatistics(session);
    }

    this.emit('hypothesis_created', hypothesis);
    return hypothesis;
  }

  addQuery(hypothesisId: string, query: Omit<HuntingQuery, 'id'>): HuntingQuery {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    const newQuery: HuntingQuery = {
      ...query,
      id: this.generateId('qry'),
    };

    hypothesis.queries.push(newQuery);
    hypothesis.updated_at = new Date();
    return newQuery;
  }

  executeQuery(query: HuntingQuery): Promise<HuntingQuery['results']> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const results = {
          total_hits: Math.floor(Math.random() * 100),
          unique_events: Math.floor(Math.random() * 50),
          events: [],
          executed_at: new Date(),
          duration_ms: Math.floor(Math.random() * 1000) + 100,
        };
        query.results = results;
        resolve(results);
      }, 500);
    });
  }

  addFinding(hypothesisId: string, finding: Omit<HuntingFinding, 'id' | 'created_at'>): HuntingFinding {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    const newFinding: HuntingFinding = {
      ...finding,
      id: this.generateId('find'),
      created_at: new Date(),
    };

    hypothesis.findings.push(newFinding);
    hypothesis.updated_at = new Date();

    if (finding.severity === 'critical' || finding.severity === 'high') {
      this.emit('high_severity_finding', { hypothesis, finding: newFinding });
    }

    return newFinding;
  }

  addEvidence(hypothesisId: string, evidence: Omit<HuntingEvidence, 'id'>): HuntingEvidence {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    const newEvidence: HuntingEvidence = {
      ...evidence,
      id: this.generateId('ev'),
    };

    hypothesis.evidence.push(newEvidence);
    hypothesis.updated_at = new Date();
    return newEvidence;
  }

  addIOC(hypothesisId: string, ioc: IOCInput): void {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    const exists = hypothesis.iocs.some(
      i => i.type === ioc.type && i.value === ioc.value
    );

    if (!exists) {
      hypothesis.iocs.push(ioc);
      hypothesis.updated_at = new Date();
    }
  }

  updateHypothesisStatus(hypothesisId: string, status: HuntingHypothesisStatus, confidence?: number): void {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    hypothesis.status = status;
    if (confidence !== undefined) {
      hypothesis.confidence = Math.max(0, Math.min(1, confidence));
    }
    hypothesis.updated_at = new Date();

    this.emit('hypothesis_status_changed', { hypothesis, status });

    for (const session of this.sessions.values()) {
      if (session.hypotheses.some(h => h.id === hypothesisId)) {
        this.updateSessionStatistics(session);
      }
    }
  }

  executePlaybook(sessionId: string, playbookId: string): Promise<HuntingHypothesis[]> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`Playbook not found: ${playbookId}`);
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const createdHypotheses: HuntingHypothesis[] = [];

    for (const step of playbook.steps.sort((a, b) => a.order - b.order)) {
      const hypothesis = this.createHypothesis({
        sessionId,
        title: `[Playbook] ${step.name}`,
        description: step.description,
        mitreTactics: playbook.mitre_tactics,
        technique: step.technique,
        priority: 'medium',
        createdBy: session.lead_hunter,
        dataSources: playbook.required_data_sources,
      });

      if (step.queries) {
        for (const query of step.queries) {
          this.addQuery(hypothesis.id, query);
        }
      }

      createdHypotheses.push(hypothesis);
    }

    return Promise.resolve(createdHypotheses);
  }

  evaluateRule(ruleId: string, eventData: Record<string, unknown>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) {
      return false;
    }

    let conditionsMet = true;
    for (const condition of rule.conditions) {
      const value = eventData[condition.field];
      if (!this.evaluateCondition(condition, value)) {
        conditionsMet = false;
        break;
      }
    }

    if (conditionsMet) {
      rule.trigger_count++;
      rule.last_triggered = new Date();

      for (const action of rule.actions) {
        this.executeAction(action);
      }
    }

    return conditionsMet;
  }

  private evaluateCondition(condition: HuntingRule['conditions'][0], value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        if (Array.isArray(condition.value)) {
          if (Array.isArray(value)) {
            return value.some(v => (condition.value as unknown[]).includes(v));
          }
          return (condition.value as unknown[]).includes(String(value));
        }
        return value === condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'matches':
        return new RegExp(String(condition.value)).test(String(value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  private executeAction(action: HuntingRule['actions'][0]): void {
    this.emit('rule_action_triggered', action);
  }

  getDashboard(): HuntingDashboard {
    const allHypotheses = Array.from(this.hypotheses.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hypothesesToday = allHypotheses.filter(h => h.created_at >= today);
    const confirmedToday = hypothesesToday.filter(h => h.status === 'confirmed');

    const techniqueCounts = new Map<string, number>();
    for (const h of allHypotheses) {
      for (const t of h.mitreTechniques) {
        techniqueCounts.set(t, (techniqueCounts.get(t) || 0) + 1);
      }
    }

    const topTechniques = Array.from(techniqueCounts.entries())
      .map(([technique, count]) => ({ technique, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const allFindings = allHypotheses.flatMap(h => h.findings);
    const recentFindings = allFindings
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, 10);

    const statusCounts: Record<HuntingHypothesisStatus, number> = {
      proposed: 0,
      investigating: 0,
      confirmed: 0,
      dismissed: 0,
      false_positive: 0,
    };

    const priorityCounts: Record<HuntingPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const h of allHypotheses) {
      statusCounts[h.status]++;
      priorityCounts[h.priority]++;
    }

    return {
      active_sessions: Array.from(this.sessions.values()).filter(s => s.status === 'active').length,
      total_hypotheses_today: hypothesesToday.length,
      confirmed_threats_today: confirmedToday.length,
      top_mitre_techniques: topTechniques,
      top_hunters: [],
      recent_findings: recentFindings,
      hypothesis_by_status: statusCounts,
      hypothesis_by_priority: priorityCounts,
    };
  }

  getSession(sessionId: string): HuntingSession | undefined {
    return this.sessions.get(sessionId);
  }

  getHypothesis(hypothesisId: string): HuntingHypothesis | undefined {
    return this.hypotheses.get(hypothesisId);
  }

  listSessions(status?: HuntingSession['status']): HuntingSession[] {
    const sessions = Array.from(this.sessions.values());
    if (status) {
      return sessions.filter(s => s.status === status);
    }
    return sessions;
  }

  addEventHandler(handler: HuntingEventHandler): void {
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

  private updateSessionStatistics(session: HuntingSession): void {
    session.statistics = {
      total_hypotheses: session.hypotheses.length,
      confirmed_threats: session.hypotheses.filter(h => h.status === 'confirmed').length,
      false_positives: session.hypotheses.filter(h => h.status === 'false_positive').length,
      pending_investigation: session.hypotheses.filter(h => h.status === 'investigating' || h.status === 'proposed').length,
      total_findings: session.hypotheses.reduce((sum, h) => sum + h.findings.length, 0),
      critical_findings: session.hypotheses.reduce(
        (sum, h) => sum + h.findings.filter(f => f.severity === 'critical').length,
        0
      ),
      high_findings: session.hypotheses.reduce(
        (sum, h) => sum + h.findings.filter(f => f.severity === 'high').length,
        0
      ),
      iocs_discovered: session.hypotheses.reduce((sum, h) => sum + h.iocs.length, 0),
      coverage_score: this.calculateCoverageScore(session),
    };
  }

  private calculateCoverageScore(session: HuntingSession): number {
    const totalTechniques = 193;
    const coveredTechniques = new Set<string>();
    
    for (const h of session.hypotheses) {
      h.mitreTechniques.forEach(t => coveredTechniques.add(t));
    }
    
    return coveredTechniques.size / totalTechniques;
  }

  private createEmptyStatistics(): HuntingStatistics {
    return {
      total_hypotheses: 0,
      confirmed_threats: 0,
      false_positives: 0,
      pending_investigation: 0,
      total_findings: 0,
      critical_findings: 0,
      high_findings: 0,
      iocs_discovered: 0,
      coverage_score: 0,
    };
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `hunt_${prefix}_${timestamp}_${random}`;
  }
}

export type HuntingEventHandler = (eventType: string, data: unknown) => void | Promise<void>;

export function createThreatHuntingEngine(): ThreatHuntingEngine {
  return new ThreatHuntingEngine();
}
