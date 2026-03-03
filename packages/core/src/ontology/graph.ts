import type { OntologyObject, OntologyLink, ObjectType, LinkType } from "./types.js";
import { isValidLink } from "./schema.js";

export interface STIXLink {
  id: string;
  type: "link";
  link_type: LinkType;
  source_ref: string;
  target_ref: string;
  weight?: number;
  properties?: Record<string, unknown>;
  created: string;
  modified: string;
}

export interface STIXBundle {
  type: string;
  objects: (OntologyObject | STIXLink)[];
}

export interface GraphNode {
  id: string;
  object: OntologyObject;
  type: ObjectType;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  linkType: LinkType;
  weight: number;
  metadata: Record<string, unknown>;
}

export interface GraphQuery {
  nodeTypes?: ObjectType[];
  linkTypes?: LinkType[];
  depth?: number;
  filters?: Record<string, unknown>;
}

export interface PathResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
}

export class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, Map<string, Set<string>>> = new Map();
  private typeIndex: Map<ObjectType, Set<string>> = new Map();
  private linkIndex: Map<LinkType, Set<string>> = new Map();

  addNode(object: OntologyObject): GraphNode {
    const type = object.type as ObjectType;
    const node: GraphNode = {
      id: object.id,
      object,
      type,
      label: object.name,
      metadata: {
        created: object.created,
        modified: object.modified,
        severity: object.severity,
        status: object.status,
        tags: object.tags,
      },
    };

    this.nodes.set(node.id, node);

    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(node.id);

    return node;
  }

  addLink(link: OntologyLink): GraphEdge | null {
    const sourceNode = this.nodes.get(link.source_ref);
    const targetNode = this.nodes.get(link.target_ref);

    if (!sourceNode || !targetNode) {
      return null;
    }

    if (!isValidLink(sourceNode.type, targetNode.type, link.link_type)) {
      return null;
    }

    const edge: GraphEdge = {
      id: link.id,
      source: link.source_ref,
      target: link.target_ref,
      linkType: link.link_type,
      weight: link.weight ?? 1.0,
      metadata: link.properties ?? {},
    };

    this.edges.set(edge.id, edge);

    if (!this.adjacencyList.has(edge.source)) {
      this.adjacencyList.set(edge.source, new Map());
    }
    if (!this.adjacencyList.get(edge.source)!.has(edge.target)) {
      this.adjacencyList.get(edge.source)!.set(edge.target, new Set());
    }
    this.adjacencyList.get(edge.source)!.get(edge.target)!.add(edge.id);

    if (!this.linkIndex.has(edge.linkType)) {
      this.linkIndex.set(edge.linkType, new Set());
    }
    this.linkIndex.get(edge.linkType)!.add(edge.id);

    return edge;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  getNodesByType(type: ObjectType): GraphNode[] {
    const nodeIds = this.typeIndex.get(type);
    if (!nodeIds) return [];
    return Array.from(nodeIds).map((id) => this.nodes.get(id)!).filter(Boolean);
  }

  getEdgesByType(linkType: LinkType): GraphEdge[] {
    const edgeIds = this.linkIndex.get(linkType);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map((id) => this.edges.get(id)!).filter(Boolean);
  }

  getOutgoingEdges(nodeId: string): GraphEdge[] {
    const outgoing = this.adjacencyList.get(nodeId);
    if (!outgoing) return [];

    const edges: GraphEdge[] = [];
    for (const edgeIds of outgoing.values()) {
      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (edge) edges.push(edge);
      }
    }
    return edges;
  }

  getIncomingEdges(nodeId: string): GraphEdge[] {
    const edges: GraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.target === nodeId) {
        edges.push(edge);
      }
    }
    return edges;
  }

  findNeighbors(nodeId: string, linkTypes?: LinkType[], depth: number = 1): Map<string, GraphNode> {
    const neighbors = new Map<string, GraphNode>();
    const visited = new Set<string>();
    const queue: Array<{ id: string; currentDepth: number }> = [{ id: nodeId, currentDepth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.currentDepth > depth) continue;
      visited.add(current.id);

      if (current.id !== nodeId) {
        const node = this.nodes.get(current.id);
        if (node) neighbors.set(current.id, node);
      }

      if (current.currentDepth < depth) {
        const outgoing = this.adjacencyList.get(current.id);
        if (outgoing) {
          for (const [targetId, edgeIds] of outgoing) {
            for (const edgeId of edgeIds) {
              const edge = this.edges.get(edgeId);
              if (!edge) continue;
              if (linkTypes && !linkTypes.includes(edge.linkType)) continue;
              if (!visited.has(targetId)) {
                queue.push({ id: targetId, currentDepth: current.currentDepth + 1 });
              }
            }
          }
        }
      }
    }

    return neighbors;
  }

  findPaths(sourceId: string, targetId: string, maxDepth: number = 5): PathResult[] {
    const paths: PathResult[] = [];
    const visited = new Set<string>();

    const dfs = (current: string, target: string, depth: number, pathNodes: GraphNode[], pathEdges: GraphEdge[], totalWeight: number): void => {
      if (depth > maxDepth || visited.has(current)) return;

      if (current === target) {
        paths.push({
          nodes: [...pathNodes],
          edges: [...pathEdges],
          totalWeight,
        });
        return;
      }

      visited.add(current);

      const outgoing = this.adjacencyList.get(current);
      if (outgoing) {
        for (const [nextId, edgeIds] of outgoing) {
          for (const edgeId of edgeIds) {
            const edge = this.edges.get(edgeId);
            if (!edge) continue;

            const nextNode = this.nodes.get(nextId);
            if (!nextNode) continue;

            pathNodes.push(nextNode);
            pathEdges.push(edge);
            dfs(nextId, target, depth + 1, pathNodes, pathEdges, totalWeight + edge.weight);
            pathNodes.pop();
            pathEdges.pop();
          }
        }
      }

      visited.delete(current);
    };

    const sourceNode = this.nodes.get(sourceId);
    if (sourceNode) {
      dfs(sourceId, targetId, 0, [sourceNode], [], 0);
    }

    return paths;
  }

  query(query: GraphQuery): GraphNode[] {
    let resultIds = new Set<string>();

    if (query.nodeTypes && query.nodeTypes.length > 0) {
      for (const type of query.nodeTypes) {
        const typeNodes = this.typeIndex.get(type);
        if (typeNodes) {
          for (const id of typeNodes) {
            resultIds.add(id);
          }
        }
      }
    } else {
      resultIds = new Set(this.nodes.keys());
    }

    if (query.filters) {
      const filteredIds = new Set<string>();
      for (const id of resultIds) {
        const node = this.nodes.get(id);
        if (!node) continue;

        let matches = true;
        for (const [key, value] of Object.entries(query.filters)) {
          const nodeValue = node.metadata[key] ?? node.object[key as keyof typeof node.object];
          if (nodeValue !== value) {
            matches = false;
            break;
          }
        }
        if (matches) {
          filteredIds.add(id);
        }
      }
      resultIds = filteredIds;
    }

    return Array.from(resultIds).map((id) => this.nodes.get(id)!).filter(Boolean);
  }

  getStats(): { nodeCount: number; edgeCount: number; typeDistribution: Record<ObjectType, number> } {
    const typeDistribution: Record<string, number> = {};

    for (const node of this.nodes.values()) {
      typeDistribution[node.type] = (typeDistribution[node.type] ?? 0) + 1;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      typeDistribution: typeDistribution as Record<ObjectType, number>,
    };
  }

  toSTIXBundle(): STIXBundle {
    const objects: (OntologyObject | STIXLink)[] = [];
    for (const node of this.nodes.values()) {
      objects.push(node.object);
    }
    for (const edge of this.edges.values()) {
      objects.push({
        id: edge.id,
        type: "link",
        link_type: edge.linkType,
        source_ref: edge.source,
        target_ref: edge.target,
        weight: edge.weight,
        properties: edge.metadata,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      });
    }
    return { type: "bundle", objects };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.typeIndex.clear();
    this.linkIndex.clear();
  }

  export(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  import(data: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    this.clear();
    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
      if (!this.typeIndex.has(node.type)) {
        this.typeIndex.set(node.type, new Set());
      }
      this.typeIndex.get(node.type)!.add(node.id);
    }
    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);
      if (!this.adjacencyList.has(edge.source)) {
        this.adjacencyList.set(edge.source, new Map());
      }
      if (!this.adjacencyList.get(edge.source)!.has(edge.target)) {
        this.adjacencyList.get(edge.source)!.set(edge.target, new Set());
      }
      this.adjacencyList.get(edge.source)!.get(edge.target)!.add(edge.id);

      if (!this.linkIndex.has(edge.linkType)) {
        this.linkIndex.set(edge.linkType, new Set());
      }
      this.linkIndex.get(edge.linkType)!.add(edge.id);
    }
  }
}
