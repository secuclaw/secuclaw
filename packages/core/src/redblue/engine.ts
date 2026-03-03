import type {
  AttackChain,
  AttackStep,
  AttackTechnique,
  AttackPhase,
  SimulationConfig,
  SimulationResult,
  SimulationTarget,
  DetectionResult,
  TimelineEvent,
  AfterActionReport,
  Finding,
  SecurityRecommendation,
  SimulationMetrics,
  DefenseVerification,
  RedBlueTeamSession,
  TeamType,
} from './types.js';

export const MITRE_ATTACK_PHASES: AttackPhase[] = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

export const DEFAULT_TECHNIQUES: AttackTechnique[] = [
  {
    id: 't1595',
    mitreId: 'T1595',
    name: 'Active Scanning',
    phase: 'reconnaissance',
    description: 'Adversaries may execute active reconnaissance scans to gather information',
    severity: 'low',
    tactics: ['reconnaissance'],
    platforms: ['pre'],
    detectionDifficulty: 3,
    executionComplexity: 1,
  },
  {
    id: 't1566',
    mitreId: 'T1566',
    name: 'Phishing',
    phase: 'initial-access',
    description: 'Adversaries may send phishing messages to gain access',
    severity: 'high',
    tactics: ['initial-access'],
    platforms: ['windows', 'macos', 'linux'],
    detectionDifficulty: 4,
    executionComplexity: 2,
  },
  {
    id: 't1190',
    mitreId: 'T1190',
    name: 'Exploit Public-Facing Application',
    phase: 'initial-access',
    description: 'Adversaries may exploit vulnerabilities in public-facing applications',
    severity: 'critical',
    tactics: ['initial-access'],
    platforms: ['windows', 'linux'],
    detectionDifficulty: 5,
    executionComplexity: 4,
  },
  {
    id: 't1059',
    mitreId: 'T1059',
    name: 'Command and Scripting Interpreter',
    phase: 'execution',
    description: 'Adversaries may abuse command and script interpreters',
    severity: 'high',
    tactics: ['execution'],
    platforms: ['windows', 'macos', 'linux'],
    detectionDifficulty: 3,
    executionComplexity: 2,
  },
  {
    id: 't1078',
    mitreId: 'T1078',
    name: 'Valid Accounts',
    phase: 'initial-access',
    description: 'Adversaries may obtain and abuse credentials',
    severity: 'critical',
    tactics: ['initial-access', 'persistence', 'privilege-escalation', 'defense-evasion'],
    platforms: ['windows', 'macos', 'linux', 'cloud'],
    detectionDifficulty: 6,
    executionComplexity: 3,
  },
  {
    id: 't1021',
    mitreId: 'T1021',
    name: 'Remote Services',
    phase: 'lateral-movement',
    description: 'Adversaries may use remote services for lateral movement',
    severity: 'high',
    tactics: ['lateral-movement'],
    platforms: ['windows', 'linux'],
    detectionDifficulty: 4,
    executionComplexity: 3,
  },
  {
    id: 't1003',
    mitreId: 'T1003',
    name: 'OS Credential Dumping',
    phase: 'credential-access',
    description: 'Adversaries may attempt to dump credentials',
    severity: 'critical',
    tactics: ['credential-access'],
    platforms: ['windows', 'linux'],
    detectionDifficulty: 5,
    executionComplexity: 3,
  },
  {
    id: 't1048',
    mitreId: 'T1048',
    name: 'Exfiltration Over Alternative Protocol',
    phase: 'exfiltration',
    description: 'Adversaries may steal data over alternative protocols',
    severity: 'high',
    tactics: ['exfiltration'],
    platforms: ['windows', 'linux', 'macos'],
    detectionDifficulty: 5,
    executionComplexity: 4,
  },
];

export class RedBlueTeamEngine {
  private techniques: Map<string, AttackTechnique> = new Map();
  private sessions: Map<string, RedBlueTeamSession> = new Map();
  private simulations: Map<string, SimulationResult> = new Map();
  private verifications: Map<string, DefenseVerification[]> = new Map();

  constructor() {
    for (const technique of DEFAULT_TECHNIQUES) {
      this.techniques.set(technique.id, technique);
    }
  }

  registerTechnique(technique: AttackTechnique): void {
    this.techniques.set(technique.id, technique);
  }

