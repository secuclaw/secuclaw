/**
 * Unified Knowledge Graph - 综合知识图谱构建器
 * 
 * 整合 SCF 安全控制框架与 MITRE ATT&CK 的综合分析图谱
 * 支持多种视图:
 * - SCF-MITRE 覆盖矩阵
 * - 攻击路径+控制映射
 * - 威胁态势+控制有效性
 * - 深度防御分析
 */

import type { GraphNode, GraphEdge, KnowledgeGraph } from '../knowledge/graph.js';
import type { SCFControl, SCFDomain } from '../knowledge/scf/types.js';
import type { SCFThreat } from '../knowledge/scf/threats.js';
import type { MITRETechnique, MITRETactic } from '../knowledge/mitre/types.js';
import { SCF_DOMAINS, getSCFControl } from '../knowledge/scf/controls.js';
import { NT_THREATS, MT_THREATS } from '../knowledge/scf/threats.js';
import { scfMitreBridge, type TechniqueControlCoverage } from './scf-mitre-bridge.js';

// ============================================
// 类型定义
// ============================================

export type UnifiedGraphViewType = 
  | 'scf_mitre_coverage'    // SCF-MITRE 覆盖矩阵
  | 'attack_path_control'   // 攻击路径+控制映射
  | 'threat_control_matrix' // 威胁-控制矩阵
  | 'defense_in_depth'     // 深度防御分析
  | 'risk_heatmap';        // 风险热力图

export interface UnifiedGraphConfig {
  viewType: UnifiedGraphViewType;
  includeSCFControls: boolean;
  includeMITRETechniques: boolean;
  includeThreats: boolean;
  includeAssets: boolean;
  minConfidence?: number;
}

export interface AttackPathWithControls {
  pathId: string;
  steps: AttackStepWithControls[];
  totalResidualRisk: number;
  overallCoverage: number;
  recommendations: string[];
}

export interface AttackStepWithControls {
  stepNumber: number;
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  coveredByControls: SCFControl[];
  detectionControls: SCFControl[];
  responseControls: SCFControl[];
  residualRisk: number;
  isProtected: boolean;
}

export interface DefenseLayer {
  layerId: string;
  layerName: string;
  description: string;
  controls: SCFControl[];
  effectiveness: number;
  gaps: string[];
}

export interface ThreatControlMatrixCell {
  threatId: string;
  threatName: string;
  severity: string;
  techniqueId: string;
  techniqueName: string;
  controlId?: string;
  controlName?: string;
  effectiveness: 'high' | 'medium' | 'low' | 'none';
  residualRisk: number;
}

// ============================================
// 综合图谱构建器
// ============================================

export class UnifiedKnowledgeGraph {
  private config: UnifiedGraphConfig;
  
  constructor(config: Partial<UnifiedGraphConfig> = {}) {
    this.config = {
      viewType: config.viewType || 'scf_mitre_coverage',
      includeSCFControls: config.includeSCFControls ?? true,
      includeMITRETechniques: config.includeMITRETechniques ?? true,
      includeThreats: config.includeThreats ?? true,
      includeAssets: config.includeAssets ?? false,
      minConfidence: config.minConfidence ?? 0.5,
    };
  }
  
  /**
   * 生成 SCF-MITRE 覆盖矩阵图谱
   */
  buildCoverageMatrixGraph(): KnowledgeGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    // 添加 SCF 域节点
    for (const domain of SCF_DOMAINS) {
      nodes.push({
        id: `domain-${domain.code}`,
        type: 'control',
        label: domain.name,
        properties: {
          domainCode: domain.code,
          controlCount: domain.controls.length,
        },
        style: { color: '#6366f1', shape: 'rect', size: 40 },
      });
    }
    
    // 添加 SCF 控制节点
    for (const domain of SCF_DOMAINS) {
      for (const control of domain.controls) {
        nodes.push({
          id: `control-${control.id}`,
          type: 'control',
          label: control.name,
          properties: {
            controlId: control.id,
            controlName: control.name,
            domain: domain.code,
            category: control.category,
          },
          style: { color: '#3b82f6', shape: 'rect' },
        });
        
        edges.push({
          id: `edge-domain-${domain.code}-control-${control.id}`,
          source: `domain-${domain.code}`,
          target: `control-${control.id}`,
          type: 'contains',
          style: { color: '#6366f1', width: 1 },
        });
      }
    }
    
