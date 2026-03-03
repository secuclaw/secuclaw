/**
 * SCF-MITRE Bridge - 双向映射引擎
 * 
 * 实现 SCF 安全控制框架 与 MITRE ATT&CK 之间的双向映射
 * 支持:
 * - SCF Control → MITRE Technique 映射
 * - MITRE Technique → SCF Control 反向查找
 * - 威胁到攻击技术的自动推断
 */

import type { SCFControl, SCFDomain } from '../knowledge/scf/types.js';
import type { MITRETechnique, MITRETactic, MITREData } from '../knowledge/mitre/types.js';
import type { GraphNode, GraphEdge, KnowledgeGraph } from '../knowledge/graph.js';
import { SCF_DOMAINS } from '../knowledge/scf/controls.js';
import { NT_THREATS, MT_THREATS, SCFThreat } from '../knowledge/scf/threats.js';

// ============================================
// 类型定义
// ============================================

export interface SCFMITREMapping {
  scfControlId: string;
  scfControlName: string;
  scfDomain: string;
  mitreTechniqueId: string;
  mitreTechniqueName: string;
  mitreTactic: string;
  relationship: 'prevents' | 'detects' | 'responds';
  confidence: number;
}

export interface TechniqueControlCoverage {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  coveredBy: SCFMITREMapping[];
  uncovered: boolean;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface ControlCoverageStats {
  controlId: string;
  controlName: string;
  domain: string;
  techniquesCovered: number;
  techniquesTotal: number;
  coveragePercentage: number;
  gaps: string[];
}

export interface ThreatTechniqueMapping {
  threatId: string;
  threatName: string;
  category: 'NT' | 'MT';
  severity: string;
  mappedTechniques: {
    techniqueId: string;
    techniqueName: string;
    tactic: string;
    coveredByControls: string[];
    residualRisk: number;
  }[];
}

// ============================================
// SCF Control → MITRE Technique 映射表
// ============================================

const EXPERT_MAPPINGS: SCFMITREMapping[] = [
  { scfControlId: 'IAM-03', scfControlName: 'Multi-Factor Authentication', scfDomain: 'IAM', mitreTechniqueId: 'T1078', mitreTechniqueName: 'Valid Accounts', mitreTactic: 'Privilege Escalation', relationship: 'prevents', confidence: 0.95 },
  { scfControlId: 'IAM-02', scfControlName: 'Access Control', scfDomain: 'IAM', mitreTechniqueId: 'T1078', mitreTechniqueName: 'Valid Accounts', mitreTactic: 'Initial Access', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'IAM-04', scfControlName: 'Privileged Access Management', scfDomain: 'IAM', mitreTechniqueId: 'T1068', mitreTechniqueName: 'Exploitation for Privilege Escalation', mitreTactic: 'Privilege Escalation', relationship: 'prevents', confidence: 0.85 },
  { scfControlId: 'IAM-01', scfControlName: 'Identity Management', scfDomain: 'IAM', mitreTechniqueId: 'T1078', mitreTechniqueName: 'Valid Accounts', mitreTactic: 'Persistence', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'NET-02', scfControlName: 'Network Segmentation', scfDomain: 'NET', mitreTechniqueId: 'T1210', mitreTechniqueName: 'Exploitation of Remote Services', mitreTactic: 'Lateral Movement', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'NET-03', scfControlName: 'Firewall Management', scfDomain: 'NET', mitreTechniqueId: 'T1071', mitreTechniqueName: 'Application Layer Protocol', mitreTactic: 'Command and Control', relationship: 'prevents', confidence: 0.85 },
  { scfControlId: 'NET-04', scfControlName: 'Intrusion Detection', scfDomain: 'NET', mitreTechniqueId: 'T1071', mitreTechniqueName: 'Application Layer Protocol', mitreTactic: 'Command and Control', relationship: 'detects', confidence: 0.90 },
  { scfControlId: 'END-01', scfControlName: 'Endpoint Protection', scfDomain: 'END', mitreTechniqueId: 'T1059', mitreTechniqueName: 'Command and Scripting Interpreter', mitreTactic: 'Execution', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'END-02', scfControlName: 'Endpoint Hardening', scfDomain: 'END', mitreTechniqueId: 'T1547', mitreTechniqueName: 'Boot or Logon Autostart Execution', mitreTactic: 'Persistence', relationship: 'prevents', confidence: 0.85 },
  { scfControlId: 'END-03', scfControlName: 'Patch Management', scfDomain: 'END', mitreTechniqueId: 'T1190', mitreTechniqueName: 'Exploit Public-Facing Application', mitreTactic: 'Initial Access', relationship: 'prevents', confidence: 0.95 },
  { scfControlId: 'VPM-01', scfControlName: 'Vulnerability Scanning', scfDomain: 'VPM', mitreTechniqueId: 'T1190', mitreTechniqueName: 'Exploit Public-Facing Application', mitreTactic: 'Initial Access', relationship: 'detects', confidence: 0.85 },
  { scfControlId: 'VPM-02', scfControlName: 'Vulnerability Remediation', scfDomain: 'VPM', mitreTechniqueId: 'T1068', mitreTechniqueName: 'Exploitation for Privilege Escalation', mitreTactic: 'Privilege Escalation', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'MON-01', scfControlName: 'Security Monitoring', scfDomain: 'MON', mitreTechniqueId: 'T1041', mitreTechniqueName: 'Exfiltration Over C2 Channel', mitreTactic: 'Exfiltration', relationship: 'detects', confidence: 0.80 },
  { scfControlId: 'MON-02', scfControlName: 'Log Management', scfDomain: 'MON', mitreTechniqueId: 'T1569', mitreTechniqueName: 'System Services', mitreTactic: 'Execution', relationship: 'detects', confidence: 0.85 },
  { scfControlId: 'MON-03', scfControlName: 'SIEM', scfDomain: 'MON', mitreTechniqueId: 'T1047', mitreTechniqueName: 'Windows Management Instrumentation', mitreTactic: 'Execution', relationship: 'detects', confidence: 0.90 },
  { scfControlId: 'IR-01', scfControlName: 'Incident Response Plan', scfDomain: 'IR', mitreTechniqueId: 'T1486', mitreTechniqueName: 'Data Encrypted for Impact', mitreTactic: 'Impact', relationship: 'responds', confidence: 0.85 },
  { scfControlId: 'IR-02', scfControlName: 'Incident Detection', scfDomain: 'IR', mitreTechniqueId: 'T1105', mitreTechniqueName: 'Ingress Tool Transfer', mitreTactic: 'Command and Control', relationship: 'detects', confidence: 0.90 },
  { scfControlId: 'IR-04', scfControlName: 'Incident Analysis', scfDomain: 'IR', mitreTechniqueId: 'T1005', mitreTechniqueName: 'Data from Local System', mitreTactic: 'Collection', relationship: 'detects', confidence: 0.85 },
  { scfControlId: 'CRY-02', scfControlName: 'Encryption at Rest', scfDomain: 'CRY', mitreTechniqueId: 'T1486', mitreTechniqueName: 'Data Encrypted for Impact', mitreTactic: 'Impact', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'CRY-03', scfControlName: 'Encryption in Transit', scfDomain: 'CRY', mitreTechniqueId: 'T1041', mitreTechniqueName: 'Exfiltration Over C2 Channel', mitreTactic: 'Exfiltration', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'THM-01', scfControlName: 'Threat Intelligence', scfDomain: 'THM', mitreTechniqueId: 'T1588', mitreTechniqueName: 'Obtain Capabilities', mitreTactic: 'Resource Development', relationship: 'detects', confidence: 0.80 },
  { scfControlId: 'THM-02', scfControlName: 'Threat Hunting', scfDomain: 'THM', mitreTechniqueId: 'T1027', mitreTechniqueName: 'Obfuscated Files or Information', mitreTactic: 'Defense Evasion', relationship: 'detects', confidence: 0.75 },
  { scfControlId: 'THM-03', scfControlName: 'Penetration Testing', scfDomain: 'THM', mitreTechniqueId: 'T1190', mitreTechniqueName: 'Exploit Public-Facing Application', mitreTactic: 'Initial Access', relationship: 'detects', confidence: 0.85 },
  { scfControlId: 'TPM-01', scfControlName: 'Vendor Risk Assessment', scfDomain: 'TPM', mitreTechniqueId: 'T1195', mitreTechniqueName: 'Supply Chain Compromise', mitreTactic: 'Initial Access', relationship: 'prevents', confidence: 0.85 },
  { scfControlId: 'TPM-03', scfControlName: 'Vendor Monitoring', scfDomain: 'TPM', mitreTechniqueId: 'T1195', mitreTechniqueName: 'Supply Chain Compromise', mitreTactic: 'Persistence', relationship: 'detects', confidence: 0.80 },
  { scfControlId: 'SAT-03', scfControlName: 'Phishing Awareness', scfDomain: 'SAT', mitreTechniqueId: 'T1566', mitreTechniqueName: 'Phishing', mitreTactic: 'Initial Access', relationship: 'prevents', confidence: 0.90 },
  { scfControlId: 'BCD-03', scfControlName: 'Backup and Recovery', scfDomain: 'BCD', mitreTechniqueId: 'T1486', mitreTechniqueName: 'Data Encrypted for Impact', mitreTactic: 'Impact', relationship: 'responds', confidence: 0.90 },
];

// ============================================
// 引擎实现
// ============================================

export class SCFMITREBridge {
  private mappings: SCFMITREMapping[] = [];
  private techniqueToControls: Map<string, SCFMITREMapping[]> = new Map();
  private controlToTechniques: Map<string, SCFMITREMapping[]> = new Map();
  private techniqueNameCache: Map<string, string> = new Map();
  
