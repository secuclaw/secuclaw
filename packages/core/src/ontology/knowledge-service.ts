/**
 * OntologyKnowledgeService - Integrates MITRE ATT&CK and SCF data into the Ontology Engine
 * 
 * Palantir-style Ontology:
 * - Objects: Techniques → Threat, Controls → Control, Tactics → Asset (as attack phase)
 * - Properties: severity, cvss_score, frameworks, platforms
 * - Links: mitigates (Control→Technique), uses (Threat→Technique), belongs_to (Technique→Tactic)
 * - Actions: remediate, escalate
 */

import type { OntologyObject, OntologyLink, Threat, Control, Asset, Vulnerability } from "./types.js";
import { OntologyEngine } from "./engine.js";
import type { MITREData, MITRETactic, MITRETechnique, MITREGroup, MITREMitigation } from "../knowledge/mitre/types.js";
import type { SCFData, SCFDomain, SCFControl } from "../knowledge/scf/types.js";
import { ALL_THREATS, type SCFThreat } from "../knowledge/scf/threats.js";

export interface OntologyKnowledgeStats {
  techniques: number;
  tactics: number;
  controls: number;
  domains: number;
  threats: number;
  links: number;
  controlCoverage: Record<string, number>;
}

export interface AttackChainNode {
  id: string;
  type: "tactic" | "technique" | "control";
  name: string;
  tacticOrder: number;
  controls: string[];
}

export interface AttackChain {
  id: string;
  name: string;
  nodes: AttackChainNode[];
  coverage: number;
}

export class OntologyKnowledgeService {
  private engine: OntologyEngine;
  private mitreData: MITREData | null = null;
  private scfData: SCFData | null = null;
  private techniqueControlMap: Map<string, string[]> = new Map();
  private loaded = false;

  constructor() {
    this.engine = new OntologyEngine({
      enableReasoning: true,
      autoIndex: true,
      maxPathDepth: 10,
    });
  }

  /**
   * Load MITRE and SCF data into the ontology engine
   */
  async load(mitreData: MITREData, scfData: SCFData): Promise<void> {
    if (this.loaded) return;

    this.mitreData = mitreData;
    this.scfData = scfData;

    // 1. Load tactics as Asset nodes (attack phases)
    this.loadTactics(mitreData.tactics);

    // 2. Load techniques as Threat objects
    this.loadTechniques(mitreData.techniques);

    // 3. Load threat groups as Actor objects
    this.loadGroups(mitreData.groups);

    // 4. Load SCF controls
    this.loadControls(scfData);

    // 5. Load MITRE mitigations and link to controls
    this.loadMitigations(mitreData.mitigations);

    // 6. Create technique-control links based on SCF threat mappings
    this.createTechniqueControlLinks();

    this.loaded = true;
  }

