import type { ObjectType, LinkType, ActionType, SeverityLevel, StatusLevel, AssetCategory, ActorType } from "./types.js";

export interface ObjectTypeDefinition {
  type: ObjectType;
  label: string;
  description: string;
  properties: PropertyDefinition[];
  required: string[];
  stixType: string;
}

export interface PropertyDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enum?: readonly string[];
  default?: unknown;
}

export interface LinkTypeDefinition {
  type: LinkType;
  label: string;
  description: string;
  sourceTypes: ObjectType[];
  targetTypes: ObjectType[];
  directional: boolean;
  transitive: boolean;
}

export interface ActionTypeDefinition {
  type: ActionType;
  label: string;
  description: string;
  applicableTypes: ObjectType[];
  resultsInStatusChange: boolean;
  newStatus?: StatusLevel;
}

export const severityOrder: Record<SeverityLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const statusOrder: Record<StatusLevel, number> = {
  new: 0,
  in_progress: 1,
  mitigated: 2,
  resolved: 3,
  closed: 4,
};

export const objectTypeDefinitions: Record<ObjectType, ObjectTypeDefinition> = {
  asset: {
    type: "asset",
    label: "Asset",
    description: "An asset is a resource or component of value that needs protection",
    properties: [
      { name: "category", type: "AssetCategory", required: true, enum: ["hardware", "software", "data", "network", "identity", "facility"] },
      { name: "criticality", type: "number", required: true, description: "Asset criticality score 0-100" },
      { name: "owner", type: "string", required: false, description: "Owner of the asset" },
      { name: "classification", type: "string", required: false, description: "Security classification" },
      { name: "sensitivity", type: "number", required: false, description: "Sensitivity level 0-100" },
      { name: "location", type: "string", required: false, description: "Physical or logical location" },
    ],
    required: ["name", "category", "criticality"],
    stixType: "x-enterprise-asset",
  },
  threat: {
    type: "threat",
    label: "Threat",
    description: "A potential threat that could exploit vulnerabilities",
    properties: [
      { name: "threat_actor_types", type: "ActorType[]", required: false },
      { name: "motivations", type: "string[]", required: false },
      { name: "intended_effects", type: "string[]", required: false },
      { name: "attack_patterns", type: "string[]", required: false, description: "MITRE ATT&CK techniques" },
      { name: "malware", type: "string[]", required: false },
      { name: "tools", type: "string[]", required: false },
    ],
    required: ["name"],
    stixType: "threat-actor",
  },
  vulnerability: {
    type: "vulnerability",
    label: "Vulnerability",
    description: "A weakness that can be exploited by threats",
    properties: [
      { name: "cve_id", type: "string", required: false, description: "CVE identifier" },
      { name: "cvss_score", type: "number", required: false, description: "CVSS base score 0-10" },
      { name: "cvss_vector", type: "string", required: false, description: "CVSS vector string" },
      { name: "affected_products", type: "string[]", required: false },
      { name: "patch_available", type: "boolean", required: false, default: false },
      { name: "exploit_available", type: "boolean", required: false, default: false },
    ],
    required: ["name"],
    stixType: "vulnerability",
  },
  control: {
    type: "control",
    label: "Control",
    description: "A security control or safeguard",
    properties: [
      { name: "control_type", type: "string", required: true, enum: ["preventive", "detective", "corrective", "compensating"] },
      { name: "implementation_status", type: "string", required: false, enum: ["implemented", "partial", "planned", "not_applicable"] },
      { name: "effectiveness", type: "string", required: false, enum: ["effective", "ineffective", "partial"] },
      { name: "framework", type: "string", required: false, description: "Control framework (NIST, ISO, etc.)" },
      { name: "family", type: "string", required: false, description: "Control family" },
    ],
    required: ["name", "control_type"],
    stixType: "x-enterprise-control",
  },
  incident: {
    type: "incident",
    label: "Incident",
    description: "A security incident or event",
    properties: [
      { name: "incident_type", type: "string", required: false },
      { name: "discovery_time", type: "string", required: false, description: "ISO 8601 timestamp" },
      { name: "containment_time", type: "string", required: false },
      { name: "eradication_time", type: "string", required: false },
      { name: "recovery_time", type: "string", required: false },
      { name: "impact_assessment", type: "string", required: false },
      { name: "root_cause", type: "string", required: false },
    ],
    required: ["name"],
    stixType: "incident",
  },
  risk: {
    type: "risk",
    label: "Risk",
    description: "A security risk assessment",
    properties: [
      { name: "risk_type", type: "string", required: true, enum: ["strategic", "tactical", "operational"] },
      { name: "likelihood", type: "number", required: true, description: "Likelihood 0-100" },
      { name: "impact", type: "number", required: true, description: "Impact 0-100" },
      { name: "residual_risk", type: "number", required: false, description: "Residual risk after controls" },
      { name: "risk_owner", type: "string", required: false },
      { name: "treatment", type: "string", required: false, enum: ["accept", "mitigate", "transfer", "avoid"] },
    ],
    required: ["name", "risk_type", "likelihood", "impact"],
    stixType: "x-enterprise-risk",
  },
  actor: {
    type: "actor",
    label: "Actor",
    description: "An entity that could act as a threat actor",
    properties: [
      { name: "actor_type", type: "ActorType", required: true, enum: ["internal", "external", "partner"] },
      { name: "motivations", type: "string[]", required: false },
      { name: "sophistication", type: "string", required: false, enum: ["novice", "intermediate", "expert", "innovator"] },
      { name: "resource_level", type: "string", required: false, enum: ["individual", "club", "team", "organization", "nation-state"] },
      { name: "aliases", type: "string[]", required: false },
    ],
    required: ["name", "actor_type"],
    stixType: "threat-actor",
  },
};