  constructor() {
    this.buildIndices();
  }
  
  private buildIndices(): void {
    this.mappings = [...EXPERT_MAPPINGS];
    
    for (const mapping of this.mappings) {
      if (!this.techniqueToControls.has(mapping.mitreTechniqueId)) {
        this.techniqueToControls.set(mapping.mitreTechniqueId, []);
      }
      this.techniqueToControls.get(mapping.mitreTechniqueId)!.push(mapping);
      
      if (!this.controlToTechniques.has(mapping.scfControlId)) {
        this.controlToTechniques.set(mapping.scfControlId, []);
      }
      this.controlToTechniques.get(mapping.scfControlId)!.push(mapping);
      
      this.techniqueNameCache.set(mapping.mitreTechniqueId, mapping.mitreTechniqueName);
    }
  }
  
  getTechniquesByControl(controlId: string): SCFMITREMapping[] {
    return this.controlToTechniques.get(controlId) || [];
  }
  
  getControlsByTechnique(techniqueId: string): SCFMITREMapping[] {
    return this.techniqueToControls.get(techniqueId) || [];
  }
  
  getAllMappings(): SCFMITREMapping[] {
    return this.mappings;
  }
  
  getTechniqueNameById(techniqueId: string): string {
    return this.techniqueNameCache.get(techniqueId) || techniqueId;
  }
  