  createSession(
    type: TeamType,
    scope: {
      targets: SimulationTarget[];
      rulesOfEngagement: string[];
      participants?: { red?: string[]; blue?: string[]; white?: string[] };
    }
  ): RedBlueTeamSession {
    const session: RedBlueTeamSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'planning',
      startTime: new Date(),
      participants: {
        red: scope.participants?.red || [],
        blue: scope.participants?.blue || [],
        white: scope.participants?.white || [],
      },
      scope: {
        targets: scope.targets,
        rulesOfEngagement: scope.rulesOfEngagement,
        blackoutPeriods: [],
      },
      simulations: [],
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async executeSimulation(
    sessionId: string,
    config: SimulationConfig
  ): Promise<SimulationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'executing';

    const chain = await this.buildAttackChain(config);
    chain.status = 'running';
    chain.startTime = new Date();

    const timeline: TimelineEvent[] = [];
    const detections: { technique: string; detected: boolean; detectionTime?: number }[] = [];

    for (const step of chain.steps) {
      step.status = 'running';
      step.startTime = new Date();

      const event: TimelineEvent = {
        timestamp: step.startTime,
        type: 'attack',
        stepId: step.id,
        description: `Executing ${step.technique.name} against ${step.target}`,
        severity: step.technique.severity,
      };
      timeline.push(event);

      const result = await this.executeStep(step, config);
      step.result = result;
      step.endTime = new Date();
      step.status = result?.success ? 'completed' : 'failed';

      const detection = await this.checkDetection(step, config);
      step.detectionResult = detection;

      detections.push({
        technique: step.technique.mitreId,
        detected: detection.detected,
        detectionTime: detection.detectionTime,
      });

      if (detection.detected) {
        timeline.push({
          timestamp: new Date(),
          type: 'detection',
          stepId: step.id,
          description: `Detection: ${step.technique.name} was detected`,
          severity: step.technique.severity,
        });
      }

      if (config.stopOnDetection && detection.detected) {
        chain.status = 'blocked';
        break;
      }
    }

    chain.endTime = new Date();
    chain.status = chain.status === 'running' ? 'completed' : chain.status;

    const result = this.generateSimulationResult(chain, timeline, detections);
    session.simulations.push(result);
    session.status = 'completed';

    this.simulations.set(result.id, result);
    return result;
  }

  private async buildAttackChain(config: SimulationConfig): Promise<AttackChain> {
    const availableTechniques = Array.from(this.techniques.values())
      .filter(t => !config.excludedTechniques.includes(t.id));

    const steps: AttackStep[] = [];
    let stepIndex = 0;

    for (const phase of MITRE_ATTACK_PHASES) {
      const phaseTechniques = availableTechniques.filter(t => t.phase === phase);
      
      for (const technique of phaseTechniques.slice(0, 2)) {
        for (const target of config.targets.slice(0, 1)) {
          steps.push({
            id: `step-${stepIndex++}`,
            technique,
            status: 'pending',
            target: target.identifier,
            parameters: {
              target_type: target.type,
              scope: target.scope,
            },
          });
        }
      }
    }

    return {
      id: `chain-${Date.now()}`,
      name: 'Automated Attack Chain',
      description: 'AI-generated attack chain based on MITRE ATT&CK framework',
      target: config.targets.map(t => t.identifier).join(', '),
      steps,
      status: 'pending',
      metadata: {
        createdBy: 'redblue-engine',
        createdAt: new Date(),
        tags: ['automated', 'mitre-attack'],
        objectives: ['Assess detection capabilities', 'Identify security gaps'],
        scope: config.targets.map(t => t.identifier),
      },
    };
  }

  private async executeStep(
    step: AttackStep,
    _config: SimulationConfig
  ): Promise<AttackStep['result']> {
    await this.simulateDelay(100 + Math.random() * 500);

    const successRate = this.calculateSuccessRate(step.technique);
    const success = Math.random() < successRate;

    return {
      success,
      output: success
        ? `Successfully executed ${step.technique.name}`
        : `Failed to execute ${step.technique.name}: Simulated failure`,
      indicators: success ? this.generateIndicators(step) : [],
      artifacts: success ? this.generateArtifacts(step) : [],
      error: success ? undefined : 'Simulated execution failure',
    };
  }

  private async checkDetection(
    step: AttackStep,
    _config: SimulationConfig
  ): Promise<DetectionResult> {
    await this.simulateDelay(50 + Math.random() * 200);

    const detectionRate = this.calculateDetectionRate(step.technique);
    const detected = Math.random() < detectionRate;

    return {
      detected,
      detectionTime: detected ? Math.floor(Math.random() * 5000) : undefined,
      detectionMethod: detected ? this.getRandomDetectionMethod() : undefined,
      alertId: detected ? `alert-${Date.now()}` : undefined,
      falsePositive: detected ? Math.random() < 0.1 : false,
      responseTime: detected ? Math.floor(Math.random() * 10000) : undefined,
    };
  }

