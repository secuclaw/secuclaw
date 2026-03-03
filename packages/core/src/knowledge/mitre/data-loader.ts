import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface STIXObject {
  type: string;
  id: string;
  created?: string;
  modified?: string;
  name?: string;
  description?: string;
  x_mitre_platforms?: string[];
  x_mitre_detection?: string;
  x_mitre_is_subtechnique?: boolean;
  x_mitre_deprecated?: boolean;
  x_mitre_revoked?: boolean;
  x_mitre_version?: string;
  x_mitre_contributors?: string[];
  x_mitre_domains?: string[];
  kill_chain_phases?: Array<{
    kill_chain_name: string;
    phase_name: string;
  }>;
  external_references?: Array<{
    source_name: string;
    external_id?: string;
    url?: string;
    description?: string;
  }>;
  object_marking_refs?: string[];
  [key: string]: unknown;
}

export interface STIXRelationship {
  type: 'relationship';
  id: string;
  relationship_type: string;
  source_ref: string;
  target_ref: string;
  description?: string;
}

export interface ParsedMITREData {
  version: string;
  tactics: Map<string, STIXObject>;
  techniques: Map<string, STIXObject>;
  subtechniques: Map<string, STIXObject>;
  mitigations: Map<string, STIXObject>;
  groups: Map<string, STIXObject>;
  software: Map<string, STIXObject>;
  tools: Map<string, STIXObject>;
  malware: Map<string, STIXObject>;
  campaigns: Map<string, STIXObject>;
  dataSources: Map<string, STIXObject>;
  dataComponents: Map<string, STIXObject>;
  relationships: STIXRelationship[];
  matrices: Map<string, STIXObject>;
  stats: {
    totalObjects: number;
    tactics: number;
    techniques: number;
    subtechniques: number;
    mitigations: number;
    groups: number;
    software: number;
    relationships: number;
  };
}