  private loadTactics(tactics: MITRETactic[]): void {
    const tacticOrder = [
      "Initial Access", "Execution", "Persistence", "Privilege Escalation",
      "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
      "Collection", "Command and Control", "Exfiltration", "Impact"
    ];

    for (const tactic of tactics) {
      const asset: Asset = {
        id: `tactic-${tactic.id}`,
        type: "asset",
        name: tactic.name,
        description: tactic.description,
        category: "software" as const,
        criticality: 50,
        tags: ["tactic", "mitre-attack"],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      this.engine.addEntity(asset);
    }
  }

  private loadTechniques(techniques: MITRETechnique[]): void {
    for (const tech of techniques) {
      const threat: Threat = {
        id: `technique-${tech.id}`,
        type: "threat",
        name: tech.name,
        description: tech.description,
        attack_patterns: [tech.id],
        platforms: tech.platforms,
        severity: this.inferSeverity(tech),
        tags: ["mitre-attack", "technique", ...(tech.platforms || [])],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      this.engine.addEntity(threat);

      // Create links to tactics
      for (const tacticId of tech.tacticIds) {
        const link: OntologyLink = {
          id: `link-${tech.id}-${tacticId}`,
          type: "link",
          link_type: "belongs-to",
          source_ref: `technique-${tech.id}`,
          target_ref: `tactic-${tacticId}`,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        };
        this.engine.addRelationship(link);
      }

      // Load sub-techniques
      if (tech.subTechniques) {
        for (const subTech of tech.subTechniques) {
          const subThreat: Threat = {
            id: `technique-${subTech.id}`,
            type: "threat",
            name: subTech.name,
            description: subTech.description,
            attack_patterns: [subTech.id],
            platforms: subTech.platforms,
            severity: this.inferSeverity(subTech),
            tags: ["mitre-attack", "sub-technique", "parent:" + tech.id],
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          };
          this.engine.addEntity(subThreat);
        }
      }
    }
  }

  private loadGroups(groups: MITREGroup[]): void {
    for (const group of groups) {
      const actor: OntologyObject = {
        id: `actor-${group.id}`,
        type: "actor",
        name: group.name,
        description: group.description,
        actor_type: "external" as const,
        aliases: group.aliases,
        tags: ["threat-actor", "mitre-attack"],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      this.engine.addEntity(actor);

      // Link group to techniques they use
      for (const techId of group.techniques) {
        const link: OntologyLink = {
          id: `link-${group.id}-${techId}`,
          type: "link",
          link_type: "uses",
          source_ref: `actor-${group.id}`,
          target_ref: `technique-${techId}`,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        };
        this.engine.addRelationship(link);
      }
    }
  }

  private loadControls(scfData: SCFData): void {
    for (const domain of scfData.domains) {
      for (const control of domain.controls) {
        const ctrl: Control = {
          id: `control-${control.id}`,
          type: "control",
          name: control.name,
          description: control.description,
          control_type: this.inferControlType(control),
          implementation_status: "implemented" as const,
          effectiveness: "effective" as const,
          framework: control.mappings.map(m => m.framework).join(", "),
          family: domain.name,
          tags: ["scf", "control", domain.code],
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        };

        this.engine.addEntity(ctrl);
      }
    }
  }

  private loadMitigations(mitigations: MITREMitigation[]): void {
    // MITRE mitigations provide mapping to techniques
    for (const mitigation of mitigations) {
      for (const techId of mitigation.techniques) {
        if (!this.techniqueControlMap.has(techId)) {
          this.techniqueControlMap.set(techId, []);
        }
        // Map mitigation name to potential SCF controls
        const mappedControls = this.findMatchingControls(mitigation.name);
        this.techniqueControlMap.get(techId)!.push(...mappedControls);
      }
    }
  }

  private createTechniqueControlLinks(): void {
    // Create links based on SCF threat mappings
    for (const threat of ALL_THREATS) {
      for (const techId of threat.mitreMapping.techniques) {
        // Link threat mitigations to technique
        for (const mitigation of threat.mitigations) {
          const controls = this.findMatchingControls(mitigation);
          for (const controlId of controls) {
            const link: OntologyLink = {
              id: `link-mitigate-${techId}-${controlId}`,
              type: "link",
              link_type: "mitigates",
              source_ref: `control-${controlId}`,
              target_ref: `technique-${techId}`,
              weight: 0.8,
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
            };
            this.engine.addRelationship(link);
          }
        }
      }
    }
  }

  private findMatchingControls(keyword: string): string[] {
    const matches: string[] = [];
    if (!this.scfData) return matches;

    const keywordLower = keyword.toLowerCase();
    for (const domain of this.scfData.domains) {
      for (const control of domain.controls) {
        if (
          control.name.toLowerCase().includes(keywordLower) ||
          control.description.toLowerCase().includes(keywordLower) ||
          keywordLower.includes(control.category.toLowerCase())
        ) {
          matches.push(control.id);
        }
      }
    }
    return matches;
  }

  private inferSeverity(tech: MITRETechnique): "critical" | "high" | "medium" | "low" {
    const criticalKeywords = ["remote", "arbitrary", "privilege", "credential", "exfiltration"];
    const highKeywords = ["execution", "persistence", "evasion", "lateral"];
    
    const desc = (tech.description || "").toLowerCase();
    const name = tech.name.toLowerCase();
    
    for (const kw of criticalKeywords) {
      if (desc.includes(kw) || name.includes(kw)) return "critical";
    }
    for (const kw of highKeywords) {
      if (desc.includes(kw) || name.includes(kw)) return "high";
    }
    return "medium";
  }

  private inferControlType(control: SCFControl): "preventive" | "detective" | "corrective" {
    const name = control.name.toLowerCase();
    const desc = control.description.toLowerCase();
    
    if (name.includes("monitor") || name.includes("detect") || name.includes("audit") || name.includes("log")) {
      return "detective";
    }
    if (name.includes("response") || name.includes("recover") || name.includes("remediate")) {
      return "corrective";
    }
    return "preventive";
  }

  /**
   * Get graph data for visualization
   */
  getGraphData(): { nodes: any[]; edges: any[] } {
    const stats = this.engine.getStats();
    const graph = this.engine.getGraph();
    const exported = graph.export();

    return {
      nodes: exported.nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        metadata: n.metadata,
      })),
      edges: exported.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        linkType: e.linkType,
        weight: e.weight,
      })),
    };
  }

  /**
   * Get attack chains with control coverage
   */
  getAttackChains(): AttackChain[] {
    if (!this.mitreData) return [];

    const tacticOrder = [
      { name: "Initial Access", order: 1 },
      { name: "Execution", order: 2 },
      { name: "Persistence", order: 3 },
      { name: "Privilege Escalation", order: 4 },
      { name: "Defense Evasion", order: 5 },
      { name: "Credential Access", order: 6 },
      { name: "Discovery", order: 7 },
      { name: "Lateral Movement", order: 8 },
      { name: "Collection", order: 9 },
      { name: "Command and Control", order: 10 },
      { name: "Exfiltration", order: 11 },
      { name: "Impact", order: 12 },
    ];

    const chains: AttackChain[] = [];

    // Build attack chains from tactics
    for (const tactic of this.mitreData.tactics) {
      const tacticInfo = tacticOrder.find(t => t.name.toLowerCase() === tactic.name.toLowerCase());
      const order = tacticInfo?.order || 99;

      // Get techniques for this tactic
      const techniques = this.mitreData!.techniques.filter(t => t.tacticIds.includes(tactic.id));

      for (const tech of techniques) {
        // Get controls that mitigate this technique
        const controls = this.getControlsForTechnique(tech.id);

        chains.push({
          id: `chain-${tech.id}`,
          name: `${tactic.name} → ${tech.name}`,
          nodes: [
            { id: `tactic-${tactic.id}`, type: "tactic", name: tactic.name, tacticOrder: order, controls: [] },
            { id: `technique-${tech.id}`, type: "technique", name: tech.name, tacticOrder: order, controls },
          ],
          coverage: controls.length > 0 ? Math.min(controls.length * 25, 100) : 0,
        });
      }
    }

    return chains;
  }

  private getControlsForTechnique(techId: string): string[] {
    const controls: string[] = [];
    const graph = this.engine.getGraph();
    const edges = graph.getEdgesByType("mitigates");
    
    for (const edge of edges) {
      if (edge.target === `technique-${techId}`) {
        controls.push(edge.source);
      }
    }
    return controls;
  }

  /**
   * Calculate control coverage per MITRE tactic
   */
  getControlCoverage(): Record<string, number> {
    if (!this.mitreData) return {};

    const coverage: Record<string, number> = {};

    for (const tactic of this.mitreData.tactics) {
      const techniques = this.mitreData!.techniques.filter(t => t.tacticIds.includes(tactic.id));
      let coveredCount = 0;

      for (const tech of techniques) {
        const controls = this.getControlsForTechnique(tech.id);
        if (controls.length > 0) coveredCount++;
      }

      coverage[tactic.name] = techniques.length > 0 
        ? Math.round((coveredCount / techniques.length) * 100) 
        : 0;
    }

    return coverage;
  }

  /**
   * Get statistics
   */
  getStats(): OntologyKnowledgeStats {
    const stats = this.engine.getStats();
    
    return {
      techniques: this.mitreData?.techniques.length || 0,
      tactics: this.mitreData?.tactics.length || 0,
      controls: this.scfData?.domains.reduce((sum, d) => sum + d.controls.length, 0) || 0,
      domains: this.scfData?.domains.length || 0,
      threats: ALL_THREATS.length,
      links: stats.edgeCount,
      controlCoverage: this.getControlCoverage(),
    };
  }

  /**
   * Search entities
   */
  search(query: string, types?: string[]): any[] {
    return this.engine.search(query, types as any);
  }

  /**
   * Get technique details with related controls
   */
  getTechniqueDetails(techId: string): any {
    const node = this.engine.getEntity(`technique-${techId}`);
    if (!node) return null;

    const relationships = this.engine.getRelationships(`technique-${techId}`);
    const mitigatingControls = relationships.incoming
      .filter(e => e.linkType === "mitigates")
      .map(e => this.engine.getEntity(e.source));

    return {
      technique: node,
      controls: mitigatingControls.filter(Boolean),
      coverage: mitigatingControls.length > 0 ? Math.min(mitigatingControls.length * 25, 100) : 0,
    };
  }

  /**
   * Get control details with mitigated techniques
   */
  getControlDetails(controlId: string): any {
    const node = this.engine.getEntity(`control-${controlId}`);
    if (!node) return null;

    const relationships = this.engine.getRelationships(`control-${controlId}`);
    const mitigatedTechniques = relationships.outgoing
      .filter(e => e.linkType === "mitigates")
      .map(e => this.engine.getEntity(e.target));

    return {
      control: node,
      techniques: mitigatedTechniques.filter(Boolean),
      effectiveness: mitigatedTechniques.length > 0 ? 100 : 0,
    };
  }
}

// Singleton instance
let serviceInstance: OntologyKnowledgeService | null = null;

export function getOntologyKnowledgeService(): OntologyKnowledgeService {
  if (!serviceInstance) {
    serviceInstance = new OntologyKnowledgeService();
  }
  return serviceInstance;
}

export async function initOntologyKnowledgeService(
  mitreData: MITREData,
  scfData: SCFData
): Promise<OntologyKnowledgeService> {
  const service = getOntologyKnowledgeService();
  await service.load(mitreData, scfData);
  return service;
}
