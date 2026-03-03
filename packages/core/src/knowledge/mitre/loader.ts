import * as fs from "node:fs";
import * as path from "node:path";
import type {
  MITREData,
  MITRETactic,
  MITRETechnique,
  MITREGroup,
  MITREMitigation,
  STIXBundle,
  STIXRelationship,
  STIXParserOptions,
} from "./types.js";

function extractMITREId(externalRefs: { external_id?: string }[]): string | undefined {
  for (const ref of externalRefs ?? []) {
    if (ref.external_id?.match(/^TA\d{4}$|^T\d{4}(\.\d{3})?$/)) {
      return ref.external_id;
    }
  }
  return undefined;
}

function getTechniqueId(pattern: { id: string; name: string; external_references?: { external_id?: string }[] }): string {
  const ref = pattern.external_references?.find(
    (r) => r.external_id && r.external_id.match(/^T\d{4}(\.\d{3})?$/)
  );
  if (ref?.external_id) {
    return ref.external_id;
  }
  return pattern.name.replace(/\s+/g, "");
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseSTIX(
  stixData: STIXBundle,
  options: STIXParserOptions = {}
): MITREData {
  const { includeSubTechniques = true } = options;

  const tactics: MITRETactic[] = [];
  const techniques: MITRETechnique[] = [];
  const groups: MITREGroup[] = [];
  const mitigations: MITREMitigation[] = [];

  const killChainName = "mitre-attack";
  const tacticMap = new Map<string, MITRETactic>();

  for (const obj of stixData.objects) {
    if (!("type" in obj)) continue;

    if (obj.type === "attack-pattern") {
      const pattern = obj;

      const killChainPhases = pattern.kill_chain_phases ?? [];
      const tacticRefs = killChainPhases
        .filter((phase: { kill_chain_name: string; phase_name: string }) => phase.kill_chain_name === killChainName)
        .map((phase: { kill_chain_name: string; phase_name: string }) => phase.phase_name);

      for (const tacticName of tacticRefs) {
        if (!tacticMap.has(tacticName)) {
          const tacticId = `TA${String(tacticMap.size + 1).padStart(4, "0")}`;
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
        description: pattern.description ?? "",
        detection: pattern.x_mitre_detection,
        platforms: pattern.x_mitre_platforms,
      };

      if (pattern.x_mitre_is_subtechnique && pattern.x_mitre_parent_technique) {
        const parentId = pattern.x_mitre_parent_technique.replace(
          "attack-pattern--",
          ""
        );
        const parentTech = techniques.find((t) =>
          t.id.startsWith(parentId.substring(0, 5))
        );
        if (parentTech) {
          if (!parentTech.subTechniques) {
            parentTech.subTechniques = [];
          }
          parentTech.subTechniques.push(technique);
        } else {
          techniques.push(technique);
        }
      } else if (!pattern.x_mitre_is_subtechnique || includeSubTechniques) {
        techniques.push(technique);
      }
    }

    if (obj.type === "course-of-action") {
      const mitigation = obj;
      mitigations.push({
        id: extractMITREId(mitigation.external_references ?? []) ?? mitigation.id,
        name: mitigation.name,
        description: mitigation.description ?? "",
        techniques: [],
      });
    }

    if (obj.type === "intrusion-set") {
      const group = obj;
      groups.push({
        id: extractMITREId(group.external_references ?? []) ?? group.id,
        name: group.name,
        aliases: group.aliases ?? [],
        description: group.description ?? "",
        techniques: [],
      });
    }
  }

  const relationships = stixData.objects.filter(
    (obj): obj is STIXRelationship =>
      "type" in obj && obj.type === "relationship"
  );

  for (const rel of relationships) {
    if (rel.relationship_type === "mitigates") {
      const sourceId = rel.source_ref.replace("course-of-action--", "").substring(0, 8);
      const mitigation = mitigations.find((m) => m.id.includes(sourceId));
      if (mitigation) {
        const techId = rel.target_ref.replace("attack-pattern--", "");
        if (!mitigation.techniques.includes(techId)) {
          mitigation.techniques.push(techId);
        }
      }
    }

    if (rel.relationship_type === "uses") {
      const sourceId = rel.source_ref.replace("intrusion-set--", "").substring(0, 8);
      const group = groups.find((g) => g.id.includes(sourceId));
      if (group) {
        const techId = rel.target_ref.replace("attack-pattern--", "");
        if (!group.techniques.includes(techId)) {
          group.techniques.push(techId);
        }
      }
    }
  }

  tactics.push(...tacticMap.values());

  return { tactics, techniques, groups, mitigations };
}

export function extractTechniques(
  stixData: STIXBundle,
  options: STIXParserOptions = {}
): MITRETechnique[] {
  const parsed = parseSTIX(stixData, options);
  return parsed.techniques;
}

export class MITRELoader {
  private data: MITREData | null = null;
  private dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  async load(): Promise<MITREData> {
    if (this.data) return this.data;

    const enterprisePath = path.join(this.dataPath, "enterprise-attack", "enterprise-attack.json");
    const mobilePath = path.join(this.dataPath, "mobile-attack", "mobile-attack.json");
    const icsPath = path.join(this.dataPath, "ics-attack", "ics-attack.json");
    const cachedPath = path.join(this.dataPath, "mitre-parsed.json");

    if (fs.existsSync(cachedPath)) {
      try {
        const content = fs.readFileSync(cachedPath, "utf-8");
        this.data = JSON.parse(content);
        return this.data!;
      } catch {}
    }

    const domains = [
      { name: "enterprise", path: enterprisePath },
      { name: "mobile", path: mobilePath },
      { name: "ics", path: icsPath },
    ];

    const allTactics: MITRETactic[] = [];
    const allTechniques: MITRETechnique[] = [];
    const allGroups: MITREGroup[] = [];
    const allMitigations: MITREMitigation[] = [];

    for (const domain of domains) {
      if (fs.existsSync(domain.path)) {
        try {
          const content = fs.readFileSync(domain.path, "utf-8");
          const stixData = JSON.parse(content) as STIXBundle;
          const parsed = parseSTIX(stixData);
          
          allTactics.push(...parsed.tactics);
          allTechniques.push(...parsed.techniques);
          allGroups.push(...parsed.groups);
          allMitigations.push(...parsed.mitigations);
          
          console.log(`MITRE ${domain.name}: ${parsed.tactics.length} tactics, ${parsed.techniques.length} techniques`);
        } catch (error) {
          console.error(`Failed to load MITRE ${domain.name}:`, error);
        }
      }
    }

    this.data = {
      tactics: allTactics,
      techniques: allTechniques,
      groups: allGroups,
      mitigations: allMitigations,
    };

    try {
      fs.writeFileSync(cachedPath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {}

    console.log(`MITRE ATT&CK total: ${this.data.tactics.length} tactics, ${this.data.techniques.length} techniques, ${this.data.groups.length} groups`);
    return this.data;
  }

  async loadFromSTIX(
    stixData: STIXBundle,
    options: STIXParserOptions = {}
  ): Promise<MITREData> {
    this.data = parseSTIX(stixData, options);
    return this.data;
  }

  getTactic(id: string): MITRETactic | undefined {
    return this.data?.tactics.find((t) => t.id === id);
  }

  getTechnique(id: string): MITRETechnique | undefined {
    return this.data?.techniques.find((t) => t.id === id);
  }

  getGroup(id: string): MITREGroup | undefined {
    return this.data?.groups.find((g) => g.id === id);
  }

  getTechniquesByTactic(tacticId: string): MITRETechnique[] {
    return this.data?.techniques.filter((t) => t.tacticIds.includes(tacticId)) ?? [];
  }

  getMitigation(id: string): MITREMitigation | undefined {
    return this.data?.mitigations.find((m) => m.id === id);
  }

  getGroupsByTechnique(techniqueId: string): MITREGroup[] {
    return this.data?.groups.filter((g) => g.techniques.includes(techniqueId)) ?? [];
  }

  searchTechniques(query: string): MITRETechnique[] {
    const results: MITRETechnique[] = [];
    const lowerQuery = query.toLowerCase();

    for (const tech of this.data?.techniques ?? []) {
      if (
        tech.name.toLowerCase().includes(lowerQuery) ||
        tech.description.toLowerCase().includes(lowerQuery) ||
        tech.id.toLowerCase().includes(lowerQuery)
      ) {
        results.push(tech);
      }
    }

    return results;
  }

  getStats(): { tactics: number; techniques: number; groups: number; mitigations: number } {
    return {
      tactics: this.data?.tactics.length ?? 0,
      techniques: this.data?.techniques.length ?? 0,
      groups: this.data?.groups.length ?? 0,
      mitigations: this.data?.mitigations.length ?? 0,
    };
  }

  getAllTechniques(): MITRETechnique[] {
    return this.data?.techniques ?? [];
  }

  getAllTactics(): MITRETactic[] {
    return this.data?.tactics ?? [];
  }
  
  getData(): MITREData {
    return this.data ?? { tactics: [], techniques: [], groups: [], mitigations: [] };
  }
}