  generateCoverageGraph(): KnowledgeGraph {
    const nodes = this.generateMappingGraphNodes();
    const edges = this.generateMappingGraphEdges();
    
    return {
      id: 'scf-mitre-coverage',
      name: 'SCF-MITRE Control Coverage',
      type: 'attack_chain',
      nodes,
      edges,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      },
    } as KnowledgeGraph;
  }
  
  generateMappingGraphNodes(): GraphNode[] {
    const nodes: GraphNode[] = [];
    
    for (const domain of SCF_DOMAINS) {
      for (const control of domain.controls) {
        const nodeId = `scf-${control.id}`;
        nodes.push({
          id: nodeId,
          type: 'control',
          label: control.name,
          properties: {
            controlId: control.id,
            domain: domain.code,
            category: control.category,
          },
          style: { color: '#3b82f6', shape: 'rect' },
        });
      }
    }
    
    const addedTechniques = new Set<string>();
    for (const mapping of this.mappings) {
      if (!addedTechniques.has(mapping.mitreTechniqueId)) {
        addedTechniques.add(mapping.mitreTechniqueId);
        const nodeId = `mitre-${mapping.mitreTechniqueId}`;
        nodes.push({
          id: nodeId,
          type: 'attack',
          label: mapping.mitreTechniqueName,
          properties: {
            techniqueId: mapping.mitreTechniqueId,
            tactic: mapping.mitreTactic,
          },
          style: { color: '#ef4444', shape: 'diamond' },
        });
      }
    }
    
    return nodes;
  }
  
