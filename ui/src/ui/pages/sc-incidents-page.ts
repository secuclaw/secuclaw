/**
 * SecuClaw Security Incidents Page
 * 
 * Features:
 * - Incident list with filtering
 * - Timeline view for incident progression
 * - Status management
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface Incident {
  id: string;
  title: string;
  type: 'malware' | 'intrusion' | 'ddos' | 'phishing' | 'data-breach' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  assignee: string;
  affectedAssets: string[];
  description: string;
  timeline: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  action: string;
  user: string;
  details?: string;
}

const TYPE_LABELS: Record<string, string> = {
  'malware': '恶意软件',
  'intrusion': '入侵检测',
  'ddos': 'DDoS 攻击',
  'phishing': '钓鱼攻击',
  'data-breach': '数据泄露',
  'other': '其他',
};

const STATUS_LABELS: Record<string, string> = {
  'open': '待处理',
  'investigating': '调查中',
  'contained': '已遏制',
  'resolved': '已解决',
};

@customElement('sc-incidents-page')
export class ScIncidentsPage extends LitElement {
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
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      max-width: 300px;
    }

    .filter-select {
      min-width: 150px;
    }

    .view-toggle {
      display: flex;
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      padding: 2px;
    }

    .view-btn {
      padding: var(--spacing-xs) var(--spacing-md);
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 6px;
      transition: all var(--transition-fast);
    }

    .view-btn.active {
      background: var(--color-primary);
      color: white;
    }

    .incidents-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .incident-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .incident-card:hover {
      border-color: var(--color-primary);
    }

    .incident-card.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .incident-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-md);
    }

    .incident-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .incident-title {
      font-weight: 600;
      font-size: 1rem;
      margin-top: var(--spacing-xs);
    }

    .incident-badges {
      display: flex;
      gap: var(--spacing-sm);
    }

    .badge {
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .severity-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .status-open { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .status-investigating { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .status-contained { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .status-resolved { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .incident-meta {
      display: flex;
      gap: var(--spacing-lg);
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .incident-assets {
      margin-top: var(--spacing-md);
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .asset-tag {
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Timeline View */
    .timeline-view {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: var(--spacing-lg);
    }

    .timeline-container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .timeline-title {
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
    }

    .timeline {
      position: relative;
      padding-left: var(--spacing-xl);
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border-color);
    }

    .timeline-item {
      position: relative;
      padding-bottom: var(--spacing-lg);
    }

    .timeline-item:last-child {
      padding-bottom: 0;
    }

    .timeline-dot {
      position: absolute;
      left: calc(-1 * var(--spacing-xl) + 4px);
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-primary);
      border: 2px solid var(--bg-card);
    }

    .timeline-time {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .timeline-action {
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
    }

    .timeline-details {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .timeline-user {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .detail-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .detail-section {
      margin-bottom: var(--spacing-lg);
    }

    .detail-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: var(--spacing-xs);
    }

    .detail-value {
      color: var(--text-primary);
    }

    .btn {
      padding: var(--spacing-sm) var(--spacing-md);
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

    .actions-bar {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-lg);
    }

    @media (max-width: 1024px) {
      .timeline-view {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state()
  private _incidents: Incident[] = this._generateMockIncidents();

  @state()
  private _selectedIncident: Incident | null = null;

  @state()
  private _viewMode: 'list' | 'timeline' = 'list';

  @state()
  private _filter = 'all';

  @state()
  private _search = '';

  private _generateMockIncidents(): Incident[] {
    return [
      {
        id: 'INC-2024-001',
        title: '检测到可疑横向移动行为',
        type: 'intrusion',
        severity: 'critical',
        status: 'investigating',
        assignee: '张安全',
        affectedAssets: ['SERVER-01', 'WORKSTATION-15', 'DC-02'],
        description: '在内部网络中检测到可疑的横向移动尝试，攻击者可能已获取初始访问权限。',
        timeline: [
          { id: '1', timestamp: new Date('2024-03-05T09:30:00'), action: '事件创建', user: '系统', details: 'SIEM 自动检测到异常' },
          { id: '2', timestamp: new Date('2024-03-05T09:45:00'), action: '开始调查', user: '张安全' },
          { id: '3', timestamp: new Date('2024-03-05T10:15:00'), action: '隔离受影响主机', user: '张安全', details: 'SERVER-01 已隔离' },
        ],
        createdAt: new Date('2024-03-05T09:30:00'),
        updatedAt: new Date('2024-03-05T10:15:00'),
      },
      {
        id: 'INC-2024-002',
        title: '勒索软件感染事件',
        type: 'malware',
        severity: 'critical',
        status: 'contained',
        assignee: '李响应',
        affectedAssets: ['WORKSTATION-22', 'FILE-SERVER-03'],
        description: '检测到勒索软件加密文件行为，已及时遏制。',
        timeline: [
          { id: '1', timestamp: new Date('2024-03-04T14:20:00'), action: '事件创建', user: 'EDR系统' },
          { id: '2', timestamp: new Date('2024-03-04T14:25:00'), action: '自动隔离', user: 'EDR系统' },
          { id: '3', timestamp: new Date('2024-03-04T15:00:00'), action: '确认遏制', user: '李响应' },
        ],
        createdAt: new Date('2024-03-04T14:20:00'),
        updatedAt: new Date('2024-03-04T15:00:00'),
      },
      {
        id: 'INC-2024-003',
        title: '钓鱼邮件攻击',
        type: 'phishing',
        severity: 'high',
        status: 'resolved',
        assignee: '王防护',
        affectedAssets: ['MAIL-SERVER-01', 'USER-MAILBOXES'],
        description: '检测到大规模钓鱼邮件攻击，已阻止并通知用户。',
        timeline: [
          { id: '1', timestamp: new Date('2024-03-03T08:00:00'), action: '事件创建', user: '邮件网关' },
          { id: '2', timestamp: new Date('2024-03-03T08:15:00'), action: '阻止邮件', user: '王防护' },
          { id: '3', timestamp: new Date('2024-03-03T09:00:00'), action: '用户通知', user: '王防护' },
          { id: '4', timestamp: new Date('2024-03-03T16:00:00'), action: '事件关闭', user: '王防护' },
        ],
        createdAt: new Date('2024-03-03T08:00:00'),
        updatedAt: new Date('2024-03-03T16:00:00'),
      },
      {
        id: 'INC-2024-004',
        title: 'DDoS 攻击检测',
        type: 'ddos',
        severity: 'medium',
        status: 'resolved',
        assignee: '赵网络',
        affectedAssets: ['WEB-FRONTEND', 'LOAD-BALANCER'],
        description: 'Web 服务遭受 DDoS 攻击，已通过 CDN 缓解。',
        timeline: [
          { id: '1', timestamp: new Date('2024-03-02T20:00:00'), action: '流量异常告警', user: '监控系统' },
          { id: '2', timestamp: new Date('2024-03-02T20:05:00'), action: '启用 CDN 防护', user: '赵网络' },
          { id: '3', timestamp: new Date('2024-03-02T21:30:00'), action: '攻击停止', user: '监控系统' },
        ],
        createdAt: new Date('2024-03-02T20:00:00'),
        updatedAt: new Date('2024-03-02T21:30:00'),
      },
    ];
  }

  private _getFilteredIncidents(): Incident[] {
    return this._incidents.filter(i => {
      const matchesFilter = this._filter === 'all' || 
        i.severity === this._filter || 
        i.status === this._filter;
      const matchesSearch = this._search === '' || 
        i.title.toLowerCase().includes(this._search.toLowerCase()) ||
        i.id.toLowerCase().includes(this._search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }

  private _formatDate(date: Date): string {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private _selectIncident(incident: Incident) {
    this._selectedIncident = this._selectedIncident?.id === incident.id ? null : incident;
  }

  render() {
    const filteredIncidents = this._getFilteredIncidents();

    return html`
      <div class="page-header">
        <h1 class="page-title">安全事件</h1>
        <button class="btn btn-primary">+ 创建事件</button>
      </div>

      <div class="toolbar">
        <input 
          type="text" 
          class="search-input"
          placeholder="搜索事件..."
          .value=${this._search}
          @input=${(e: Event) => this._search = (e.target as HTMLInputElement).value}
        />
        <select 
          class="filter-select"
          .value=${this._filter}
          @change=${(e: Event) => this._filter = (e.target as HTMLSelectElement).value}
        >
          <option value="all">全部状态</option>
          <option value="open">待处理</option>
          <option value="investigating">调查中</option>
          <option value="contained">已遏制</option>
          <option value="resolved">已解决</option>
          <option value="critical">严重</option>
          <option value="high">高</option>
        </select>
        <div class="view-toggle">
          <button 
            class="view-btn ${this._viewMode === 'list' ? 'active' : ''}"
            @click=${() => this._viewMode = 'list'}
          >列表</button>
          <button 
            class="view-btn ${this._viewMode === 'timeline' ? 'active' : ''}"
            @click=${() => this._viewMode = 'timeline'}
          >时间线</button>
        </div>
      </div>

      ${this._viewMode === 'list' ? this._renderListView(filteredIncidents) : this._renderTimelineView(filteredIncidents)}
    `;
  }

  private _renderListView(incidents: Incident[]) {
    return html`
      <div class="incidents-list">
        ${incidents.map(i => html`
          <div 
            class="incident-card ${this._selectedIncident?.id === i.id ? 'selected' : ''}"
            @click=${() => this._selectIncident(i)}
          >
            <div class="incident-header">
              <div>
                <div class="incident-id">${i.id}</div>
                <div class="incident-title">${i.title}</div>
              </div>
              <div class="incident-badges">
                <span class="badge severity-${i.severity}">
                  ${i.severity === 'critical' ? '严重' : i.severity === 'high' ? '高' : i.severity === 'medium' ? '中' : '低'}
                </span>
                <span class="badge status-${i.status}">
                  ${STATUS_LABELS[i.status]}
                </span>
              </div>
            </div>
            <div class="incident-meta">
              <span>类型: ${TYPE_LABELS[i.type]}</span>
              <span>负责人: ${i.assignee}</span>
              <span>更新: ${this._formatDate(i.updatedAt)}</span>
            </div>
            <div class="incident-assets">
              ${i.affectedAssets.map(a => html`<span class="asset-tag">${a}</span>`)}
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private _renderTimelineView(incidents: Incident[]) {
    const selected = this._selectedIncident || incidents[0];

    return html`
      <div class="timeline-view">
        <div class="incidents-list" style="max-height: 600px; overflow-y: auto;">
          ${incidents.map(i => html`
            <div 
              class="incident-card ${selected?.id === i.id ? 'selected' : ''}"
              @click=${() => this._selectedIncident = i}
            >
              <div class="incident-header">
                <div>
                  <div class="incident-id">${i.id}</div>
                  <div class="incident-title">${i.title}</div>
                </div>
                <span class="badge severity-${i.severity}">
                  ${i.severity === 'critical' ? '严重' : i.severity === 'high' ? '高' : '中'}
                </span>
              </div>
            </div>
          `)}
        </div>

        ${selected ? html`
          <div class="detail-panel">
            <h3 style="margin-bottom: var(--spacing-md);">${selected.title}</h3>
            
            <div class="detail-section">
              <div class="detail-label">描述</div>
              <div class="detail-value">${selected.description}</div>
            </div>

            <div class="detail-section">
              <div class="detail-label">时间线</div>
              <div class="timeline">
                ${selected.timeline.map(t => html`
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-time">${this._formatDate(t.timestamp)}</div>
                    <div class="timeline-action">${t.action}</div>
                    ${t.details ? html`<div class="timeline-details">${t.details}</div>` : ''}
                    <div class="timeline-user">操作人: ${t.user}</div>
                  </div>
                `)}
              </div>
            </div>

            <div class="actions-bar">
              <button class="btn">更新状态</button>
              <button class="btn">添加备注</button>
              <button class="btn btn-primary">导出报告</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-incidents-page': ScIncidentsPage;
  }
}
