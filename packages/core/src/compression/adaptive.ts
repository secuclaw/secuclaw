import type { SessionMessage } from '../session/types.js';

export interface ChunkSummary {
  id: string;
  startIndex: number;
  endIndex: number;
  summary: string;
  keyPoints: string[];
  entities: ExtractedEntity[];
  importance: number;
  createdAt: Date;
}

export interface ExtractedEntity {
  type: 'threat' | 'asset' | 'technique' | 'indicator' | 'user' | 'tool';
  name: string;
  mentions: number;
  firstMention: number;
  lastMention: number;
}

export interface SemanticSnapshot {
  id: string;
  version: number;
  timestamp: Date;
  contextSummary: string;
  activeThreads: ThreadSummary[];
  pendingTasks: TaskSummary[];
  keyDecisions: DecisionRecord[];
  compressedTokens: number;
  originalTokens: number;
}

export interface ThreadSummary {
  id: string;
  topic: string;
  participants: string[];
  status: 'active' | 'paused' | 'completed';
  lastActivity: Date;
  summary: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  blocker?: string;
}

export interface DecisionRecord {
  id: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  timestamp: Date;
  confidence: number;
}

export interface CompressionConfig {
  maxChunkSize: number;
  minChunkSize: number;
  overlapSize: number;
  summaryMaxLength: number;
  entityExtraction: boolean;
  importanceThreshold: number;
  preserveRecentCount: number;
}

export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  maxChunkSize: 4000,
  minChunkSize: 500,
  overlapSize: 200,
  summaryMaxLength: 500,
  entityExtraction: true,
  importanceThreshold: 0.3,
  preserveRecentCount: 10,
};

