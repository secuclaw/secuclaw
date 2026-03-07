/**
 * SecuClaw Header Component
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('sc-header')
export class ScHeader extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    header {
      height: var(--header-height);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--spacing-lg);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .logo-icon {
      width: 32px;
      height: 32px;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .logo-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--border-radius);
      background: transparent;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .menu-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: rgba(16, 185, 129, 0.1);
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--color-success);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success);
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .user-menu:hover {
      background: var(--bg-hover);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
    }
  `;

  private _toggleMenu() {
    this.dispatchEvent(new CustomEvent('toggle-sidebar', { bubbles: true }));
  }

  render() {
    return html`
      <header>
        <div class="logo">
          <button class="menu-btn" @click=${this._toggleMenu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          <img src="./favicon.svg" alt="SecuClaw" class="logo-icon" />
          <div>
            <div class="logo-text">SecuClaw</div>
            <div class="logo-subtitle">安爪安全控制台</div>
          </div>
        </div>

        <div class="actions">
          <div class="status-badge">
            <span class="status-dot"></span>
            系统运行中
          </div>

          <div class="user-menu">
            <div class="user-avatar">管</div>
          </div>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-header': ScHeader;
  }
}
