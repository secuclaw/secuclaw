import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { connectionState, connectionUrl, initGateway, connectGateway } from '../../services/gateway';
import { t, I18nController } from '../../i18n';
import '../views/basic-views';
import '../skills/skills-market-view';
import '../settings/settings-view';
import '../ai-experts/ai-experts-view';
import '../language-switcher';

// Security roles - using translation keys
const SECURITY_ROLES = [
  { id: 'security-expert', nameKey: 'roles.securityExpert', descKey: 'roles.securityExpertDesc', emoji: '🛡️' },
  { id: 'privacy-security-officer', nameKey: 'roles.privacyOfficer', descKey: 'roles.privacyOfficerDesc', emoji: '🔒' },
  { id: 'security-architect', nameKey: 'roles.securityArchitect', descKey: 'roles.securityArchitectDesc', emoji: '🏗️' },
  { id: 'business-security-officer', nameKey: 'roles.businessSecurityOfficer', descKey: 'roles.businessSecurityOfficerDesc', emoji: '💼' },
  { id: 'chief-security-architect', nameKey: 'roles.ciso', descKey: 'roles.cisoDesc', emoji: '👔' },
  { id: 'supply-chain-security-officer', nameKey: 'roles.supplyChainOfficer', descKey: 'roles.supplyChainOfficerDesc', emoji: '🔗' },
  { id: 'business-security-operations', nameKey: 'roles.securityOpsOfficer', descKey: 'roles.securityOpsOfficerDesc', emoji: '⚙️' },
  { id: 'secuclaw-commander', nameKey: 'roles.commander', descKey: 'roles.commanderDesc', emoji: '🎖️' },
];

// 导航分组
const NAV_GROUPS = [
  { id: 'builtin', labelKey: 'nav.builtin', items: ['ai-experts', 'dashboard', 'knowledge'] },
  { id: 'skills', labelKey: 'nav.skills', items: ['skills-market', 'settings'] },
  { id: 'extensions', labelKey: 'nav.extensions', items: ['messaging', 'threat-intel', 'security-incidents', 'vulnerability-management', 'analysis-reports', 'compliance-audit', 'security-risk', 'warroom'] },
];

const NAV_ITEMS_MAP: Record<string, { id: string; labelKey: string; icon: string; color: string }> = {
  'ai-experts': { id: 'ai-experts', labelKey: 'nav.chat', icon: '🤖', color: '#3b82f6' },
  'skills-market': { id: 'skills-market', labelKey: 'nav.skills', icon: '📦', color: '#a855f7' },
  settings: { id: 'settings', labelKey: 'nav.settings', icon: '⚙️', color: '#64748b' },
  dashboard: { id: 'dashboard', labelKey: 'nav.dashboard', icon: '📊', color: '#3b82f6' },
  knowledge: { id: 'knowledge', labelKey: 'nav.knowledge', icon: '🧠', color: '#6366f1' },
  'threat-intel': { id: 'threat-intel', labelKey: 'nav.threatIntel', icon: '🔍', color: '#ef4444' },
  'security-incidents': { id: 'security-incidents', labelKey: 'nav.securityIncidents', icon: '🚨', color: '#ef4444' },
  'vulnerability-management': { id: 'vulnerability-management', labelKey: 'nav.vulnManagement', icon: '🔴', color: '#f97316' },
  'analysis-reports': { id: 'analysis-reports', labelKey: 'nav.analysisReports', icon: '📈', color: '#3b82f6' },
  'compliance-audit': { id: 'compliance-audit', labelKey: 'nav.compliance', icon: '📝', color: '#06b6d4' },
  'security-risk': { id: 'security-risk', labelKey: 'nav.securityRisk', icon: '⚡', color: '#f59e0b' },
  'warroom': { id: 'warroom', labelKey: 'nav.warroom', icon: '🎯', color: '#f97316' },
  'messaging': { id: 'messaging', labelKey: 'nav.messaging', icon: '💬', color: '#8b5cf6' },
};

