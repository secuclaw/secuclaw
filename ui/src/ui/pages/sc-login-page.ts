/**
 * SecuClaw Login Page
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { authStore } from '../store/auth-store.js';
import { navigate } from '../router.js';

@customElement('sc-login-page')
export class ScLoginPage extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary);
    }

    .login-container {
      width: 100%;
      max-width: 400px;
      padding: var(--spacing-xl);
    }

    .login-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-xl);
    }

    .logo {
      text-align: center;
      margin-bottom: var(--spacing-xl);
    }

    .logo-icon {
      width: 64px;
      height: 64px;
      margin-bottom: var(--spacing-md);
    }

    .logo-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .logo-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .form-group {
      margin-bottom: var(--spacing-lg);
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: var(--spacing-sm);
      color: var(--text-secondary);
    }

    .form-input {
      width: 100%;
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      color: var(--text-primary);
      font-size: 1rem;
      transition: border-color var(--transition-fast);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .form-input::placeholder {
      color: var(--text-muted);
    }

    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--border-radius);
      padding: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      color: var(--color-danger);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .btn-login {
      width: 100%;
      padding: var(--spacing-md);
      background: var(--color-primary);
      border: none;
      border-radius: var(--border-radius);
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .btn-login:hover {
      background: var(--color-primary-dark);
    }

    .btn-login:disabled {
      background: var(--bg-tertiary);
      color: var(--text-muted);
      cursor: not-allowed;
    }

    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: var(--spacing-sm);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .form-footer {
      margin-top: var(--spacing-lg);
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .form-footer a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .form-footer a:hover {
      text-decoration: underline;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
    }

    .remember-me input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
    }

    .remember-me label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .demo-hint {
      margin-top: var(--spacing-xl);
      padding: var(--spacing-md);
      background: var(--bg-tertiary);
      border-radius: var(--border-radius);
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }

    .demo-hint code {
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  `;

  @state()
  private _username = '';

  @state()
  private _password = '';

  @state()
  private _loading = false;

  @state()
  private _error: string | null = null;

  private async _handleSubmit(e: Event) {
    e.preventDefault();
    
    this._loading = true;
    this._error = null;

    const success = await authStore.login(this._username, this._password);
    
    this._loading = false;
    
    if (success) {
      navigate('/');
      // Force app re-render
      window.dispatchEvent(new Event('hashchange'));
    } else {
      this._error = authStore.getState().error;
    }
  }

  render() {
    return html`
      <div class="login-container">
        <div class="login-card">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="clawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
              </defs>
              <path d="M50 5 L90 20 L90 50 C90 75 70 90 50 95 C30 90 10 75 10 50 L10 20 Z" fill="url(#clawGradient)" />
              <path d="M30 35 L45 55 L30 75" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M50 30 L50 70" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
              <path d="M70 35 L55 55 L70 75" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="logo-title">SecuClaw</div>
            <div class="logo-subtitle">安爪安全控制台</div>
          </div>

          ${this._error ? html`
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              ${this._error}
            </div>
          ` : ''}

          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <label class="form-label" for="username">用户名</label>
              <input 
                type="text" 
                id="username"
                class="form-input"
                placeholder="请输入用户名"
                .value=${this._username}
                @input=${(e: Event) => this._username = (e.target as HTMLInputElement).value}
                ?disabled=${this._loading}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="password">密码</label>
              <input 
                type="password" 
                id="password"
                class="form-input"
                placeholder="请输入密码"
                .value=${this._password}
                @input=${(e: Event) => this._password = (e.target as HTMLInputElement).value}
                ?disabled=${this._loading}
                required
              />
            </div>

            <div class="remember-me">
              <input type="checkbox" id="remember" />
              <label for="remember">记住我</label>
            </div>

            <button 
              type="submit" 
              class="btn-login"
              ?disabled=${this._loading || !this._username || !this._password}
            >
              ${this._loading ? html`
                <span class="loading-spinner"></span>
                登录中...
              ` : '登 录'}
            </button>
          </form>

          <div class="form-footer">
            <a href="#">忘记密码？</a>
          </div>

          <div class="demo-hint">
            演示账号: <code>admin</code> / <code>admin123</code>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-login-page': ScLoginPage;
  }
}
