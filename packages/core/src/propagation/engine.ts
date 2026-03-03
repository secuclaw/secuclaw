import type {
  RiskNode,
  RiskEdge,
  RiskGraph,
  GraphStatistics,
  RiskScore,
  RiskNodeType,
  RiskRelationshipType,
  PropagationConfig,
  PropagationResult,
  PropagatedScore,
  RiskHotspot,
  PropagationPath,
  ImpactAnalysis,
  AffectedNode,
  ImpactRecommendation,
  RiskSimulation,
  SimulationScenario,
  SimulationResult,
  GraphModification,
  RiskPropagationDashboard,
  PropagationQuery,
  PropagationEventHandler,
} from './types.js';

export class RiskPropagationEngine {
  private graphs: Map<string, RiskGraph> = new Map();
  private results: Map<string, PropagationResult> = new Map();
  private simulations: Map<string, RiskSimulation> = new Map();
  private eventHandlers: PropagationEventHandler[] = [];

  private defaultConfig: PropagationConfig = {
    algorithm: 'pagerank',
    maxIterations: 100,
    convergenceThreshold: 0.001,
    dampingFactor: 0.85,
    nodeTypeWeights: {
      asset: 1.0,
      vulnerability: 1.2,
      threat: 1.5,
      control: 0.5,
      process: 0.8,
      data: 1.3,
      user: 0.9,
      network: 1.0,
      application: 1.0,
      infrastructure: 1.1,
    },
    relationshipWeights: {
      depends_on: 0.8,
      hosts: 0.9,
      connects_to: 0.7,
      accesses: 0.85,
      contains: 0.6,
      protects: 0.4,
      mitigates: 0.3,
      exploits: 1.2,
      affects: 1.0,
      triggers: 1.1,
    },
    includeControls: true,
    includeMitigations: true,
  };

  createGraph(options: {
    name?: string;
    nodes?: Array<Omit<RiskNode, 'id'>>;
    edges?: Array<{ sourceId: string; targetId: string; relationship: RiskRelationshipType; propagationFactor?: number }>;
  }): RiskGraph {
    const graphId = this.generateId('graph');
    const nodes: RiskNode[] = [];
    const nodeMap = new Map<string, string>();

    if (options.nodes) {
      for (const nodeData of options.nodes) {
        const nodeId = this.generateId('node');
        nodeMap.set(nodeData.name, nodeId);
        nodes.push({
          id: nodeId,
          ...nodeData,
          metadata: nodeData.metadata || {},
        });
      }
    }

    const edges: RiskEdge[] = [];
    if (options.edges) {
      for (const edgeData of options.edges) {
        const sourceId = nodeMap.get(edgeData.sourceId) || edgeData.sourceId;
        const targetId = nodeMap.get(edgeData.targetId) || edgeData.targetId;
        
        if (nodes.find(n => n.id === sourceId) && nodes.find(n => n.id === targetId)) {
          edges.push({
            id: this.generateId('edge'),
            sourceId,
            targetId,
            relationship: edgeData.relationship,
            propagationFactor: edgeData.propagationFactor || this.defaultConfig.relationshipWeights[edgeData.relationship] || 0.5,
            bidirectional: false,
            attributes: {},
            metadata: {},
          });
        }
      }
    }

    const graph: RiskGraph = {
      nodes,
      edges,
      statistics: this.calculateStatistics(nodes, edges),
    };

    this.graphs.set(graphId, graph);
    this.emit('graph_created', { graphId, graph });
    return graph;
  }

  addNode(graphId: string, node: Omit<RiskNode, 'id'>): RiskNode {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const newNode: RiskNode = {
      id: this.generateId('node'),
      ...node,
      metadata: node.metadata || {},
    };

    graph.nodes.push(newNode);
    graph.statistics = this.calculateStatistics(graph.nodes, graph.edges);

    this.emit('node_added', { graphId, node: newNode });
    return newNode;
  }

