import type {
  OntologyObject,
  OntologyLink,
  OntologyAction,
  ObjectType,
  LinkType,
  ActionType,
  Asset,
  Threat,
  Vulnerability,
  Control,
  Incident,
  Risk,
  Actor,
} from "./types.js";
import { ObjectType as ObjType, LinkType as LnType, ActionType as ActType } from "./types.js";

export interface DigitalTwinConfig {
  enterpriseId: string;
  name: string;
  description?: string;
  version?: string;
}

export interface EntityState {
  objectId: string;
  properties: Record<string, unknown>;
  lastUpdated: number;
  version: number;
  status: "active" | "inactive" | "deprecated";
}

export interface RelationshipState {
  linkId: string;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  properties: Record<string, unknown>;
  strength: number;
}

export interface TwinSnapshot {
  timestamp: number;
  entities: Map<string, EntityState>;
  relationships: Map<string, RelationshipState>;
  metrics: TwinMetrics;
}

export interface TwinMetrics {
  totalEntities: number;
  totalRelationships: number;
  entityByType: Record<ObjectType, number>;
  relationshipByType: Record<LinkType, number>;
  healthScore: number;
  riskScore: number;
}

export interface EntityQuery {
  types?: ObjectType[];
  tags?: string[];
  properties?: Record<string, unknown>;
  status?: "active" | "inactive" | "deprecated";
  createdAfter?: number;
  modifiedAfter?: number;
}

export interface RelationshipQuery {
  linkTypes?: LinkType[];
  sourceId?: string;
  targetId?: string;
  minStrength?: number;
}

export class DigitalTwin {
  private enterpriseId: string;
  private name: string;
  private description: string;
  private version: string;

  private entities: Map<string, OntologyObject> = new Map();
  private relationships: Map<string, OntologyLink> = new Map();
  private actions: Map<string, OntologyAction> = new Map();
  private states: Map<string, EntityState> = new Map();

  private snapshots: TwinSnapshot[] = [];
  private maxSnapshots = 10;

  constructor(config: DigitalTwinConfig) {
    this.enterpriseId = config.enterpriseId;
    this.name = config.name;
    this.description = config.description ?? "";
    this.version = config.version ?? "1.0.0";
  }

  addObject(object: OntologyObject): void {
    this.entities.set(object.id, object);
    this.updateState(object.id, object);
  }

  getObject(id: string): OntologyObject | undefined {
    return this.entities.get(id);
  }

  updateObject(id: string, updates: Partial<OntologyObject>): OntologyObject | undefined {
    const existing = this.entities.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      modified: new Date().toISOString(),
    } as OntologyObject;

    this.entities.set(id, updated);
    this.updateState(id, updated);

