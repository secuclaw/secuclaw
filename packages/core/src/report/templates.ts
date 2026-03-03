import type {
  ReportData,
  ReportTemplate,
  ReportGenerationOptions,
  ReportSection,
  ReportFinding,
  ReportMetric,
} from './types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSeverityColor(severity: ReportFinding['severity']): string {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a',
    info: '#0284c7',
  };
  return colors[severity] || '#6b7280';
}

function getTrendIcon(trend?: 'up' | 'down' | 'stable'): string {
  const icons: Record<string, string> = {
    up: '↑',
    down: '↓',
    stable: '→',
  };
  return trend ? icons[trend] || '' : '';
}

function sectionToHtml(section: ReportSection, level: number = 2): string {
  const tag = `h${Math.min(level, 6)}`;
  let html = `<div class="section" id="${escapeHtml(section.id)}">`;
  html += `<${tag} class="section-title">${escapeHtml(section.title)}</${tag}>`;
  
  if (typeof section.content === 'string') {
    html += `<div class="section-content">${section.content}</div>`;
  } else if (Array.isArray(section.content)) {
    for (const subSection of section.content) {
      html += sectionToHtml(subSection, level + 1);
    }
  }
  
  html += '</div>';
  return html;
}

function findingsToHtml(findings: ReportFinding[]): string {
  let html = '<div class="findings">';
  html += '<h2>Findings</h2>';
  
  const severityGroups: Record<string, ReportFinding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };
  
  for (const finding of findings) {
    severityGroups[finding.severity].push(finding);
  }
  
  for (const [severity, items] of Object.entries(severityGroups)) {
    if (items.length === 0) continue;
    
    html += `<div class="severity-group severity-${severity}">`;
    html += `<h3 class="severity-header" style="border-left: 4px solid ${getSeverityColor(severity as ReportFinding['severity'])}">`;
    html += `${severity.toUpperCase()} (${items.length})</h3>`;
    
    for (const finding of items) {
      html += `<div class="finding">`;
      html += `<h4 class="finding-title">${escapeHtml(finding.title)}</h4>`;
      html += `<p class="finding-description">${escapeHtml(finding.description)}</p>`;
      
      if (finding.recommendation) {
        html += `<div class="finding-recommendation">`;
        html += `<strong>Recommendation:</strong> ${escapeHtml(finding.recommendation)}`;
        html += '</div>';
      }
      
      if (finding.affectedAssets && finding.affectedAssets.length > 0) {
        html += '<div class="finding-assets">';
        html += '<strong>Affected Assets:</strong> ';
        html += finding.affectedAssets.map(a => escapeHtml(a)).join(', ');
        html += '</div>';
      }
      
      if (finding.cveIds && finding.cveIds.length > 0) {
        html += '<div class="finding-cves">';
        html += '<strong>CVEs:</strong> ';
        html += finding.cveIds.map(c => `<code>${escapeHtml(c)}</code>`).join(', ');
        html += '</div>';
      }
      
      html += '</div>';
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

function metricsToHtml(metrics: ReportMetric[]): string {
  let html = '<div class="metrics">';
  html += '<h2>Key Metrics</h2>';
  html += '<div class="metrics-grid">';
  
  for (const metric of metrics) {
    html += '<div class="metric-card">';
    html += `<div class="metric-label">${escapeHtml(metric.label)}</div>`;
    html += `<div class="metric-value">${metric.value}`;
    if (metric.unit) {
      html += ` <span class="metric-unit">${escapeHtml(metric.unit)}</span>`;
    }
    html += '</div>';
    
    if (metric.change !== undefined || metric.trend) {
      html += '<div class="metric-change">';
      if (metric.trend) {
        html += `<span class="trend trend-${metric.trend}">${getTrendIcon(metric.trend)}</span>`;
      }
      if (metric.change !== undefined) {
        const changeClass = metric.change >= 0 ? 'positive' : 'negative';
        html += `<span class="change change-${changeClass}">${metric.change >= 0 ? '+' : ''}${metric.change}%</span>`;
      }
      html += '</div>';
    }
    
    html += '</div>';
  }
  
  html += '</div></div>';
  return html;
}

export function generateHtmlReport(
  data: ReportData,
  template?: ReportTemplate,
  options?: ReportGenerationOptions
): string {
  const primaryColor = template?.branding?.primaryColor || '#1e40af';
  const fontFamily = template?.branding?.fontFamily || 'system-ui, -apple-system, sans-serif';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.metadata.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFamily};
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header {
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 2rem;
      color: #111827;
      margin-bottom: 0.5rem;
    }
    .header .subtitle {
      font-size: 1.25rem;
      color: #6b7280;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-top: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
    }
    .meta-item { display: flex; gap: 0.5rem; }
    .meta-label { font-weight: 600; }
    .classification {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #fef3c7;
      color: #92400e;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
    }
    .classification.confidential { background: #fee2e2; color: #991b1b; }
    .classification.secret { background: #ede9fe; color: #5b21b6; }
    .section { margin-bottom: 2rem; }
    .section-title {
      font-size: 1.5rem;
      color: ${primaryColor};
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .section-content { color: #374151; }
    .executive-summary {
      background: #f0f9ff;
      border-left: 4px solid ${primaryColor};
      padding: 1.5rem;
      margin-bottom: 2rem;
      border-radius: 0 8px 8px 0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .metric-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
    }
    .metric-label { font-size: 0.875rem; color: #6b7280; }
    .metric-value { font-size: 2rem; font-weight: 700; color: #111827; }
    .metric-unit { font-size: 1rem; font-weight: 400; color: #6b7280; }
    .metric-change { margin-top: 0.5rem; font-size: 0.875rem; }
    .trend-up { color: #16a34a; }
    .trend-down { color: #dc2626; }
    .change-positive { color: #16a34a; }
    .change-negative { color: #dc2626; }
    .severity-group { margin-bottom: 1.5rem; }
    .severity-header {
      padding: 0.75rem 1rem;
      background: #f9fafb;
      font-size: 1rem;
      text-transform: uppercase;
    }
    .finding {
      padding: 1rem;
      margin: 0.5rem 0;
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .finding-title { font-size: 1.1rem; color: #111827; margin-bottom: 0.5rem; }
    .finding-description { color: #4b5563; margin-bottom: 0.5rem; }
    .finding-recommendation, .finding-assets, .finding-cves {
      font-size: 0.875rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px dashed #e5e7eb;
    }
    code {
      background: #f3f4f6;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(data.metadata.title)}</h1>
      ${data.metadata.subtitle ? `<div class="subtitle">${escapeHtml(data.metadata.subtitle)}</div>` : ''}
      <div class="meta">
        <div class="meta-item"><span class="meta-label">Generated:</span> ${data.metadata.generatedAt}</div>
        <div class="meta-item"><span class="meta-label">By:</span> ${escapeHtml(data.metadata.generatedBy)}</div>
        ${data.metadata.organization ? `<div class="meta-item"><span class="meta-label">Organization:</span> ${escapeHtml(data.metadata.organization)}</div>` : ''}
        ${data.metadata.period ? `<div class="meta-item"><span class="meta-label">Period:</span> ${data.metadata.period.start} - ${data.metadata.period.end}</div>` : ''}
      </div>
      ${data.metadata.classification ? `<span class="classification ${data.metadata.classification}">${data.metadata.classification}</span>` : ''}
    </div>

    ${data.executiveSummary ? `
    <div class="executive-summary">
      <h2>Executive Summary</h2>
      ${data.executiveSummary}
    </div>
    ` : ''}

    ${data.metrics && data.metrics.length > 0 ? metricsToHtml(data.metrics) : ''}

    ${data.sections.map(s => sectionToHtml(s)).join('\n')}

    ${data.findings && data.findings.length > 0 ? findingsToHtml(data.findings) : ''}

    ${data.recommendations && data.recommendations.length > 0 ? `
    <div class="recommendations">
      <h2>Recommendations</h2>
      <ol>
        ${data.recommendations.map(r => `
        <li>
          <strong>${escapeHtml(r.title)}</strong> 
          <span class="priority-${r.priority}">[${r.priority.toUpperCase()}]</span>
          <p>${escapeHtml(r.description)}</p>
          ${r.effort ? `<small>Effort: ${r.effort}</small>` : ''}
        </li>
        `).join('')}
      </ol>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by SecuClaw Enterprise Security Platform | Version ${data.metadata.version}</p>
      <p>This report is ${data.metadata.classification || 'internal'} - Do not distribute without authorization</p>
    </div>
  </div>
</body>
</html>`;
}
