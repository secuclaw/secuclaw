export type MaskingStrategy = 
  | 'redaction'
  | 'substitution'
  | 'shuffling'
  | 'encryption'
  | 'tokenization'
  | 'masking'
  | 'generalization'
  | 'pseudonymization'
  | 'nulling'
  | 'partial_masking';

export type DataType = 
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'ip_address'
  | 'mac_address'
  | 'url'
  | 'name'
  | 'address'
  | 'date'
  | 'zip_code'
  | 'bank_account'
  | 'passport'
  | 'driver_license'
  | 'medical_record'
  | 'custom';

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted' | 'critical';

export interface MaskingRule {
  id: string;
  name: string;
  description: string;
  
  dataType: DataType;
  sensitivity: SensitivityLevel;
  
  strategy: MaskingStrategy;
  config: MaskingConfig;
  
  patterns: PatternMatcher[];
  
  enabled: boolean;
  priority: number;
  
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface PatternMatcher {
  type: 'regex' | 'keyword' | 'context' | 'ml' | 'custom';
  pattern: string;
  flags?: string;
  confidence: number;
}

export interface MaskingConfig {
  preserveFormat?: boolean;
  showFirst?: number;
  showLast?: number;
  replacementChar?: string;
  customReplacement?: string;
  tokenPrefix?: string;
  encryptionKey?: string;
  hashAlgorithm?: 'md5' | 'sha1' | 'sha256' | 'sha512';
  salt?: string;
  locale?: string;
  customHandler?: string;
}

export interface MaskingResult {
  original: string;
  masked: string;
  wasMasked: boolean;
  ruleId?: string;
  ruleName?: string;
  strategy: MaskingStrategy;
  dataType: DataType;
  confidence: number;
  position: { start: number; end: number };
}

export interface MaskingContext {
  source: string;
  userId?: string;
  purpose?: string;
  retention?: string;
  dataClassification?: SensitivityLevel;
  customRules?: string[];
}

export interface MaskingPolicy {
  id: string;
  name: string;
  description: string;
  
  rules: string[];
  defaultStrategy: MaskingStrategy;
  
  allowedStrategies: MaskingStrategy[];
  blockedDataTypes: DataType[];
  
  auditEnabled: boolean;
  auditLevel: 'minimal' | 'standard' | 'verbose';
  
  exceptions: MaskingException[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface MaskingException {
  id: string;
  type: 'user' | 'role' | 'purpose' | 'context';
  value: string;
  reason: string;
  expiresAt?: Date;
}

export interface MaskingProfile {
  id: string;
  name: string;
  description: string;
  policies: string[];
  
  allowedDataTypes: DataType[];
  maskedDataTypes: DataType[];
  
  strictness: 'relaxed' | 'standard' | 'strict' | 'maximum';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface MaskingAuditLog {
  id: string;
  timestamp: Date;
  
  userId?: string;
  sessionId?: string;
  source: string;
  purpose?: string;
  
  inputHash: string;
  outputHash: string;
  rulesApplied: string[];
  dataTypesMasked: DataType[];
  
  fieldCount: number;
  maskedFieldCount: number;
  
  processingTime: number;
  success: boolean;
  errorMessage?: string;
}

export interface MaskingStatistics {
  totalProcessed: number;
  totalMasked: number;
  byDataType: Record<DataType, { processed: number; masked: number }>;
  byStrategy: Record<MaskingStrategy, number>;
  bySource: Record<string, number>;
  avgProcessingTime: number;
  errorRate: number;
}

export interface MaskingDashboard {
  statistics: MaskingStatistics;
  recentAuditLogs: MaskingAuditLog[];
  topDataTypes: Array<{ type: DataType; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  activePolicies: number;
  activeRules: number;
  recentErrors: Array<{ timestamp: Date; message: string; count: number }>;
}

export type MaskingEventHandler = (eventType: string, data: unknown) => void | Promise<void>;