  private generateSimulationResult(
    chain: AttackChain,
    timeline: TimelineEvent[],
    detections: { technique: string; detected: boolean; detectionTime?: number }[]
  ): SimulationResult {
    const successfulSteps = chain.steps.filter(s => s.result?.success).length;
    const detectedSteps = chain.steps.filter(s => s.detectionResult?.detected).length;
    const blockedSteps = chain.steps.filter(s => s.status === 'blocked').length;
    const detectedWithTime = detections.filter(d => d.detected && d.detectionTime);

    const meanTimeToDetection = detectedWithTime.length > 0
      ? detectedWithTime.reduce((sum, d) => sum + (d.detectionTime || 0), 0) / detectedWithTime.length
      : undefined;

    const metrics: SimulationMetrics = {
      attackSuccessRate: successfulSteps / chain.steps.length,
      detectionRate: detectedSteps / chain.steps.length,
      meanTimeToDetection: meanTimeToDetection || 0,
      meanTimeToResponse: chain.steps
        .filter(s => s.detectionResult?.responseTime)
        .reduce((sum, s) => sum + (s.detectionResult?.responseTime || 0), 0) / Math.max(detectedSteps, 1),
      coverageByPhase: this.calculatePhaseCoverage(chain),
      topMissedTechniques: detections
        .filter(d => !d.detected)
        .map(d => d.technique)
        .slice(0, 5),
      topDetectedTechniques: detections
        .filter(d => d.detected)
        .map(d => d.technique)
        .slice(0, 5),
    };

    const recommendations = this.generateRecommendations(chain, detections);
    const report = this.generateAfterActionReport(chain, metrics, recommendations);

    return {
      id: `sim-${Date.now()}`,
      chain,
      summary: {
        totalSteps: chain.steps.length,
        successfulSteps,
        detectedSteps,
        blockedSteps,
        duration: chain.startTime && chain.endTime
          ? chain.endTime.getTime() - chain.startTime.getTime()
          : 0,
        meanTimeToDetection,
        meanTimeToResponse: metrics.meanTimeToResponse,
      },
      timeline,
      detectionCoverage: detections,
      recommendations,
      report,
    };
  }

  generateAfterActionReport(
    chain: AttackChain,
    metrics: SimulationMetrics,
    recommendations: SecurityRecommendation[]
  ): AfterActionReport {
    const detectedSteps = chain.steps.filter(s => s.detectionResult?.detected);
    const missedSteps = chain.steps.filter(s => !s.detectionResult?.detected);

    const findings: Finding[] = [
      ...missedSteps.slice(0, 5).map((step): Finding => ({
        id: `finding-${step.id}`,
        type: 'gap',
        severity: step.technique.severity,
        title: `Missed Detection: ${step.technique.name}`,
        description: `The ${step.technique.name} technique was not detected during simulation`,
        evidence: [step.result?.output || 'Execution completed without detection'],
        impact: `Attackers could use ${step.technique.name} without being detected`,
        recommendation: `Implement detection for ${step.technique.mitreId}`,
      })),
      ...detectedSteps.slice(0, 3).map((step): Finding => ({
        id: `finding-${step.id}-strength`,
        type: 'strength',
        severity: 'medium',
        title: `Effective Detection: ${step.technique.name}`,
        description: `${step.technique.name} was successfully detected`,
        evidence: [
          `Detection time: ${step.detectionResult?.detectionTime}ms`,
          `Method: ${step.detectionResult?.detectionMethod}`,
        ],
        impact: 'Positive indicator of detection capability',
        recommendation: 'Continue monitoring and tuning this detection',
      })),
    ];

    const riskLevel = metrics.attackSuccessRate > 0.7 ? 'critical'
      : metrics.attackSuccessRate > 0.5 ? 'high'
      : metrics.attackSuccessRate > 0.3 ? 'medium'
      : 'low';

    return {
      id: `aar-${Date.now()}`,
      simulationId: chain.id,
      generatedAt: new Date(),
      executive: {
        summary: `Red team simulation completed with ${Math.round(metrics.attackSuccessRate * 100)}% attack success rate and ${Math.round(metrics.detectionRate * 100)}% detection rate.`,
        riskLevel,
        keyFindings: findings.slice(0, 5).map(f => f.title),
      },
      attackSummary: {
        objectives: chain.metadata.objectives,
        achieved: chain.steps.filter(s => s.result?.success).map(s => s.technique.name),
        failed: chain.steps.filter(s => !s.result?.success).map(s => s.technique.name),
      },
      defenseSummary: {
        detections: detectedSteps.length,
        blocked: chain.steps.filter(s => s.status === 'blocked').length,
        missed: missedSteps.length,
        falsePositives: chain.steps.filter(s => s.detectionResult?.falsePositive).length,
        avgDetectionTime: metrics.meanTimeToDetection,
      },
      findings,
      recommendations,
      metrics,
    };
  }

