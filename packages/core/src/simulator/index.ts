export { 
  SecurityEventSimulator, 
  securitySimulator,
  type SecurityEvent,
  type ThreatActor,
  type AttackChain,
  type AttackPhase,
  type IOC,
} from "./security-events.js";

export { 
  ComplianceSimulator, 
  complianceSimulator,
  type ComplianceFramework,
  type ComplianceGap,
  type AuditTask,
} from "./compliance.js";

export { 
  RiskSimulator, 
  riskSimulator,
  type RiskDomain,
  type RiskItem,
  type BusinessUnit,
  type SupplyChainRisk,
} from "./risk.js";
