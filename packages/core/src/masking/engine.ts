import * as crypto from 'crypto';
import type {
  MaskingRule,
  MaskingStrategy,
  DataType,
  SensitivityLevel,
  MaskingResult,
  MaskingContext,
  MaskingPolicy,
  MaskingProfile,
  MaskingAuditLog,
  MaskingStatistics,
  MaskingDashboard,
  MaskingEventHandler,
  PatternMatcher,
  MaskingConfig,
} from './types.js';

export class DataMaskingEngine {
  private rules: Map<string, MaskingRule> = new Map();
  private policies: Map<string, MaskingPolicy> = new Map();
  private profiles: Map<string, MaskingProfile> = new Map();
  private auditLogs: MaskingAuditLog[] = [];
  private statistics: MaskingStatistics;
  private eventHandlers: MaskingEventHandler[] = [];

  private tokenStore: Map<string, { original: string; createdAt: Date }> = new Map();

  constructor() {
    this.statistics = this.initStatistics();
    this.registerDefaultRules();
  }

  private initStatistics(): MaskingStatistics {
    return {
      totalProcessed: 0,
      totalMasked: 0,
      byDataType: {} as Record<DataType, { processed: number; masked: number }>,
      byStrategy: {} as Record<MaskingStrategy, number>,
      bySource: {},
      avgProcessingTime: 0,
      errorRate: 0,
    };
  }

