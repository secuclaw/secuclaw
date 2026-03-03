export {
  discoverAttackPath,
  validateExploit,
  simulateAttack,
  penetrationTest,
  threatHunt,
  attackTools,
} from "./attack.js";

export {
  detectThreat,
  scanVulnerability,
  designArchitecture,
  incidentResponse,
  defenseTools,
} from "./defense.js";

export {
  analyzeLogs,
  queryThreatIntel,
  analyzeRisk,
  analyzeCompliance,
  analysisTools,
} from "./analysis.js";

export {
  assessCompliance,
  assessVulnerability,
  assessControl,
  assessArchitecture,
  assessBusiness,
  assessmentTools,
} from "./assessment.js";

export { webFetch, webSearch, utilityTools } from "./utility.js";

export { memorySearch, memoryAdd, memoryTools } from "./memory.js";

import { memoryTools } from "./memory.js";

import type { SecurityTool } from "../types.js";
import { attackTools } from "./attack.js";
import { defenseTools } from "./defense.js";
import { analysisTools } from "./analysis.js";
import { assessmentTools } from "./assessment.js";
import { utilityTools } from "./utility.js";

export const allSecurityTools: SecurityTool[] = [
  ...attackTools,
  ...defenseTools,
  ...analysisTools,
  ...assessmentTools,
  ...utilityTools,
  ...memoryTools,
];
