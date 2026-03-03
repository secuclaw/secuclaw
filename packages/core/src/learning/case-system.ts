export interface CaseRecord {
  id: string;
  title: string;
  incidentType: IncidentType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: CaseStatus;
  summary: string;
  timeline: TimelineEntry[];
  affectedAssets: string[];
  indicators: Indicator[];
  mitreMapping: {
    tactics: string[];
    techniques: string[];
  };
  response: ResponseAction[];
  lessons: LessonLearned[];
  metadata: CaseMetadata;
}

export type IncidentType = 
  | 'malware'
  | 'phishing'
  | 'data_breach'
  | 'ransomware'
  | 'ddos'
  | 'insider_threat'
  | 'apt'
  | 'zero_day'
  | 'supply_chain'
  | 'misconfiguration'
  | 'unauthorized_access';

export type CaseStatus = 
  | 'open'
  | 'investigating'
  | 'contained'
  | 'resolved'
  | 'closed'
  | 'archived';

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  phase: 'reconnaissance' | 'initial_access' | 'execution' | 'persistence' | 'lateral_movement' | 'exfiltration' | 'impact' | 'response';
  action: string;
  actor?: string;
  details: string;
  evidence?: string[];
}

export interface Indicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file_path' | 'registry' | 'mutex';
  value: string;
  context: string;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
  tags: string[];
}

export interface ResponseAction {
  id: string;
  timestamp: Date;
  action: string;
  performer: string;
  outcome: 'successful' | 'partial' | 'failed';
  notes?: string;
}

export interface LessonLearned {
  id: string;
  category: 'detection' | 'response' | 'prevention' | 'communication' | 'process';
  finding: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  implemented: boolean;
  implementationDate?: Date;
}

export interface CaseMetadata {
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  assignedTo: string[];
  tags: string[];
  relatedCases: string[];
  references: string[];
}

export interface PatternMatch {
  id: string;
  patternId: string;
  patternName: string;
  matchScore: number;
  matchedIndicators: string[];
  matchedBehaviors: string[];
  suggestedResponse: string[];
}

export interface ExtractedPattern {
  id: string;
  name: string;
  description: string;
  indicators: {
    type: string;
    pattern: string;
    frequency: number;
  }[];
  behaviors: {
    phase: string;
    action: string;
    frequency: number;
  }[];
  mitreMapping: {
    tactics: string[];
    techniques: string[];
  };
  similarCases: string[];
  confidence: number;
  createdAt: Date;
}

export interface KnowledgeExtraction {
  id: string;
  sourceCaseId: string;
  extractedAt: Date;
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  insights: string[];
  reusableKnowledge: ReusableKnowledge[];
}

export interface ExtractedEntity {
  id: string;
  type: 'threat_actor' | 'tool' | 'technique' | 'target' | 'asset';
  name: string;
  properties: Record<string, unknown>;
}

export interface ExtractedRelationship {
  source: string;
  target: string;
  type: string;
  evidence: string;
}

export interface ReusableKnowledge {
  id: string;
  type: 'detection_rule' | 'response_playbook' | 'indicator_pattern' | 'mitigation';
  name: string;
  content: string;
  applicableScenarios: string[];
  effectiveness: number;
}

export class CaseLearningSystem {
  private cases: Map<string, CaseRecord> = new Map();
  private patterns: Map<string, ExtractedPattern> = new Map();
  private knowledge: Map<string, KnowledgeExtraction> = new Map();

  constructor() {
    this.initializeDemoCases();
  }

