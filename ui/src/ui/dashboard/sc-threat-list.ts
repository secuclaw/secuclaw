/**
 * Threat List Component
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface Threat {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  time: string;
}

@customElement('sc-threat-list')
export class ScThreatList extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .threat-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .threat-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm);
      border-radius: var(--border-radius);
      transition: background var(--transition-fast);
      cursor: pointer;
    }

    .threat-item:hover {
      background: var(--bg-hover);
    }

    .severity-indicator {
      width: 4px;
      height: 40px;
      border-radius: 2px;
    }

    .severity-critical { background: var(--color-danger); }
    .severity-high { background: var(--color-warning); }
    .severity-medium { background: var(--color-info); }
    .severity-low { background: var(--color-success); }

    .threat-info {
      flex: 1;
      min-width: 0;
    }

    .threat-name {
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .threat-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      gap: var(--spacing-sm);
    }

    .severity-badge {
      font-size: 0.625rem;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .severity-badge.critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-badge.high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-badge.medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-badge.low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .empty-state {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--text-muted);
    }
  `;

  @state()
  private _threats: Threat[] = [
    { id: '1', name: 'APT28 钓鱼攻击活动', severity: 'critical', source: '威胁情报源', time: '5分钟前' },
    { id: '2', name: 'CVE-2024-1234 漏洞利用', severity: 'high', source: '漏洞扫描', time: '15分钟前' },
    { id: '3', name: '异常登录行为检测', severity: 'medium', source: 'SIEM', time: '1小时前' },
    { id: '4', name: '恶意软件签名更新', severity: 'low', source: '防病毒系统', time: '2小时前' },
    { id: '5', name: 'DDoS 攻击预警', severity: 'high', source: '网络监控', time: '3小时前' },
  ];

  private _getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低',
    };
    return labels[severity] || severity;
  }

  render() {
    if (this._threats.length === 0) {
      return html`
        <div class="empty-state">
          暂无威胁数据
        </div>
      `;
    }

    return html`
      <div class="threat-list">
        ${this._threats.map(threat => html`
          <div class="threat-item">
            <div class="severity-indicator severity-${threat.severity}"></div>
            <div class="threat-info">
              <div class="threat-name">${threat.name}</div>
              <div class="threat-meta">
                <span>${threat.source}</span>
                <span>•</span>
                <span>${threat.time}</span>
              </div>
            </div>
            <span class="severity-badge ${threat.severity}">
              ${this._getSeverityLabel(threat.severity)}
            </span>
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-threat-list': ScThreatList;
  }
}
