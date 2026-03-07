/**
 * Stats Card Component
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type CardColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

@customElement('sc-stats-card')
export class ScStatsCard extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      transition: all var(--transition-fast);
    }

    .card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .card-title {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--border-radius);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-icon svg {
      width: 20px;
      height: 20px;
    }

    .card-icon.primary { background: rgba(59, 130, 246, 0.1); color: var(--color-primary); }
    .card-icon.success { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
    .card-icon.warning { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
    .card-icon.danger { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); }
    .card-icon.info { background: rgba(6, 182, 212, 0.1); color: var(--color-info); }

    .card-value {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: var(--spacing-xs);
    }

    .card-trend {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.75rem;
    }

    .trend-up { color: var(--color-success); }
    .trend-down { color: var(--color-danger); }
  `;

  @property({ type: String })
  title = '';

  @property({ type: String })
  value = '';

  @property({ type: String })
  trend = '';

  @property({ type: String })
  icon = 'activity';

  @property({ type: String })
  color: CardColor = 'primary';

  private _getIconPath(icon: string): string {
    const icons: Record<string, string> = {
      'alert-triangle': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
      'file-warning': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'bug': 'M8 2l1.88 1.88M14.12 3.88L16 2',
      'clipboard-check': 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 14l2 2 4-4',
      'activity': 'M22 12h-4l-3 9L9 3l-3 9H2',
    };
    return icons[icon] || icons['activity'];
  }

  private _isTrendUp(): boolean {
    return this.trend.startsWith('+');
  }

  render() {
    return html`
      <div class="card">
        <div class="card-header">
          <span class="card-title">${this.title}</span>
          <div class="card-icon ${this.color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d=${this._getIconPath(this.icon)}/>
            </svg>
          </div>
        </div>
        <div class="card-value">${this.value}</div>
        <div class="card-trend ${this._isTrendUp() ? 'trend-up' : 'trend-down'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this._isTrendUp() 
              ? html`<path d="M18 15l-6-6-6 6"/>`
              : html`<path d="M6 9l6 6 6-6"/>`}
          </svg>
          ${this.trend} 较上周
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-stats-card': ScStatsCard;
  }
}
