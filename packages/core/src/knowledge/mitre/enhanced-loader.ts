import type {
  MITREData,
  MITRETactic,
  MITRETechnique,
  MITREGroup,
  MITREMitigation,
  STIXBundle,
  STIXParserOptions,
} from './types.js';

export interface MITRETool {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  techniques: string[];
  groups: string[];
  type: 'tool' | 'malware';
  platforms?: string[];
  createdBy?: string;
  firstSeen?: string;
}

export interface MITREDataSource {
  id: string;
  name: string;
  description: string;
  techniques: string[];
  components: MITREComponent[];
}

export interface MITREComponent {
  id: string;
  name: string;
  description: string;
  dataSourceId: string;
  techniques: string[];
}

export interface MITREMatrix {
  id: string;
  name: string;
  description: string;
  tactics: string[];
}

export interface EnhancedMITREData extends MITREData {
  tools: MITRETool[];
  dataSources: MITREDataSource[];
  matrices: MITREMatrix[];
  version: string;
  domain: 'enterprise' | 'mobile' | 'ics';
}

export interface STIXTool {
  type: 'tool' | 'malware';
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  x_mitre_platforms?: string[];
  x_mitre_aliases?: string[];
  external_references?: Array<{ external_id?: string; source_name?: string }>;
  created_by_ref?: string;
  x_mitre_first_seen?: string;
  created?: string;
  modified?: string;
}

export interface STIXDataSource {
  type: 'x-mitre-data-source';
  id: string;
  name: string;
  description?: string;
  x_mitre_platforms?: string[];
  external_references?: Array<{ external_id?: string }>;
  created?: string;
  modified?: string;
}

export interface STIXComponent {
  type: 'x-mitre-data-component';
  id: string;
  name: string;
  description?: string;
  x_mitre_data_source_ref?: string;
  created?: string;
  modified?: string;
}

export interface STIXMatrix {
  type: 'x-mitre-matrix';
  id: string;
  name: string;
  description?: string;
  tactic_refs?: string[];
  created?: string;
  modified?: string;
}

export type EnhancedSTIXObject =
  | STIXTool
  | STIXDataSource
  | STIXComponent
  | STIXMatrix;

function extractMITREId(externalRefs: Array<{ external_id?: string }>): string | undefined {
  for (const ref of externalRefs ?? []) {
    if (ref.external_id?.match(/^(TA|T|M|G|S|DS)\d{4}(\.\d{3})?$/)) {
      return ref.external_id;
    }
  }
  return undefined;
}

