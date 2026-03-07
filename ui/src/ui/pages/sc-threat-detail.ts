/**
 * SecuClaw Threat Detail Page
 * 
 * Features:
 * - IOC (Indicators of Compromise) details
 * - Related threats analysis
 * - MITRE ATT&CK mapping
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface IOC {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email';
  value: string;
  confidence: 'high' | 'medium' | 'low';
  firstSeen: Date;
  lastSeen: Date;
  sources: string[];
}

interface RelatedThreat {
  id: string;
  name: string;
  similarity: number;
}

interface MITRETechnique {
  id: string;
  name: string;
  tactics: string[];
}

interface ThreatDetail {
  id: string;
  name: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'mitigated' | 'false-positive';
  description: string;
  iocs: IOC[];
  relatedThreats: RelatedThreat[];
  mitreTechniques: MITRETechnique[];
  tags: string[];
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedSystems: string[];
  killChain: { phase: string; status: 'detected' | 'prevented' | 'unknown' }[];
}

@customElement('sc-threat-detail')
export class ScThreatDetail extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .detail-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--spacing-lg);
    }

    .main-panel {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .side-panel {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: var(--spacing-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
    }

    .threat-title {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .threat-id {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .badges {
      display: flex;
      gap: var(--spacing-sm);
    }

    .badge {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .severity-critical { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }
    .severity-high { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .severity-medium { background: rgba(6, 182, 212, 0.2); color: var(--color-info); }
    .severity-low { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }

    .description {
      color: var(--text-secondary);
      line-height: 1.6;
    }

    /* IOC Table */
    .ioc-table {
      width: 100%;
      border-collapse: collapse;
    }

    .ioc-table th,
    .ioc-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.875rem;
    }

    .ioc-table th {
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      font-size: 0.75rem;
    }

    .ioc-value {
      font-family: monospace;
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    .ioc-type {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .type-icon {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .confidence-high { color: var(--color-success); }
    .confidence-medium { color: var(--color-warning); }
    .confidence-low { color: var(--color-danger); }

    /* MITRE ATT&CK */
    .mitre-grid {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .mitre-item {
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .mitre-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--color-primary);
    }

    .mitre-name {
      font-weight: 500;
      margin-top: var(--spacing-xs);
    }

    .mitre-tactics {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-xs);
    }

    .tactic-tag {
      font-size: 0.625rem;
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-muted);
    }

    /* Related Threats */
    .related-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .related-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm);
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .related-item:hover {
      background: var(--bg-hover);
    }

    .similarity-bar {
      width: 60px;
      height: 4px;
      background: var(--bg-secondary);
      border-radius: 2px;
      overflow: hidden;
    }

    .similarity-fill {
      height: 100%;
      background: var(--color-primary);
    }

    /* Kill Chain */
    .kill-chain {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .kill-chain-phase {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) 0;
    }

    .phase-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .phase-detected { background: var(--color-warning); }
    .phase-prevented { background: var(--color-success); }
    .phase-unknown { background: var(--bg-tertiary); }

    .phase-name {
      flex: 1;
      font-size: 0.875rem;
    }

    .phase-status {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Actions */
    .actions-bar {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-lg);
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

    .btn-danger {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Tags */
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .tag {
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Confidence Score */
    .confidence-score {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .score-high { background: rgba(16, 185, 129, 0.2); color: var(--color-success); }
    .score-medium { background: rgba(245, 158, 11, 0.2); color: var(--color-warning); }
    .score-low { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); }

    .score-label {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 1024px) {
      .detail-container {
        grid-template-columns: 1fr;
      }
    }
  `;

  @property({ type: String })
  threatId = '';

  @state()
  private _threat: ThreatDetail = this._getMockThreat();

  private _getMockThreat(): ThreatDetail {
    return {
      id: 'T001',
      name: 'APT28 鱼叉式钓鱼攻击活动',
      type: 'APT',
      severity: 'critical',
      status: 'active',
      description: 'APT28（又称 Fancy Bear、Sofacy）是一个与俄罗斯军事情报机构相关的网络间谍组织。该组织自2000年代中期以来一直活跃，主要针对政府、军事和安全机构进行网络间谍活动。本次攻击活动使用鱼叉式钓鱼邮件作为初始入侵手段，邮件伪装成合法的组织或个人，诱导目标打开恶意附件或点击恶意链接。',
      iocs: [
        { type: 'ip', value: '192.168.1.100', confidence: 'high', firstSeen: new Date('2024-01-15'), lastSeen: new Date('2024-03-01'), sources: ['VirusTotal', 'AlienVault'] },
        { type: 'domain', value: 'secure-login-microsoft.com', confidence: 'high', firstSeen: new Date('2024-01-20'), lastSeen: new Date('2024-03-01'), sources: ['VirusTotal'] },
        { type: 'hash', value: 'a1b2c3d4e5f6789012345678901234567890abcd', confidence: 'high', firstSeen: new Date('2024-02-01'), lastSeen: new Date('2024-02-28'), sources: ['Hybrid Analysis'] },
        { type: 'url', value: 'https://secure-login-microsoft.com/office365/login', confidence: 'medium', firstSeen: new Date('2024-02-05'), lastSeen: new Date('2024-03-01'), sources: ['PhishTank'] },
        { type: 'email', value: 'support@microsoft-services.com', confidence: 'medium', firstSeen: new Date('2024-01-25'), lastSeen: new Date('2024-02-20'), sources: ['Internal'] },
      ],
      relatedThreats: [
        { id: 'T002', name: 'Emotet 僵尸网络变种', similarity: 0.65 },
        { id: 'T003', name: 'TrickBot 银行木马', similarity: 0.45 },
        { id: 'T004', name: 'Ryuk 勒索软件', similarity: 0.35 },
      ],
      mitreTechniques: [
        { id: 'T1566.001', name: 'Spearphishing Attachment', tactics: ['Initial Access'] },
        { id: 'T1566.002', name: 'Spearphishing Link', tactics: ['Initial Access'] },
        { id: 'T1059.001', name: 'PowerShell', tactics: ['Execution'] },
        { id: 'T1055', name: 'Process Injection', tactics: ['Defense Evasion', 'Privilege Escalation'] },
        { id: 'T1071.001', name: 'Web Protocols', tactics: ['Command and Control'] },
      ],
      tags: ['APT', '俄罗斯', '鱼叉式钓鱼', '间谍活动', '政府目标'],
      confidence: 92,
      firstSeen: new Date('2024-01-15'),
      lastSeen: new Date('2024-03-01'),
      affectedSystems: ['Windows Workstations', 'Microsoft 365', 'Active Directory'],
      killChain: [
        { phase: '侦察', status: 'detected' },
        { phase: '武器化', status: 'detected' },
        { phase: '交付', status: 'detected' },
        { phase: '利用', status: 'detected' },
        { phase: '安装', status: 'prevented' },
        { phase: '命令控制', status: 'prevented' },
        { phase: '目标达成', status: 'unknown' },
      ],
    };
  }

  private _getIOCTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'ip': 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      'domain': 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9 12h6M12 9v6',
      'url': 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      'hash': 'M4 4h16v16H4zM9 9h6v6H9z',
      'email': 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
    };
    return icons[type] || icons['ip'];
  }

  private _getConfidenceClass(confidence: number): string {
    if (confidence >= 80) return 'score-high';
    if (confidence >= 50) return 'score-medium';
    return 'score-low';
  }

  render() {
    const t = this._threat;

    return html`
      <div class="header-section">
        <div>
          <h1 class="threat-title">${t.name}</h1>
          <div class="threat-id">${t.id} · 首次发现: ${t.firstSeen.toLocaleDateString('zh-CN')}</div>
        </div>
        <div class="badges">
          <span class="badge severity-${t.severity}">
            ${t.severity === 'critical' ? '严重' : t.severity === 'high' ? '高' : t.severity === 'medium' ? '中' : '低'}
          </span>
          <span class="badge" style="background: var(--bg-tertiary); color: var(--text-secondary);">
            ${t.status === 'active' ? '活跃' : t.status === 'mitigated' ? '已缓解' : '误报'}
          </span>
        </div>
      </div>

      <div class="detail-container">
        <div class="main-panel">
          <!-- Description -->
          <div class="card">
            <h3 class="card-title">描述</h3>
            <p class="description">${t.description}</p>
            <div class="tags-container" style="margin-top: var(--spacing-md);">
              ${t.tags.map(tag => html`<span class="tag">${tag}</span>`)}
            </div>
          </div>

          <!-- IOCs -->
          <div class="card">
            <h3 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              IOC 指标 (${t.iocs.length})
            </h3>
            <table class="ioc-table">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>值</th>
                  <th>可信度</th>
                  <th>最后发现</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                ${t.iocs.map(ioc => html`
                  <tr>
                    <td>
                      <span class="ioc-type">
                        <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d=${this._getIOCTypeIcon(ioc.type)}/>
                        </svg>
                        ${ioc.type.toUpperCase()}
                      </span>
                    </td>
                    <td><code class="ioc-value">${ioc.value}</code></td>
                    <td class="confidence-${ioc.confidence}">
                      ${ioc.confidence === 'high' ? '高' : ioc.confidence === 'medium' ? '中' : '低'}
                    </td>
                    <td>${ioc.lastSeen.toLocaleDateString('zh-CN')}</td>
                    <td>${ioc.sources.join(', ')}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>

          <!-- MITRE ATT&CK -->
          <div class="card">
            <h3 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
                <line x1="12" y1="22" x2="12" y2="15.5"/>
                <polyline points="22 8.5 12 15.5 2 8.5"/>
              </svg>
              MITRE ATT&CK 技术
            </h3>
            <div class="mitre-grid">
              ${t.mitreTechniques.map(tech => html`
                <div class="mitre-item">
                  <div class="mitre-id">${tech.id}</div>
                  <div class="mitre-name">${tech.name}</div>
                  <div class="mitre-tactics">
                    ${tech.tactics.map(tactic => html`<span class="tactic-tag">${tactic}</span>`)}
                  </div>
                </div>
              `)}
            </div>
          </div>

          <!-- Actions -->
          <div class="actions-bar">
            <button class="btn btn-primary">创建事件</button>
            <button class="btn">导出 IOC</button>
            <button class="btn">添加到黑名单</button>
            <button class="btn btn-danger">标记为误报</button>
          </div>
        </div>

        <div class="side-panel">
          <!-- Confidence Score -->
          <div class="card">
            <h3 class="card-title">威胁可信度</h3>
            <div class="confidence-score">
              <div class="score-circle ${this._getConfidenceClass(t.confidence)}">
                ${t.confidence}%
              </div>
              <div>
                <div style="font-weight: 600;">高可信度</div>
                <div class="score-label">基于 ${t.iocs.length} 个 IOC</div>
              </div>
            </div>
          </div>

          <!-- Kill Chain -->
          <div class="card">
            <h3 class="card-title">攻击链分析</h3>
            <div class="kill-chain">
              ${t.killChain.map(phase => html`
                <div class="kill-chain-phase">
                  <div class="phase-indicator phase-${phase.status}"></div>
                  <span class="phase-name">${phase.phase}</span>
                  <span class="phase-status">
                    ${phase.status === 'detected' ? '已检测' : phase.status === 'prevented' ? '已阻止' : '未知'}
                  </span>
                </div>
              `)}
            </div>
          </div>

          <!-- Related Threats -->
          <div class="card">
            <h3 class="card-title">关联威胁</h3>
            <div class="related-list">
              ${t.relatedThreats.map(rt => html`
                <div class="related-item">
                  <div>
                    <div style="font-size: 0.875rem;">${rt.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${rt.id}</div>
                  </div>
                  <div class="similarity-bar">
                    <div class="similarity-fill" style="width: ${rt.similarity * 100}%"></div>
                  </div>
                </div>
              `)}
            </div>
          </div>

          <!-- Affected Systems -->
          <div class="card">
            <h3 class="card-title">影响系统</h3>
            <div class="tags-container">
              ${t.affectedSystems.map(sys => html`<span class="tag">${sys}</span>`)}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-threat-detail': ScThreatDetail;
  }
}