export class MITREDataLoader {
  private data: ParsedMITREData | null = null;
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || join(process.cwd(), 'data', 'mitre-attack');
  }

  async load(): Promise<ParsedMITREData> {
    if (this.data) {
      return this.data;
    }

    const data = this.loadFromDirectory();
    this.data = data;
    return data;
  }

  private loadFromDirectory(): ParsedMITREData {
    const data: ParsedMITREData = {
      version: '',
      tactics: new Map(),
      techniques: new Map(),
      subtechniques: new Map(),
      mitigations: new Map(),
      groups: new Map(),
      software: new Map(),
      tools: new Map(),
      malware: new Map(),
      campaigns: new Map(),
      dataSources: new Map(),
      dataComponents: new Map(),
      relationships: [],
      matrices: new Map(),
      stats: {
        totalObjects: 0,
        tactics: 0,
        techniques: 0,
        subtechniques: 0,
        mitigations: 0,
        groups: 0,
        software: 0,
        relationships: 0,
      },
    };

    if (!existsSync(this.dataPath)) {
      console.warn(`MITRE ATT&CK data path not found: ${this.dataPath}`);
      return data;
    }

    const files = readdirSync(this.dataPath).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = join(this.dataPath, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const stixBundle = JSON.parse(content);
        
        if (stixBundle.type === 'bundle' && Array.isArray(stixBundle.objects)) {
          this.parseSTIXObjects(stixBundle.objects, data);
        }
      } catch (error) {
        console.error(`Failed to load MITRE data from ${file}:`, error);
      }
    }

    data.stats = {
      totalObjects: 
        data.tactics.size + 
        data.techniques.size + 
        data.subtechniques.size +
        data.mitigations.size +
        data.groups.size +
        data.software.size +
        data.relationships.length,
      tactics: data.tactics.size,
      techniques: data.techniques.size,
      subtechniques: data.subtechniques.size,
      mitigations: data.mitigations.size,
      groups: data.groups.size,
      software: data.software.size,
      relationships: data.relationships.length,
    };

    return data;
  }

  private parseSTIXObjects(objects: STIXObject[], data: ParsedMITREData): void {
    for (const obj of objects) {
      if (obj.x_mitre_deprecated || obj.x_mitre_revoked) {
        continue;
      }

      switch (obj.type) {
        case 'x-mitre-tactic':
          data.tactics.set(obj.id, obj);
          break;
        case 'attack-pattern':
          if (obj.x_mitre_is_subtechnique) {
            data.subtechniques.set(obj.id, obj);
          } else {
            data.techniques.set(obj.id, obj);
          }
          break;
        case 'course-of-action':
          data.mitigations.set(obj.id, obj);
          break;
        case 'intrusion-set':
          data.groups.set(obj.id, obj);
          break;
        case 'tool':
          data.tools.set(obj.id, obj);
          data.software.set(obj.id, obj);
          break;
        case 'malware':
          data.malware.set(obj.id, obj);
          data.software.set(obj.id, obj);
          break;
        case 'campaign':
          data.campaigns.set(obj.id, obj);
          break;
        case 'x-mitre-data-source':
          data.dataSources.set(obj.id, obj);
          break;
        case 'x-mitre-data-component':
          data.dataComponents.set(obj.id, obj);
          break;
        case 'x-mitre-matrix':
          data.matrices.set(obj.id, obj);
          break;
        case 'relationship':
          if (obj.relationship_type && obj.source_ref && obj.target_ref) {
            data.relationships.push({
              type: 'relationship',
              id: obj.id,
              relationship_type: obj.relationship_type as string,
              source_ref: obj.source_ref as string,
              target_ref: obj.target_ref as string,
              description: obj.description as string | undefined,
            });
          }
          break;
        case 'marking-definition':
        case 'identity':
          break;
        default:
          break;
      }
    }
  }

  getTechniquesByTactic(tacticId: string): STIXObject[] {
    if (!this.data) return [];
    
    const tacticPhases = this.data.relationships
      .filter(r => 
        r.relationship_type === 'subtechnique-of' === false &&
        r.source_ref.startsWith('attack-pattern--')
      )
      .map(r => r.source_ref);

    return Array.from(this.data.techniques.values())
      .filter(t => {
        const phases = t.kill_chain_phases || [];
        return phases.some(p => p.phase_name === tacticId.split('--')[1]?.replace(/-/g, ''));
      });
  }

  getRelatedObjects(objectId: string, relationshipType: string): STIXObject[] {
    if (!this.data) return [];

    const relatedIds = this.data.relationships
      .filter(r => 
        r.relationship_type === relationshipType &&
        (r.source_ref === objectId || r.target_ref === objectId)
      )
      .map(r => r.source_ref === objectId ? r.target_ref : r.source_ref);

    const result: STIXObject[] = [];
    for (const id of relatedIds) {
      const obj = 
        this.data.techniques.get(id) ||
        this.data.subtechniques.get(id) ||
        this.data.mitigations.get(id) ||
        this.data.groups.get(id) ||
        this.data.software.get(id);
      if (obj) result.push(obj);
    }
    return result;
  }

  search(query: string, limit = 50): STIXObject[] {
    if (!this.data) return [];
    
    const q = query.toLowerCase();
    const results: STIXObject[] = [];
    
    const searchIn = (map: Map<string, STIXObject>) => {
      for (const obj of map.values()) {
        if (results.length >= limit) break;
        const name = (obj.name || '').toLowerCase();
        const desc = (obj.description || '').toLowerCase();
        if (name.includes(q) || desc.includes(q)) {
          results.push(obj);
        }
      }
    };

    searchIn(this.data.techniques);
    searchIn(this.data.tactics);
    searchIn(this.data.groups);
    searchIn(this.data.software);
    searchIn(this.data.mitigations);

    return results;
  }

  getStats(): ParsedMITREData['stats'] {
    return this.data?.stats || {
      totalObjects: 0,
      tactics: 0,
      techniques: 0,
      subtechniques: 0,
      mitigations: 0,
      groups: 0,
      software: 0,
      relationships: 0,
    };
  }
}

export const mitreDataLoader = new MITREDataLoader();
