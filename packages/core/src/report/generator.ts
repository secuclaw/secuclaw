import type {
  ReportData,
  ReportFormat,
  ReportGenerationOptions,
  ReportGenerationResult,
  ReportFinding,
  ReportRecommendation,
  ReportSection,
  ReportTemplate,
  ReportStorage,
  ReportMetadata,
} from './types.js';
import { generateHtmlReport } from './templates.js';

export class ReportGenerator {
  private templates: Map<string, ReportTemplate> = new Map();
  private storage?: ReportStorage;
  private defaultOptions: ReportGenerationOptions;

  constructor(options?: { storage?: ReportStorage; defaultOptions?: ReportGenerationOptions }) {
    this.storage = options?.storage;
    this.defaultOptions = options?.defaultOptions || {};
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'security-assessment',
        name: 'Security Assessment Report',
        type: 'security-assessment',
        sections: [
          { id: 'executive-summary', title: 'Executive Summary', required: true },
          { id: 'scope', title: 'Scope', required: true },
          { id: 'methodology', title: 'Methodology', required: false },
          { id: 'findings', title: 'Findings', required: true },
          { id: 'recommendations', title: 'Recommendations', required: true },
          { id: 'conclusion', title: 'Conclusion', required: false },
        ],
      },
      {
        id: 'vulnerability-scan',
        name: 'Vulnerability Scan Report',
        type: 'vulnerability-scan',
        sections: [
          { id: 'executive-summary', title: 'Executive Summary', required: true },
          { id: 'scan-details', title: 'Scan Details', required: true },
          { id: 'vulnerabilities', title: 'Vulnerabilities', required: true },
          { id: 'risk-analysis', title: 'Risk Analysis', required: true },
          { id: 'recommendations', title: 'Remediation', required: true },
        ],
      },
      {
        id: 'compliance-audit',
        name: 'Compliance Audit Report',
        type: 'compliance-audit',
        sections: [
          { id: 'executive-summary', title: 'Executive Summary', required: true },
          { id: 'compliance-overview', title: 'Compliance Overview', required: true },
          { id: 'controls', title: 'Control Assessment', required: true },
          { id: 'gaps', title: 'Gap Analysis', required: true },
          { id: 'remediation', title: 'Remediation Plan', required: true },
        ],
      },
      {
        id: 'incident-response',
        name: 'Incident Response Report',
        type: 'incident-response',
        sections: [
          { id: 'incident-summary', title: 'Incident Summary', required: true },
          { id: 'timeline', title: 'Timeline', required: true },
          { id: 'impact', title: 'Impact Analysis', required: true },
          { id: 'containment', title: 'Containment Actions', required: true },
          { id: 'root-cause', title: 'Root Cause Analysis', required: true },
          { id: 'lessons-learned', title: 'Lessons Learned', required: true },
        ],
      },
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  listTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  async generate(
    data: ReportData,
    options: ReportGenerationOptions = {}
  ): Promise<ReportGenerationResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const format = mergedOptions.format || data.metadata.format || 'html';
    const reportId = this.generateReportId();

    try {
      let content: string | Buffer;
      let fileSize: number;

      switch (format) {
        case 'html':
          content = await this.generateHtml(data, mergedOptions);
          fileSize = Buffer.byteLength(content as string, 'utf-8');
          break;
        case 'json':
          content = JSON.stringify(data, null, 2);
          fileSize = Buffer.byteLength(content as string, 'utf-8');
          break;
        case 'markdown':
          content = this.generateMarkdown(data, mergedOptions);
          fileSize = Buffer.byteLength(content as string, 'utf-8');
          break;
        case 'pdf':
          content = await this.generatePdf(data, mergedOptions);
          fileSize = (content as Buffer).length;
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      if (this.storage) {
        await this.storage.save(reportId, content, data.metadata);
      }

      return {
        success: true,
        reportId,
        format,
        content,
        fileSize,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        reportId,
        format,
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Report generation failed',
      };
    }
  }

