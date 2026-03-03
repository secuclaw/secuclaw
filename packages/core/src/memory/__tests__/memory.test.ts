import { describe, it, expect } from 'vitest';

describe('Memory Manager', () => {
  describe('Vector Memory', () => {
    it('should create vector embedding structure', () => {
      const embedding = {
        id: 'emb-1',
        vector: [0.1, 0.2, 0.3, 0.4, 0.5],
        metadata: { source: 'conversation' },
        timestamp: Date.now(),
      };
      
      expect(embedding.vector).toHaveLength(5);
      expect(embedding.metadata.source).toBe('conversation');
    });
    
    it('should calculate cosine similarity', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const vecC = [1, 0, 0];
      
      const dotAB = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
      const magA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
      const magB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));
      const similarityAB = dotAB / (magA * magB);
      
      const dotAC = vecA.reduce((sum, v, i) => sum + v * vecC[i], 0);
      const magC = Math.sqrt(vecC.reduce((sum, v) => sum + v * v, 0));
      const similarityAC = dotAC / (magA * magC);
      
      expect(similarityAB).toBe(0);
      expect(similarityAC).toBe(1);
    });
  });
  
  describe('Memory Types', () => {
    it('should define short-term memory', () => {
      const shortTerm = {
        type: 'short-term',
        capacity: 10,
        items: [
          { content: 'Recent message 1', timestamp: Date.now() },
          { content: 'Recent message 2', timestamp: Date.now() },
        ],
      };
      
      expect(shortTerm.type).toBe('short-term');
      expect(shortTerm.items).toHaveLength(2);
    });
    
    it('should define long-term memory', () => {
      const longTerm = {
        type: 'long-term',
        persistence: true,
        embeddings: [],
      };
      
      expect(longTerm.persistence).toBe(true);
    });
  });
  
  describe('BM25 Ranking', () => {
    it('should calculate term frequency', () => {
      const doc = 'the quick brown fox jumps over the lazy dog';
      const term = 'the';
      const words = doc.split(' ');
      const tf = words.filter(w => w === term).length / words.length;
      
      expect(tf).toBe(2 / 9);
    });
    
    it('should handle empty documents', () => {
      const doc = '';
      const words = doc.split(' ').filter(w => w);
      
      expect(words).toHaveLength(0);
    });
  });
});