@customElement('app-layout')
export class AppLayout extends LitElement {
  static styles = css`
    :host {
      display: flex;
      width: 100vw;
      height: 100vh;
      background: #0f0f1a;
      color: #fff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    aside {
      width: 260px;
      background: #1a1a2e;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #2a2a4a;
    }

    .logo {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #2a2a4a;
    }

    .logo h1 {
      font-size: 1.25rem;
      margin: 0 0 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo-subtitle {
      font-size: 0.7rem;
      color: #666;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #0f0f1a;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.75rem;
      color: #888;
    }

    .connection-status.connected {
      color: #22c55e;
    }

    .connection-status.connecting {
      color: #f59e0b;
    }

    .connection-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #666;
    }

    .connection-dot.connected {
      background: #22c55e;
    }

    .connection-dot.connecting {
      background: #f59e0b;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .connect-btn {
      padding: 0.25rem 0.5rem;
      font-size: 0.65rem;
      background: #3b82f6;
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
    }

    .connect-btn:hover {
      background: #2563eb;
    }

    .connect-btn:disabled {
      background: #4a4a6a;
      cursor: not-allowed;
    }

    nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 1.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #a0a0b0;
      cursor: pointer;
      font-size: 0.9rem;
      text-align: left;
      transition: all 0.2s;
    }

    .nav-item:hover {
      background: #2a2a4a;
    }

    .nav-item.active {
      background: #4a4a6a;
    }

    .nav-group {
      margin-bottom: 0.5rem;
    }

    .nav-group-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.7rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: color 0.2s;
    }

    .nav-group-header:hover {
      color: #888;
    }

    .nav-group-header .arrow {
      font-size: 0.6rem;
      transition: transform 0.2s;
    }

    .nav-group-header .arrow.collapsed {
      transform: rotate(-90deg);
    }

    .nav-group-items {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .nav-group-items.collapsed {
      display: none;
    }

    .nav-icon {
      font-size: 1.1rem;
    }

    main {
      flex: 1;
      overflow: auto;
      background: #0f0f1a;
    }

    .role-selector {
      margin-bottom: 1rem;
    }

    .role-selector-title {
      font-size: 0.7rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .role-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.25rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #fff;
      cursor: pointer;
      text-align: left;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .role-item:hover {
      background: #2a2a4a;
    }

    .role-item.active {
      background: #4a4a6a;
    }

    .role-emoji {
      font-size: 1rem;
    }

    .role-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  // i18n controller for reactive language updates
  private i18n = new I18nController(this);

  @state()
  private currentPage = 'dashboard';

  private installedSkills = [
    'dashboard', 'knowledge',
    // Extension skills
    'messaging', 'threat-intel', 'security-incidents', 'vulnerability-management',
    'analysis-reports', 'compliance-audit', 'security-risk', 'warroom'
  ];

  @state()
  private selectedRole = 'security-expert';

  @state()
  private collapsedGroups: Set<string> = new Set();

  connectedCallback() {
    super.connectedCallback();
    this.loadInstalledSkills();
    initGateway();
    connectionState.subscribe(() => {
      this.requestUpdate();
    });
    // Auto-connect on page load
    setTimeout(() => {
      if (connectionState.value !== 'connected') {
        connectGateway();
      }
    }, 500);
  }

  private loadInstalledSkills() {
    const saved = localStorage.getItem('secuclaw-installed-skills');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const uniqueSkills = [...new Set(parsed)];
        if (uniqueSkills.length !== parsed.length) {
          console.log('[Skills] Found duplicate skills, resetting to defaults');
          this.installedSkills = ['dashboard', 'knowledge'];
          localStorage.setItem('secuclaw-installed-skills', JSON.stringify(this.installedSkills));
        } else {
          this.installedSkills = uniqueSkills;
        }
      } catch {
        // use default
      }
    }
  }

  private saveInstalledSkills() {
    localStorage.setItem('secuclaw-installed-skills', JSON.stringify(this.installedSkills));
  }

  private renderConnectionStatus() {
    const connState = connectionState.value;
    const url = connectionUrl.value;
    
    const statusText = connState === 'connected' 
      ? t('connection.connected') 
      : connState === 'connecting' 
        ? t('connection.connecting') 
        : t('connection.disconnected');
    
    return html`
      <div class="connection-status ${connState}">
        <span class="connection-dot ${connState}"></span>
        <span style="flex: 1">${statusText} ${url}</span>
        ${connState !== 'connected' ? html`
          <button 
            class="connect-btn"
            @click=${() => connectGateway()}
            ?disabled=${connState === 'connecting'}
          >
            ${connState === 'connecting' ? '...' : t('connection.connect')}
          </button>
        ` : ''}
      </div>
    `;
  }

  private renderNavItems() {
    return NAV_GROUPS.map(group => {
      const groupItems = group.items
        .map(itemId => NAV_ITEMS_MAP[itemId])
        .filter(item => {
          if (!item) return false;
          if (group.id === 'core' || group.id === 'builtin' || group.id === 'skills') return true;
          return this.installedSkills.includes(item.id);
        });

      if (groupItems.length === 0) return null;

      const isCollapsed = this.collapsedGroups.has(group.id);

      return html`
        <div class="nav-group">
          <div class="nav-group-header" @click=${() => this.toggleGroup(group.id)}>
            <span class="arrow ${isCollapsed ? 'collapsed' : ''}">▼</span>
            <span>${t(group.labelKey)}</span>
          </div>
          <div class="nav-group-items ${isCollapsed ? 'collapsed' : ''}">
            ${groupItems.map(item => html`
              <button 
                class="nav-item ${this.currentPage === item.id ? 'active' : ''}"
                style="--nav-color: ${item.color}"
                @click=${() => this.currentPage = item.id}
              >
                <span class="nav-icon">${item.icon}</span>
                <span style="flex: 1">${t(item.labelKey)}</span>
              </button>
            `)}
          </div>
        </div>
      `;
    });
  }

  private toggleGroup(groupId: string) {
    const newCollapsed = new Set(this.collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    this.collapsedGroups = newCollapsed;
  }

  private renderRoleSelector() {
    if (this.currentPage !== 'chat') return null;

    return html`
      <div class="role-selector">
        <div class="role-selector-title">${t('roles.selectRole')}</div>
        ${SECURITY_ROLES.map(role => html`
          <button 
            class="role-item ${this.selectedRole === role.id ? 'active' : ''}"
            @click=${() => this.selectedRole = role.id}
            title=${t(role.descKey)}
          >
            <span class="role-emoji">${role.emoji}</span>
            <span class="role-name">${t(role.nameKey)}</span>
          </button>
        `)}
      </div>
    `;
  }

  private renderMainContent() {
    switch (this.currentPage) {
      case 'dashboard':
        return html`<dashboard-view .roleId=${this.selectedRole}></dashboard-view>`;
      case 'chat':
        return html`<chat-view .roleId=${this.selectedRole}></chat-view>`;
      case 'knowledge':
        return html`<knowledge-view></knowledge-view>`;
      case 'threat-intel':
        return html`<threat-intel-view></threat-intel-view>`;
      case 'security-incidents':
        return html`<security-incidents-view></security-incidents-view>`;
      case 'vulnerability-management':
        return html`<vulnerability-management-view></vulnerability-management-view>`;
      case 'analysis-reports':
        return html`<analysis-reports-view></analysis-reports-view>`;
      case 'compliance-audit':
        return html`<compliance-audit-view></compliance-audit-view>`;
      case 'security-risk':
        return html`<security-risk-view></security-risk-view>`;
      case 'warroom':
        return html`<warroom-view></warroom-view>`;
      case 'messaging':
        return html`<messaging-view></messaging-view>`;
      case 'ai-experts':
        return html`<ai-experts-view></ai-experts-view>`;
      case 'skills-market':
        return html`<skills-market-view .roleId=${this.selectedRole} .installedSkills=${this.installedSkills} @skill-toggle=${this.handleSkillToggle}></skills-market-view>`;
      case 'settings':
        return html`<settings-view></settings-view>`;
      default:
        return html`<dashboard-view></dashboard-view>`;
    }
  }

  private handleSkillToggle = (e: CustomEvent) => {
    const { skillId, enabled } = e.detail;
    if (enabled) {
      if (!this.installedSkills.includes(skillId)) {
        this.installedSkills = [...new Set([...this.installedSkills, skillId])];
      }
    } else {
      this.installedSkills = this.installedSkills.filter(id => id !== skillId);
    }
    this.saveInstalledSkills();
  };

  render() {
    return html`
      <aside>
        <div class="logo">
          <h1><span>🛡️</span> SecuClaw</h1>
          <div class="logo-subtitle">${t('app.subtitle')}</div>
          <div style="margin-top: 0.75rem;">
            <language-switcher></language-switcher>
          </div>
        </div>

        ${this.renderConnectionStatus()}

        <nav>
          ${this.renderNavItems()}
        </nav>

        ${this.renderRoleSelector()}
      </aside>

      <main>
        ${this.renderMainContent()}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-layout': AppLayout;
  }
}