  private async generateHtml(data: ReportData, options: ReportGenerationOptions): Promise<string> {
    const template = options.template ? this.templates.get(options.template) : undefined;
    return generateHtmlReport(data, template, options);
  }

  private generateMarkdown(data: ReportData, _options: ReportGenerationOptions): string {
    const lines: string[] = [];

    lines.push(`# ${data.metadata.title}`);
    if (data.metadata.subtitle) {
      lines.push(`\n## ${data.metadata.subtitle}`);
    }
    lines.push(`\n**Generated:** ${data.metadata.generatedAt}`);
    lines.push(`**Type:** ${data.metadata.type}`);
    lines.push('');

    if (data.executiveSummary) {
      lines.push('## Executive Summary\n');
      lines.push(data.executiveSummary);
      lines.push('');
    }

    for (const section of data.sections) {
      lines.push(this.sectionToMarkdown(section, 2));
    }

    if (data.findings && data.findings.length > 0) {
      lines.push('\n## Findings\n');
      for (const finding of data.findings) {
        lines.push(`### ${finding.title}`);
        lines.push(`**Severity:** ${finding.severity.toUpperCase()}`);
        lines.push(`\n${finding.description}`);
        if (finding.recommendation) {
          lines.push(`\n**Recommendation:** ${finding.recommendation}`);
        }
        lines.push('');
      }
    }

    if (data.recommendations && data.recommendations.length > 0) {
      lines.push('\n## Recommendations\n');
      for (const rec of data.recommendations) {
        lines.push(`- **${rec.title}** (${rec.priority}): ${rec.description}`);
      }
    }

    return lines.join('\n');
  }

  private sectionToMarkdown(section: ReportSection, level: number): string {
    const prefix = '#'.repeat(level);
    const lines: string[] = [`${prefix} ${section.title}`];

    if (typeof section.content === 'string') {
      lines.push(section.content);
    } else if (Array.isArray(section.content)) {
      for (const sub of section.content) {
        lines.push(this.sectionToMarkdown(sub, level + 1));
      }
    }

    return lines.join('\n') + '\n';
  }

  private async generatePdf(data: ReportData, options: ReportGenerationOptions): Promise<Buffer> {
    const html = await this.generateHtml(data, { ...options, format: 'html' });
    return this.htmlToPdf(html);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async htmlToPdf(html: string): Promise<Buffer> {
    // Puppeteer import - optional dependency
    const puppeteerPdf = async (htmlContent: string): Promise<Buffer> => {
      // @ts-expect-error - puppeteer is an optional dependency
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });
      
      await browser.close();
      return pdfBuffer;
    };

    try {
      return await puppeteerPdf(html);
    } catch {
      const header = Buffer.from('%PDF-1.4\n');
      const body = Buffer.from(`%PDF placeholder - PDF generation requires puppeteer\n${html.length} bytes HTML content`);
      return Buffer.concat([header, body]);
    }
  }

  private generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `rpt_${timestamp}_${random}`;
  }

  sortBySeverity(findings: ReportFinding[]): ReportFinding[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  prioritizeRecommendations(recommendations: ReportRecommendation[]): ReportRecommendation[] {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...recommendations].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  async loadReport(reportId: string): Promise<{ content: string | Buffer; metadata: ReportMetadata } | null> {
    if (!this.storage) {
      throw new Error('No storage backend configured');
    }
    return this.storage.load(reportId);
  }

  async deleteReport(reportId: string): Promise<boolean> {
    if (!this.storage) {
      throw new Error('No storage backend configured');
    }
    return this.storage.delete(reportId);
  }

  async listReports(options?: { type?: ReportData['metadata']['type']; limit?: number; offset?: number }): Promise<Array<{ id: string; metadata: ReportMetadata }>> {
    if (!this.storage) {
      throw new Error('No storage backend configured');
    }
    return this.storage.list(options);
  }
}

export function createReportGenerator(options?: { storage?: ReportStorage; defaultOptions?: ReportGenerationOptions }): ReportGenerator {
  return new ReportGenerator(options);
}