    // 添加 MITRE 技术节点和边
    const mappings = scfMitreBridge.getAllMappings();
    const techniqueNodes = new Map<string, GraphNode>();
    
    for (const mapping of mappings) {
      if (mapping.confidence < (this.config.minConfidence ?? 0)) continue;
      
      if (!techniqueNodes.has(mapping.mitreTechniqueId)) {
        const node: GraphNode = {
          id: `technique-${mapping.mitreTechniqueId}`,
          type: 'attack',
          label: mapping.mitreTechniqueName,
          properties: {
            techniqueId: mapping.mitreTechniqueId,
            tactic: mapping.mitreTactic,
          },
          style: { 
            color: mapping.relationship === 'prevents' ? '#22c55e' : 
                   mapping.relationship === 'detects' ? '#f59e0b' : '#3b82f6',
            shape: 'diamond',
          },
        };
        techniqueNodes.set(mapping.mitreTechniqueId, node);
        nodes.push(node);
      }
      
      edges.push({
        id: `edge-control-${mapping.scfControlId}-technique-${mapping.mitreTechniqueId}`,
        source: `control-${mapping.scfControlId}`,
        target: `technique-${mapping.mitreTechniqueId}`,
        type: mapping.relationship as 'prevents' | 'detects' | 'responds_to',
        weight: mapping.confidence,
        properties: {
          relationship: mapping.relationship,
          confidence: mapping.confidence,
        },
        style: {
          color: mapping.relationship === 'prevents' ? '#22c55e' : 
                 mapping.relationship === 'detects' ? '#f59e0b' : '#3b82f6',
          width: mapping.confidence * 3,
          dashed: mapping.relationship === 'detects',
        },
      });
    }
    
