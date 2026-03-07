/**
 * SecuClaw Settings Page Component
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
}

const SECTIONS: SettingsSection[] = [
  { id: 'ai-experts', title: 'AI安全专家配置', icon: 'users' },
  { id: 'llm-service', title: 'LLM服务配置', icon: 'server' },
  { id: 'general', title: '常规设置', icon: 'settings' },
  { id: 'security', title: '安全设置', icon: 'shield' },
  { id: 'notifications', title: '通知设置', icon: 'bell' },
  { id: 'integrations', title: '集成配置', icon: 'plug' },
  { id: 'api', title: 'API 设置', icon: 'code' },
  { id: 'about', title: '关于', icon: 'info' },
];

@customElement('sc-settings-page')
export class ScSettingsPage extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .settings-layout {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: var(--spacing-lg);
    }

    .settings-nav {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-sm);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .nav-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-primary);
    }

    .nav-icon {
      width: 18px;
      height: 18px;
    }

    .settings-content {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .setting-group {
      margin-bottom: var(--spacing-lg);
    }

    .setting-label {
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
    }

    .setting-description {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: var(--spacing-sm);
    }

    .setting-input {
      width: 100%;
      max-width: 400px;
    }

    .setting-toggle {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--bg-tertiary);
      border-radius: 12px;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .toggle-switch.active {
      background: var(--color-primary);
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform var(--transition-fast);
    }

    .toggle-switch.active::after {
      transform: translateX(20px);
    }

    .btn-save {
      background: var(--color-primary);
      color: white;
      padding: var(--spacing-sm) var(--spacing-lg);
      border-radius: var(--border-radius);
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: background var(--transition-fast);
    }

    .btn-save:hover {
      background: var(--color-primary-dark);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
    }

    .api-key-display {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .api-key {
      font-family: monospace;
      background: var(--bg-tertiary);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      flex: 1;
    }

    .btn-icon {
      padding: var(--spacing-sm);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .btn-icon:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  `;

  @state()
  private _activeSection = 'general';

  @state()
  private _settings = {
    siteName: 'SecuClaw',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    twoFactorEnabled: true,
    sessionTimeout: 30,
    notificationsEmail: true,
    notificationsSlack: false,
    notificationsWeb: true,
  };

  private _getIconPath(icon: string): string {
    const icons: Record<string, string> = {
      'settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
      'shield': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      'bell': 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
      'plug': 'M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8h12z',
      'code': 'M16 18l6-6-6-6M8 6l-6 6 6 6',
      'info': 'M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zM12 16v-4M12 8h.01',
    };
    return icons[icon] || icons['settings'];
  }

  private _renderSectionContent(): unknown {
    switch (this._activeSection) {
      case 'general':
        return html`
          <div class="setting-group">
            <label class="setting-label">站点名称</label>
            <p class="setting-description">显示在浏览器标题栏和页面标题中</p>
            <input type="text" class="setting-input" .value=${this._settings.siteName} />
          </div>
          <div class="form-row">
            <div class="setting-group">
              <label class="setting-label">语言</label>
              <select class="setting-input">
                <option value="zh-CN" ?selected=${this._settings.language === 'zh-CN'}>简体中文</option>
                <option value="en-US" ?selected=${this._settings.language === 'en-US'}>English</option>
              </select>
            </div>
            <div class="setting-group">
              <label class="setting-label">时区</label>
              <select class="setting-input">
                <option value="Asia/Shanghai" ?selected=${this._settings.timezone === 'Asia/Shanghai'}>Asia/Shanghai (UTC+8)</option>
                <option value="UTC" ?selected=${this._settings.timezone === 'UTC'}>UTC</option>
              </select>
            </div>
          </div>
        `;
      case 'security':
        return html`
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.twoFactorEnabled ? 'active' : ''}"
                @click=${() => this._settings = { ...this._settings, twoFactorEnabled: !this._settings.twoFactorEnabled }}
              ></div>
              <span>启用双因素认证</span>
            </div>
            <p class="setting-description">为账户添加额外的安全保护层</p>
          </div>
          <div class="setting-group">
            <label class="setting-label">会话超时时间 (分钟)</label>
            <p class="setting-description">用户无操作后自动登出的时间</p>
            <input type="number" class="setting-input" .value=${String(this._settings.sessionTimeout)} />
          </div>
        `;
      case 'notifications':
        return html`
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.notificationsEmail ? 'active' : ''}"
                @click=${() => this._settings = { ...this._settings, notificationsEmail: !this._settings.notificationsEmail }}
              ></div>
              <span>邮件通知</span>
            </div>
            <p class="setting-description">通过邮件接收安全告警</p>
          </div>
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.notificationsSlack ? 'active' : ''}"
                @click=${() => this._settings = { ...this._settings, notificationsSlack: !this._settings.notificationsSlack }}
              ></div>
              <span>Slack 通知</span>
            </div>
            <p class="setting-description">通过 Slack 接收安全告警</p>
          </div>
          <div class="setting-group">
            <div class="setting-toggle">
              <div 
                class="toggle-switch ${this._settings.notificationsWeb ? 'active' : ''}"
                @click=${() => this._settings = { ...this._settings, notificationsWeb: !this._settings.notificationsWeb }}
              ></div>
              <span>Web 通知</span>
            </div>
            <p class="setting-description">在浏览器中显示通知</p>
          </div>
        `;
      case 'api':
        return html`
          <div class="setting-group">
            <label class="setting-label">API 密钥</label>
            <p class="setting-description">用于访问 SecuClaw API 的密钥</p>
            <div class="api-key-display">
              <code class="api-key">sk-****************************</code>
              <button class="btn-icon" title="复制">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button class="btn-icon" title="重新生成">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            </div>
          </div>
        `;
      case 'about':
        return html`
          <div class="setting-group">
            <label class="setting-label">SecuClaw 安爪安全平台</label>
            <p class="setting-description">AI 驱动的企业安全运营平台</p>
            <p style="margin-top: var(--spacing-md);">
              <strong>版本:</strong> 1.0.0<br/>
              <strong>构建日期:</strong> ${new Date().toLocaleDateString('zh-CN')}<br/>
              <strong>许可证:</strong> MIT
            </p>
          </div>
        `;
      default:
        return html`<p>选择一个设置类别</p>`;
    }
  }

  render() {
    return html`
      <div class="settings-layout">
        <!-- Settings Navigation -->
        <nav class="settings-nav">
          ${SECTIONS.map(s => html`
            <div 
              class="nav-item ${this._activeSection === s.id ? 'active' : ''}"
              @click=${() => this._activeSection = s.id}
            >
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d=${this._getIconPath(s.icon)}/>
              </svg>
              ${s.title}
            </div>
          `)}
        </nav>

        <!-- Settings Content -->
        <div class="settings-content">
          <h2 class="section-title">
            ${SECTIONS.find(s => s.id === this._activeSection)?.title || '设置'}
          </h2>
          
          ${this._renderSectionContent()}

          <div style="margin-top: var(--spacing-xl);">
            <button class="btn-save">保存更改</button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-settings-page': ScSettingsPage;
  }
}
