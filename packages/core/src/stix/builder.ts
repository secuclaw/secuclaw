import type {
  STIXBundle,
  STIXObject,
  STIXType,
  STIXAttackPattern,
  STIXIndicator,
  STIXMalware,
  STIXThreatActor,
  STIXVulnerability,
  STIXRelationship,
  STIXIdentity,
  STIXReport,
  STIXKillChainPhase,
  STIXExternalReference,
} from './types.js';

export class STIXBuilder {
  private objects: STIXObject[] = [];
  private createdByRef?: string;
  private defaultMarkings: string[] = [];
  private confidence?: number;

  setCreatedBy(identityId: string): this {
    this.createdByRef = identityId;
    return this;
  }

  setDefaultMarking(markingRefs: string[]): this {
    this.defaultMarkings = markingRefs;
    return this;
  }

  setConfidence(confidence: number): this {
    this.confidence = Math.max(0, Math.min(100, confidence));
    return this;
  }

  generateId(type: STIXType): string {
    const uuid = crypto.randomUUID ? crypto.randomUUID() : 
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    return `${type}--${uuid}`;
  }

  addAttackPattern(options: {
    name: string;
    description?: string;
    aliases?: string[];
    killChainPhases?: STIXKillChainPhase[];
    externalReferences?: STIXExternalReference[];
  }): STIXAttackPattern {
    const id = this.generateId('attack-pattern');
    const now = new Date().toISOString();

    const attackPattern: STIXAttackPattern = {
      type: 'attack-pattern',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      name: options.name,
      description: options.description,
      aliases: options.aliases,
      kill_chain_phases: options.killChainPhases,
      external_references: options.externalReferences,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(attackPattern);
    return attackPattern;
  }

  addIndicator(options: {
    name?: string;
    description?: string;
    pattern: string;
    patternType: STIXIndicator['pattern_type'];
    validFrom: string;
    validUntil?: string;
    indicatorTypes?: STIXIndicator['indicator_types'];
    killChainPhases?: STIXKillChainPhase[];
    labels?: string[];
  }): STIXIndicator {
    const id = this.generateId('indicator');
    const now = new Date().toISOString();

    const indicator: STIXIndicator = {
      type: 'indicator',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      name: options.name,
      description: options.description,
      pattern: options.pattern,
      pattern_type: options.patternType,
      valid_from: options.validFrom,
      valid_until: options.validUntil,
      indicator_types: options.indicatorTypes,
      kill_chain_phases: options.killChainPhases,
      labels: options.labels,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(indicator);
    return indicator;
  }

  addMalware(options: {
    name: string;
    description?: string;
    malwareTypes?: string[];
    isFamily?: boolean;
    aliases?: string[];
    killChainPhases?: STIXKillChainPhase[];
    labels?: string[];
  }): STIXMalware {
    const id = this.generateId('malware');
    const now = new Date().toISOString();

    const malware: STIXMalware = {
      type: 'malware',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      name: options.name,
      description: options.description,
      malware_types: options.malwareTypes,
      is_family: options.isFamily ?? false,
      aliases: options.aliases,
      kill_chain_phases: options.killChainPhases,
      labels: options.labels,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(malware);
    return malware;
  }

  addThreatActor(options: {
    name: string;
    description?: string;
    threatActorTypes?: string[];
    aliases?: string[];
    firstSeen?: string;
    lastSeen?: string;
    roles?: string[];
    goals?: string[];
    sophistication?: string;
    resourceLevel?: string;
    primaryMotivation?: string;
    labels?: string[];
  }): STIXThreatActor {
    const id = this.generateId('threat-actor');
    const now = new Date().toISOString();

    const threatActor: STIXThreatActor = {
      type: 'threat-actor',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      name: options.name,
      description: options.description,
      threat_actor_types: options.threatActorTypes,
      aliases: options.aliases,
      first_seen: options.firstSeen,
      last_seen: options.lastSeen,
      roles: options.roles,
      goals: options.goals,
      sophistication: options.sophistication,
      resource_level: options.resourceLevel,
      primary_motivation: options.primaryMotivation,
      labels: options.labels,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(threatActor);
    return threatActor;
  }

  addVulnerability(options: {
    name: string;
    description?: string;
    cveId?: string;
    cvss?: {
      vectorString?: string;
      baseScore?: number;
      baseSeverity?: string;
    };
    labels?: string[];
  }): STIXVulnerability {
    const id = this.generateId('vulnerability');
    const now = new Date().toISOString();

    const externalReferences: STIXExternalReference[] = [];
    if (options.cveId) {
      externalReferences.push({
        source_name: 'cve',
        external_id: options.cveId,
        url: `https://nvd.nist.gov/vuln/detail/${options.cveId}`,
      });
    }

    const vulnerability: STIXVulnerability = {
      type: 'vulnerability',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      name: options.name,
      description: options.description,
      x_cvss: options.cvss ? {
        vector_string: options.cvss.vectorString,
        base_score: options.cvss.baseScore,
        base_severity: options.cvss.baseSeverity,
      } : undefined,
      external_references: externalReferences.length > 0 ? externalReferences : undefined,
      labels: options.labels,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(vulnerability);
    return vulnerability;
  }

  addRelationship(options: {
    relationshipType: string;
    sourceRef: string;
    targetRef: string;
    description?: string;
    startTime?: string;
    stopTime?: string;
  }): STIXRelationship {
    const id = this.generateId('relationship');
    const now = new Date().toISOString();

    const relationship: STIXRelationship = {
      type: 'relationship',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      relationship_type: options.relationshipType,
      source_ref: options.sourceRef,
      target_ref: options.targetRef,
      description: options.description,
      start_time: options.startTime,
      stop_time: options.stopTime,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(relationship);
    return relationship;
  }

  addIdentity(options: {
    name: string;
    identityClass: STIXIdentity['identity_class'];
    description?: string;
    roles?: string[];
    sectors?: string[];
    contactInformation?: string;
  }): STIXIdentity {
    const id = this.generateId('identity');
    const now = new Date().toISOString();

    const identity: STIXIdentity = {
      type: 'identity',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      name: options.name,
      identity_class: options.identityClass,
      description: options.description,
      roles: options.roles,
      sectors: options.sectors,
      contact_information: options.contactInformation,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(identity);
    return identity;
  }

  addReport(options: {
    name: string;
    description?: string;
    published: string;
    reportTypes?: string[];
    objectRefs: string[];
    labels?: string[];
  }): STIXReport {
    const id = this.generateId('report');
    const now = new Date().toISOString();

    const report: STIXReport = {
      type: 'report',
      spec_version: '2.1',
      id,
      created: now,
      modified: now,
      name: options.name,
      description: options.description,
      published: options.published,
      report_types: options.reportTypes,
      object_refs: options.objectRefs,
      labels: options.labels,
      created_by_ref: this.createdByRef,
      object_marking_refs: this.defaultMarkings.length > 0 ? this.defaultMarkings : undefined,
      confidence: this.confidence,
    };

    this.objects.push(report);
    return report;
  }

  addObject(obj: STIXObject): this {
    this.objects.push(obj);
    return this;
  }

  build(): STIXBundle {
    const bundleId = this.generateId('bundle');

    return {
      type: 'bundle',
      spec_version: '2.1',
      id: bundleId,
      created: new Date().toISOString(),
      objects: this.objects,
    };
  }

  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  clear(): this {
    this.objects = [];
    return this;
  }

  getObjects(): STIXObject[] {
    return [...this.objects];
  }

  getObjectCount(): number {
    return this.objects.length;
  }

  getObjectsByType<T extends STIXObject>(type: STIXType): T[] {
    return this.objects.filter(obj => (obj as unknown as Record<string, unknown>).type === type) as T[];
  }

  getObjectById(id: string): STIXObject | undefined {
    return this.objects.find(obj => (obj as unknown as Record<string, unknown>).id === id);
  }
}

export function createSTIXBuilder(): STIXBuilder {
  return new STIXBuilder();
}

export function createKillChainPhase(killChainName: string, phaseName: string): STIXKillChainPhase {
  return {
    kill_chain_name: killChainName,
    phase_name: phaseName,
  };
}

export const MITRE_ATTACK_KILL_CHAIN = 'mitre-attack';

export const MITRE_PHASES = {
  RECONNAISSANCE: 'reconnaissance',
  RESOURCE_DEVELOPMENT: 'resource-development',
  INITIAL_ACCESS: 'initial-access',
  EXECUTION: 'execution',
  PERSISTENCE: 'persistence',
  PRIVILEGE_ESCALATION: 'privilege-escalation',
  DEFENSE_EVASION: 'defense-evasion',
  CREDENTIAL_ACCESS: 'credential-access',
  DISCOVERY: 'discovery',
  LATERAL_MOVEMENT: 'lateral-movement',
  COLLECTION: 'collection',
  COMMAND_AND_CONTROL: 'command-and-control',
  EXFILTRATION: 'exfiltration',
  IMPACT: 'impact',
} as const;
