/**
 * SecuClaw Reports Page
 * 
 * Features:
 * - Report templates
 * - Report generation
 * - Export functionality
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  lastGenerated?: Date;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
  status: 'completed' | 'generating' | 'failed';
  size: string;
}

const TEMPLATES: ReportTemplate[] = [
  {
    id: 'threat-summary',
    name: '威胁情报摘要',
    description: '汇总当前威胁情报状态和趋势分析',
    category: '威胁情报',
    icon: 'alert-triangle',
  },
  {
    id: 'incident-report',
    name: '安全事件报告',
    description: '详细记录安全事件的调查过程和处理结果',
    category: '事件响应',
    icon: 'file-warning',
  },
  {
    id: 'vuln-scan',
    name: '漏洞扫描报告',
    description: '系统漏洞扫描结果和修复建议',
    category: '漏洞管理',
    icon: 'bug',
  },
  {
    id: 'compliance-audit',
    name: '合规审计报告',
    description: '各合规框架的审计结果和状态',
    category: '合规审计',
    icon: 'clipboard-check',
  },
  {
    id: 'executive-summary',
    name: '高管摘要报告',
    description: '面向管理层的安全态势概览',
    category: '管理报告',
    icon: 'briefcase',
  },
  {
    id: 'asset-inventory',
    name: '资产清单报告',
    description: 'IT 资产清单和安全状态',
    category: '资产管理',
    icon: 'server',
  },
];

const RECENT_REPORTS: GeneratedReport[] = [
  { id: 'R001', name: '2024年3月威胁情报摘要', type: 'threat-summary', createdAt: new Date('2024-03-05'), status: 'completed', size: '2.3 MB' },
  { id: 'R002', name: 'INC-2024-001 事件报告', type: 'incident-report', createdAt: new Date('2024-03-05'), status: 'completed', size: '1.5 MB' },
  { id: 'R003', name: 'Q1 合规审计报告', type: 'compliance-audit', createdAt: new Date('2024-03-01'), status: 'completed', size: '5.2 MB' },
  { id: 'R004', name: '漏洞扫描 - 生产环境', type: 'vuln-scan', createdAt: new Date('2024-03-01'), status: 'completed', size: '3.8 MB' },
  { id: 'R005', name: '2月高管摘要', type: 'executive-summary', createdAt: new Date('2024-02-28'), status: 'completed', size: '1.2 MB' },
];

@customElement('sc-reports-page')
export class ScReportsPage extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .tabs {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: var(--spacing-sm);
    }

    .tab {
      padding: var(--spacing-sm) var(--spacing-md);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all var(--transition-fast);
    }

    .tab:hover {
      color: var(--text-primary);
    }

    .tab.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    /* Templates Grid */
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-md);
    }

    .template-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .template-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .template-icon {
      width: 48px;
      height: 48px;
      background: rgba(59, 130, 246, 0.1);
      border-radius: var(--border-radius);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--spacing-md);
      color: var(--color-primary);
    }

    .template-name {
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .template-category {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-sm);
    }

    .template-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    /* Reports Table */
    .reports-table {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      overflow: hidden;
    }

    .reports-table th,
    .reports-table td {
      padding: var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .reports-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .reports-table tr:last-child td {
      border-bottom: none;
    }

    .reports-table tr:hover td {
      background: var(--bg-hover);
    }

    .report-name {
      font-weight: 500;
    }

    .report-status {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .status-completed { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .status-generating { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-failed { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-generating .status-dot {
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .btn-icon {
      padding: var(--spacing-xs);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      transition: all var(--transition-fast);
    }

    .btn-icon:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-lg);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all var(--transition-fast);
    }

    .btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }

    /* Schedule Section */
    .schedule-section {
      margin-top: var(--spacing-xl);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: var(--spacing-md);
    }

    .schedule-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .schedule-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
    }

    .schedule-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .schedule-name {
      font-weight: 500;
    }

    .schedule-frequency {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    @media (max-width: 1024px) {
      .templates-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .templates-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state()
  private _templates = TEMPLATES;

  @state()
  private _reports = RECENT_REPORTS;

  @state()
  private _activeTab = 'templates';

  private _getIconPath(icon: string): string {
    const icons: Record<string, string> = {
      'alert-triangle': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
      'file-warning': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'bug': 'M8 2l1.88 1.88M14.12 3.88L16 2',
      'clipboard-check': 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14l2 2 4-4',
      'briefcase': 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16 M20 20H4 M8 6h8',
      'server': 'M2 2h20v8H2zM2 14h20v8H2zM6 6h.01M6 18h.01',
    };
    return icons[icon] || icons['file-warning'];
  }

  private _formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private _getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'completed': '已完成',
      'generating': '生成中',
      'failed': '失败',
    };
    return labels[status] || status;
  }

  render() {
    return html`
      <div class="page-header">
        <h1 class="page-title">分析报告</h1>
        <button class="btn btn-primary">+ 新建报告</button>
      </div>

      <div class="tabs">
        <button 
          class="tab ${this._activeTab === 'templates' ? 'active' : ''}"
          @click=${() => this._activeTab = 'templates'}
        >报告模板</button>
        <button 
          class="tab ${this._activeTab === 'recent' ? 'active' : ''}"
          @click=${() => this._activeTab = 'recent'}
        >最近报告</button>
        <button 
          class="tab ${this._activeTab === 'scheduled' ? 'active' : ''}"
          @click=${() => this._activeTab = 'scheduled'}
        >定时任务</button>
      </div>

      ${this._activeTab === 'templates' ? this._renderTemplates() : ''}
      ${this._activeTab === 'recent' ? this._renderRecentReports() : ''}
      ${this._activeTab === 'scheduled' ? this._renderScheduled() : ''}
    `;
  }

  private _renderTemplates() {
    return html`
      <div class="templates-grid">
        ${this._templates.map(t => html`
          <div class="template-card">
            <div class="template-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d=${this._getIconPath(t.icon)}/>
              </svg>
            </div>
            <div class="template-name">${t.name}</div>
            <div class="template-category">${t.category}</div>
            <div class="template-desc">${t.description}</div>
          </div>
        `)}
      </div>
    `;
  }

  private _renderRecentReports() {
    return html`
      <table class="reports-table">
        <thead>
          <tr>
            <th>报告名称</th>
            <th>类型</th>
            <th>创建时间</th>
            <th>大小</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${this._reports.map(r => html`
            <tr>
              <td><span class="report-name">${r.name}</span></td>
              <td>${this._templates.find(t => t.id === r.type)?.name || r.type}</td>
              <td>${this._formatDate(r.createdAt)}</td>
              <td>${r.size}</td>
              <td>
                <span class="report-status status-${r.status}">
                  <span class="status-dot"></span>
                  ${this._getStatusLabel(r.status)}
                </span>
              </td>
              <td>
                <button class="btn-icon" title="下载">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button class="btn-icon" title="分享">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
                <button class="btn-icon" title="删除">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private _renderScheduled() {
    return html`
      <div class="schedule-section">
        <h3 class="section-title">定时报告任务</h3>
        <div class="schedule-list">
          <div class="schedule-item">
            <div class="schedule-info">
              <div class="schedule-name">每周威胁情报摘要</div>
              <div class="schedule-frequency">每周一 09:00</div>
            </div>
            <button class="btn">编辑</button>
          </div>
          <div class="schedule-item">
            <div class="schedule-info">
              <div class="schedule-name">月度合规审计报告</div>
              <div class="schedule-frequency">每月1日 08:00</div>
            </div>
            <button class="btn">编辑</button>
          </div>
          <div class="schedule-item">
            <div class="schedule-info">
              <div class="schedule-name">季度高管摘要</div>
              <div class="schedule-frequency">每季度首日 08:00</div>
            </div>
            <button class="btn">编辑</button>
          </div>
        </div>
        <div style="margin-top: var(--spacing-lg);">
          <button class="btn btn-primary">+ 添加定时任务</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-reports-page': ScReportsPage;
  }
}