export const linkTypeDefinitions: Record<LinkType, LinkTypeDefinition> = {
  exploits: {
    type: "exploits",
    label: "Exploits",
    description: "A threat or actor exploits a vulnerability",
    sourceTypes: ["threat", "actor"],
    targetTypes: ["vulnerability"],
    directional: true,
    transitive: false,
  },
  mitigates: {
    type: "mitigates",
    label: "Mitigates",
    description: "A control mitigates a threat or vulnerability",
    sourceTypes: ["control"],
    targetTypes: ["threat", "vulnerability"],
    directional: true,
    transitive: false,
  },
  "depends-on": {
    type: "depends-on",
    label: "Depends On",
    description: "One asset depends on another",
    sourceTypes: ["asset", "control"],
    targetTypes: ["asset", "control"],
    directional: true,
    transitive: true,
  },
  transmits: {
    type: "transmits",
    label: "Transmits",
    description: "Data is transmitted between assets",
    sourceTypes: ["asset"],
    targetTypes: ["asset"],
    directional: true,
    transitive: false,
  },
  contains: {
    type: "contains",
    label: "Contains",
    description: "An asset or control contains another",
    sourceTypes: ["asset", "control"],
    targetTypes: ["asset", "control"],
    directional: true,
    transitive: true,
  },
  "belongs-to": {
    type: "belongs-to",
    label: "Belongs To",
    description: "An entity belongs to a group or category",
    sourceTypes: ["asset", "vulnerability", "incident", "risk"],
    targetTypes: ["asset", "control", "risk"],
    directional: true,
    transitive: false,
  },
  uses: {
    type: "uses",
    label: "Uses",
    description: "An actor or threat uses a technique or tool",
    sourceTypes: ["actor", "threat"],
    targetTypes: ["threat", "vulnerability"],
    directional: true,
    transitive: false,
  },
};

export const actionTypeDefinitions: Record<ActionType, ActionTypeDefinition> = {
  approve: {
    type: "approve",
    label: "Approve",
    description: "Approve an action or request",
    applicableTypes: ["risk", "incident", "control"],
    resultsInStatusChange: false,
  },
  reject: {
    type: "reject",
    label: "Reject",
    description: "Reject an action or request",
    applicableTypes: ["risk", "incident", "control"],
    resultsInStatusChange: false,
  },
  update: {
    type: "update",
    label: "Update",
    description: "Update properties of an entity",
    applicableTypes: Object.keys(objectTypeDefinitions) as ObjectType[],
    resultsInStatusChange: false,
  },
  assign: {
    type: "assign",
    label: "Assign",
    description: "Assign responsibility to an actor",
    applicableTypes: ["incident", "risk", "vulnerability"],
    resultsInStatusChange: true,
    newStatus: "in_progress",
  },
  remediate: {
    type: "remediate",
    label: "Remediate",
    description: "Remediate a vulnerability or risk",
    applicableTypes: ["vulnerability", "risk", "incident"],
    resultsInStatusChange: true,
    newStatus: "mitigated",
  },
  escalate: {
    type: "escalate",
    label: "Escalate",
    description: "Escalate to higher authority",
    applicableTypes: ["incident", "risk"],
    resultsInStatusChange: true,
    newStatus: "in_progress",
  },
};

export function isValidLink(sourceType: ObjectType, targetType: ObjectType, linkType: LinkType): boolean {
  const linkDef = linkTypeDefinitions[linkType];
  if (!linkDef) return false;
  return linkDef.sourceTypes.includes(sourceType) && linkDef.targetTypes.includes(targetType);
}

export function isValidAction(actionType: ActionType, objectType: ObjectType): boolean {
  const actionDef = actionTypeDefinitions[actionType];
  if (!actionDef) return false;
  return actionDef.applicableTypes.includes(objectType);
}

export function getLinkInheritance(linkType: LinkType): LinkType[] {
  const linkDef = linkTypeDefinitions[linkType];
  if (!linkDef?.transitive) return [linkType];
  return Object.keys(linkTypeDefinitions).filter(
    (k) => k !== linkType && linkTypeDefinitions[k as LinkType].sourceTypes.some((t) => linkDef.sourceTypes.includes(t))
  ) as LinkType[];
}

export function getPropertiesForType(objectType: ObjectType): PropertyDefinition[] {
  return objectTypeDefinitions[objectType]?.properties ?? [];
}

export function getRequiredProperties(objectType: ObjectType): string[] {
  return objectTypeDefinitions[objectType]?.required ?? [];
}
