export type {
  MaskingStrategy,
  DataType,
  SensitivityLevel,
  MaskingRule,
  PatternMatcher,
  MaskingConfig,
  MaskingResult,
  MaskingContext,
  MaskingPolicy,
  MaskingException,
  MaskingProfile,
  MaskingAuditLog,
  MaskingStatistics,
  MaskingDashboard,
  MaskingEventHandler,
} from './types.js';

export {
  DataMaskingEngine,
  createDataMaskingEngine,
} from './engine.js';
