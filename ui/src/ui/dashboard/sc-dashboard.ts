/**
 * SecuClaw Dashboard Component
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './sc-stats-card.js';
import './sc-threat-list.js';
import './sc-chart-panel.js';

interface DashboardStats {
  totalThreats: number;
  activeIncidents: number;
  vulnerabilities: number;
  complianceScore: number;
}

@customElement('sc-dashboard')
export class ScDashboard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .dashboard-header {
      margin-bottom: var(--spacing-xl);
    }

    .dashboard-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .dashboard-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--spacing-lg);
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .panel-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .panel-action {
      font-size: 0.75rem;
      color: var(--color-primary);
      cursor: pointer;
    }

    .panel-action:hover {
      color: var(--color-primary-light);
    }
  `;

  @state()
  private _stats: DashboardStats = {
    totalThreats: 156,
    activeIncidents: 8,
    vulnerabilities: 42,
    complianceScore: 94,
  };

  @state()
  private _lastUpdate = new Date();

  render() {
    return html`
      <div class="dashboard-header">
        <h1 class="dashboard-title">安全仪表盘</h1>
        <p class="dashboard-subtitle">
          最后更新: ${this._lastUpdate.toLocaleString('zh-CN')}
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <sc-stats-card
          title="威胁情报"
          value=${this._stats.totalThreats}
          trend="+12"
          icon="alert-triangle"
          color="warning"
        ></sc-stats-card>

        <sc-stats-card
          title="活跃事件"
          value=${this._stats.activeIncidents}
          trend="-3"
          icon="file-warning"
          color="danger"
        ></sc-stats-card>

        <sc-stats-card
          title="漏洞数量"
          value=${this._stats.vulnerabilities}
          trend="-8"
          icon="bug"
          color="info"
        ></sc-stats-card>

        <sc-stats-card
          title="合规评分"
          value="${this._stats.complianceScore}%"
          trend="+2"
          icon="clipboard-check"
          color="success"
        ></sc-stats-card>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Chart Panel -->
        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title">威胁趋势</h2>
            <span class="panel-action">查看详情</span>
          </div>
          <sc-chart-panel></sc-chart-panel>
        </div>

        <!-- Recent Threats -->
        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title">最新威胁</h2>
            <span class="panel-action">查看全部</span>
          </div>
          <sc-threat-list></sc-threat-list>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-dashboard': ScDashboard;
  }
}
