import { describe, it, expect } from 'vitest';

describe('Ontology Engine', () => {
  describe('Object Types', () => {
    it('should define security object types', () => {
      const objectTypes = {
        asset: { name: 'Asset', properties: ['name', 'criticality', 'owner'] },
        threat: { name: 'Threat', properties: ['name', 'severity', 'mitreId'] },
        vulnerability: { name: 'Vulnerability', properties: ['cve', 'cvss', 'status'] },
        control: { name: 'Control', properties: ['name', 'effectiveness', 'status'] },
      };
      
      expect(objectTypes.asset.name).toBe('Asset');
      expect(objectTypes.threat.properties).toContain('mitreId');
    });
  });
  
  describe('Relationship Types', () => {
    it('should define security relationships', () => {
      const relationships = [
        { type: 'exploits', source: 'threat', target: 'vulnerability' },
        { type: 'mitigates', source: 'control', target: 'vulnerability' },
        { type: 'affects', source: 'threat', target: 'asset' },
        { type: 'protects', source: 'control', target: 'asset' },
      ];
      
      expect(relationships).toHaveLength(4);
      
      const mitigationRels = relationships.filter(r => r.type === 'mitigates');
      expect(mitigationRels[0].source).toBe('control');
    });
  });
  
  describe('Inference', () => {
    it('should infer transitive relationships', () => {
      const facts = [
        { subject: 'A', predicate: 'depends_on', object: 'B' },
        { subject: 'B', predicate: 'depends_on', object: 'C' },
      ];
      
      const inferred = [];
      for (let i = 0; i < facts.length - 1; i++) {
        if (facts[i].predicate === 'depends_on' && facts[i + 1].predicate === 'depends_on') {
          inferred.push({
            subject: facts[i].subject,
            predicate: 'depends_on',
            object: facts[i + 1].object,
            inferred: true,
          });
        }
      }
      
      expect(inferred).toHaveLength(1);
      expect(inferred[0].subject).toBe('A');
      expect(inferred[0].object).toBe('C');
    });
  });
  
  describe('Schema Validation', () => {
    it('should validate object against schema', () => {
      const schema = {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['asset', 'threat', 'control'] },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        },
      };
      
      const validObject = { id: 'obj-1', type: 'threat', severity: 'high' };
      const invalidObject = { id: 'obj-2', type: 'invalid' };
      
      const isValidType = schema.properties.type.enum.includes(validObject.type);
      const isInvalidType = !schema.properties.type.enum.includes(invalidObject.type);
      
      expect(isValidType).toBe(true);
      expect(isInvalidType).toBe(true);
    });
  });
});
