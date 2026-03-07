import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { I18nController } from '../../i18n';

const ALL_SKILLS = [
  { 
    id: 'dashboard', 
    label: '仪表盘', 
    icon: '📊', 
    color: '#3b82f6',
    description: '安全态势总览仪表盘',
    category: 'builtin'
  },
  { 
    id: 'knowledge', 
    label: '知识库', 
    icon: '🧠', 
    color: '#6366f1',
    description: 'MITRE ATT&CK 和 SCF 知识库',
    category: 'builtin'
  },
  { 
    id: 'threat-intel', 
    label: '威胁情报', 
    icon: '🔍', 
    color: '#ef4444',
    description: '威胁情报收集与分析',
    category: 'extension'
  },
  { 
    id: 'security-incidents', 
    label: '安全事件', 
    icon: '🚨', 
    color: '#ef4444',
    description: '安全事件管理与响应',
    category: 'extension'
  },
  { 
    id: 'vulnerability-management', 
    label: '漏洞管理', 
    icon: '🔴', 
    color: '#f97316',
    description: '漏洞扫描与修复跟踪',
    category: 'extension'
  },
  { 
    id: 'analysis-reports', 
    label: '分析报告', 
    icon: '📈', 
    color: '#3b82f6',
    description: '安全分析与报告生成',
    category: 'extension'
  },
  { 
    id: 'compliance-audit', 
    label: '合规审计', 
    icon: '📝', 
    color: '#06b6d4',
    description: '合规性审计与管理',
    category: 'extension'
  },
  { 
    id: 'security-risk', 
    label: '安全风险', 
    icon: '⚡', 
    color: '#f59e0b',
    description: '企业风险评估与管理',
    category: 'extension'
  },
  { 
    id: 'warroom', 
    label: '作战室', 
    icon: '🎯', 
    color: '#f97316',
    description: '安全事件指挥作战室',
    category: 'extension'
  },
  { 
    id: 'messaging', 
    label: '消息收发', 
    icon: '💬', 
    color: '#8b5cf6',
    description: '消息收发与通讯管理',
    category: 'extension'
  } 
];

@customElement('skills-market-view')
export class SkillsMarketView extends LitElement {

  @property({ type: Array })
  installedSkills: string[] = [];

  private _installedSkills: string[] = [];

  // i18n controller for reactive language updates
  private i18n = new I18nController(this);

  connectedCallback() {
    super.connectedCallback();
    this._installedSkills = [...this.installedSkills];
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('installedSkills')) {
      this._installedSkills = [...this.installedSkills];
    }
  }

  static styles = css`
    :host {
      display: block;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      color: #a0a0b0;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .skill-card {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 1.25rem;
      border: 1px solid #2a2a4a;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      transition: all 0.2s;
    }
    .skill-card:hover {
      border-color: var(--skill-color, #3b82f6);
    }
    .skill-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }
    .skill-info {
      flex: 1;
      min-width: 0;
    }
    .skill-name {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .skill-desc {
      font-size: 0.8rem;
      color: #888;
    }
    .skill-toggle {
      flex-shrink: 0;
    }
    .toggle-btn {
      width: 48px;
      height: 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
      background: #2a2a4a;
    }
    .toggle-btn.active {
      background: #22c55e;
    }
    .toggle-btn::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      transition: all 0.2s;
    }
    .toggle-btn.active::after {
      left: 26px;
    }
    .builtin-badge {
      display: inline-block;
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: #22c55e20;
      color: #22c55e;
      margin-left: 0.5rem;
    }
    .extension-badge {
      display: inline-block;
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: #a855f720;
      color: #a855f7;
    }

  `;

  private toggleSkill(skillId: string) {
    const isInstalled = this._installedSkills.includes(skillId);
    const newSkills = isInstalled
      ? this._installedSkills.filter(id => id !== skillId)
      : [...this._installedSkills, skillId];
    
    this._installedSkills = newSkills;
    
    this.dispatchEvent(new CustomEvent('skill-toggle', {
      detail: { skillId, enabled: !isInstalled },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const builtinSkills = ALL_SKILLS.filter(s => s.category === 'builtin');
    const extensionSkills = ALL_SKILLS.filter(s => s.category === 'extension');

    return html`
      <h1>📦 技能市场</h1>
      <p class="subtitle">安装和管理安全技能扩展</p>

      <div class="section-title">系统内置技能</div>
      <div class="skills-grid">
        ${builtinSkills.map(skill => this.renderSkillCard(skill))}
      </div>

      <div class="section-title">扩展技能</div>
      <div class="skills-grid">
        ${extensionSkills.map(skill => this.renderSkillCard(skill))}
      </div>
    `;
  }

  private renderSkillCard(skill: typeof ALL_SKILLS[0]) {
    const isInstalled = this._installedSkills.includes(skill.id);

    return html`
      <div class="skill-card" style="--skill-color: ${skill.color}">
        <div class="skill-icon">${skill.icon}</div>
        <div class="skill-info">
          <div class="skill-name">
            ${skill.label}
            <span class="${skill.category === 'builtin' ? 'builtin-badge' : 'extension-badge'}">
              ${skill.category === 'builtin' ? '内置' : '扩展'}
            </span>
          </div>
          <div class="skill-desc">${skill.description}</div>
        </div>
        <div class="skill-toggle">
          <button 
            class="toggle-btn ${isInstalled ? 'active' : ''}"
            @click=${() => this.toggleSkill(skill.id)}
            ?disabled=${skill.category === 'builtin'}
            title=${skill.category === 'builtin' ? '内置技能无法卸载' : ''}
          ></button>
        </div>
      </div>
    `;
  }
}