export class AdaptiveCompressor {
  private config: CompressionConfig;
  private entityPatterns: Map<string, RegExp> = new Map();

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...DEFAULT_COMPRESSION_CONFIG, ...config };
    this.initializeEntityPatterns();
  }

  private initializeEntityPatterns(): void {
    this.entityPatterns.set('ip', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    this.entityPatterns.set('domain', /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g);
    this.entityPatterns.set('hash', /\b[a-fA-F0-9]{32,64}\b/g);
    this.entityPatterns.set('email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    this.entityPatterns.set('url', /https?:\/\/[^\s<>"{}|\\^`[\]]+/g);
    this.entityPatterns.set('cve', /CVE-\d{4}-\d{4,}/gi);
    this.entityPatterns.set('mitre', /T\d{4}(?:\.\d{3})?/g);
  }

  compress(messages: SessionMessage[]): {
    preserved: SessionMessage[];
    summaries: ChunkSummary[];
    stats: CompressionStats;
  } {
    const recentCount = this.config.preserveRecentCount;
    const recentMessages = messages.slice(-recentCount);
    const oldMessages = messages.slice(0, -recentCount);

    if (oldMessages.length === 0) {
      return {
        preserved: recentMessages,
        summaries: [],
        stats: {
          originalMessages: messages.length,
          preservedMessages: recentMessages.length,
          compressedChunks: 0,
          compressionRatio: 1,
          extractedEntities: 0,
        },
      };
    }

    const chunks = this.createChunks(oldMessages);
    const summaries = this.summarizeChunks(chunks);
    const entities = this.extractAllEntities(summaries);

    const stats: CompressionStats = {
      originalMessages: messages.length,
      preservedMessages: recentMessages.length,
      compressedChunks: summaries.length,
      compressionRatio: this.calculateCompressionRatio(messages, summaries),
      extractedEntities: entities.length,
    };

    return {
      preserved: recentMessages,
      summaries,
      stats,
    };
  }

  private createChunks(messages: SessionMessage[]): SessionMessage[][] {
    const chunks: SessionMessage[][] = [];
    let currentChunk: SessionMessage[] = [];
    let currentSize = 0;

    for (const message of messages) {
      const messageSize = this.estimateMessageSize(message);

      if (currentSize + messageSize > this.config.maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        const overlapMessages = currentChunk.slice(-3);
        currentChunk = [...overlapMessages];
        currentSize = overlapMessages.reduce((sum, m) => sum + this.estimateMessageSize(m), 0);
      }

      currentChunk.push(message);
      currentSize += messageSize;
    }

    if (currentChunk.length >= this.config.minChunkSize / 100) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private summarizeChunks(chunks: SessionMessage[][]): ChunkSummary[] {
    return chunks.map((chunk, index) => this.summarizeChunk(chunk, index));
  }

  private summarizeChunk(messages: SessionMessage[], chunkIndex: number): ChunkSummary {
    const content = messages.map(m => this.extractTextContent(m)).join('\n');
    const keyPoints = this.extractKeyPoints(content);
    const entities = this.extractEntities(content);
    const importance = this.calculateImportance(messages);

    const summaryText = this.generateSummary(content, keyPoints);

    return {
      id: `chunk-${chunkIndex}-${Date.now()}`,
      startIndex: chunkIndex,
      endIndex: chunkIndex,
      summary: summaryText,
      keyPoints,
      entities,
      importance,
      createdAt: new Date(),
    };
  }

  private extractTextContent(message: SessionMessage): string {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      return message.content
        .filter(c => c.type === 'text')
        .map(c => (c as { text?: string }).text || '')
        .join('\n');
    }
    return '';
  }

  private extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    const importantPatterns = [
      /detected|found|identified|discovered/i,
      /critical|high|severe|urgent/i,
      /vulnerability|exploit|attack|breach/i,
      /recommend|suggest|should|must/i,
      /failed|error|warning|alert/i,
    ];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (importantPatterns.some(p => p.test(trimmed))) {
        keyPoints.push(trimmed);
        if (keyPoints.length >= 5) break;
      }
    }

    return keyPoints;
  }

  private extractEntities(content: string): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>();

    for (const [type, pattern] of this.entityPatterns) {
      const matches = content.matchAll(new RegExp(pattern.source, 'g'));
      let index = 0;
      for (const match of matches) {
        index++;
        const name = match[0];
        const existing = entityMap.get(name);
        if (existing) {
          existing.mentions++;
          existing.lastMention = match.index || 0;
        } else {
          entityMap.set(name, {
            type: type as ExtractedEntity['type'],
            name,
            mentions: 1,
            firstMention: match.index || 0,
            lastMention: match.index || 0,
          });
        }
      }
    }

    return Array.from(entityMap.values())
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 20);
  }

  private extractAllEntities(summaries: ChunkSummary[]): ExtractedEntity[] {
    const merged = new Map<string, ExtractedEntity>();

    for (const summary of summaries) {
      for (const entity of summary.entities) {
        const existing = merged.get(entity.name);
        if (existing) {
          existing.mentions += entity.mentions;
          existing.lastMention = Math.max(existing.lastMention, entity.lastMention);
        } else {
          merged.set(entity.name, { ...entity });
        }
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.mentions - a.mentions);
  }

  private calculateImportance(messages: SessionMessage[]): number {
    let score = 0.5;

    const content = messages.map(m => this.extractTextContent(m)).join(' ');

    if (/critical|severe|urgent|breach/i.test(content)) score += 0.2;
    if (/high|important|warning/i.test(content)) score += 0.1;
    if (/CVE-\d{4}-\d{4,}/i.test(content)) score += 0.15;
    if (/T\d{4}/.test(content)) score += 0.1;
    if (/malicious|attack|exploit/i.test(content)) score += 0.15;

    return Math.min(1, score);
  }

  private generateSummary(content: string, keyPoints: string[]): string {
    if (keyPoints.length === 0) {
      const firstSentence = content.split(/[.!?]+/)[0];
      return (firstSentence || 'Content processed').substring(0, this.config.summaryMaxLength);
    }

    return keyPoints.slice(0, 3).join('. ').substring(0, this.config.summaryMaxLength);
  }

  private estimateMessageSize(message: SessionMessage): number {
    return this.extractTextContent(message).length;
  }

  private calculateCompressionRatio(messages: SessionMessage[], summaries: ChunkSummary[]): number {
    const originalSize = messages.reduce((sum, m) => sum + this.estimateMessageSize(m), 0);
    const compressedSize = summaries.reduce((sum, s) => sum + s.summary.length + s.keyPoints.join(' ').length, 0);
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }
}