    return {
      id: 'unified-scf-mitre-coverage',
      name: 'SCF-MITRE Coverage Matrix',
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
  
  /**
   * 构建攻击路径+控制映射
   */
  buildAttackPathControlGraph(threats?: SCFThreat[]): KnowledgeGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const targetThreats = threats || NT_THREATS.slice(0, 3);
    
    for (const threat of targetThreats) {
      const threatNodeId = `threat-${threat.id}`;
      
      nodes.push({
        id: threatNodeId,
        type: 'threat',
        label: threat.name,
        properties: {
          threatId: threat.id,
          severity: threat.severity,
          likelihood: threat.likelihood,
          impact: threat.impact,
          category: threat.category,
        },
        style: {
          color: threat.severity === 'critical' ? '#dc2626' : 
                 threat.severity === 'high' ? '#ea580c' : '#ca8a04',
          size: 50,
          shape: 'hexagon',
        },
      });
      
      const techniques = threat.mitreMapping.techniques;
      const tactics = threat.mitreMapping.tactics;
      
      for (let i = 0; i < techniques.length; i++) {
        const techId = techniques[i];
        const tactic = tactics[i] || 'Unknown';
        
        const techNodeId = `technique-${techId}`;
        
        if (!nodes.find(n => n.id === techNodeId)) {
          nodes.push({
            id: techNodeId,
            type: 'attack',
            label: scfMitreBridge.getTechniqueNameById(techId) || techId,
            properties: {
              techniqueId: techId,
              tactic,
              stepOrder: i,
            },
            style: { color: '#ef4444', shape: 'diamond' },
          });
        }
        
        edges.push({
          id: `edge-${threatNodeId}-${techNodeId}`,
          source: threatNodeId,
          target: techNodeId,
          type: 'indicates',
          style: { color: '#f97316', animated: true },
        });
        
        const controls = scfMitreBridge.getControlsByTechnique(techId);
        
        for (const control of controls) {
          const controlNodeId = `control-${control.scfControlId}`;
          
          if (!nodes.find(n => n.id === controlNodeId)) {
            nodes.push({
              id: controlNodeId,
              type: 'control',
              label: control.scfControlName,
              properties: {
                controlId: control.scfControlId,
                domain: control.scfDomain,
              },
              style: { color: '#22c55e', shape: 'rect' },
            });
          }
          
          edges.push({
            id: `edge-${techNodeId}-${controlNodeId}`,
            source: techNodeId,
            target: controlNodeId,
            type: control.relationship as 'prevents' | 'detects' | 'responds_to',
            weight: control.confidence,
            properties: {
              confidence: control.confidence,
              relationship: control.relationship,
            },
            style: {
              color: control.relationship === 'prevents' ? '#22c55e' : 
                     control.relationship === 'detects' ? '#f59e0b' : '#3b82f6',
              width: control.confidence * 2,
            },
          });
        }
      }
    }
    
    return {
      id: 'unified-attack-path-control',
      name: 'Attack Path with Control Mapping',
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
  
  /**
   * 构建威胁-控制矩阵
   */
  buildThreatControlMatrix(threats?: SCFThreat[]): ThreatControlMatrixCell[] {
    const targetThreats = threats || [...NT_THREATS, ...MT_THREATS];
    const matrix: ThreatControlMatrixCell[] = [];
    
    for (const threat of targetThreats) {
      for (const techId of threat.mitreMapping.techniques) {
        const controls = scfMitreBridge.getControlsByTechnique(techId);
        
        if (controls.length > 0) {
          for (const control of controls) {
            matrix.push({
              threatId: threat.id,
              threatName: threat.name,
              severity: threat.severity,
              techniqueId: techId,
              techniqueName: scfMitreBridge.getTechniqueNameById(techId) || techId,
              controlId: control.scfControlId,
              controlName: control.scfControlName,
              effectiveness: control.confidence >= 0.8 ? 'high' : 
                           control.confidence >= 0.6 ? 'medium' : 'low',
              residualRisk: 1 - control.confidence,
            });
          }
        } else {
          matrix.push({
            threatId: threat.id,
            threatName: threat.name,
            severity: threat.severity,
            techniqueId: techId,
            techniqueName: scfMitreBridge.getTechniqueNameById(techId) || techId,
            effectiveness: 'none',
            residualRisk: 1,
          });
        }
      }
    }
    
    return matrix;
  }
  
  /**
   * 构建深度防御分析图谱
   */
  buildDefenseInDepthGraph(): KnowledgeGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    const defenseLayers: { id: string; name: string; categories: string[] }[] = [
      { id: 'layer-prevent', name: 'Prevention', categories: ['access', 'network', 'endpoint', 'data'] },
      { id: 'layer-detect', name: 'Detection', categories: ['monitoring', 'threat', 'vulnerability'] },
      { id: 'layer-respond', name: 'Response', categories: ['incident', 'continuity'] },
      { id: 'layer-recover', name: 'Recovery', categories: ['continuity'] },
    ];
    
    for (const layer of defenseLayers) {
      nodes.push({
        id: layer.id,
        type: 'control',
        label: layer.name,
        properties: { layerName: layer.name },
        style: { 
          color: layer.id === 'layer-prevent' ? '#22c55e' : 
                 layer.id === 'layer-detect' ? '#f59e0b' : 
                 layer.id === 'layer-respond' ? '#3b82f6' : '#8b5cf6',
          size: 45,
          shape: 'hexagon',
        },
      });
    }
    
    for (const domain of SCF_DOMAINS) {
      for (const control of domain.controls) {
        const controlNodeId = `control-${control.id}`;
        
        let targetLayer = 'layer-respond';
        for (const layer of defenseLayers) {
          if (layer.categories.includes(control.category)) {
            targetLayer = layer.id;
            break;
          }
        }
        
        nodes.push({
          id: controlNodeId,
          type: 'control',
          label: control.name,
          properties: {
            controlId: control.id,
            domain: domain.code,
            category: control.category,
          },
          style: { color: '#3b82f6', shape: 'rect' },
        });
        
        edges.push({
          id: `edge-${targetLayer}-${controlNodeId}`,
          source: targetLayer,
          target: controlNodeId,
          type: 'contains',
          style: { width: 2 },
        });
      }
    }
    
    return {
      id: 'unified-defense-in-depth',
      name: 'Defense in Depth Analysis',
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
  
  /**
   * 构建风险热力图
   */
  buildRiskHeatmapGraph(threats?: SCFThreat[]): KnowledgeGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const targetThreats = threats || [...NT_THREATS, ...MT_THREATS];
    
    const severityToRisk: Record<string, number> = {
      critical: 1.0,
      high: 0.75,
      medium: 0.5,
      low: 0.25,
    };
    
    for (const threat of targetThreats) {
      const riskScore = severityToRisk[threat.severity] || 0.5;
      
      let coverage = 0;
      for (const techId of threat.mitreMapping.techniques) {
        const controls = scfMitreBridge.getControlsByTechnique(techId);
        if (controls.length > 0) {
          coverage += controls.reduce((sum, c) => sum + c.confidence, 0) / controls.length;
        }
      }
      coverage = threat.mitreMapping.techniques.length > 0 
        ? coverage / threat.mitreMapping.techniques.length 
        : 0;
      
      const residualRisk = riskScore * (1 - coverage);
      
      nodes.push({
        id: `threat-${threat.id}`,
        type: 'threat',
        label: threat.name,
        properties: {
          threatId: threat.id,
          severity: threat.severity,
          likelihood: threat.likelihood,
          impact: threat.impact,
          riskScore,
          coverage,
          residualRisk,
        },
        style: {
          color: residualRisk > 0.7 ? '#dc2626' : 
                 residualRisk > 0.4 ? '#f59e0b' : '#22c55e',
          size: 30 + residualRisk * 30,
        },
      });
      
      for (const techId of threat.mitreMapping.techniques) {
        const techNodeId = `tech-${techId}`;
        
        if (!nodes.find(n => n.id === techNodeId)) {
          nodes.push({
            id: techNodeId,
            type: 'attack',
            label: scfMitreBridge.getTechniqueNameById(techId) || techId,
            properties: { techniqueId: techId },
            style: { color: '#ef4444', shape: 'diamond', size: 20 },
          });
        }
        
        edges.push({
          id: `edge-${threat.id}-${techId}`,
          source: `threat-${threat.id}`,
          target: techNodeId,
          type: 'indicates',
          style: { color: '#f97316' },
        });
      }
    }
    
    return {
      id: 'unified-risk-heatmap',
      name: 'Risk Heatmap',
      type: 'risk_propagation',
      nodes,
      edges,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      },
    } as KnowledgeGraph;
  }
  
  /**
   * 根据配置构建图谱
   */
  build(): KnowledgeGraph {
    switch (this.config.viewType) {
      case 'scf_mitre_coverage':
        return this.buildCoverageMatrixGraph();
      case 'attack_path_control':
        return this.buildAttackPathControlGraph();
      case 'defense_in_depth':
        return this.buildDefenseInDepthGraph();
      case 'risk_heatmap':
        return this.buildRiskHeatmapGraph();
      default:
        return this.buildCoverageMatrixGraph();
    }
  }
  
  /**
   * 分析攻击路径及控制
   */
  analyzeAttackPaths(threats?: SCFThreat[]): AttackPathWithControls[] {
    const targetThreats = threats || NT_THREATS.slice(0, 5);
    const paths: AttackPathWithControls[] = [];
    
    for (const threat of targetThreats) {
      const steps: AttackStepWithControls[] = [];
      let totalResidualRisk = 1.0;
      let controlCoverage = 0;
      
      for (let i = 0; i < threat.mitreMapping.techniques.length; i++) {
        const techId = threat.mitreMapping.techniques[i];
        const tactic = threat.mitreMapping.tactics[i] || 'Unknown';
        
        const controls = scfMitreBridge.getControlsByTechnique(techId);
        
        const preventControls: SCFControl[] = [];
        const detectControls: SCFControl[] = [];
        const respondControls: SCFControl[] = [];
        
        for (const mapping of controls) {
          const scfControl = getSCFControl(mapping.scfControlId);
          if (scfControl) {
            if (mapping.relationship === 'prevents') preventControls.push(scfControl);
            else if (mapping.relationship === 'detects') detectControls.push(scfControl);
            else respondControls.push(scfControl);
          }
        }
        
        const stepConfidence = controls.length > 0
          ? controls.reduce((sum, c) => sum + c.confidence, 0) / controls.length
          : 0;
        const stepResidualRisk = 1 - stepConfidence;
        totalResidualRisk *= stepResidualRisk;
        controlCoverage += stepConfidence;
        
        steps.push({
          stepNumber: i + 1,
          techniqueId: techId,
          techniqueName: scfMitreBridge.getTechniqueNameById(techId) || techId,
          tactic,
          coveredByControls: preventControls,
          detectionControls: detectControls,
          responseControls: respondControls,
          residualRisk: stepResidualRisk,
          isProtected: preventControls.length > 0,
        });
      }
      
      paths.push({
        pathId: `path-${threat.id}`,
        steps,
        totalResidualRisk,
        overallCoverage: threat.mitreMapping.techniques.length > 0 
          ? controlCoverage / threat.mitreMapping.techniques.length 
          : 0,
        recommendations: this.generateRecommendations(steps),
      });
    }
    
    return paths;
  }
  
  /**
   * 生成缓解建议
   */
  private generateRecommendations(steps: AttackStepWithControls[]): string[] {
    const recommendations: string[] = [];
    
    for (const step of steps) {
      if (!step.isProtected) {
        recommendations.push(
          `建议在 ${step.tactic} 阶段添加控制措施防御 ${step.techniqueName} (${step.techniqueId})`
        );
      }
      
      if (step.detectionControls.length === 0) {
        recommendations.push(
          `建议添加检测控制以发现 ${step.techniqueName} 技术`
        );
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('当前攻击路径已被有效控制措施覆盖');
    }
    
    return recommendations;
  }
  
  /**
   * 获取深度防御层级
   */
  getDefenseLayers(): DefenseLayer[] {
    const layers: DefenseLayer[] = [
      { layerId: 'prevent', layerName: '预防层', description: '阻止攻击发生', controls: [], effectiveness: 0, gaps: [] },
      { layerId: 'detect', layerName: '检测层', description: '发现正在进行的攻击', controls: [], effectiveness: 0, gaps: [] },
      { layerId: 'respond', layerName: '响应层', description: '响应已发生的攻击', controls: [], effectiveness: 0, gaps: [] },
      { layerId: 'recover', layerName: '恢复层', description: '恢复受损系统', controls: [], effectiveness: 0, gaps: [] },
    ];
    
    const categoryToLayer: Record<string, string> = {
      'access': 'prevent', 'network': 'prevent', 'endpoint': 'prevent', 'data': 'prevent',
      'monitoring': 'detect', 'threat': 'detect', 'vulnerability': 'detect',
      'incident': 'respond', 'continuity': 'respond',
    };
    
    for (const domain of SCF_DOMAINS) {
      for (const control of domain.controls) {
        const layerId = categoryToLayer[control.category] || 'respond';
        const layer = layers.find(l => l.layerId === layerId);
        if (layer) {
          layer.controls.push(control);
        }
      }
    }
    
    for (const layer of layers) {
      const mappings = layer.controls.flatMap(c => scfMitreBridge.getTechniquesByControl(c.id));
      layer.effectiveness = mappings.length > 0
        ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
        : 0;
    }
    
    return layers;
  }
}

// ============================================
// 便捷函数
// ============================================

export function buildSCFMITRECoverageGraph(): KnowledgeGraph {
  const builder = new UnifiedKnowledgeGraph({ viewType: 'scf_mitre_coverage' });
  return builder.build();
}

export function buildAttackPathWithControlsGraph(threats?: SCFThreat[]): KnowledgeGraph {
  const builder = new UnifiedKnowledgeGraph({ viewType: 'attack_path_control' });
  return builder.buildAttackPathControlGraph(threats);
}

export function buildDefenseInDepthGraph(): KnowledgeGraph {
  const builder = new UnifiedKnowledgeGraph({ viewType: 'defense_in_depth' });
  return builder.buildDefenseInDepthGraph();
}

export function buildRiskHeatmapGraph(threats?: SCFThreat[]): KnowledgeGraph {
  const builder = new UnifiedKnowledgeGraph({ viewType: 'risk_heatmap' });
  return builder.buildRiskHeatmapGraph(threats);
}

export function analyzeAttackPathsWithControls(threats?: SCFThreat[]): AttackPathWithControls[] {
  const builder = new UnifiedKnowledgeGraph();
  return builder.analyzeAttackPaths(threats);
}

export function getDefenseInDepthLayers(): DefenseLayer[] {
  const builder = new UnifiedKnowledgeGraph();
  return builder.getDefenseLayers();
}
