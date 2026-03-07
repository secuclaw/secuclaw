/**
 * SecuClaw Notification System
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  timestamp: Date;
}

// Notification store
const notifications = new Map<string, Notification>();
let notifyElement: ScNotifications | null = null;

export function notify(notification: Omit<Notification, 'id' | 'timestamp'>): string {
  const id = `notify-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fullNotification: Notification = {
    ...notification,
    id,
    timestamp: new Date(),
    duration: notification.duration ?? 5000,
  };

  notifications.set(id, fullNotification);
  notifyElement?.addNotification(fullNotification);

  // Auto remove after duration
  if (fullNotification.duration && fullNotification.duration > 0) {
    setTimeout(() => dismissNotification(id), fullNotification.duration);
  }

  return id;
}

export function dismissNotification(id: string): void {
  notifications.delete(id);
  notifyElement?.removeNotification(id);
}

export function clearAllNotifications(): void {
  notifications.clear();
  notifyElement?.clearAll();
}

@customElement('sc-notifications')
export class ScNotifications extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      top: calc(var(--header-height) + var(--spacing-md));
      right: var(--spacing-md);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      max-width: 400px;
      pointer-events: none;
    }

    .notification {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      display: flex;
      gap: var(--spacing-md);
      animation: slideIn 0.3s ease;
      pointer-events: auto;
      box-shadow: var(--shadow-lg);
    }

    .notification.removing {
      animation: slideOut 0.3s ease forwards;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .notification-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: var(--spacing-xs);
    }

    .notification-message {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .notification-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notification-close:hover {
      color: var(--text-primary);
    }

    /* Type colors */
    .notification.info { border-left: 3px solid var(--color-info); }
    .notification.success { border-left: 3px solid var(--color-success); }
    .notification.warning { border-left: 3px solid var(--color-warning); }
    .notification.error { border-left: 3px solid var(--color-danger); }

    .notification.info .notification-icon { color: var(--color-info); }
    .notification.success .notification-icon { color: var(--color-success); }
    .notification.warning .notification-icon { color: var(--color-warning); }
    .notification.error .notification-icon { color: var(--color-danger); }
  `;

  @state()
  private _notifications: Notification[] = [];

  connectedCallback() {
    super.connectedCallback();
    notifyElement = this;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (notifyElement === this) {
      notifyElement = null;
    }
  }

  addNotification(notification: Notification): void {
    this._notifications = [...this._notifications, notification];
  }

  removeNotification(id: string): void {
    const notification = this.shadowRoot?.querySelector(`[data-id="${id}"]`);
    if (notification) {
      notification.classList.add('removing');
      setTimeout(() => {
        this._notifications = this._notifications.filter(n => n.id !== id);
      }, 300);
    } else {
      this._notifications = this._notifications.filter(n => n.id !== id);
    }
  }

  clearAll(): void {
    this._notifications = [];
  }

  private _getIcon(type: string): string {
    const icons: Record<string, string> = {
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return icons[type] || icons.info;
  }

  render() {
    return html`
      ${this._notifications.map(n => html`
        <div class="notification ${n.type}" data-id=${n.id}>
          <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d=${this._getIcon(n.type)}/>
          </svg>
          <div class="notification-content">
            <div class="notification-title">${n.title}</div>
            ${n.message ? html`<div class="notification-message">${n.message}</div>` : ''}
          </div>
          <button class="notification-close" @click=${() => dismissNotification(n.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-notifications': ScNotifications;
  }
}