export interface CompressionStats {
  originalMessages: number;
  preservedMessages: number;
  compressedChunks: number;
  compressionRatio: number;
  extractedEntities: number;
}

export class SemanticSnapshotManager {
  private snapshots: Map<string, SemanticSnapshot> = new Map();
  private currentVersion = 0;

  createSnapshot(
    messages: SessionMessage[],
    activeThreads: ThreadSummary[],
    pendingTasks: TaskSummary[],
  ): SemanticSnapshot {
    this.currentVersion++;

    const compressor = new AdaptiveCompressor();
    const { summaries } = compressor.compress(messages);

    const contextSummary = summaries
      .map(s => s.summary)
      .join('\n\n')
      .substring(0, 2000);

    const keyDecisions = this.extractDecisions(messages);

    const originalTokens = messages.reduce((sum, m) => 
      sum + compressor['estimateMessageSize'](m) / 4, 0);

    const snapshot: SemanticSnapshot = {
      id: `snapshot-${Date.now()}`,
      version: this.currentVersion,
      timestamp: new Date(),
      contextSummary,
      activeThreads,
      pendingTasks,
      keyDecisions,
      compressedTokens: Math.floor(contextSummary.length / 4),
      originalTokens: Math.floor(originalTokens),
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  private extractDecisions(messages: SessionMessage[]): DecisionRecord[] {
    const decisions: DecisionRecord[] = [];
    const decisionPatterns = [
      /decided to|decision:|we will|I've chosen/i,
      /selected|opted for|going with/i,
      /concluded|determined|resolved/i,
    ];

    for (const message of messages) {
      const content = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);

      for (const pattern of decisionPatterns) {
        const match = content.match(pattern);
        if (match) {
          decisions.push({
            id: `decision-${decisions.length}`,
            decision: content.substring(Math.max(0, match.index! - 20), match.index! + 200),
            rationale: 'Extracted from conversation context',
            alternatives: [],
            timestamp: new Date(message.timestamp),
            confidence: 0.7,
          });
          break;
        }
      }
    }

    return decisions.slice(0, 10);
  }

  getSnapshot(id: string): SemanticSnapshot | undefined {
    return this.snapshots.get(id);
  }

  getLatestSnapshot(): SemanticSnapshot | undefined {
    const sorted = Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sorted[0];
  }

  listSnapshots(): SemanticSnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  restoreFromSnapshot(snapshotId: string): {
    contextSummary: string;
    instructions: string[];
  } {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return { contextSummary: '', instructions: [] };
    }

    const instructions: string[] = [];

    instructions.push(`Context from previous session (v${snapshot.version}):`);
    instructions.push(snapshot.contextSummary);

    if (snapshot.pendingTasks.length > 0) {
      instructions.push('\nPending tasks:');
      snapshot.pendingTasks.forEach(task => {
        instructions.push(`- ${task.title} (${task.status}, ${task.progress}% complete)`);
      });
    }

    if (snapshot.keyDecisions.length > 0) {
      instructions.push('\nKey decisions made:');
      snapshot.keyDecisions.forEach(d => {
        instructions.push(`- ${d.decision}`);
      });
    }

    return {
      contextSummary: snapshot.contextSummary,
      instructions,
    };
  }

  clearOldSnapshots(keepCount: number = 5): void {
    const sorted = this.listSnapshots();
    const toRemove = sorted.slice(keepCount);
    for (const snapshot of toRemove) {
      this.snapshots.delete(snapshot.id);
    }
  }
}

export const adaptiveCompressor = new AdaptiveCompressor();
export const semanticSnapshotManager = new SemanticSnapshotManager();
