/**
 * SecuClaw Sidebar Component
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: 'grid' },
  { id: 'threats', label: '威胁情报', icon: 'alert-triangle', badge: 3 },
  { id: 'incidents', label: '安全事件', icon: 'file-warning' },
  { id: 'vulnerabilities', label: '漏洞管理', icon: 'bug', badge: 12 },
  { id: 'compliance', label: '合规审计', icon: 'clipboard-check' },
  { id: 'reports', label: '分析报告', icon: 'bar-chart' },
  { id: 'settings', label: '系统设置', icon: 'settings' },
];

@customElement('sc-sidebar')
export class ScSidebar extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: var(--sidebar-width);
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      transition: width var(--transition-normal);
      overflow: hidden;
    }

    :host([collapsed]) {
      width: 64px;
    }

    nav {
      padding: var(--spacing-md);
    }

    .nav-section {
      margin-bottom: var(--spacing-lg);
    }

    .nav-section-title {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      padding: var(--spacing-sm) var(--spacing-md);
      white-space: nowrap;
      overflow: hidden;
    }

    :host([collapsed]) .nav-section-title {
      opacity: 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
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
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-label {
      flex: 1;
      font-size: 0.875rem;
    }

    :host([collapsed]) .nav-label {
      opacity: 0;
      width: 0;
    }

    .nav-badge {
      background: var(--color-danger);
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 9999px;
      min-width: 18px;
      text-align: center;
    }

    :host([collapsed]) .nav-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 0.5rem;
      padding: 1px 4px;
    }

    .nav-item-wrapper {
      position: relative;
    }
  `;

  @property({ type: Boolean, reflect: true })
  collapsed = false;

  @property({ type: String })
  activeItem = 'dashboard';

  private _handleNavClick(item: NavItem) {
    this.activeItem = item.id;
    this.dispatchEvent(new CustomEvent('nav-change', {
      detail: { item },
      bubbles: true,
    }));
  }

  private _renderIcon(icon: string) {
    const icons: Record<string, string> = {
      'grid': 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
      'alert-triangle': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
      'file-warning': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M12 9v4 M12 17h.01',
      'bug': 'M8 2l1.88 1.88M14.12 3.88L16 2M9 22v-4.5M15 22v-4.5M12 12v6',
      'clipboard-check': 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14l2 2 4-4',
      'bar-chart': 'M12 20V10M18 20V4M6 20v-4',
      'settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    };

    const path = icons[icon] || icons['grid'];

    return html`
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d=${path}/>
      </svg>
    `;
  }

  render() {
    return html`
      <nav>
        <div class="nav-section">
          <div class="nav-section-title">导航菜单</div>
          ${NAV_ITEMS.map(item => html`
            <div class="nav-item-wrapper">
              <div 
                class="nav-item ${this.activeItem === item.id ? 'active' : ''}"
                @click=${() => this._handleNavClick(item)}
              >
                ${this._renderIcon(item.icon)}
                <span class="nav-label">${item.label}</span>
                ${item.badge ? html`<span class="nav-badge">${item.badge}</span>` : ''}
              </div>
            </div>
          `)}
        </div>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-sidebar': ScSidebar;
  }
}
