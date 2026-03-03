export type {
  ReportFormat,
  ReportType,
  ReportSection,
  ReportMetric,
  ReportChart,
  ReportFinding,
  ReportRecommendation,
  ReportMetadata,
  ReportData,
  ReportTemplate,
  ReportGenerationOptions,
  ReportGenerationResult,
  ReportSchedule,
  ReportStorage,
} from './types.js';

export { ReportGenerator, createReportGenerator } from './generator.js';
export { generateHtmlReport } from './templates.js';