  private initializeDemoCases(): void {
    const demoCase: CaseRecord = {
      id: 'case-001',
      title: 'APT29 钓鱼攻击事件',
      incidentType: 'apt',
      severity: 'critical',
      status: 'closed',
      summary: '检测到疑似APT29组织发起的针对性钓鱼攻击，通过恶意邮件附件传播Cobalt Strike Beacon',
      timeline: [
        {
          id: 'tl-001',
          timestamp: new Date('2026-01-15T08:30:00Z'),
          phase: 'initial_access',
          action: '钓鱼邮件发送',
          details: '伪装成财务部门发送的发票邮件',
          evidence: ['email_headers.txt', 'malicious_attachment.doc'],
        },
        {
          id: 'tl-002',
          timestamp: new Date('2026-01-15T09:15:00Z'),
          phase: 'execution',
          action: '恶意宏执行',
          details: '用户打开附件并启用宏，触发Payload下载',
          evidence: ['macro_code.vba', 'pcap_initial.pcap'],
        },
        {
          id: 'tl-003',
          timestamp: new Date('2026-01-15T09:20:00Z'),
          phase: 'persistence',
          action: 'Cobalt Strike Beacon安装',
          details: 'Beacon写入注册表启动项',
          evidence: ['registry_dump.txt'],
        },
        {
          id: 'tl-004',
          timestamp: new Date('2026-01-15T10:00:00Z'),
          phase: 'response',
          action: 'EDR检测告警',
          details: 'EDR系统检测到可疑行为并生成告警',
          actor: 'SOC Team',
        },
      ],
      affectedAssets: ['WS-FIN-001', 'FS-SHARE-02'],
      indicators: [
        {
          id: 'ioc-001',
          type: 'ip',
          value: '192.168.100.50',
          context: 'C2 Server',
          firstSeen: new Date('2026-01-15'),
          lastSeen: new Date('2026-01-15'),
          confidence: 0.95,
          tags: ['apt29', 'c2', 'cobalt_strike'],
        },
        {
          id: 'ioc-002',
          type: 'hash',
          value: 'a1b2c3d4e5f6...',
          context: 'Beacon Payload',
          firstSeen: new Date('2026-01-15'),
          lastSeen: new Date('2026-01-15'),
          confidence: 0.99,
          tags: ['malware', 'beacon'],
        },
      ],
      mitreMapping: {
        tactics: ['Initial Access', 'Execution', 'Persistence', 'Command and Control'],
        techniques: ['T1566.001', 'T1059.005', 'T1547.001', 'T1071.001'],
      },
      response: [
        {
          id: 'resp-001',
          timestamp: new Date('2026-01-15T10:05:00Z'),
          action: '隔离受影响主机',
          performer: 'SOC Analyst',
          outcome: 'successful',
        },
        {
          id: 'resp-002',
          timestamp: new Date('2026-01-15T10:30:00Z'),
          action: '阻断C2通信',
          performer: 'Network Team',
          outcome: 'successful',
        },
      ],
      lessons: [
        {
          id: 'lesson-001',
          category: 'detection',
          finding: '钓鱼邮件绕过了邮件网关检测',
          recommendation: '增强宏文档检测能力，部署沙箱分析',
          priority: 'high',
          implemented: true,
          implementationDate: new Date('2026-01-20'),
        },
        {
          id: 'lesson-002',
          category: 'prevention',
          finding: '用户仍然可以启用宏',
          recommendation: '通过GPO禁用宏执行',
          priority: 'high',
          implemented: true,
        },
      ],
      metadata: {
        createdBy: 'SOC Team',
        createdAt: new Date('2026-01-15'),
        updatedBy: 'IR Lead',
        updatedAt: new Date('2026-01-20'),
        assignedTo: ['analyst-1', 'analyst-2'],
        tags: ['apt', 'cobalt_strike', 'phishing'],
        relatedCases: [],
        references: ['MITRE ATT&CK G0016'],
      },
    };

    this.cases.set(demoCase.id, demoCase);
  }

  async createCase(caseData: Partial<CaseRecord>): Promise<CaseRecord> {
    const newCase: CaseRecord = {
      id: `case-${Date.now()}`,
      title: caseData.title || 'Untitled Case',
      incidentType: caseData.incidentType || 'unauthorized_access',
      severity: caseData.severity || 'medium',
      status: 'open',
      summary: caseData.summary || '',
      timeline: caseData.timeline || [],
      affectedAssets: caseData.affectedAssets || [],
      indicators: caseData.indicators || [],
      mitreMapping: caseData.mitreMapping || { tactics: [], techniques: [] },
      response: caseData.response || [],
      lessons: caseData.lessons || [],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedBy: 'system',
        updatedAt: new Date(),
        assignedTo: [],
        tags: [],
        relatedCases: [],
        references: [],
      },
    };