  addEdge(graphId: string, edge: { sourceId: string; targetId: string; relationship: RiskRelationshipType; propagationFactor?: number }): RiskEdge {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const newEdge: RiskEdge = {
      id: this.generateId('edge'),
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relationship: edge.relationship,
      propagationFactor: edge.propagationFactor || this.defaultConfig.relationshipWeights[edge.relationship] || 0.5,
      bidirectional: false,
      attributes: {},
      metadata: {},
    };

    graph.edges.push(newEdge);
    graph.statistics = this.calculateStatistics(graph.nodes, graph.edges);

    this.emit('edge_added', { graphId, edge: newEdge });
    return newEdge;
  }

  propagate(graphId: string, config?: Partial<PropagationConfig>): PropagationResult {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const effectiveConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    const nodeScores = new Map<string, PropagatedScore>();
    for (const node of graph.nodes) {
      const initialScore = node.intrinsicRisk.overall;
      nodeScores.set(node.id, {
        nodeId: node.id,
        previousScore: initialScore,
        newScore: initialScore,
        scoreChange: 0,
        influence: 0,
        influencedBy: [],
      });
    }

    let converged = false;
    let iterations = 0;

    for (let i = 0; i < effectiveConfig.maxIterations; i++) {
      iterations++;
      let maxChange = 0;

      const adjacencyMap = this.buildAdjacencyMap(graph);

      for (const node of graph.nodes) {
        const currentScore = nodeScores.get(node.id)!;
        const neighbors = adjacencyMap.get(node.id) || [];
        
        let incomingRisk = 0;
        const influencers: string[] = [];

        for (const neighbor of neighbors) {
          const neighborScore = nodeScores.get(neighbor.nodeId);
          if (neighborScore) {
            const typeWeight = effectiveConfig.nodeTypeWeights[neighbor.nodeType] || 1;
            const propagatedRisk = neighborScore.newScore * neighbor.factor * typeWeight;
            incomingRisk += propagatedRisk;
            influencers.push(neighbor.nodeId);
          }
        }

        const nodeTypeWeight = effectiveConfig.nodeTypeWeights[node.type] || 1;
        const dampedIntrinsic = (1 - effectiveConfig.dampingFactor) * node.intrinsicRisk.overall;
        const dampedPropagation = effectiveConfig.dampingFactor * incomingRisk;
        const newScore = Math.min(1, Math.max(0, (dampedIntrinsic + dampedPropagation) * nodeTypeWeight));

        const change = Math.abs(newScore - currentScore.newScore);
        maxChange = Math.max(maxChange, change);

        currentScore.previousScore = currentScore.newScore;
        currentScore.newScore = newScore;
        currentScore.scoreChange = change;
        currentScore.influence = incomingRisk;
        currentScore.influencedBy = influencers;
      }

      if (maxChange < effectiveConfig.convergenceThreshold) {
        converged = true;
        break;
      }
    }

    for (const node of graph.nodes) {
      const score = nodeScores.get(node.id);
      if (score) {
        node.propagatedRisk = {
          confidentiality: score.newScore * node.intrinsicRisk.confidence,
          integrity: score.newScore * node.intrinsicRisk.confidence,
          availability: score.newScore * node.intrinsicRisk.confidence,
          overall: score.newScore,
          confidence: node.intrinsicRisk.confidence,
        };
      }
    }

    const hotspots = this.identifyHotspots(graph, nodeScores);

    const result: PropagationResult = {
      graphId,
      algorithm: effectiveConfig.algorithm,
      iterations,
      converged,
      nodeScores,
      riskHotspots: hotspots,
      executionTime: Date.now() - startTime,
      computedAt: new Date(),
    };

    this.results.set(this.generateId('result'), result);
    this.emit('propagation_completed', result);
    return result;
  }

  private buildAdjacencyMap(graph: RiskGraph): Map<string, Array<{ nodeId: string; nodeType: RiskNodeType; factor: number }>> {
    const map = new Map<string, Array<{ nodeId: string; nodeType: RiskNodeType; factor: number }>>();

    for (const edge of graph.edges) {
      const sourceNode = graph.nodes.find(n => n.id === edge.sourceId);
      const targetNode = graph.nodes.find(n => n.id === edge.targetId);

      if (sourceNode && targetNode) {
        if (!map.has(targetNode.id)) {
          map.set(targetNode.id, []);
        }
        map.get(targetNode.id)!.push({
          nodeId: sourceNode.id,
          nodeType: sourceNode.type,
          factor: edge.propagationFactor,
        });

        if (edge.bidirectional) {
          if (!map.has(sourceNode.id)) {
            map.set(sourceNode.id, []);
          }
          map.get(sourceNode.id)!.push({
            nodeId: targetNode.id,
            nodeType: targetNode.type,
            factor: edge.propagationFactor,
          });
        }
      }
    }

    return map;
  }

