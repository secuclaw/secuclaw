export type STIXType = 
  | 'bundle'
  | 'attack-pattern'
  | 'campaign'
  | 'course-of-action'
  | 'grouping'
  | 'identity'
  | 'indicator'
  | 'infrastructure'
  | 'intrusion-set'
  | 'location'
  | 'malware'
  | 'malware-analysis'
  | 'note'
  | 'observed-data'
  | 'opinion'
  | 'report'
  | 'threat-actor'
  | 'tool'
  | 'vulnerability'
  | 'relationship'
  | 'sighting';

export type STIXHashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512' | 'SHA3-256' | 'SHA3-512' | 'SSDEEP' | 'TLSH';

export interface STIXCommonProperties {
  type: STIXType;
  spec_version: '2.1';
  id: string;
  created: string;
  modified?: string;
  created_by_ref?: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: STIXExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: STIXGranularMarking[];
  extensions?: Record<string, unknown>;
}

export interface STIXExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  hashes?: Partial<Record<STIXHashAlgorithm, string>>;
  external_id?: string;
}

export interface STIXGranularMarking {
  marking_ref: string;
  selectors: string[];
}

export interface STIXBundle extends STIXCommonProperties {
  type: 'bundle';
  id: string;
  objects: STIXObject[];
}

export type STIXObject = 
  | STIXBundle
  | STIXAttackPattern
  | STIXCampaign
  | STIXCourseOfAction
  | STIXGrouping
  | STIXIdentity
  | STIXIndicator
  | STIXInfrastructure
  | STIXIntrusionSet
  | STIXLocation
  | STIXMalware
  | STIXMalwareAnalysis
  | STIXNote
  | STIXObservedData
  | STIXOpinion
  | STIXReport
  | STIXThreatActor
  | STIXTool
  | STIXVulnerability
  | STIXRelationship
  | STIXSighting;

export interface STIXAttackPattern extends STIXCommonProperties {
  type: 'attack-pattern';
  name: string;
  description?: string;
  aliases?: string[];
  kill_chain_phases?: STIXKillChainPhase[];
}

export interface STIXKillChainPhase {
  kill_chain_name: string;
  phase_name: string;
}

export interface STIXCampaign extends STIXCommonProperties {
  type: 'campaign';
  name: string;
  description?: string;
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  objective?: string;
}

export interface STIXCourseOfAction extends STIXCommonProperties {
  type: 'course-of-action';
  name: string;
  description?: string;
}

export interface STIXGrouping extends STIXCommonProperties {
  type: 'grouping';
  name: string;
  description?: string;
  context: string;
  object_refs: string[];
}

export interface STIXIdentity extends STIXCommonProperties {
  type: 'identity';
  name: string;
  description?: string;
  roles?: string[];
  identity_class: 'individual' | 'group' | 'system' | 'organization' | 'class' | 'unknown';
  sectors?: string[];
  contact_information?: string;
}

export interface STIXIndicator extends STIXCommonProperties {
  type: 'indicator';
  name?: string;
  description?: string;
  indicator_types?: STIXIndicatorType[];
  pattern: string;
  pattern_type: 'stix' | 'pcre' | 'sigma' | 'snort' | 'suricata' | 'yara' | 'spl' | 'grf';
  pattern_version?: string;
  valid_from: string;
  valid_until?: string;
  kill_chain_phases?: STIXKillChainPhase[];
}

export type STIXIndicatorType = 
  | 'anomalous-activity'
  | 'anonymization'
  | 'benign'
  | 'compromised'
  | 'malicious-activity'
  | 'attribution'
  | 'unknown';

export interface STIXInfrastructure extends STIXCommonProperties {
  type: 'infrastructure';
  name: string;
  description?: string;
  infrastructure_types?: string[];
  aliases?: string[];
}

export interface STIXIntrusionSet extends STIXCommonProperties {
  type: 'intrusion-set';
  name: string;
  description?: string;
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  goals?: string[];
  resource_level?: string;
  primary_motivation?: string;
  secondary_motivations?: string[];
}

export interface STIXLocation extends STIXCommonProperties {
  type: 'location';
  name?: string;
  description?: string;
  region?: string;
  country?: string;
  administrative_area?: string;
  city?: string;
  street_address?: string;
  postal_code?: string;
  geolocation_lat?: number;
  geolocation_long?: number;
}

