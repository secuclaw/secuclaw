export type {
  IOCType,
  HashType,
  ThreatCategory,
  ThreatSeverity,
  ProviderName,
  ThreatIntelConfig,
  IOCInput,
  IOCResult,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  CVEResult,
  ThreatIntelResult,
  AggregatedResult,
  ThreatIntelProvider,
  ThreatIntelCache,
  ThreatIntelEvent,
  ThreatIntelEventHandler,
} from './types.js';

export {
  SEVERITY_SCORES,
  CATEGORY_WEIGHTS,
  PROVIDER_PRIORITIES,
} from './types.js';

export * from './providers/index.js';
export * from './aggregation/index.js';