  private identifyHotspots(graph: RiskGraph, scores: Map<string, PropagatedScore>): RiskHotspot[] {
    const sortedNodes = Array.from(scores.entries())
      .sort((a, b) => b[1].newScore - a[1].newScore);

    const hotspots: RiskHotspot[] = [];
    const threshold = 0.7;

    for (let i = 0; i < Math.min(10, sortedNodes.length); i++) {
      const [nodeId, score] = sortedNodes[i];
      if (score.newScore >= threshold) {
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node) {
          const reasons: string[] = [];
          if (node.intrinsicRisk.overall > 0.7) reasons.push('High intrinsic risk');
          if (score.influence > 0.5) reasons.push('High incoming risk propagation');
          if (score.influencedBy.length > 3) reasons.push('Multiple risk sources');

          hotspots.push({
            nodeId,
            nodeName: node.name,
            nodeType: node.type,
            score: score.newScore,
            rank: i + 1,
            reasons,
          });
        }
      }
    }

    return hotspots;
  }

  analyzeImpact(graphId: string, sourceNodeId: string, options?: { maxDepth?: number }): ImpactAnalysis {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const sourceNode = graph.nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) {
      throw new Error(`Node not found: ${sourceNodeId}`);
    }

    const maxDepth = options?.maxDepth || 5;
    const directlyAffected: AffectedNode[] = [];
    const indirectlyAffected: AffectedNode[] = [];
    const visited = new Set<string>([sourceNodeId]);

    const adjacencyMap = this.buildAdjacencyMap(graph);

    const queue: Array<{ nodeId: string; distance: number; path: string[] }> = [
      { nodeId: sourceNodeId, distance: 0, path: [sourceNodeId] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      const outgoing = graph.edges.filter(e => e.sourceId === current.nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          const targetNode = graph.nodes.find(n => n.id === edge.targetId);
          if (targetNode) {
            const newPath = [...current.path, edge.targetId];
            const affectedNode: AffectedNode = {
              nodeId: edge.targetId,
              nodeName: targetNode.name,
              nodeType: targetNode.type,
              distance: current.distance + 1,
              impactScore: this.calculateImpactScore(sourceNode, targetNode, edge, current.distance),
              propagationPath: newPath,
            };

            if (current.distance === 0) {
              directlyAffected.push(affectedNode);
            } else if (current.distance < maxDepth) {
              indirectlyAffected.push(affectedNode);
            }

            if (current.distance < maxDepth) {
              queue.push({
                nodeId: edge.targetId,
                distance: current.distance + 1,
                path: newPath,
              });
            }
          }
        }
      }
    }

    const affectedAssets = graph.nodes
      .filter(n => visited.has(n.id) && n.type === 'asset')
      .map(n => n.name);
    const affectedData = graph.nodes
      .filter(n => visited.has(n.id) && n.type === 'data')
      .map(n => n.name);
    const affectedProcesses = graph.nodes
      .filter(n => visited.has(n.id) && n.type === 'process')
      .map(n => n.name);

    const totalImpact = directlyAffected.reduce((sum, n) => sum + n.impactScore, 0) +
                        indirectlyAffected.reduce((sum, n) => sum + n.impactScore, 0);
    
    const riskIncrease = totalImpact / (directlyAffected.length + indirectlyAffected.length + 1);

    const recommendations = this.generateRecommendations(sourceNode, directlyAffected, indirectlyAffected);

    return {
      sourceNodeId,
      impactRadius: Math.max(...directlyAffected.map(n => n.distance), ...indirectlyAffected.map(n => n.distance), 0),
      directlyAffected,
      indirectlyAffected,
      totalImpact,
      riskIncrease,
      affectedAssets,
      affectedProcesses,
      affectedData,
      recommendations,
    };
  }

  private calculateImpactScore(source: RiskNode, target: RiskNode, edge: RiskEdge, distance: number): number {
    const distanceFactor = Math.pow(0.5, distance);
    const edgeFactor = edge.propagationFactor;
    const sourceRisk = source.intrinsicRisk.overall;
    const targetVulnerability = 1 - (target.intrinsicRisk.confidence);
    
    return sourceRisk * edgeFactor * distanceFactor * (0.5 + 0.5 * targetVulnerability);
  }

  private generateRecommendations(
    source: RiskNode,
    directlyAffected: AffectedNode[],
    indirectlyAffected: AffectedNode[]
  ): ImpactRecommendation[] {
    const recommendations: ImpactRecommendation[] = [];

    if (directlyAffected.length > 5) {
      recommendations.push({
        priority: 'critical',
        type: 'containment',
        description: `Isolate source node '${source.name}' to prevent widespread risk propagation`,
        targetNodes: [source.id],
        estimatedReduction: 0.4,
      });
    }

    const highRiskTargets = [...directlyAffected, ...indirectlyAffected]
      .filter(n => n.impactScore > 0.7)
      .map(n => n.nodeId);

    if (highRiskTargets.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'mitigation',
        description: 'Implement additional controls on high-impact nodes',
        targetNodes: highRiskTargets.slice(0, 5),
        estimatedReduction: 0.3,
      });
    }

    if (indirectlyAffected.length > 10) {
      recommendations.push({
        priority: 'medium',
        type: 'monitoring',
        description: 'Enhance monitoring for indirectly affected nodes',
        targetNodes: indirectlyAffected.slice(0, 10).map(n => n.nodeId),
        estimatedReduction: 0.1,
      });
    }

    return recommendations;
  }

  findPropagationPath(graphId: string, sourceNodeId: string, targetNodeId: string): PropagationPath | null {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[]; edges: string[] }> = [
      { nodeId: sourceNodeId, path: [sourceNodeId], edges: [] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.nodeId === targetNodeId) {
        const totalRisk = current.path.reduce((sum, nodeId) => {
          const node = graph.nodes.find(n => n.id === nodeId);
          return sum + (node?.intrinsicRisk.overall || 0);
        }, 0) / current.path.length;

        return {
          id: this.generateId('path'),
          sourceNodeId,
          targetNodeId,
          nodes: current.path,
          edges: current.edges,
          totalRisk,
          propagationDelay: current.path.length,
          probability: Math.pow(0.9, current.path.length - 1),
          criticalNodes: this.identifyCriticalNodes(graph, current.path),
          criticalEdges: current.edges,
        };
      }

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      const outgoing = graph.edges.filter(e => e.sourceId === current.nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.targetId)) {
          queue.push({
            nodeId: edge.targetId,
            path: [...current.path, edge.targetId],
            edges: [...current.edges, edge.id],
          });
        }
      }
    }

    return null;
  }

  private identifyCriticalNodes(graph: RiskGraph, path: string[]): string[] {
    return path.filter(nodeId => {
      const node = graph.nodes.find(n => n.id === nodeId);
      return node && node.intrinsicRisk.overall > 0.7;
    });
  }

  runSimulation(graphId: string, options: {
    name: string;
    description?: string;
    scenarios: Array<{
      name: string;
      modifications: GraphModification[];
    }>;
  }): RiskSimulation {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const simulation: RiskSimulation = {
      id: this.generateId('sim'),
      name: options.name,
      description: options.description || '',
      baseGraphId: graphId,
      scenarios: options.scenarios.map(s => ({
        id: this.generateId('scenario'),
        name: s.name,
        type: 'custom',
        modifications: s.modifications,
        parameters: {},
      })),
      status: 'pending',
      createdAt: new Date(),
      createdBy: 'system',
    };

    this.simulations.set(simulation.id, simulation);
    this.executeSimulation(simulation, graph);

    return simulation;
  }

  private executeSimulation(simulation: RiskSimulation, baseGraph: RiskGraph): void {
    simulation.status = 'running';
    const results: SimulationResult[] = [];

    for (const scenario of simulation.scenarios) {
      const modifiedGraph = this.applyModifications(baseGraph, scenario.modifications);
      
      const beforeStats = baseGraph.statistics;
      const beforeResult = this.propagate(simulation.baseGraphId);
      const afterResult = this.propagate(simulation.baseGraphId);

      const beforeAvgScore = Array.from(beforeResult.nodeScores.values())
        .reduce((sum, s) => sum + s.newScore, 0) / beforeResult.nodeScores.size;
      const afterAvgScore = Array.from(afterResult.nodeScores.values())
        .reduce((sum, s) => sum + s.newScore, 0) / afterResult.nodeScores.size;

      results.push({
        scenarioId: scenario.id,
        beforeState: beforeStats,
        afterState: modifiedGraph.statistics,
        riskChange: afterAvgScore - beforeAvgScore,
        hotspotChanges: this.compareHotspots(beforeResult.riskHotspots, afterResult.riskHotspots),
        newRisks: this.identifyNewRisks(beforeResult, afterResult),
        mitigatedRisks: this.identifyMitigatedRisks(beforeResult, afterResult),
        recommendations: this.generateSimulationRecommendations(afterResult),
        computedAt: new Date(),
      });
    }

    simulation.results = results;
    simulation.status = 'completed';
    this.emit('simulation_completed', simulation);
  }

  private applyModifications(graph: RiskGraph, modifications: GraphModification[]): RiskGraph {
    const newNodes = [...graph.nodes];
    const newEdges = [...graph.edges];

    for (const mod of modifications) {
      switch (mod.type) {
        case 'add_node':
          newNodes.push({
            id: this.generateId('node'),
            type: mod.changes.type as RiskNodeType,
            name: mod.changes.name as string,
            intrinsicRisk: mod.changes.intrinsicRisk as RiskScore,
            attributes: {},
            tags: [],
            metadata: {},
          });
          break;
        case 'remove_node':
          const removeIndex = newNodes.findIndex(n => n.id === mod.target);
          if (removeIndex > -1) newNodes.splice(removeIndex, 1);
          break;
        case 'modify_node':
          const node = newNodes.find(n => n.id === mod.target);
          if (node) Object.assign(node, mod.changes);
          break;
      }
    }

    return {
      nodes: newNodes,
      edges: newEdges.filter(e => 
        newNodes.find(n => n.id === e.sourceId) && 
        newNodes.find(n => n.id === e.targetId)
      ),
      statistics: this.calculateStatistics(newNodes, newEdges),
    };
  }

  private compareHotspots(before: RiskHotspot[], after: RiskHotspot[]): Array<{ nodeId: string; beforeRank: number; afterRank: number }> {
    const changes: Array<{ nodeId: string; beforeRank: number; afterRank: number }> = [];
    
    for (const afterHotspot of after) {
      const beforeHotspot = before.find(h => h.nodeId === afterHotspot.nodeId);
      changes.push({
        nodeId: afterHotspot.nodeId,
        beforeRank: beforeHotspot?.rank || -1,
        afterRank: afterHotspot.rank,
      });
    }
    
    return changes;
  }

  private identifyNewRisks(before: PropagationResult, after: PropagationResult): string[] {
    const newRisks: string[] = [];
    for (const [nodeId, afterScore] of after.nodeScores) {
      const beforeScore = before.nodeScores.get(nodeId);
      if (beforeScore && afterScore.newScore > 0.7 && beforeScore.newScore <= 0.7) {
        newRisks.push(nodeId);
      }
    }
    return newRisks;
  }

  private identifyMitigatedRisks(before: PropagationResult, after: PropagationResult): string[] {
    const mitigated: string[] = [];
    for (const [nodeId, afterScore] of after.nodeScores) {
      const beforeScore = before.nodeScores.get(nodeId);
      if (beforeScore && beforeScore.newScore > 0.7 && afterScore.newScore <= 0.7) {
        mitigated.push(nodeId);
      }
    }
    return mitigated;
  }

  private generateSimulationRecommendations(result: PropagationResult): string[] {
    const recommendations: string[] = [];
    
    if (result.riskHotspots.length > 5) {
      recommendations.push('Consider implementing additional controls to reduce risk concentration');
    }
    
    const highRiskCount = Array.from(result.nodeScores.values())
      .filter(s => s.newScore > 0.8).length;
    if (highRiskCount > 10) {
      recommendations.push('Multiple high-risk nodes detected - prioritize mitigation efforts');
    }
    
    return recommendations;
  }

  query(graphId: string, query: PropagationQuery): RiskNode[] {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    let nodes = graph.nodes;

    if (query.nodeTypes?.length) {
      nodes = nodes.filter(n => query.nodeTypes!.includes(n.type));
    }

    if (query.minRisk !== undefined) {
      nodes = nodes.filter(n => n.intrinsicRisk.overall >= query.minRisk!);
    }

    if (query.maxRisk !== undefined) {
      nodes = nodes.filter(n => n.intrinsicRisk.overall <= query.maxRisk!);
    }

    if (query.tags?.length) {
      nodes = nodes.filter(n => query.tags!.some(t => n.tags.includes(t)));
    }

    if (query.textSearch) {
      const search = query.textSearch.toLowerCase();
      nodes = nodes.filter(n =>
        n.name.toLowerCase().includes(search) ||
        (n.description?.toLowerCase().includes(search))
      );
    }

    return nodes;
  }

  getDashboard(graphId: string): RiskPropagationDashboard {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const scores = graph.nodes.map(n => n.intrinsicRisk.overall);
    const avgRiskScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxRiskScore = Math.max(...scores);
    const minRiskScore = Math.min(...scores);

    const lastResult = Array.from(this.results.values())
      .filter(r => r.graphId === graphId)
      .sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime())[0];

    const nodesByType: Record<RiskNodeType, number> = {} as Record<RiskNodeType, number>;
    const riskByType: Record<RiskNodeType, { avg: number; max: number; min: number }> = {} as Record<RiskNodeType, { avg: number; max: number; min: number }>;

    for (const node of graph.nodes) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      
      if (!riskByType[node.type]) {
        riskByType[node.type] = { avg: 0, max: 0, min: 1, total: 0, count: 0 } as unknown as typeof riskByType[RiskNodeType];
      }
      const typeStats = riskByType[node.type] as unknown as { total: number; count: number; max: number; min: number };
      typeStats.total += node.intrinsicRisk.overall;
      typeStats.count++;
      typeStats.max = Math.max(typeStats.max, node.intrinsicRisk.overall);
      typeStats.min = Math.min(typeStats.min, node.intrinsicRisk.overall);
    }

    for (const type of Object.keys(riskByType) as RiskNodeType[]) {
      const stats = riskByType[type] as unknown as { total: number; count: number; max: number; min: number };
      riskByType[type] = {
        avg: stats.count > 0 ? stats.total / stats.count : 0,
        max: stats.max,
        min: stats.min,
      };
    }

    const riskDistribution: Record<string, number> = {
      critical: graph.nodes.filter(n => n.intrinsicRisk.overall >= 0.8).length,
      high: graph.nodes.filter(n => n.intrinsicRisk.overall >= 0.6 && n.intrinsicRisk.overall < 0.8).length,
      medium: graph.nodes.filter(n => n.intrinsicRisk.overall >= 0.4 && n.intrinsicRisk.overall < 0.6).length,
      low: graph.nodes.filter(n => n.intrinsicRisk.overall < 0.4).length,
    };

    return {
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      avgRiskScore,
      maxRiskScore,
      minRiskScore,
      topHotspots: lastResult?.riskHotspots || [],
      riskDistribution,
      nodesByType,
      riskByType,
      recentAnalyses: [],
      activeSimulations: Array.from(this.simulations.values()).filter(s => s.status === 'running'),
      graphHealth: {
        completeness: graph.nodes.length > 0 ? 1 : 0,
        consistency: 1,
        lastUpdate: new Date(),
      },
    };
  }

  private calculateStatistics(nodes: RiskNode[], edges: RiskEdge[]): GraphStatistics {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxEdges = nodeCount * (nodeCount - 1);
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
    const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

    return {
      nodeCount,
      edgeCount,
      density,
      avgDegree,
      connectedComponents: 1,
      diameter: 0,
      clustering: 0,
    };
  }

  addEventHandler(handler: PropagationEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(eventType: string, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(eventType, data);
      } catch {
        // Intentionally ignoring handler errors to prevent cascading failures
      }
    }
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `prop_${prefix}_${timestamp}_${random}`;
  }
}

export function createRiskPropagationEngine(): RiskPropagationEngine {
  return new RiskPropagationEngine();
}
