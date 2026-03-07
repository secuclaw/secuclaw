/**
 * SecuClaw Compliance Audit Page
 * 
 * Features:
 * - Compliance framework status (ISO 27001, SOC 2, GDPR, etc.)
 * - Control checklist
 * - Report generation
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  totalControls: number;
  passedControls: number;
  failedControls: number;
  pendingControls: number;
  lastAudit: Date;
  nextAudit: Date;
  status: 'compliant' | 'partial' | 'non-compliant';
}

interface Control {
  id: string;
  frameworkId: string;
  name: string;
  description: string;
  category: string;
  status: 'pass' | 'fail' | 'pending' | 'na';
  evidence?: string;
  lastChecked: Date;
  assignee: string;
}

const FRAMEWORKS: ComplianceFramework[] = [
  {
    id: 'iso27001',
    name: 'ISO 27001:2022',
    description: '信息安全管理体系国际标准',
    totalControls: 93,
    passedControls: 78,
    failedControls: 5,
    pendingControls: 10,
    lastAudit: new Date('2024-01-15'),
    nextAudit: new Date('2024-07-15'),
    status: 'compliant',
  },
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    description: '服务组织控制报告',
    totalControls: 87,
    passedControls: 65,
    failedControls: 12,
    pendingControls: 10,
    lastAudit: new Date('2024-02-01'),
    nextAudit: new Date('2024-08-01'),
    status: 'partial',
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    description: '欧盟通用数据保护条例',
    totalControls: 45,
    passedControls: 40,
    failedControls: 2,
    pendingControls: 3,
    lastAudit: new Date('2024-01-20'),
    nextAudit: new Date('2024-07-20'),
    status: 'compliant',
  },
  {
    id: 'pci-dss',
    name: 'PCI DSS v4.0',
    description: '支付卡行业数据安全标准',
    totalControls: 64,
    passedControls: 45,
    failedControls: 15,
    pendingControls: 4,
    lastAudit: new Date('2024-02-10'),
    nextAudit: new Date('2024-08-10'),
    status: 'non-compliant',
  },
];

@customElement('sc-compliance-page')
export class ScCompliancePage extends LitElement {
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

    /* Overview Stats */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .overview-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      text-align: center;
    }

    .overview-value {
      font-size: 2.5rem;
      font-weight: 700;
    }

    .overview-label {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
    }

    .text-success { color: var(--color-success); }
    .text-warning { color: var(--color-warning); }
    .text-danger { color: var(--color-danger); }
    .text-info { color: var(--color-info); }

    /* Framework Cards */
    .frameworks-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
    }

    .framework-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .framework-card:hover {
      border-color: var(--color-primary);
    }

    .framework-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-md);
    }

    .framework-name {
      font-weight: 600;
      font-size: 1.125rem;
    }

    .framework-desc {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-compliant { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .status-partial { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-non-compliant { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }

    .progress-bar {
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      margin: var(--spacing-md) 0;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width var(--transition-normal);
    }

    .progress-pass { background: var(--color-success); }
    .progress-fail { background: var(--color-danger); }
    .progress-pending { background: var(--color-warning); }

    .framework-stats {
      display: flex;
      gap: var(--spacing-lg);
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .framework-dates {
      display: flex;
      gap: var(--spacing-lg);
      margin-top: var(--spacing-md);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Report Section */
    .report-section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
    }

    .report-options {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .report-option {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      cursor: pointer;
      text-align: center;
      transition: all var(--transition-fast);
    }

    .report-option:hover {
      border-color: var(--color-primary);
    }

    .report-option.selected {
      border-color: var(--color-primary);
      background: rgba(59, 130, 246, 0.1);
    }

    .report-icon {
      width: 40px;
      height: 40px;
      margin: 0 auto var(--spacing-sm);
      color: var(--color-primary);
    }

    .report-name {
      font-weight: 500;
    }

    .report-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
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

    .actions-row {
      display: flex;
      gap: var(--spacing-md);
    }

    @media (max-width: 1024px) {
      .frameworks-grid {
        grid-template-columns: 1fr;
      }
      .overview-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .report-options {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state()
  private _frameworks = FRAMEWORKS;

  @state()
  private _selectedReport = 'full';

  @state()
  private _selectedFramework: string | null = null;

  private _getOverallStats() {
    const total = this._frameworks.reduce((sum, f) => sum + f.totalControls, 0);
    const passed = this._frameworks.reduce((sum, f) => sum + f.passedControls, 0);
    const failed = this._frameworks.reduce((sum, f) => sum + f.failedControls, 0);
    const pending = this._frameworks.reduce((sum, f) => sum + f.pendingControls, 0);
    
    return { total, passed, failed, pending };
  }

  private _getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'compliant': '合规',
      'partial': '部分合规',
      'non-compliant': '不合规',
    };
    return labels[status] || status;
  }

  private _formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN');
  }

  render() {
    const stats = this._getOverallStats();

    return html`
      <div class="page-header">
        <h1 class="page-title">合规审计</h1>
        <div class="actions-row">
          <button class="btn">开始审计</button>
          <button class="btn btn-primary">生成报告</button>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="overview-grid">
        <div class="overview-card">
          <div class="overview-value">${stats.total}</div>
          <div class="overview-label">总控制项</div>
        </div>
        <div class="overview-card">
          <div class="overview-value text-success">${stats.passed}</div>
          <div class="overview-label">通过项</div>
        </div>
        <div class="overview-card">
          <div class="overview-value text-danger">${stats.failed}</div>
          <div class="overview-label">失败项</div>
        </div>
        <div class="overview-card">
          <div class="overview-value text-warning">${stats.pending}</div>
          <div class="overview-label">待检查</div>
        </div>
      </div>

      <!-- Framework Cards -->
      <h2 style="margin-bottom: var(--spacing-md);">合规框架</h2>
      <div class="frameworks-grid">
        ${this._frameworks.map(f => {
          const passPercent = (f.passedControls / f.totalControls) * 100;
          const failPercent = (f.failedControls / f.totalControls) * 100;
          
          return html`
            <div class="framework-card" @click=${() => this._selectedFramework = f.id}>
              <div class="framework-header">
                <div>
                  <div class="framework-name">${f.name}</div>
                  <div class="framework-desc">${f.description}</div>
                </div>
                <span class="status-badge status-${f.status}">
                  ${this._getStatusLabel(f.status)}
                </span>
              </div>
              
              <div class="progress-bar">
                <div class="progress-fill progress-pass" style="width: ${passPercent}%"></div>
              </div>
              
              <div class="framework-stats">
                <span>✓ 通过: ${f.passedControls}</span>
                <span>✗ 失败: ${f.failedControls}</span>
                <span>○ 待检: ${f.pendingControls}</span>
              </div>
              
              <div class="framework-dates">
                <span>上次审计: ${this._formatDate(f.lastAudit)}</span>
                <span>下次审计: ${this._formatDate(f.nextAudit)}</span>
              </div>
            </div>
          `;
        })}
      </div>

      <!-- Report Generation -->
      <div class="report-section">
        <h3 class="section-title">生成报告</h3>
        
        <div class="report-options">
          <div 
            class="report-option ${this._selectedReport === 'full' ? 'selected' : ''}"
            @click=${() => this._selectedReport = 'full'}
          >
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <div class="report-name">完整审计报告</div>
            <div class="report-desc">包含所有框架详细检查结果</div>
          </div>
          
          <div 
            class="report-option ${this._selectedReport === 'summary' ? 'selected' : ''}"
            @click=${() => this._selectedReport = 'summary'}
          >
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <div class="report-name">执行摘要</div>
            <div class="report-desc">高层管理概述</div>
          </div>
          
          <div 
            class="report-option ${this._selectedReport === 'gap' ? 'selected' : ''}"
            @click=${() => this._selectedReport = 'gap'}
          >
            <svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="report-name">差距分析</div>
            <div class="report-desc">识别合规差距和改进建议</div>
          </div>
        </div>

        <button class="btn btn-primary">下载 PDF 报告</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-compliance-page': ScCompliancePage;
  }
}