  generateMappingGraphEdges(): GraphEdge[] {
    const edges: GraphEdge[] = [];
    
    for (const mapping of this.mappings) {
      edges.push({
        id: `edge-${mapping.scfControlId}-${mapping.mitreTechniqueId}`,
        source: `scf-${mapping.scfControlId}`,
        target: `mitre-${mapping.mitreTechniqueId}`,
        type: mapping.relationship === 'prevents' ? 'prevents' : 
              mapping.relationship === 'detects' ? 'detects' : 'responds_to',
        weight: mapping.confidence,
        properties: {
          confidence: mapping.confidence,
          relationship: mapping.relationship,
        },
        style: {
          color: mapping.relationship === 'prevents' ? '#22c55e' : 
                 mapping.relationship === 'detects' ? '#f59e0b' : '#3b82f6',
          width: mapping.confidence * 3,
        },
      });
    }
    
    return edges;
  }
}

// ============================================
// 单例导出
// ============================================

export const scfMitreBridge = new SCFMITREBridge();

// ============================================
// 便捷函数
// ============================================

export function getControlTechniqueMappings(controlId: string): SCFMITREMapping[] {
  return scfMitreBridge.getTechniquesByControl(controlId);
}

export function getTechniqueControlMappings(techniqueId: string): SCFMITREMapping[] {
  return scfMitreBridge.getControlsByTechnique(techniqueId);
}

export function getUncoveredTechniques(allTechniques: MITRETechnique[]): TechniqueControlCoverage[] {
  const coverage: TechniqueControlCoverage[] = [];
  
  for (const tech of allTechniques) {
    const mappings = scfMitreBridge.getControlsByTechnique(tech.id);
    const tactic = tech.tacticIds.length > 0 ? tech.tacticIds[0] : 'Unknown';
    
    coverage.push({
      techniqueId: tech.id,
      techniqueName: scfMitreBridge.getTechniqueNameById(tech.id),
      tactic,
      coveredBy: mappings,
      uncovered: mappings.length === 0,
      riskLevel: mappings.length === 0 ? 'high' : mappings.length < 3 ? 'medium' : 'low',
    });
  }
  
  return coverage.filter(t => t.uncovered);
}

export function analyzeThreatControlCoverage(): ThreatTechniqueMapping[] {
  const allThreats = [...NT_THREATS, ...MT_THREATS];
  return allThreats.map(threat => {
    const mappedTechniques = threat.mitreMapping.techniques.map(techId => {
      const controls = scfMitreBridge.getControlsByTechnique(techId);
      const controlIds = controls.map(c => c.scfControlId);
      
      let residualRisk = 1.0;
      for (const control of controls) {
        residualRisk *= (1 - control.confidence);
      }
      
      const tactic = threat.mitreMapping.tactics[threat.mitreMapping.techniques.indexOf(techId)] || 'Unknown';
      
      return {
        techniqueId: techId,
        techniqueName: scfMitreBridge.getTechniqueNameById(techId),
        tactic,
        coveredByControls: controlIds,
        residualRisk,
      };
    });
    
    return {
      threatId: threat.id,
      threatName: threat.name,
      category: threat.category,
      severity: threat.severity,
      mappedTechniques,
    };
  });
}
