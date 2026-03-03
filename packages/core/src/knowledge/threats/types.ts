export interface ThreatIntelligence {
  id: string;
  type: ThreatType;
  name: string;
  description: string;
  source: string;
  confidence: number;
  severity: ThreatSeverity;
  indicators: ThreatIndicator[];
  mitigations: string[];
  timestamps: ThreatTimestamps;
}

export type ThreatType =
  | "malware"
  | "tool"
  | "campaign"
  | "intrusion-set"
  | "vulnerability"
  | "attack-pattern"
  | "infrastructure"
  | "threat-actor";

export type ThreatSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface ThreatIndicator {
  type: IndicatorType;
  value: string;
  pattern?: string;
  firstSeen?: string;
  lastSeen?: string;
  confidence?: number;
}

export type IndicatorType =
  | "ipv4"
  | "ipv6"
  | "domain"
  | "url"
  | "email"
  | "file-hash"
  | "file-name"
  | "mutex"
  | "registry"
  | "account"
  | "certificate"
  | "crypto";

export interface ThreatTimestamps {
  firstSeen: string;
  lastSeen: string;
  published?: string;
  updated?: string;
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  motivation: ActorMotivation[];
  sophistication: ActorSophistication;
  resourceLevel: ResourceLevel;
  intendedEffects: string[];
  attackPatterns: string[];
  malware: string[];
  tools: string[];
  targets: string[];
  externalReferences: ExternalReference[];
}

export type ActorMotivation =
  | "financial-gain"
  | "espionage"
  | "hacktivism"
  | "ideology"
  | "revenge"
  | "disruption"
  | "accidental"
  | "unknown";

export type ActorSophistication = "minimal" | "intermediate" | "advanced" | "expert" | "innovator";

export type ResourceLevel = "individual" | "club" | "team" | "organization" | "nation-state";

export interface ExternalReference {
  sourceName: string;
  url?: string;
  externalId?: string;
  description?: string;
}

export interface Campaign {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  firstSeen: string;
  lastSeen?: string;
  objective?: string;
  status: CampaignStatus;
  associatedGroups: string[];
  targetedSectors: string[];
  targetedCountries: string[];
  malware: string[];
  techniques: string[];
}

export type CampaignStatus = "active" | "inactive" | "completed" | "suspected";

export interface Malware {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  malwareType: MalwareType;
  isFamily: boolean;
  capabilities: MalwareCapability[];
  architectureExecutionEnvs?: string[];
  operatingSystemRefs?: string[];
  implementationLang?: string;
  features: MalwareFeature[];
}

export type MalwareType =
  | "backdoor"
  | "botnet"
  | "downloader"
  | "dropper"
  | "exploit-kit"
  | "keylogger"
  | "ransomware"
  | "spyware"
  | "trojan"
  | "virus"
  | "worm"
  | "adware"
  | "rootkit"
  | "rogue-security-software"
  | "remote-access-trojan";

export type MalwareCapability =
  | "av-bypass"
  | "anti-analysis"
  | "anti-debug"
  | "persistence"
  | "privilege-escalation"
  | "credential-theft"
  | "data-theft"
  | "destruction"
  | "exfiltration"
  | "command-and-control"
  | "lateral-movement"
  | "execution"
  | "process-injection"
  | "obfuscation";

export interface MalwareFeature {
  name: string;
  description?: string;
}

export interface Infrastructure {
  id: string;
  type: InfrastructureType;
  description: string;
  firstSeen: string;
  lastSeen?: string;
  ownership?: string;
  hostingCountry?: string;
  serviceProvider?: string;
  isPivot?: boolean;
  indicators: ThreatIndicator[];
}

export type InfrastructureType = "command-and-control" | "staging" | "exfiltration" | "phishing" | "malware-distribution";

export interface STIXThreatObject {
  type: string;
  spec_version?: string;
  id: string;
  created: string;
  modified: string;
  name?: string;
  description?: string;
  pattern?: string;
  pattern_type?: string;
  pattern_version?: string;
  valid_from?: string;
  valid_until?: string;
  labels?: string[];
  external_references?: Array<{
    source_name: string;
    external_id?: string;
    url?: string;
    description?: string;
  }>;
  object_marking_refs?: string[];
  granular_marking?: unknown;
}

export interface ThreatReport {
  id: string;
  title: string;
  summary: string;
  threats: ThreatIntelligence[];
  actor?: ThreatActor;
  campaigns?: Campaign[];
  malware?: Malware[];
  indicators: ThreatIndicator[];
  mitigations: string[];
  published: string;
  lastUpdated: string;
  tlp: "white" | "green" | "amber" | "red";
}

export interface ThreatSummary {
  totalThreats: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topActors: Array<{ name: string; threatCount: number }>;
  topMalware: Array<{ name: string; threatCount: number }>;
  topTechniques: Array<{ id: string; name: string; usageCount: number }>;
}