    return updated;
  }

  deleteObject(id: string): boolean {
    const deleted = this.entities.delete(id);
    if (deleted) {
      this.states.delete(id);
      this.cleanupRelationships(id);
    }
    return deleted;
  }

  addLink(link: OntologyLink): void {
    this.relationships.set(link.id, link);
  }

  getLink(id: string): OntologyLink | undefined {
    return this.relationships.get(id);
  }

  updateLink(id: string, updates: Partial<OntologyLink>): OntologyLink | undefined {
    const existing = this.relationships.get(id);
    if (!existing) return undefined;

    const updated: OntologyLink = {
      ...existing,
      ...updates,
      modified: new Date().toISOString(),
    };

    this.relationships.set(id, updated);
    return updated;
  }

  deleteLink(id: string): boolean {
    return this.relationships.delete(id);
  }

  addAction(action: OntologyAction): void {
    this.actions.set(action.id, action);
    this.executeAction(action);
  }

  getAction(id: string): OntologyAction | undefined {
    return this.actions.get(id);
  }

  queryEntities(query: EntityQuery): OntologyObject[] {
    let results = Array.from(this.entities.values());

    if (query.types && query.types.length > 0) {
      results = results.filter((e) => query.types!.includes(e.type as ObjectType));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) => e.tags?.some((t) => query.tags!.includes(t)));
    }

    if (query.status) {
      results = results.filter((e) => this.states.get(e.id)?.status === query.status);
    }

    if (query.createdAfter) {
      results = results.filter((e) => new Date(e.created).getTime() > query.createdAfter!);
    }

    if (query.modifiedAfter) {
      results = results.filter((e) => new Date(e.modified).getTime() > query.modifiedAfter!);
    }

    return results;
  }

  queryRelationships(query: RelationshipQuery): OntologyLink[] {
    let results = Array.from(this.relationships.values());

    if (query.linkTypes && query.linkTypes.length > 0) {
      results = results.filter((r) => query.linkTypes!.includes(r.link_type));
    }

    if (query.sourceId) {
      results = results.filter((r) => r.source_ref === query.sourceId);
    }

    if (query.targetId) {
      results = results.filter((r) => r.target_ref === query.targetId);
    }

    return results;
  }

  getRelatedEntities(entityId: string, direction: "in" | "out" | "both" = "both"): OntologyObject[] {
    const relatedIds = new Set<string>();

    for (const link of this.relationships.values()) {
      if (direction === "out" || direction === "both") {
        if (link.source_ref === entityId) {
          relatedIds.add(link.target_ref);
        }
      }
      if (direction === "in" || direction === "both") {
        if (link.target_ref === entityId) {
          relatedIds.add(link.source_ref);
        }
      }
    }

    return Array.from(relatedIds)
      .map((id) => this.entities.get(id))
      .filter((e): e is OntologyObject => e !== undefined);
  }

  getAttackChain(vulnerabilityId: string): OntologyObject[] {
    const chain: OntologyObject[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string, depth: number) => {
      if (depth > 10 || visited.has(currentId)) return;
      visited.add(currentId);

      const entity = this.entities.get(currentId);
      if (entity) {
        chain.push(entity);
      }

      const outgoing = this.queryRelationships({ sourceId: currentId });
      for (const link of outgoing) {
        if (link.link_type === LnType.EXPLOITS || link.link_type === LnType.DEPENDS_ON) {
          traverse(link.target_ref, depth + 1);
        }
      }
    };

    traverse(vulnerabilityId, 0);
    return chain;
  }

  getDefenseChain(assetId: string): OntologyObject[] {
    const chain: OntologyObject[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string, depth: number) => {
      if (depth > 10 || visited.has(currentId)) return;
      visited.add(currentId);

      const entity = this.entities.get(currentId);
      if (entity) {
        chain.push(entity);
      }

      const incoming = this.queryRelationships({ targetId: currentId });
      for (const link of incoming) {
        if (link.link_type === LnType.MITIGATES || link.link_type === LnType.CONTAINS) {
          traverse(link.source_ref, depth + 1);
        }
      }
    };

    traverse(assetId, 0);
    return chain;
  }

  createSnapshot(): TwinSnapshot {
    const entityStates = new Map<string, EntityState>();
    const relationshipStates = new Map<string, RelationshipState>();

    for (const [id, entity] of this.entities) {
      const state = this.states.get(id);
      if (state) {
        entityStates.set(id, state);
      }
    }

    for (const [id, link] of this.relationships) {
      relationshipStates.set(id, {
        linkId: id,
        sourceId: link.source_ref,
        targetId: link.target_ref,
        linkType: link.link_type,
        properties: link.properties ?? {},
        strength: link.weight ?? 1,
      });
    }

    const snapshot: TwinSnapshot = {
      timestamp: Date.now(),
      entities: entityStates,
      relationships: relationshipStates,
      metrics: this.calculateMetrics(),
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  getSnapshots(): TwinSnapshot[] {
    return [...this.snapshots];
  }

  getLatestSnapshot(): TwinSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  getMetrics(): TwinMetrics {
    return this.calculateMetrics();
  }

  private updateState(objectId: string, object: OntologyObject): void {
    const existing = this.states.get(objectId);
    this.states.set(objectId, {
      objectId,
      properties: { ...object },
      lastUpdated: Date.now(),
      version: (existing?.version ?? 0) + 1,
      status: existing?.status ?? "active",
    });
  }

  private cleanupRelationships(objectId: string): void {
    const toDelete: string[] = [];

    for (const [id, link] of this.relationships) {
      if (link.source_ref === objectId || link.target_ref === objectId) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.relationships.delete(id);
    }
  }

  private executeAction(action: OntologyAction): void {
    switch (action.action_type) {
      case ActType.UPDATE:
        for (const ref of action.object_refs) {
          this.updateObject(ref, action.result ? JSON.parse(action.result) : {});
        }
        break;
      case ActType.ASSIGN:
        if (action.actor_ref && action.object_refs.length > 0) {
          this.updateObject(action.object_refs[0], { owner: action.actor_ref });
        }
        break;
    }
  }

  private calculateMetrics(): TwinMetrics {
    const entityByType: Record<string, number> = {};
    const relationshipByType: Record<string, number> = {};

    for (const entity of this.entities.values()) {
      entityByType[entity.type] = (entityByType[entity.type] ?? 0) + 1;
    }

    for (const link of this.relationships.values()) {
      relationshipByType[link.link_type] = (relationshipByType[link.link_type] ?? 0) + 1;
    }

    let riskScore = 0;
    const risks = this.queryEntities({ types: [ObjType.RISK] }) as Risk[];
    for (const risk of risks) {
      riskScore += risk.likelihood * risk.impact;
    }
    riskScore = risks.length > 0 ? riskScore / risks.length : 0;

    let healthScore = 100;
    const vulnerabilities = this.queryEntities({ types: [ObjType.VULNERABILITY] }) as Vulnerability[];
    const criticalVulns = vulnerabilities.filter((v) => v.cvss_score && v.cvss_score >= 9);
    healthScore -= criticalVulns.length * 5;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      totalEntities: this.entities.size,
      totalRelationships: this.relationships.size,
      entityByType: entityByType as Record<ObjectType, number>,
      relationshipByType: relationshipByType as Record<LinkType, number>,
      healthScore,
      riskScore,
    };
  }

  exportJSON(): string {
    return JSON.stringify({
      enterpriseId: this.enterpriseId,
      name: this.name,
      description: this.description,
      version: this.version,
      entities: Array.from(this.entities.values()),
      relationships: Array.from(this.relationships.values()),
      actions: Array.from(this.actions.values()),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  importJSON(json: string): void {
    const data = JSON.parse(json);

    if (data.entities) {
      for (const entity of data.entities) {
        this.entities.set(entity.id, entity);
      }
    }

    if (data.relationships) {
      for (const link of data.relationships) {
        this.relationships.set(link.id, link);
      }
    }

    if (data.actions) {
      for (const action of data.actions) {
        this.actions.set(action.id, action);
      }
    }
  }
}

export function createDigitalTwin(config: DigitalTwinConfig): DigitalTwin {
  return new DigitalTwin(config);
}

export function createAsset(data: Partial<Asset>): Asset {
  const now = new Date().toISOString();
  return {
    id: data.id ?? `asset-${Date.now()}`,
    type: "asset",
    name: data.name ?? "Unnamed Asset",
    description: data.description,
    category: data.category ?? "software",
    criticality: data.criticality ?? 5,
    owner: data.owner,
    classification: data.classification,
    sensitivity: data.sensitivity,
    location: data.location,
    created: data.created ?? now,
    modified: data.modified ?? now,
    tags: data.tags ?? [],
  };
}

export function createThreat(data: Partial<Threat>): Threat {
  const now = new Date().toISOString();
  return {
    id: data.id ?? `threat-${Date.now()}`,
    type: "threat",
    name: data.name ?? "Unnamed Threat",
    description: data.description,
    threat_actor_types: data.threat_actor_types ?? [],
    motivations: data.motivations ?? [],
    attack_patterns: data.attack_patterns ?? [],
    malware: data.malware ?? [],
    tools: data.tools ?? [],
    created: data.created ?? now,
    modified: data.modified ?? now,
    tags: data.tags ?? [],
  };
}

export function createVulnerability(data: Partial<Vulnerability>): Vulnerability {
  const now = new Date().toISOString();
  return {
    id: data.id ?? `vuln-${Date.now()}`,
    type: "vulnerability",
    name: data.name ?? "Unnamed Vulnerability",
    description: data.description,
    cve_id: data.cve_id,
    cvss_score: data.cvss_score,
    cvss_vector: data.cvss_vector,
    affected_products: data.affected_products ?? [],
    patch_available: data.patch_available ?? false,
    exploit_available: data.exploit_available ?? false,
    created: data.created ?? now,
    modified: data.modified ?? now,
    tags: data.tags ?? [],
  };
}

export function createControl(data: Partial<Control>): Control {
  const now = new Date().toISOString();
  return {
    id: data.id ?? `control-${Date.now()}`,
    type: "control",
    name: data.name ?? "Unnamed Control",
    description: data.description,
    control_type: data.control_type ?? "preventive",
    implementation_status: data.implementation_status ?? "planned",
    effectiveness: data.effectiveness,
    framework: data.framework,
    family: data.family,
    created: data.created ?? now,
    modified: data.modified ?? now,
    tags: data.tags ?? [],
  };
}

export function createRisk(data: Partial<Risk>): Risk {
  const now = new Date().toISOString();
  return {
    id: data.id ?? `risk-${Date.now()}`,
    type: "risk",
    name: data.name ?? "Unnamed Risk",
    description: data.description,
    risk_type: data.risk_type ?? "operational",
    likelihood: data.likelihood ?? 5,
    impact: data.impact ?? 5,
    residual_risk: data.residual_risk,
    risk_owner: data.risk_owner,
    treatment: data.treatment ?? "mitigate",
    created: data.created ?? now,
    modified: data.modified ?? now,
    tags: data.tags ?? [],
  };
}

export function createLink(
  sourceId: string,
  targetId: string,
  linkType: LinkType,
  properties?: Record<string, unknown>,
): OntologyLink {
  const now = new Date().toISOString();
  return {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "link",
    link_type: linkType,
    source_ref: sourceId,
    target_ref: targetId,
    properties,
    created: now,
    modified: now,
  };
}

export function createAction(
  actionType: ActionType,
  objectRefs: string[],
  actorRef?: string,
): OntologyAction {
  const now = new Date().toISOString();
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "action",
    action_type: actionType,
    object_refs: objectRefs,
    actor_ref: actorRef,
    status: "pending",
    created: now,
    modified: now,
  };
}
