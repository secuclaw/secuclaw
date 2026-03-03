export interface MITRETactic {
  id: string;
  name: string;
  shortName: string;
  description: string;
}

export interface MITRETechnique {
  id: string;
  name: string;
  tacticIds: string[];
  description: string;
  subTechniques?: MITRETechnique[];
  detection?: string;
  platforms?: string[];
}

export interface MITREGroup {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  techniques: string[];
}

export interface MITREMitigation {
  id: string;
  name: string;
  description: string;
  techniques: string[];
}

export interface MITREData {
  tactics: MITRETactic[];
  techniques: MITRETechnique[];
  groups: MITREGroup[];
  mitigations: MITREMitigation[];
}

export interface STIXBundle {
  type: "bundle";
  id: string;
  objects: STIXObject[];
}

export type STIXObject =
  | STIXAttackPattern
  | STIXCourseOfAction
  | STIXIntrusionSet
  | STIXIdentity
  | STIXXMITRECollection
  | STIXRelationship
  | STIXExternalReference
  | STIXTool
  | STIXMalware
  | STIXDataSource
  | STIXDataComponent
  | STIXMatrix;

export interface STIXTool {
  type: 'tool';
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  x_mitre_platforms?: string[];
  x_mitre_aliases?: string[];
  external_references?: STIXExternalReference[];
  created_by_ref?: string;
  x_mitre_deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface STIXMalware {
  type: 'malware';
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  x_mitre_platforms?: string[];
  x_mitre_aliases?: string[];
  external_references?: STIXExternalReference[];
  created_by_ref?: string;
  x_mitre_first_seen?: string;
  x_mitre_deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface STIXDataSource {
  type: 'x-mitre-data-source';
  id: string;
  name: string;
  description?: string;
  x_mitre_platforms?: string[];
  external_references?: STIXExternalReference[];
  x_mitre_deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface STIXDataComponent {
  type: 'x-mitre-data-component';
  id: string;
  name: string;
  description?: string;
  x_mitre_data_source_ref?: string;
  x_mitre_deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface STIXMatrix {
  type: 'x-mitre-matrix';
  id: string;
  name: string;
  description?: string;
  tactic_refs?: string[];
  x_mitre_deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface STIXAttackPattern {
  type: "attack-pattern";
  id: string;
  name: string;
  description?: string;
  external_references?: STIXExternalReference[];
  kill_chain_phases?: { kill_chain_name: string; phase_name: string }[];
  x_mitre_platforms?: string[];
  x_mitre_detection?: string;
  x_mitre_is_subtechnique?: boolean;
  x_mitre_parent_technique?: string;
  created?: string;
  modified?: string;
}

export interface STIXCourseOfAction {
  type: "course-of-action";
  id: string;
  name: string;
  description?: string;
  external_references?: STIXExternalReference[];
  created?: string;
  modified?: string;
}

export interface STIXIntrusionSet {
  type: "intrusion-set";
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  external_references?: STIXExternalReference[];
  created?: string;
  modified?: string;
}

export interface STIXIdentity {
  type: "identity";
  id: string;
  name: string;
  description?: string;
  identity_class?: string;
  created?: string;
  modified?: string;
}

export interface STIXXMITRECollection {
  type: "x-mitre-collection";
  id: string;
  name: string;
  description?: string;
  x_mitre_attack_spec_version?: string;
  x_mitre_version?: string;
  created?: string;
  modified?: string;
}

export interface STIXRelationship {
  type: "relationship";
  id: string;
  relationship_type: string;
  source_ref: string;
  target_ref: string;
  created?: string;
  modified?: string;
}

export interface STIXExternalReference {
  source_name?: string;
  external_id?: string;
  url?: string;
  description?: string;
}

export interface STIXParserOptions {
  includeSubTechniques?: boolean;
  includeDeprecated?: boolean;
}
