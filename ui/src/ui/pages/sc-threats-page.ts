/**
 * SecuClaw Threats Page Component
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface Threat {
  id: string;
  name: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  iocs: string[];
  description: string;
  firstSeen: string;
  lastSeen: string;
  status: 'active' | 'mitigated' | 'false-positive';
}

@customElement('sc-threats-page')
export class ScThreatsPage extends LitElement {
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

    .toolbar {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .search-input {
      flex: 1;
      max-width: 300px;
    }

    .filter-select {
      min-width: 150px;
    }

    .threat-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      overflow: hidden;
    }

    .threat-table th,
    .threat-table td {
      padding: var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .threat-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .threat-table tr:hover td {
      background: var(--bg-hover);
    }

    .threat-table tr:last-child td {
      border-bottom: none;
    }

    .severity-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .severity-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .status-active { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .status-mitigated { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .status-false-positive { background: rgba(100, 116, 139, 0.2); color: var(--text-muted); }

    .action-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: var(--spacing-xs);
      border-radius: var(--border-radius);
      transition: all var(--transition-fast);
    }

    .action-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: background var(--transition-fast);
    }

    .btn-primary:hover {
      background: var(--color-primary-dark);
    }
  `;

  @state()
  private _threats: Threat[] = [
    {
      id: 'T001',
      name: 'APT28 鱼叉式钓鱼攻击',
      type: 'APT',
      severity: 'critical',
      source: '威胁情报源 A',
      iocs: ['192.168.1.100', 'malware.exe'],
      description: '针对金融行业的定向攻击活动',
      firstSeen: '2024-01-15',
      lastSeen: '2024-03-01',
      status: 'active',
    },
    {
      id: 'T002',
      name: 'Emotet 僵尸网络变种',
      type: 'Malware',
      severity: 'high',
      source: '安全厂商 B',
      iocs: ['evil.com', 'payload.dll'],
      description: '新型 Emotet 变种，通过邮件传播',
      firstSeen: '2024-02-20',
      lastSeen: '2024-03-05',
      status: 'active',
    },
    {
      id: 'T003',
      name: 'Log4j 漏洞利用尝试',
      type: 'Vulnerability',
      severity: 'critical',
      source: 'IDS/IPS',
      iocs: ['${jndi:ldap://...}'],
      description: '检测到 Log4j 远程代码执行漏洞利用尝试',
      firstSeen: '2024-03-01',
      lastSeen: '2024-03-05',
      status: 'mitigated',
    },
    {
      id: 'T004',
      name: 'DDoS 攻击流量',
      type: 'DDoS',
      severity: 'medium',
      source: '网络监控',
      iocs: ['10.0.0.0/24'],
      description: '来自特定 IP 段的异常流量',
      firstSeen: '2024-03-04',
      lastSeen: '2024-03-05',
      status: 'active',
    },
    {
      id: 'T005',
      name: '可疑 PowerShell 脚本',
      type: 'Script',
      severity: 'low',
      source: 'EDR',
      iocs: ['script.ps1'],
      description: '执行了混淆的 PowerShell 脚本',
      firstSeen: '2024-03-03',
      lastSeen: '2024-03-03',
      status: 'false-positive',
    },
  ];

  @state()
  private _filter = 'all';

  @state()
  private _search = '';

  private _getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[severity] || severity;
  }

  private _getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: '活跃',
      mitigated: '已缓解',
      'false-positive': '误报',
    };
    return labels[status] || status;
  }

  private _getFilteredThreats(): Threat[] {
    return this._threats.filter(t => {
      const matchesFilter = this._filter === 'all' || t.severity === this._filter || t.status === this._filter;
      const matchesSearch = this._search === '' || 
        t.name.toLowerCase().includes(this._search.toLowerCase()) ||
        t.type.toLowerCase().includes(this._search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }

  render() {
    const filteredThreats = this._getFilteredThreats();

    return html`
      <div class="page-header">
        <h1 class="page-title">威胁情报</h1>
        <button class="btn-primary">+ 添加威胁</button>
      </div>

      <div class="toolbar">
        <input 
          type="text" 
          class="search-input"
          placeholder="搜索威胁..."
          .value=${this._search}
          @input=${(e: Event) => this._search = (e.target as HTMLInputElement).value}
        />
        <select 
          class="filter-select"
          .value=${this._filter}
          @change=${(e: Event) => this._filter = (e.target as HTMLSelectElement).value}
        >
          <option value="all">全部威胁</option>
          <option value="critical">严重</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
          <option value="active">活跃</option>
          <option value="mitigated">已缓解</option>
        </select>
      </div>

      <table class="threat-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>威胁名称</th>
            <th>类型</th>
            <th>严重程度</th>
            <th>来源</th>
            <th>最后发现</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${filteredThreats.map(t => html`
            <tr>
              <td>${t.id}</td>
              <td>${t.name}</td>
              <td>${t.type}</td>
              <td>
                <span class="severity-badge severity-${t.severity}">
                  ${this._getSeverityLabel(t.severity)}
                </span>
              </td>
              <td>${t.source}</td>
              <td>${t.lastSeen}</td>
              <td>
                <span class="status-badge status-${t.status}">
                  ${this._getStatusLabel(t.status)}
                </span>
              </td>
              <td>
                <button class="action-btn" title="查看详情">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button class="action-btn" title="导出">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-threats-page': ScThreatsPage;
  }
}
