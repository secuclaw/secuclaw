export type ReportFormat = 'html' | 'pdf' | 'json' | 'markdown';

export type ReportType = 
  | 'security-assessment'
  | 'vulnerability-scan'
  | 'penetration-test'
  | 'compliance-audit'
  | 'incident-response'
  | 'threat-intelligence'
  | 'risk-analysis'
  | 'executive-summary'
  | 'technical-detailed';

export type ReportSection = {
  id: string;
  title: string;
  content: string | ReportSection[];
  order: number;
  collapsible?: boolean;
};

export type ReportMetric = {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  unit?: string;
};

export type ReportChart = {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'donut' | 'table';
  title: string;
  data: Record<string, unknown>[];
  config?: Record<string, unknown>;
};

export type ReportFinding = {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  recommendation?: string;
  references?: string[];
  cveIds?: string[];
  affectedAssets?: string[];
  evidence?: string[];
};

export type ReportRecommendation = {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  description: string;
  effort?: 'low' | 'medium' | 'high';
  impact?: string;
  assignee?: string;
  dueDate?: string;
};

export type ReportMetadata = {
  title: string;
  subtitle?: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: string;
  generatedBy: string;
  organization?: string;
  version: string;
  classification?: 'public' | 'internal' | 'confidential' | 'secret';
  period?: {
    start: string;
    end: string;
  };
  tags?: string[];
};

export type ReportData = {
  metadata: ReportMetadata;
  executiveSummary?: string;
  sections: ReportSection[];
  metrics?: ReportMetric[];
  charts?: ReportChart[];
  findings?: ReportFinding[];
  recommendations?: ReportRecommendation[];
  appendix?: ReportSection[];
  customData?: Record<string, unknown>;
};

export type ReportTemplate = {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  sections: Array<{
    id: string;
    title: string;
    required: boolean;
    defaultContent?: string;
  }>;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    fontFamily?: string;
  };
};

export type ReportGenerationOptions = {
  format?: ReportFormat;
  template?: string;
  includeExecutiveSummary?: boolean;
  includeFindings?: boolean;
  includeRecommendations?: boolean;
  includeAppendix?: boolean;
  locale?: string;
  timezone?: string;
  customStyles?: string;
  headerHtml?: string;
  footerHtml?: string;
};

export type ReportGenerationResult = {
  success: boolean;
  reportId: string;
  format: ReportFormat;
  content?: string | Buffer;
  fileSize?: number;
  generatedAt: string;
  error?: string;
  warnings?: string[];
};

export type ReportSchedule = {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  cronExpression: string;
  recipients: string[];
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  options: ReportGenerationOptions;
};

export type ReportStorage = {
  save(reportId: string, content: string | Buffer, metadata: ReportMetadata): Promise<void>;
  load(reportId: string): Promise<{ content: string | Buffer; metadata: ReportMetadata } | null>;
  delete(reportId: string): Promise<boolean>;
  list(options?: { type?: ReportType; limit?: number; offset?: number }): Promise<Array<{ id: string; metadata: ReportMetadata }>>;
};
