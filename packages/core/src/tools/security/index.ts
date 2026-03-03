import type { SecurityTool } from './types';
import { SecurityToolRegistry, globalToolRegistry } from './registry';
import { attackSimulationTools } from './attack-simulation';
import { vulnerabilityScanningTools } from './vulnerability-scanning';
import { threatHuntingTools } from './threat-hunting';
import { incidentResponseTools } from './incident-response';
import { securityAnalysisTools } from './security-analysis';
import { reconnaissanceTools } from './reconnaissance';

export * from './types';
export * from './registry';

export {
  attackSimulationTools,
  vulnerabilityScanningTools,
  threatHuntingTools,
  incidentResponseTools,
  securityAnalysisTools,
  reconnaissanceTools,
};

export const allSecurityTools: SecurityTool[] = [
  ...attackSimulationTools,
  ...vulnerabilityScanningTools,
  ...threatHuntingTools,
  ...incidentResponseTools,
  ...securityAnalysisTools,
  ...reconnaissanceTools,
];

export function registerAllTools(registry: SecurityToolRegistry = globalToolRegistry): void {
  for (const tool of allSecurityTools) {
    registry.register(tool);
  }
}

export function getToolsByCategory(category: string): SecurityTool[] {
  return allSecurityTools.filter(tool => tool.category === category);
}

export function getToolsByRiskLevel(riskLevel: string): SecurityTool[] {
  return allSecurityTools.filter(tool => tool.riskLevel === riskLevel);
}

export function getToolCount(): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  
  for (const tool of allSecurityTools) {
    byCategory[tool.category] = (byCategory[tool.category] || 0) + 1;
  }
  
  return {
    total: allSecurityTools.length,
    byCategory,
  };
}

export const toolCount = {
  attackSimulation: attackSimulationTools.length,
  vulnerabilityScanning: vulnerabilityScanningTools.length,
  threatHunting: threatHuntingTools.length,
  incidentResponse: incidentResponseTools.length,
  securityAnalysis: securityAnalysisTools.length,
  reconnaissance: reconnaissanceTools.length,
  get total() {
    return this.attackSimulation + 
           this.vulnerabilityScanning + 
           this.threatHunting + 
           this.incidentResponse + 
           this.securityAnalysis + 
           this.reconnaissance;
  },
};
