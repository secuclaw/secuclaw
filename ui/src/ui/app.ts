/**
 * SecuClaw Control UI - Main Application Component
 * 
 * This is the root component that orchestrates the entire control panel UI.
 * It follows the OpenClaw WebSocket-first architecture pattern.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { signal, Signal } from '@lit-labs/signals';

import './layout/sc-layout.js';
import './layout/sc-header.js';
import './layout/sc-sidebar.js';
import './dashboard/sc-dashboard.js';
import './common/sc-notifications.js';

// Pages
import './pages/sc-login-page.js';
import './pages/sc-threats-page.js';
import './pages/sc-incidents-page.js';
import './pages/sc-vulnerabilities-page.js';
import './pages/sc-compliance-page.js';
import './pages/sc-reports-page.js';
import './pages/sc-settings-page.js';
import './pages/sc-threat-detail.js';

// Router
import { initRouter, currentRoute, navigate } from './router.js';

// Auth store
import { authStore, isAuthenticated, currentUser } from './store/auth-store.js';

// Gateway connection state context
export interface GatewayState {
  connected: boolean;
  url: string;
  version?: string;
}

export const gatewayContext = { 
  symbol: Symbol('gateway') 
} as unknown as import('@lit/context').Context<Symbol, Signal<GatewayState>>;

// Gateway WebSocket client
import type { SecuClawGatewayClient } from './gateway-client.js';

// Page to nav item mapping
const PAGE_TO_NAV: Record<string, string> = {
  '/': 'dashboard',
  '/threats': 'threats',
  '/incidents': 'incidents',
  '/vulnerabilities': 'vulnerabilities',
  '/compliance': 'compliance',
  '/reports': 'reports',
  '/settings': 'settings',
};

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

@customElement('secuclaw-app')
export class SecuClawApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .app-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .main-content {
      flex: 1;
      padding: var(--spacing-lg);
      overflow-y: auto;
      background: var(--bg-primary);
    }

    /* Connection status bar */
    .connection-bar {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: var(--spacing-xs) var(--spacing-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .connection-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-danger);
    }

    .connection-indicator.connected {
      background: var(--color-success);
    }

    .connection-indicator.connecting {
      background: var(--color-warning);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* User info in header */
    .user-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .user-info:hover {
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

    .user-name {
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .logout-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: var(--spacing-xs);
      font-size: 0.75rem;
    }

    .logout-btn:hover {
      color: var(--color-danger);
    }
  `;

  @provide({ context: gatewayContext as unknown as import('@lit/context').Context<unknown, unknown> })
  @state()
  gatewayState = signal<GatewayState>({
    connected: false,
    url: 'ws://127.0.0.1:21000/ws',
  });

  @state()
  private _sidebarCollapsed = false;

  @state()
  private _currentPath = '/';

  @state()
  private _activeNavItem = 'dashboard';

  @state()
  private _isAuthenticated = false;

  private _gatewayClient?: SecuClawGatewayClient;

  connectedCallback() {
    super.connectedCallback();
    this._checkAuth();
    this._initRouter();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._gatewayClient?.close();
  }

  private async _checkAuth() {
    const isAuth = await authStore.checkAuth();
    this._isAuthenticated = isAuth;
    
    if (isAuth) {
      this._initGateway();
    }
  }

  private _initRouter(): void {
    initRouter();
    
    // Subscribe to route changes
    const checkRoute = () => {
      const route = currentRoute.get();
      if (route) {
        this._currentPath = route.path;
        
        // Check auth for protected routes
        if (!PUBLIC_ROUTES.includes(route.path) && !this._isAuthenticated) {
          navigate('/login');
          return;
        }
        
        this._activeNavItem = PAGE_TO_NAV[route.path] || 'dashboard';
      }
    };
    
    // Check initial route
    checkRoute();
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkRoute);
  }

  private async _initGateway() {
    // Dynamic import to avoid circular dependencies
    const { SecuClawGatewayClient } = await import('./gateway-client.js');
    
    const url = this.gatewayState.get().url;
    this._gatewayClient = new SecuClawGatewayClient({
      url,
      onConnect: () => {
        this.gatewayState.set({
          ...this.gatewayState.get(),
          connected: true,
        });
      },
      onDisconnect: () => {
        this.gatewayState.set({
          ...this.gatewayState.get(),
          connected: false,
        });
      },
      onError: (error) => {
        console.error('Gateway connection error:', error);
      },
    });

    this._gatewayClient.connect();
  }

  private _toggleSidebar() {
    this._sidebarCollapsed = !this._sidebarCollapsed;
  }

  private _handleNavChange(e: CustomEvent<{ item: { id: string } }>) {
    const navId = e.detail.item.id;
    const pathMap: Record<string, string> = {
      'dashboard': '/',
      'threats': '/threats',
      'incidents': '/incidents',
      'vulnerabilities': '/vulnerabilities',
      'compliance': '/compliance',
      'reports': '/reports',
      'settings': '/settings',
    };
    
    const path = pathMap[navId] || '/';
    navigate(path);
  }

  private _handleLogout() {
    authStore.logout();
    this._isAuthenticated = false;
    navigate('/login');
  }

  private _renderPage(): unknown {
    const route = currentRoute.get();
    const path = route?.path || '/';
    const params = route?.params;

    switch (path) {
      case '/login':
        return html`<sc-login-page></sc-login-page>`;
      case '/':
        return html`<sc-dashboard></sc-dashboard>`;
      case '/threats':
        return html`<sc-threats-page></sc-threats-page>`;
      case '/incidents':
        return html`<sc-incidents-page></sc-incidents-page>`;
      case '/vulnerabilities':
        return html`<sc-vulnerabilities-page></sc-vulnerabilities-page>`;
      case '/compliance':
        return html`<sc-compliance-page></sc-compliance-page>`;
      case '/reports':
        return html`<sc-reports-page></sc-reports-page>`;
      case '/settings':
        return html`<sc-settings-page></sc-settings-page>`;
      default:
        // Check for pattern match (e.g., /threats/:id)
        if (path.startsWith('/threats/') && params?.id) {
          return html`<sc-threat-detail threatId=${params.id}></sc-threat-detail>`;
        }
        return html`<sc-dashboard></sc-dashboard>`;
    }
  }

  render() {
    const route = currentRoute.get();
    const path = route?.path || '/';
    
    // Login page doesn't need layout
    if (path === '/login' || !this._isAuthenticated) {
      return html`
        <sc-notifications></sc-notifications>
        ${this._renderPage()}
      `;
    }

    const state = this.gatewayState.get();
    const user = authStore.getState().user;

    return html`
      <div class="app-container">
        <!-- Notifications -->
        <sc-notifications></sc-notifications>

        <!-- Connection Status Bar -->
        <div class="connection-bar">
          <span 
            class="connection-indicator ${state.connected ? 'connected' : 'connecting'}"
          ></span>
          <span>
            ${state.connected 
              ? `已连接到 ${state.url}` 
              : `正在连接 ${state.url}...`}
          </span>
          <span style="margin-left: auto;">
            ${user ? html`
              <span class="user-info">
                <span class="user-avatar">${user.username[0].toUpperCase()}</span>
                <span class="user-name">${user.username}</span>
                <button class="logout-btn" @click=${this._handleLogout}>退出</button>
              </span>
            ` : ''}
          </span>
        </div>

        <!-- Header -->
        <sc-header 
          @toggle-sidebar=${this._toggleSidebar}
        ></sc-header>

        <!-- Main Body -->
        <div class="app-body">
          <!-- Sidebar -->
          <sc-sidebar 
            ?collapsed=${this._sidebarCollapsed}
            .activeItem=${this._activeNavItem}
            @nav-change=${this._handleNavChange}
          ></sc-sidebar>

          <!-- Main Content Area -->
          <main class="main-content">
            ${this._renderPage()}
          </main>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'secuclaw-app': SecuClawApp;
  }
}
