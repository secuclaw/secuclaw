/**
 * SecuClaw Vulnerabilities Page Component
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface Vulnerability {
  id: string;
  cve: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvss: number;
  affectedSystems: string[];
  description: string;
  publishedDate: string;
  patched: boolean;
  exploitAvailable: boolean;
}

@customElement('sc-vulnerabilities-page')
export class ScVulnerabilitiesPage extends LitElement {
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

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .stat-critical { color: var(--color-danger); }
    .stat-high { color: var(--color-warning); }
    .stat-medium { color: var(--color-info); }
    .stat-low { color: var(--color-success); }

    .vuln-grid {
      display: grid;
      gap: var(--spacing-md);
    }

    .vuln-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--spacing-md);
      align-items: start;
    }

    .cvss-score {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
    }

    .cvss-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); border: 2px solid var(--color-danger); }
    .cvss-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); border: 2px solid var(--color-warning); }
    .cvss-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); border: 2px solid var(--color-info); }
    .cvss-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); border: 2px solid var(--color-success); }

    .vuln-content {
      flex: 1;
    }

    .vuln-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xs);
    }

    .vuln-cve {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--color-primary);
    }

    .vuln-name {
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .vuln-description {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .vuln-meta {
      display: flex;
      gap: var(--spacing-md);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .vuln-actions {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.75rem;
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

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
    }

    .badge-exploit {
      background: rgba(239, 68, 68, 0.2);
      color: var(--color-danger);
    }

    .badge-patched {
      background: rgba(16, 185, 129, 0.2);
      color: var(--color-success);
    }
  `;

  @state()
  private _vulnerabilities: Vulnerability[] = [
    {
      id: 'V001',
      cve: 'CVE-2024-1234',
      name: 'Log4j 远程代码执行漏洞',
      severity: 'critical',
      cvss: 10.0,
      affectedSystems: ['Server-01', 'Server-02', 'App-Server'],
      description: 'Apache Log4j2 存在远程代码执行漏洞，攻击者可通过 JNDI 注入执行任意代码。',
      publishedDate: '2024-01-10',
      patched: false,
      exploitAvailable: true,
    },
    {
      id: 'V002',
      cve: 'CVE-2024-2345',
      name: 'Spring Framework RCE',
      severity: 'critical',
      cvss: 9.8,
      affectedSystems: ['Web-Server', 'API-Gateway'],
      description: 'Spring Framework 存在远程代码执行漏洞，影响使用 JDK 9+ 的应用。',
      publishedDate: '2024-02-15',
      patched: true,
      exploitAvailable: true,
    },
    {
      id: 'V003',
      cve: 'CVE-2024-3456',
      name: 'OpenSSL 缓冲区溢出',
      severity: 'high',
      cvss: 7.5,
      affectedSystems: ['Load-Balancer', 'Proxy-Server'],
      description: 'OpenSSL 在处理特定证书时存在缓冲区溢出漏洞。',
      publishedDate: '2024-02-20',
      patched: false,
      exploitAvailable: false,
    },
    {
      id: 'V004',
      cve: 'CVE-2024-4567',
      name: 'Nginx 请求走私漏洞',
      severity: 'medium',
      cvss: 5.3,
      affectedSystems: ['Web-Proxy'],
      description: '特定配置下 Nginx 可能受到 HTTP 请求走私攻击。',
      publishedDate: '2024-03-01',
      patched: true,
      exploitAvailable: false,
    },
  ];

  private _getSeverityClass(cvss: number): string {
    if (cvss >= 9) return 'cvss-critical';
    if (cvss >= 7) return 'cvss-high';
    if (cvss >= 4) return 'cvss-medium';
    return 'cvss-low';
  }

  private _getStats() {
    return {
      total: this._vulnerabilities.length,
      critical: this._vulnerabilities.filter(v => v.severity === 'critical').length,
      high: this._vulnerabilities.filter(v => v.severity === 'high').length,
      unpatched: this._vulnerabilities.filter(v => !v.patched).length,
    };
  }

  render() {
    const stats = this._getStats();

    return html`
      <div class="page-header">
        <h1 class="page-title">漏洞管理</h1>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">总漏洞数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-critical">${stats.critical}</div>
          <div class="stat-label">严重漏洞</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-high">${stats.high}</div>
          <div class="stat-label">高危漏洞</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.unpatched}</div>
          <div class="stat-label">待修复</div>
        </div>
      </div>

      <!-- Vulnerabilities List -->
      <div class="vuln-grid">
        ${this._vulnerabilities.map(v => html`
          <div class="vuln-card">
            <div class="cvss-score ${this._getSeverityClass(v.cvss)}">
              ${v.cvss.toFixed(1)}
            </div>
            <div class="vuln-content">
              <div class="vuln-header">
                <span class="vuln-cve">${v.cve}</span>
                ${v.exploitAvailable ? html`<span class="badge badge-exploit">存在利用</span>` : ''}
                ${v.patched ? html`<span class="badge badge-patched">已修复</span>` : ''}
              </div>
              <div class="vuln-name">${v.name}</div>
              <div class="vuln-description">${v.description}</div>
              <div class="vuln-meta">
                <span>影响系统: ${v.affectedSystems.join(', ')}</span>
                <span>发布日期: ${v.publishedDate}</span>
              </div>
            </div>
            <div class="vuln-actions">
              <button class="btn btn-primary">查看详情</button>
              <button class="btn">${v.patched ? '取消标记' : '标记已修复'}</button>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-vulnerabilities-page': ScVulnerabilitiesPage;
  }
}