  private generateRecommendations(
    chain: AttackChain,
    detections: { technique: string; detected: boolean }[]
  ): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];
    const missed = detections.filter(d => !d.detected);

    for (const m of missed.slice(0, 5)) {
      const technique = Array.from(this.techniques.values())
        .find(t => t.mitreId === m.technique);

      if (technique) {
        recommendations.push({
          id: `rec-${m.technique}`,
          priority: technique.severity === 'critical' ? 'critical' : 'high',
          category: 'detection',
          title: `Implement detection for ${technique.name}`,
          description: `The ${technique.name} technique was not detected during simulation`,
          affectedTechniques: [m.technique],
          remediation: `Deploy detection rules for MITRE ATT&CK ${m.technique}`,
          references: [`https://attack.mitre.org/techniques/${m.technique.replace('T', '')}/`],
        });
      }
    }

    return recommendations;
  }

  verifyDefense(
    controlId: string,
    techniqueId: string,
    testResult: 'pass' | 'fail' | 'partial',
    evidence: string,
    assessor: string
  ): DefenseVerification {
    const verification: DefenseVerification = {
      id: `verify-${Date.now()}`,
      controlId,
      technique: techniqueId,
      testResult,
      evidence,
      timestamp: new Date(),
      assessor,
    };

    const controlVerifications = this.verifications.get(controlId) || [];
    controlVerifications.push(verification);
    this.verifications.set(controlId, controlVerifications);

    return verification;
  }

  getDefenseVerification(controlId: string): DefenseVerification[] {
    return this.verifications.get(controlId) || [];
  }

  getSimulation(simulationId: string): SimulationResult | undefined {
    return this.simulations.get(simulationId);
  }

  getSession(sessionId: string): RedBlueTeamSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): RedBlueTeamSession[] {
    return Array.from(this.sessions.values());
  }

  getTechnique(techniqueId: string): AttackTechnique | undefined {
    return this.techniques.get(techniqueId);
  }

  listTechniques(): AttackTechnique[] {
    return Array.from(this.techniques.values());
  }

  private calculateSuccessRate(technique: AttackTechnique): number {
    const base = 0.6;
    const complexityFactor = (10 - technique.executionComplexity) / 10;
    return base * complexityFactor + 0.2;
  }

  private calculateDetectionRate(technique: AttackTechnique): number {
    const base = 0.5;
    const difficultyFactor = (10 - technique.detectionDifficulty) / 10;
    return base * difficultyFactor + 0.3;
  }

  private calculatePhaseCoverage(chain: AttackChain): Record<AttackPhase, number> {
    const coverage: Record<AttackPhase, number> = {} as Record<AttackPhase, number>;
    
    for (const phase of MITRE_ATTACK_PHASES) {
      const phaseSteps = chain.steps.filter(s => s.technique.phase === phase);
      const detected = phaseSteps.filter(s => s.detectionResult?.detected).length;
      coverage[phase] = phaseSteps.length > 0 ? detected / phaseSteps.length : 1;
    }

    return coverage;
  }

  private generateIndicators(step: AttackStep): string[] {
    return [
      `IOC-${step.technique.mitreId}-hash-${Math.random().toString(36).substr(2, 8)}`,
      `IOC-${step.technique.mitreId}-ip-${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    ];
  }

  private generateArtifacts(step: AttackStep): string[] {
    return [
      `/tmp/artifact-${step.id}.bin`,
      `/var/log/${step.technique.mitreId.toLowerCase()}.log`,
    ];
  }

  private getRandomDetectionMethod(): string {
    const methods = ['SIEM Rule', 'EDR Alert', 'Network IDS', 'Log Analysis', 'Behavioral Analytics'];
    return methods[Math.floor(Math.random() * methods.length)];
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createRedBlueTeamEngine(): RedBlueTeamEngine {
  return new RedBlueTeamEngine();
}