  private registerDefaultRules(): void {
    const defaultRules: Array<Omit<MaskingRule, 'id'>> = [
      {
        name: 'Email Masking',
        description: 'Masks email addresses',
        dataType: 'email',
        sensitivity: 'confidential',
        strategy: 'partial_masking',
        config: { showFirst: 2, showLast: 0, replacementChar: '*', preserveFormat: true },
        patterns: [
          { type: 'regex', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', confidence: 0.95 },
        ],
        enabled: true,
        priority: 100,
        tags: ['pii', 'contact'],
        metadata: {},
      },
      {
        name: 'Phone Number Masking',
        description: 'Masks phone numbers',
        dataType: 'phone',
        sensitivity: 'confidential',
        strategy: 'partial_masking',
        config: { showFirst: 3, showLast: 4, replacementChar: '*', preserveFormat: true },
        patterns: [
          { type: 'regex', pattern: '(\\+?1?[-.]?)?\\(?[0-9]{3}\\)?[-.]?[0-9]{3}[-.]?[0-9]{4}', confidence: 0.9 },
        ],
        enabled: true,
        priority: 100,
        tags: ['pii', 'contact'],
        metadata: {},
      },
      {
        name: 'Credit Card Masking',
        description: 'Masks credit card numbers',
        dataType: 'credit_card',
        sensitivity: 'restricted',
        strategy: 'tokenization',
        config: { showLast: 4, tokenPrefix: 'CC-' },
        patterns: [
          { type: 'regex', pattern: '\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b', confidence: 0.95 },
        ],
        enabled: true,
        priority: 50,
        tags: ['pci', 'financial'],
        metadata: {},
      },
      {
        name: 'SSN Masking',
        description: 'Masks Social Security Numbers',
        dataType: 'ssn',
        sensitivity: 'restricted',
        strategy: 'masking',
        config: { showLast: 4, replacementChar: 'X' },
        patterns: [
          { type: 'regex', pattern: '\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b', confidence: 0.95 },
        ],
        enabled: true,
        priority: 50,
        tags: ['pii', 'government'],
        metadata: {},
      },
      {
        name: 'IP Address Masking',
        description: 'Masks IP addresses',
        dataType: 'ip_address',
        sensitivity: 'internal',
        strategy: 'generalization',
        config: { showFirst: 2, replacementChar: '0' },
        patterns: [
          { type: 'regex', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', confidence: 0.9 },
          { type: 'regex', pattern: '\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b', confidence: 0.9 },
        ],
        enabled: true,
        priority: 150,
        tags: ['network'],
        metadata: {},
      },
      {
        name: 'MAC Address Masking',
        description: 'Masks MAC addresses',
        dataType: 'mac_address',
        sensitivity: 'internal',
        strategy: 'masking',
        config: { showFirst: 2, replacementChar: 'XX' },
        patterns: [
          { type: 'regex', pattern: '\\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\\b', confidence: 0.9 },
        ],
        enabled: true,
        priority: 150,
        tags: ['network', 'hardware'],
        metadata: {},
      },
    ];

    for (const rule of defaultRules) {
      const fullRule: MaskingRule = {
        id: this.generateId('rule'),
        ...rule,
      };
      this.rules.set(fullRule.id, fullRule);
    }
  }

  registerRule(rule: Omit<MaskingRule, 'id'>): MaskingRule {
    const fullRule: MaskingRule = {
      id: this.generateId('rule'),
      ...rule,
    };
    this.rules.set(fullRule.id, fullRule);
    this.emit('rule_registered', fullRule);
    return fullRule;
  }

  createPolicy(options: {
    name: string;
    description: string;
    rules: string[];
    defaultStrategy?: MaskingStrategy;
    auditEnabled?: boolean;
    createdBy: string;
  }): MaskingPolicy {
    const policy: MaskingPolicy = {
      id: this.generateId('policy'),
      name: options.name,
      description: options.description,
      rules: options.rules,
      defaultStrategy: options.defaultStrategy || 'masking',
      allowedStrategies: ['redaction', 'substitution', 'masking', 'partial_masking', 'tokenization'],
      blockedDataTypes: [],
      auditEnabled: options.auditEnabled !== false,
      auditLevel: 'standard',
      exceptions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: options.createdBy,
    };

    this.policies.set(policy.id, policy);
    this.emit('policy_created', policy);
    return policy;
  }

  mask(input: string, context?: MaskingContext): MaskingResult[] {
    const startTime = Date.now();
    const results: MaskingResult[] = [];
    const applicableRules = this.getApplicableRules(context);

    let processedInput = input;
    const appliedRules = new Set<string>();
    const maskedDataTypes = new Set<DataType>();

    for (const rule of applicableRules) {
      for (const pattern of rule.patterns) {
        const matches = this.findMatches(processedInput, pattern);
        
        for (const match of matches) {
          if (match.confidence >= 0.5) {
            const masked = this.applyMasking(match.value, rule);
            
            results.push({
              original: match.value,
              masked,
              wasMasked: masked !== match.value,
              ruleId: rule.id,
              ruleName: rule.name,
              strategy: rule.strategy,
              dataType: rule.dataType,
              confidence: match.confidence,
              position: match.position,
            });

            appliedRules.add(rule.id);
            maskedDataTypes.add(rule.dataType);
          }
        }
      }
    }

    const processingTime = Date.now() - startTime;
    this.updateStatistics(results, processingTime, context);

    if (context?.source) {
      this.createAuditLog({
        context,
        results,
        processingTime,
        appliedRules: Array.from(appliedRules),
        maskedDataTypes: Array.from(maskedDataTypes),
      });
    }

    return results;
  }

  maskObject<T extends Record<string, unknown>>(obj: T, context?: MaskingContext): T {
    const result = { ...obj } as T;

    for (const key of Object.keys(result)) {
      const value = result[key];
      
      if (typeof value === 'string') {
        const maskingResults = this.mask(value, context);
        if (maskingResults.some(r => r.wasMasked)) {
          let maskedValue = value;
          for (const result of maskingResults.sort((a, b) => b.position.start - a.position.start)) {
            if (result.wasMasked) {
              maskedValue = maskedValue.substring(0, result.position.start) + 
                           result.masked + 
                           maskedValue.substring(result.position.end);
            }
          }
          (result as Record<string, unknown>)[key] = maskedValue;
        }
      } else if (typeof value === 'object' && value !== null) {
        (result as Record<string, unknown>)[key] = this.maskObject(value as Record<string, unknown>, context);
      }
    }

    return result;
  }

  private getApplicableRules(context?: MaskingContext): MaskingRule[] {
    let rules = Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (context?.customRules?.length) {
      rules = rules.filter(r => context.customRules!.includes(r.id));
    }

    return rules;
  }

  private findMatches(input: string, pattern: PatternMatcher): Array<{ value: string; confidence: number; position: { start: number; end: number } }> {
    const matches: Array<{ value: string; confidence: number; position: { start: number; end: number } }> = [];

    if (pattern.type === 'regex') {
      try {
        const regex = new RegExp(pattern.pattern, pattern.flags || 'g');
        let match;
        while ((match = regex.exec(input)) !== null) {
          matches.push({
            value: match[0],
            confidence: pattern.confidence,
            position: { start: match.index, end: match.index + match[0].length },
          });
        }
      } catch {
        // Invalid regex pattern, skip
      }
    }

    return matches;
  }

  private applyMasking(value: string, rule: MaskingRule): string {
    switch (rule.strategy) {
      case 'redaction':
        return '';
      
      case 'substitution':
        return rule.config.customReplacement || '[REDACTED]';
      
      case 'nulling':
        return 'NULL';
      
      case 'masking':
        return this.applyFullMasking(value, rule.config);
      
      case 'partial_masking':
        return this.applyPartialMasking(value, rule.config);
      
      case 'tokenization':
        return this.applyTokenization(value, rule.config);
      
      case 'encryption':
        return this.applyEncryption(value, rule.config);
      
      case 'pseudonymization':
        return this.applyPseudonymization(value, rule.config);
      
      case 'generalization':
        return this.applyGeneralization(value, rule.config);
      
      case 'shuffling':
        return this.applyShuffling(value);
      
      default:
        return this.applyPartialMasking(value, rule.config);
    }
  }

  private applyFullMasking(value: string, config: MaskingConfig): string {
    const char = config.replacementChar || '*';
    return char.repeat(value.length);
  }

  private applyPartialMasking(value: string, config: MaskingConfig): string {
    const showFirst = config.showFirst || 0;
    const showLast = config.showLast || 0;
    const char = config.replacementChar || '*';

    if (showFirst + showLast >= value.length) {
      return value;
    }

    const first = value.substring(0, showFirst);
    const last = value.substring(value.length - showLast);
    const middle = char.repeat(value.length - showFirst - showLast);

    return first + middle + last;
  }

  private applyTokenization(value: string, config: MaskingConfig): string {
    const prefix = config.tokenPrefix || 'TKN-';
    const token = this.generateId('token');
    this.tokenStore.set(token, { original: value, createdAt: new Date() });
    return prefix + token;
  }

  private applyEncryption(value: string, config: MaskingConfig): string {
    const key = config.encryptionKey || 'default-key';
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, crypto.scryptSync(key, 'salt', 32), iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private applyPseudonymization(value: string, config: MaskingConfig): string {
    const salt = config.salt || 'default-salt';
    const algorithm = config.hashAlgorithm || 'sha256';
    const hash = crypto.createHash(algorithm);
    hash.update(value + salt);
    return hash.digest('hex').substring(0, 16);
  }

  private applyGeneralization(value: string, config: MaskingConfig): string {
    const showFirst = config.showFirst || 2;
    const parts = value.split(/[.\-:]/);
    
    if (parts.length > 1) {
      const generalized = parts.slice(0, showFirst);
      while (generalized.length < parts.length) {
        generalized.push(config.replacementChar || '0');
      }
      return generalized.join('.');
    }
    
    return this.applyPartialMasking(value, config);
  }

  private applyShuffling(value: string): string {
    const chars = value.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  detokenize(token: string, key?: string): string | null {
    const tokenId = token.replace(/^[A-Z]+-/, '');
    const stored = this.tokenStore.get(tokenId);
    
    if (stored) {
      return stored.original;
    }
    
    return null;
  }

  private updateStatistics(results: MaskingResult[], processingTime: number, context?: MaskingContext): void {
    this.statistics.totalProcessed++;
    this.statistics.totalMasked += results.filter(r => r.wasMasked).length;

    for (const result of results) {
      if (!this.statistics.byDataType[result.dataType]) {
        this.statistics.byDataType[result.dataType] = { processed: 0, masked: 0 };
      }
      this.statistics.byDataType[result.dataType].processed++;
      if (result.wasMasked) {
        this.statistics.byDataType[result.dataType].masked++;
      }

      if (!this.statistics.byStrategy[result.strategy]) {
        this.statistics.byStrategy[result.strategy] = 0;
      }
      this.statistics.byStrategy[result.strategy]++;
    }

    if (context?.source) {
      this.statistics.bySource[context.source] = (this.statistics.bySource[context.source] || 0) + 1;
    }

    this.statistics.avgProcessingTime = 
      (this.statistics.avgProcessingTime * (this.statistics.totalProcessed - 1) + processingTime) / 
      this.statistics.totalProcessed;
  }

  private createAuditLog(options: {
    context: MaskingContext;
    results: MaskingResult[];
    processingTime: number;
    appliedRules: string[];
    maskedDataTypes: DataType[];
  }): void {
    const auditLog: MaskingAuditLog = {
      id: this.generateId('audit'),
      timestamp: new Date(),
      userId: options.context.userId,
      source: options.context.source,
      purpose: options.context.purpose,
      inputHash: this.hashString(options.results.map(r => r.original).join(',')),
      outputHash: this.hashString(options.results.map(r => r.masked).join(',')),
      rulesApplied: options.appliedRules,
      dataTypesMasked: options.maskedDataTypes,
      fieldCount: options.results.length,
      maskedFieldCount: options.results.filter(r => r.wasMasked).length,
      processingTime: options.processingTime,
      success: true,
    };

    this.auditLogs.push(auditLog);
    
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }

    this.emit('audit_log_created', auditLog);
  }

  private hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  getRule(ruleId: string): MaskingRule | undefined {
    return this.rules.get(ruleId);
  }

  listRules(): MaskingRule[] {
    return Array.from(this.rules.values());
  }

  getPolicy(policyId: string): MaskingPolicy | undefined {
    return this.policies.get(policyId);
  }

  getStatistics(): MaskingStatistics {
    return { ...this.statistics };
  }

  getDashboard(): MaskingDashboard {
    const topDataTypes = Object.entries(this.statistics.byDataType)
      .map(([type, data]) => ({ type: type as DataType, count: data.processed }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSources = Object.entries(this.statistics.bySource)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentAuditLogs = this.auditLogs.slice(-100).reverse();

    return {
      statistics: this.statistics,
      recentAuditLogs,
      topDataTypes,
      topSources,
      activePolicies: this.policies.size,
      activeRules: this.rules.size,
      recentErrors: [],
    };
  }

  addEventHandler(handler: MaskingEventHandler): void {
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
    return `${prefix}_${timestamp}_${random}`;
  }
}

export function createDataMaskingEngine(): DataMaskingEngine {
  return new DataMaskingEngine();
}