function getTechniqueId(pattern: {
  id: string;
  name: string;
  external_references?: Array<{ external_id?: string }>;
}): string {
  const ref = pattern.external_references?.find(
    r => r.external_id && r.external_id.match(/^T\d{4}(\.\d{3})?$/)
  );
  return ref?.external_id ?? pattern.name.replace(/\s+/g, '');
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseEnhancedSTIX(
  stixData: STIXBundle,
  options: STIXParserOptions = {}
): EnhancedMITREData {
  const { includeSubTechniques = true, includeDeprecated = false } = options;

  const tactics: MITRETactic[] = [];
  const techniques: MITRETechnique[] = [];
  const groups: MITREGroup[] = [];
  const mitigations: MITREMitigation[] = [];
  const tools: MITRETool[] = [];
  const dataSources: MITREDataSource[] = [];
  const matrices: MITREMatrix[] = [];

  const killChainName = 'mitre-attack';
  const tacticMap = new Map<string, MITRETactic>();
  const componentMap = new Map<string, MITREComponent>();

  for (const obj of stixData.objects) {
    if (!('type' in obj)) continue;

    if (includeDeprecated === false && (obj as { x_mitre_deprecated?: boolean }).x_mitre_deprecated) {
      continue;
    }

    if (obj.type === 'attack-pattern') {
      const pattern = obj as {
        type: 'attack-pattern';
        id: string;
        name: string;
        description?: string;
        kill_chain_phases?: Array<{ kill_chain_name: string; phase_name: string }>;
        x_mitre_platforms?: string[];
        x_mitre_detection?: string;
        x_mitre_is_subtechnique?: boolean;
        x_mitre_parent_technique?: string;
        external_references?: Array<{ external_id?: string }>;
      };

      const tacticRefs = (pattern.kill_chain_phases ?? [])
        .filter(phase => phase.kill_chain_name === killChainName)
        .map(phase => phase.phase_name);

      for (const tacticName of tacticRefs) {
        if (!tacticMap.has(tacticName)) {
          const tacticId = `TA${String(tacticMap.size + 1).padStart(4, '0')}`;
          tacticMap.set(tacticName, {
            id: tacticId,
            name: capitalizeFirst(tacticName),
            shortName: tacticName,
            description: `Tactic: ${capitalizeFirst(tacticName)}`,
          });
        }
      }

      const tacticIds = Array.from(tacticMap.entries())
        .filter(([, t]) => tacticRefs.includes(t.shortName))
        .map(([, t]) => t.id);

      const technique: MITRETechnique = {
        id: getTechniqueId(pattern),
        name: pattern.name,
        tacticIds,
        description: pattern.description ?? '',
        detection: pattern.x_mitre_detection,
        platforms: pattern.x_mitre_platforms,
      };

      const isSubTechnique = pattern.x_mitre_is_subtechnique;
      const parentTechRef = pattern.x_mitre_parent_technique;

      if (isSubTechnique && parentTechRef) {
        const parentId = parentTechRef.replace('attack-pattern--', '').substring(0, 5);
        const parentTech = techniques.find(t => t.id.startsWith(parentId));
        if (parentTech) {
          if (!parentTech.subTechniques) parentTech.subTechniques = [];
          parentTech.subTechniques.push(technique);
        } else {
          techniques.push(technique);
        }
      } else if (!isSubTechnique || includeSubTechniques) {
        techniques.push(technique);
      }
    }

    if (obj.type === 'course-of-action') {
      const coa = obj as {
        type: 'course-of-action';
        id: string;
        name: string;
        description?: string;
        external_references?: Array<{ external_id?: string }>;
      };
      mitigations.push({
        id: extractMITREId(coa.external_references ?? []) ?? coa.id,
        name: coa.name,
        description: coa.description ?? '',
        techniques: [],
      });
    }

    if (obj.type === 'intrusion-set') {
      const intrusion = obj as {
        type: 'intrusion-set';
        id: string;
        name: string;
        description?: string;
        aliases?: string[];
        external_references?: Array<{ external_id?: string }>;
      };
      groups.push({
        id: extractMITREId(intrusion.external_references ?? []) ?? intrusion.id,
        name: intrusion.name,
        aliases: intrusion.aliases ?? [],
        description: intrusion.description ?? '',
        techniques: [],
      });
    }

    if (obj.type === 'tool' || obj.type === 'malware') {
      const tool = obj as STIXTool;
      tools.push({
        id: extractMITREId(tool.external_references ?? []) ?? tool.id,
        name: tool.name,
        description: tool.description ?? '',
        aliases: tool.aliases ?? tool.x_mitre_aliases ?? [],
        techniques: [],
        groups: [],
        type: obj.type as 'tool' | 'malware',
        platforms: tool.x_mitre_platforms,
        createdBy: tool.created_by_ref,
        firstSeen: tool.x_mitre_first_seen,
      });
    }

    if (obj.type === 'x-mitre-data-source') {
      const ds = obj as STIXDataSource;
      dataSources.push({
        id: extractMITREId(ds.external_references ?? []) ?? ds.id,
        name: ds.name,
        description: ds.description ?? '',
        techniques: [],
        components: [],
      });
    }

    if (obj.type === 'x-mitre-data-component') {
      const comp = obj as STIXComponent;
      const component: MITREComponent = {
        id: comp.id,
        name: comp.name,
        description: comp.description ?? '',
        dataSourceId: comp.x_mitre_data_source_ref ?? '',
        techniques: [],
      };
      componentMap.set(comp.id, component);
    }

    if (obj.type === 'x-mitre-matrix') {
      const matrix = obj as STIXMatrix;
      matrices.push({
        id: matrix.id,
        name: matrix.name,
        description: matrix.description ?? '',
        tactics: matrix.tactic_refs ?? [],
      });
    }
  }

  for (const comp of componentMap.values()) {
    const ds = dataSources.find(d => comp.dataSourceId.includes(d.id.replace('DS', '')));
    if (ds) {
      ds.components.push(comp);
    }
  }

  for (const obj of stixData.objects) {
    if (!('type' in obj) || obj.type !== 'relationship') continue;

    const rel = obj as {
      type: 'relationship';
      relationship_type: string;
      source_ref: string;
      target_ref: string;
    };

    if (rel.relationship_type === 'mitigates') {
      const sourceId = rel.source_ref.replace('course-of-action--', '').substring(0, 8);
      const mitigation = mitigations.find(m => m.id.includes(sourceId));
      if (mitigation) {
        const techId = rel.target_ref.replace('attack-pattern--', '');
        if (!mitigation.techniques.includes(techId)) {
          mitigation.techniques.push(techId);
        }
      }
    }

    if (rel.relationship_type === 'uses') {
      const sourceRef = rel.source_ref;
      const targetRef = rel.target_ref;

      if (sourceRef.startsWith('intrusion-set--')) {
        const sourceId = sourceRef.replace('intrusion-set--', '').substring(0, 8);
        const group = groups.find(g => g.id.includes(sourceId));
        if (group && targetRef.startsWith('attack-pattern--')) {
          const techId = targetRef.replace('attack-pattern--', '');
          if (!group.techniques.includes(techId)) {
            group.techniques.push(techId);
          }
        }
      }

      if (sourceRef.startsWith('intrusion-set--') && targetRef.startsWith('tool--')) {
        const groupId = sourceRef.replace('intrusion-set--', '').substring(0, 8);
        const toolId = targetRef.replace('tool--', '').substring(0, 8);
        const tool = tools.find(t => t.id.includes(toolId));
        const group = groups.find(g => g.id.includes(groupId));
        if (tool && group && !tool.groups.includes(group.id)) {
          tool.groups.push(group.id);
        }
      }

      if (sourceRef.startsWith('tool--') || sourceRef.startsWith('malware--')) {
        const sourceId = sourceRef.replace(/^(tool|malware)--/, '').substring(0, 8);
        const tool = tools.find(t => t.id.includes(sourceId));
        if (tool && targetRef.startsWith('attack-pattern--')) {
          const techId = targetRef.replace('attack-pattern--', '');
          if (!tool.techniques.includes(techId)) {
            tool.techniques.push(techId);
          }
        }
      }
    }

    if (rel.relationship_type === 'detects' || rel.relationship_type === 'revoked-by') {
      if (rel.source_ref.startsWith('x-mitre-data-component--')) {
        const compId = rel.source_ref;
        const comp = componentMap.get(compId);
        if (comp && rel.target_ref.startsWith('attack-pattern--')) {
          const techId = rel.target_ref.replace('attack-pattern--', '');
          if (!comp.techniques.includes(techId)) {
            comp.techniques.push(techId);
          }
        }
      }
    }
  }

  tactics.push(...tacticMap.values());

  let domain: 'enterprise' | 'mobile' | 'ics' = 'enterprise';
  for (const matrix of matrices) {
    if (matrix.name.toLowerCase().includes('mobile')) domain = 'mobile';
    else if (matrix.name.toLowerCase().includes('ics')) domain = 'ics';
  }

  return {
    tactics,
    techniques,
    groups,
    mitigations,
    tools,
    dataSources,
    matrices,
    version: '18.1',
    domain,
  };
}

export function createEnhancedMITRELoader() {
  return {
    parseEnhancedSTIX,
  };
}
