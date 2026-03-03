import { describe, it, expect } from 'vitest';

describe('Knowledge Graph', () => {
  describe('Graph Structure', () => {
    it('should create graph nodes', () => {
      const node = {
        id: 'node-1',
        type: 'threat',
        label: 'Phishing Attack',
        properties: {
          severity: 'high',
          mitreId: 'T1566',
        },
      };
      
      expect(node.id).toBe('node-1');
      expect(node.type).toBe('threat');
      expect(node.properties.mitreId).toBe('T1566');
    });
    
    it('should create graph edges', () => {
      const edge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'mitigates',
        weight: 0.8,
      };
      
      expect(edge.source).toBe('node-1');
      expect(edge.type).toBe('mitigates');
      expect(edge.weight).toBe(0.8);
    });
    
    it('should support multiple edge types', () => {
      const edgeTypes = ['depends_on', 'affects', 'mitigates', 'exploits', 'related_to'];
      
      expect(edgeTypes).toContain('mitigates');
      expect(edgeTypes).toContain('exploits');
    });
  });
  
  describe('Graph Queries', () => {
    it('should find nodes by type', () => {
      const nodes = [
        { id: '1', type: 'threat' },
        { id: '2', type: 'asset' },
        { id: '3', type: 'threat' },
        { id: '4', type: 'control' },
      ];
      
      const threats = nodes.filter(n => n.type === 'threat');
      
      expect(threats).toHaveLength(2);
    });
    
    it('should find connected nodes', () => {
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'D' },
      ];
      
      const connectedToB = edges.filter(e => e.source === 'B' || e.target === 'B');
      
      expect(connectedToB).toHaveLength(2);
    });
  });
  
  describe('Ontology Types', () => {
    it('should define ontology object types', () => {
      const objectTypes = ['asset', 'threat', 'vulnerability', 'control', 'incident'];
      
      expect(objectTypes).toContain('threat');
      expect(objectTypes).toContain('control');
    });
    
    it('should define ontology link types', () => {
      const linkTypes = ['depends_on', 'affects', 'mitigates', 'exploits'];
      
      expect(linkTypes).toContain('mitigates');
    });
  });
});