    this.cases.set(newCase.id, newCase);
    return newCase;
  }

  async getCase(caseId: string): Promise<CaseRecord | null> {
    return this.cases.get(caseId) || null;
  }

  async listCases(filters?: {
    status?: CaseStatus;
    severity?: string;
    incidentType?: string;
    limit?: number;
  }): Promise<CaseRecord[]> {
    let results = Array.from(this.cases.values());

    if (filters) {
      if (filters.status) {
        results = results.filter(c => c.status === filters.status);
      }
      if (filters.severity) {
        results = results.filter(c => c.severity === filters.severity);
      }
      if (filters.incidentType) {
        results = results.filter(c => c.incidentType === filters.incidentType);
      }
      if (filters.limit) {
        results = results.slice(0, filters.limit);
      }
    }

    return results.sort((a, b) => 
      b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime()
    );
  }

  async extractPatterns(caseId: string): Promise<ExtractedPattern> {
    const caseRecord = this.cases.get(caseId);
    if (!caseRecord) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const indicatorPatterns = this.analyzeIndicatorPatterns(caseRecord);
    const behaviorPatterns = this.analyzeBehaviorPatterns(caseRecord);

    const pattern: ExtractedPattern = {
      id: `pattern-${Date.now()}`,
      name: `${caseRecord.incidentType} Pattern: ${caseRecord.title}`,
      description: `Extracted from case ${caseId}`,
      indicators: indicatorPatterns,
      behaviors: behaviorPatterns,
      mitreMapping: caseRecord.mitreMapping,
      similarCases: await this.findSimilarCases(caseRecord),
      confidence: this.calculatePatternConfidence(caseRecord),
      createdAt: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
    return pattern;
  }

  private analyzeIndicatorPatterns(caseRecord: CaseRecord): ExtractedPattern['indicators'] {
    const patterns: Map<string, { type: string; pattern: string; count: number }> = new Map();

    for (const indicator of caseRecord.indicators) {
      const key = `${indicator.type}:${this.extractPattern(indicator.value)}`;
      const existing = patterns.get(key);
      if (existing) {
        existing.count++;
      } else {
        patterns.set(key, {
          type: indicator.type,
          pattern: this.extractPattern(indicator.value),
          count: 1,
        });
      }
    }

    return Array.from(patterns.values()).map(p => ({
      type: p.type,
      pattern: p.pattern,
      frequency: p.count,
    }));
  }

  private analyzeBehaviorPatterns(caseRecord: CaseRecord): ExtractedPattern['behaviors'] {
    const behaviors: Map<string, { phase: string; action: string; count: number }> = new Map();

    for (const entry of caseRecord.timeline) {
      const key = `${entry.phase}:${entry.action}`;
      const existing = behaviors.get(key);
      if (existing) {
        existing.count++;
      } else {
        behaviors.set(key, {
          phase: entry.phase,
          action: entry.action,
          count: 1,
        });
      }
    }

    return Array.from(behaviors.values()).map(b => ({
      phase: b.phase,
      action: b.action,
      frequency: b.count,
    }));
  }

  private extractPattern(value: string): string {
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
      const parts = value.split('.');
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    if (/^[a-f0-9]{32,64}$/i.test(value)) {
      return 'HASH_PATTERN';
    }
    if (value.includes('@')) {
      const domain = value.split('@')[1];
      return `*@${domain}`;
    }
    return value;
  }

  private async findSimilarCases(caseRecord: CaseRecord): Promise<string[]> {
    const similar: string[] = [];

    for (const [id, otherCase] of this.cases) {
      if (id === caseRecord.id) continue;

      const sharedTechniques = caseRecord.mitreMapping.techniques.filter(
        t => otherCase.mitreMapping.techniques.includes(t)
      );

      if (sharedTechniques.length >= 2) {
        similar.push(id);
      }
    }

    return similar;
  }

  private calculatePatternConfidence(caseRecord: CaseRecord): number {
    let confidence = 0.5;

    if (caseRecord.indicators.length >= 3) confidence += 0.1;
    if (caseRecord.timeline.length >= 5) confidence += 0.1;
    if (caseRecord.mitreMapping.techniques.length >= 2) confidence += 0.15;
    if (caseRecord.lessons.length >= 2) confidence += 0.1;
    if (caseRecord.status === 'closed') confidence += 0.05;

    return Math.min(1, confidence);
  }

  async matchPattern(indicators: Partial<Indicator>[]): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    for (const [patternId, pattern] of this.patterns) {
      let matchScore = 0;
      const matchedIndicators: string[] = [];
      const matchedBehaviors: string[] = [];

      for (const inputIndicator of indicators) {
        for (const patternIndicator of pattern.indicators) {
          if (inputIndicator.type === patternIndicator.type) {
            const similarity = this.calculateSimilarity(
              inputIndicator.value || '',
              patternIndicator.pattern
            );
            if (similarity > 0.7) {
              matchScore += similarity * 0.2;
              matchedIndicators.push(inputIndicator.value || '');
            }
          }
        }
      }

      if (matchScore > 0.3) {
        matches.push({
          id: `match-${Date.now()}-${patternId}`,
          patternId,
          patternName: pattern.name,
          matchScore: Math.min(1, matchScore),
          matchedIndicators,
          matchedBehaviors,
          suggestedResponse: this.generateSuggestedResponse(pattern),
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateSimilarity(value1: string, value2: string): number {
    if (value1 === value2) return 1;

    const parts1 = value1.split(/[.\-@\/]/);
    const parts2 = value2.split(/[.\-@\/]/);

    let matches = 0;
    for (const p1 of parts1) {
      for (const p2 of parts2) {
        if (p1 === p2 || p1 === '*' || p2 === '*') {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(parts1.length, parts2.length);
  }

  private generateSuggestedResponse(pattern: ExtractedPattern): string[] {
    const responses: string[] = [];

    for (const technique of pattern.mitreMapping.techniques) {
      responses.push(`Consider mitigations for MITRE technique ${technique}`);
    }

    responses.push('Review and block identified indicators');
    responses.push('Monitor for similar attack patterns');
    responses.push('Update detection rules based on extracted patterns');

    return responses;
  }

  async extractKnowledge(caseId: string): Promise<KnowledgeExtraction> {
    const caseRecord = this.cases.get(caseId);
    if (!caseRecord) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const entities = this.extractEntities(caseRecord);
    const relationships = this.extractRelationships(caseRecord);
    const insights = this.generateInsights(caseRecord);
    const reusableKnowledge = this.extractReusableKnowledge(caseRecord);

    const extraction: KnowledgeExtraction = {
      id: `knowledge-${Date.now()}`,
      sourceCaseId: caseId,
      extractedAt: new Date(),
      entities,
      relationships,
      insights,
      reusableKnowledge,
    };

    this.knowledge.set(extraction.id, extraction);
    return extraction;
  }

  private extractEntities(caseRecord: CaseRecord): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const indicator of caseRecord.indicators) {
      entities.push({
        id: `entity-${indicator.id}`,
        type: 'tool',
        name: indicator.value,
        properties: {
          type: indicator.type,
          context: indicator.context,
          tags: indicator.tags,
        },
      });
    }

    for (const technique of caseRecord.mitreMapping.techniques) {
      entities.push({
        id: `entity-${technique}`,
        type: 'technique',
        name: technique,
        properties: { framework: 'MITRE ATT&CK' },
      });
    }

    for (const asset of caseRecord.affectedAssets) {
      entities.push({
        id: `entity-${asset}`,
        type: 'asset',
        name: asset,
        properties: { affected: true },
      });
    }

    return entities;
  }

  private extractRelationships(caseRecord: CaseRecord): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    for (const indicator of caseRecord.indicators) {
      for (const asset of caseRecord.affectedAssets) {
        relationships.push({
          source: `entity-${indicator.id}`,
          target: `entity-${asset}`,
          type: 'compromised',
          evidence: indicator.context,
        });
      }
    }

    return relationships;
  }

  private generateInsights(caseRecord: CaseRecord): string[] {
    const insights: string[] = [];

    if (caseRecord.indicators.length > 0) {
      insights.push(`Identified ${caseRecord.indicators.length} indicators of compromise`);
    }

    const detectionTime = this.calculateDetectionTime(caseRecord);
    if (detectionTime > 24) {
      insights.push(`Detection time (${detectionTime}h) exceeds SLA, consider improving monitoring`);
    }

    if (caseRecord.lessons.some(l => l.category === 'detection' && l.priority === 'high')) {
      insights.push('High-priority detection improvements identified');
    }

    return insights;
  }

  private calculateDetectionTime(caseRecord: CaseRecord): number {
    if (caseRecord.timeline.length < 2) return 0;

    const sorted = [...caseRecord.timeline].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const first = sorted[0].timestamp;
    const responseStart = sorted.find(e => e.phase === 'response')?.timestamp;

    if (responseStart) {
      return (responseStart.getTime() - first.getTime()) / (1000 * 60 * 60);
    }

    return 0;
  }

  private extractReusableKnowledge(caseRecord: CaseRecord): ReusableKnowledge[] {
    const knowledge: ReusableKnowledge[] = [];

    for (const lesson of caseRecord.lessons) {
      knowledge.push({
        id: `knowledge-item-${lesson.id}`,
        type: lesson.category === 'detection' ? 'detection_rule' :
              lesson.category === 'response' ? 'response_playbook' : 'mitigation',
        name: lesson.finding,
        content: lesson.recommendation,
        applicableScenarios: [caseRecord.incidentType],
        effectiveness: lesson.implemented ? 0.8 : 0.5,
      });
    }

    if (caseRecord.indicators.length > 0) {
      const indicatorList = caseRecord.indicators
        .map(i => `${i.type}: ${i.value}`)
        .join('\n');

      knowledge.push({
        id: `knowledge-iocs-${caseRecord.id}`,
        type: 'indicator_pattern',
        name: 'IOCs from incident',
        content: indicatorList,
        applicableScenarios: caseRecord.mitreMapping.techniques,
        effectiveness: 0.9,
      });
    }

    return knowledge;
  }

  async getPatterns(): Promise<ExtractedPattern[]> {
    return Array.from(this.patterns.values());
  }

  async getKnowledge(): Promise<KnowledgeExtraction[]> {
    return Array.from(this.knowledge.values());
  }

  async applyKnowledge(knowledgeId: string, context: string): Promise<string[]> {
    const extraction = this.knowledge.get(knowledgeId);
    if (!extraction) {
      throw new Error(`Knowledge not found: ${knowledgeId}`);
    }

    const applicableKnowledge = extraction.reusableKnowledge.filter(k =>
      k.applicableScenarios.some(s => context.toLowerCase().includes(s.toLowerCase()))
    );

    return applicableKnowledge.map(k => k.content);
  }

  getStats(): {
    totalCases: number;
    totalPatterns: number;
    totalKnowledge: number;
    casesByType: Record<string, number>;
    casesBySeverity: Record<string, number>;
  } {
    const cases = Array.from(this.cases.values());
    const casesByType: Record<string, number> = {};
    const casesBySeverity: Record<string, number> = {};

    for (const c of cases) {
      casesByType[c.incidentType] = (casesByType[c.incidentType] || 0) + 1;
      casesBySeverity[c.severity] = (casesBySeverity[c.severity] || 0) + 1;
    }

    return {
      totalCases: cases.length,
      totalPatterns: this.patterns.size,
      totalKnowledge: this.knowledge.size,
      casesByType,
      casesBySeverity,
    };
  }
}

export const caseLearningSystem = new CaseLearningSystem();
