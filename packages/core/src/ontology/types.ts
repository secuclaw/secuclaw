import { z } from "zod";

export const ObjectType = {
  ASSET: "asset",
  THREAT: "threat",
  VULNERABILITY: "vulnerability",
  CONTROL: "control",
  INCIDENT: "incident",
  RISK: "risk",
  ACTOR: "actor",
} as const;

export type ObjectType = (typeof ObjectType)[keyof typeof ObjectType];

export const LinkType = {
  EXPLOITS: "exploits",
  MITIGATES: "mitigates",
  DEPENDS_ON: "depends-on",
  TRANSMITS: "transmits",
  CONTAINS: "contains",
  BELONGS_TO: "belongs-to",
  USES: "uses",
} as const;

export type LinkType = (typeof LinkType)[keyof typeof LinkType];

export const ActionType = {
  APPROVE: "approve",
  REJECT: "reject",
  UPDATE: "update",
  ASSIGN: "assign",
  REMEDIATE: "remediate",
  ESCALATE: "escalate",
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const SeverityLevel = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
} as const;

export type SeverityLevel = (typeof SeverityLevel)[keyof typeof SeverityLevel];

export const StatusLevel = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  MITIGATED: "mitigated",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type StatusLevel = (typeof StatusLevel)[keyof typeof StatusLevel];

export const AssetCategory = {
  HARDWARE: "hardware",
  SOFTWARE: "software",
  DATA: "data",
  NETWORK: "network",
  IDENTITY: "identity",
  FACILITY: "facility",
} as const;

export type AssetCategory = (typeof AssetCategory)[keyof typeof AssetCategory];

export const ActorType = {
  INTERNAL: "internal",
  EXTERNAL: "external",
  PARTNER: "partner",
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const ActorMotivation = {
  FINANCIAL: "financial",
  ESPIONAGE: "espionage",
  HACKTIVISM: "hacktivism",
  IDEOLOGY: "ideology",
  REVENGE: "revenge",
  CURIOUSITY: "curiosity",
} as const;

export type ActorMotivation = (typeof ActorMotivation)[keyof typeof ActorMotivation];

export interface STIXObject {
  id: string;
  type: string;
  spec_version?: string;
  created: string;
  modified: string;
  created_by_ref?: string;
  revoked?: boolean;
  labels?: string[];
  external_references?: ExternalReference[];
  object_marking_refs?: string[];
}

export interface ExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  hashes?: Record<string, string>;
}

export interface GranularMarking {
  marking_definition: string;
  selectors: string[];
}

export interface BaseOntologyObject extends STIXObject {
  name: string;
  description?: string;
  categories?: string[];
  severity?: SeverityLevel;
  status?: StatusLevel;
  confidence?: number;
  tags?: string[];
  granular_markings?: GranularMarking[];
}

export interface Asset extends BaseOntologyObject {
  type: "asset";
  category: AssetCategory;
  criticality: number;
  owner?: string;
  classification?: string;
  sensitivity?: number;
  location?: string;
  tags: string[];
}

export interface Threat extends BaseOntologyObject {
  type: "threat";
  threat_actor_types?: ActorType[];
  motivations?: ActorMotivation[];
  intended_effects?: string[];
  attack_patterns?: string[];
  malware?: string[];
  tools?: string[];
  platforms?: string[];
  tags: string[];
}

export interface Vulnerability extends BaseOntologyObject {
  type: "vulnerability";
  cve_id?: string;
  cvss_score?: number;
  cvss_vector?: string;
  affected_products?: string[];
  patch_available?: boolean;
  exploit_available?: boolean;
  tags: string[];
}

export interface Control extends BaseOntologyObject {
  type: "control";
  control_type: "preventive" | "detective" | "corrective" | "compensating";
  implementation_status?: "implemented" | "partial" | "planned" | "not_applicable";
  effectiveness?: "effective" | "ineffective" | "partial";
  framework?: string;
  family?: string;
  tags: string[];
}

export interface Incident extends BaseOntologyObject {
  type: "incident";
  incident_type?: string;
  discovery_time?: string;
  containment_time?: string;
  eradication_time?: string;
  recovery_time?: string;
  impact_assessment?: string;
  root_cause?: string;
  tags: string[];
}

export interface Risk extends BaseOntologyObject {
  type: "risk";
  risk_type: "strategic" | "tactical" | "operational";
  likelihood: number;
  impact: number;
  residual_risk?: number;
  risk_owner?: string;
  treatment?: "accept" | "mitigate" | "transfer" | "avoid";
  tags: string[];
}

export interface Actor extends BaseOntologyObject {
  type: "actor";
  actor_type: ActorType;
  motivations?: ActorMotivation[];
  sophistication?: "novice" | "intermediate" | "expert" | "innovator";
  resource_level?: "individual" | "club" | "team" | "organization" | "nation-state";
  aliases?: string[];
  tags: string[];
}

export type OntologyObject = Asset | Threat | Vulnerability | Control | Incident | Risk | Actor;

export interface OntologyLink extends STIXObject {
  type: "link";
  link_type: LinkType;
  source_ref: string;
  target_ref: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

export interface OntologyAction extends STIXObject {
  type: "action";
  action_type: ActionType;
  object_refs: string[];
  actor_ref?: string;
  status?: "pending" | "completed" | "failed";
  result?: string;
  timestamp?: string;
}

export const ontologyObjectSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
  created: z.string(),
  modified: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
  status: z.enum(["new", "in_progress", "mitigated", "resolved", "closed"]).optional(),
  confidence: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()),
});

export const ontologyLinkSchema = z.object({
  id: z.string(),
  type: z.literal("link"),
  link_type: z.enum(["exploits", "mitigates", "depends-on", "transmits", "contains", "belongs-to"]),
  source_ref: z.string(),
  target_ref: z.string(),
  created: z.string(),
  modified: z.string(),
  weight: z.number().optional(),
  properties: z.record(z.unknown()).optional(),
});

export const ontologyActionSchema = z.object({
  id: z.string(),
  type: z.literal("action"),
  action_type: z.enum(["approve", "reject", "update", "assign", "remediate", "escalate"]),
  object_refs: z.array(z.string()),
  actor_ref: z.string().optional(),
  status: z.enum(["pending", "completed", "failed"]).optional(),
  result: z.string().optional(),
  created: z.string(),
  modified: z.string(),
});

export type { STIXObject as STIXBaseObject };