export interface STIXMalware extends STIXCommonProperties {
  type: 'malware';
  name: string;
  description?: string;
  malware_types?: string[];
  is_family?: boolean;
  aliases?: string[];
  kill_chain_phases?: STIXKillChainPhase[];
  operating_system_refs?: string[];
  architecture_execution_envs?: string[];
  implementation_languages?: string[];
  capabilities?: string[];
  sample_refs?: string[];
}

export interface STIXMalwareAnalysis extends STIXCommonProperties {
  type: 'malware-analysis';
  product: string;
  version?: string;
  host_vm_ref?: string;
  operating_system_ref?: string;
  installed_software_refs?: string[];
  configuration_version?: string;
  modules?: string[];
  analysis_engine_version?: string;
  analysis_definition_version?: string;
  submitted?: string;
  analysis_started?: string;
  analysis_ended?: string;
  result_name?: string;
  result?: string;
  analysis_sco_refs?: string[];
  sample_ref?: string;
}

export interface STIXNote extends STIXCommonProperties {
  type: 'note';
  abstract?: string;
  content: string;
  authors?: string[];
  object_refs: string[];
}

export interface STIXObservedData extends STIXCommonProperties {
  type: 'observed-data';
  first_observed: string;
  last_observed: string;
  number_observed: number;
  object_refs: string[];
}

export interface STIXOpinion extends STIXCommonProperties {
  type: 'opinion';
  explanation?: string;
  authors?: string[];
  opinion: 'strongly-disagree' | 'disagree' | 'neutral' | 'agree' | 'strongly-agree';
  object_refs: string[];
}

export interface STIXReport extends STIXCommonProperties {
  type: 'report';
  name: string;
  description?: string;
  report_types?: string[];
  published: string;
  object_refs: string[];
}

export interface STIXThreatActor extends STIXCommonProperties {
  type: 'threat-actor';
  name: string;
  description?: string;
  threat_actor_types?: string[];
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  roles?: string[];
  goals?: string[];
  sophistication?: string;
  resource_level?: string;
  primary_motivation?: string;
  secondary_motivations?: string[];
  personal_motivations?: string[];
}

export interface STIXTool extends STIXCommonProperties {
  type: 'tool';
  name: string;
  description?: string;
  tool_types?: string[];
  aliases?: string[];
  kill_chain_phases?: STIXKillChainPhase[];
  tool_version?: string;
}

export interface STIXVulnerability extends STIXCommonProperties {
  type: 'vulnerability';
  name: string;
  description?: string;
  x_cvss?: {
    vector_string?: string;
    base_score?: number;
    base_severity?: string;
  };
}

export interface STIXRelationship extends STIXCommonProperties {
  type: 'relationship';
  relationship_type: string;
  description?: string;
  source_ref: string;
  target_ref: string;
  start_time?: string;
  stop_time?: string;
}

export interface STIXSighting extends STIXCommonProperties {
  type: 'sighting';
  first_seen?: string;
  last_seen?: string;
  count?: number;
  sighting_of_ref: string;
  observed_data_refs?: string[];
  where_sighted_refs?: string[];
  summary?: boolean;
}

export type STIXRelationshipType = 
  | 'uses'
  | 'targets'
  | 'attributed-to'
  | 'indicates'
  | 'mitigates'
  | 'variant-of'
  | 'derived-from'
  | 'related-to'
  | 'impersonates'
  | 'located-at'
  | 'based-on'
  | 'communicates-with'
  | 'consists-of'
  | 'controls'
  | 'delivers'
  | 'has'
  | 'hosts'
  | 'owns'
  | 'authored-by'
  | 'beacons-to'
  | 'exfiltrates-to'
  | 'downloads'
  | 'drops'
  | 'exploits'
  | 'investigates'
  | 'originates-from'
  | 'remediates'
  | 'revoked-by'
  | 'subtechnique-of'
  | 'analysis-of'
  | 'characterizes'
  | 'detected'
  | 'contains'
  | 'static-analysis-of'
  | 'dynamic-analysis-of';

export interface STIXParseResult {
  success: boolean;
  bundle?: STIXBundle;
  objects?: STIXObject[];
  errors?: Array<{ path: string; message: string }>;
  warnings?: Array<{ path: string; message: string }>;
  stats?: {
    total: number;
    byType: Record<STIXType, number>;
  };
}

export interface STIXValidationOptions {
  strict?: boolean;
  allowCustomProperties?: boolean;
  validateExternalRefs?: boolean;
}
