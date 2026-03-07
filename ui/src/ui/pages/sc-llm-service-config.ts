/**
 * LLM Service Configuration Page
 * 管理LLM服务商（名称、base_url、api-key、模型）
 */
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface LLMProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

interface ProviderFormData {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string;
}

@customElement('sc-llm-service-config')
export class ScLLMServiceConfig extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .service-title {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .service-desc {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
    }

    .btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all var(--duration-fast);
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover);
    }

    .btn-secondary {
      background: var(--bg-hover);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg-elevated);
    }

    .btn-icon {
      padding: var(--spacing-sm);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--duration-fast);
    }

    .btn-icon:hover {
      background: var(--bg-hover);
      color: var(--text);
    }

    .btn-icon--danger:hover {
      background: var(--danger-subtle);
      color: var(--danger);
    }

    .provider-form {
      background: var(--card);
      border: 1px solid var(--accent);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .form-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: var(--spacing-md);
    }

    .form-grid {
      display: grid;
      gap: var(--spacing-md);
    }

    .form-field {
      display: grid;
      gap: var(--spacing-xs);
    }

    .form-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .form-label--required::after {
      content: ' *';
      color: var(--danger);
    }

    .form-input {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-accent);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text);
      font-size: 0.875rem;
      transition: border-color var(--duration-fast);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .form-input::placeholder {
      color: var(--text-secondary);
      opacity: 0.6;
    }

    .form-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-lg);
    }

    .provider-list {
      display: grid;
      gap: var(--spacing-md);
    }

    .provider-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      transition: border-color var(--duration-fast);
    }

    .provider-card:hover {
      border-color: var(--border-strong);
    }

    .provider-card--enabled {
      border-color: var(--accent);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .provider-main {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      flex: 1;
    }

    .provider-icon {
      width: 40px;
      height: 40px;
      background: var(--accent-subtle);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .provider-info {
      flex: 1;
      min-width: 0;
    }

    .provider-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .provider-url {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: var(--spacing-xs);
    }

    .provider-actions {
      display: flex;
      gap: var(--spacing-xs);
    }

    .provider-details {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--border);
    }

    .api-key-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
    }

    .api-key-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .api-key-value {
      font-family: var(--mono);
      font-size: 0.75rem;
      background: var(--bg-accent);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      color: var(--text);
    }

    .models-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .model-tag {
      font-size: 0.7rem;
      background: var(--bg-hover);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-secondary);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.3;
      margin-bottom: var(--spacing-md);
    }

    .toast {
      position: fixed;
      bottom: var(--spacing-lg);
      right: var(--spacing-lg);
      padding: var(--spacing-md) var(--spacing-lg);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 1000;
      animation: slideUp 0.3s var(--ease-out);
    }

    .toast--success {
      background: var(--ok);
      color: white;
    }

    .toast--error {
      background: var(--danger);
      color: white;
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: 0.875rem;
    }

    .alert--error {
      background: var(--danger-subtle);
      border: 1px solid var(--danger);
      color: var(--danger);
    }

    .alert--success {
      background: var(--ok-subtle);
      border: 1px solid var(--ok);
      color: var(--ok);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  @state()
  private _providers: LLMProvider[] = [];

  @state()
  private _loading = true;

  @state()
  private _editingId: string | null = null;

  @state()
  private _formData: ProviderFormData = {
    name: '',
    baseUrl: '',
    apiKey: '',
    models: '',
  };

  @state()
  private _showApiKey: Record<string, boolean> = {};

  @state()
  private _error: string | null = null;

  @state()
  private _toast: { message: string; type: 'success' | 'error' } | null = null;

  connectedCallback() {
    super.connectedCallback();
    this._fetchProviders();
  }

  private async _fetchProviders() {
    try {
      const response = await fetch('/api/llm/providers');
      if (response.ok) {
        const data = await response.json();
        this._providers = data.providers || [];
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      this._loading = false;
    }
  }

  private _handleAddNew() {
    this._editingId = 'new';
    this._formData = { name: '', baseUrl: '', apiKey: '', models: '' };
    this._error = null;
  }

  private _handleEdit(provider: LLMProvider) {
    this._editingId = provider.id;
    this._formData = {
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey || '',
      models: provider.models?.join(', ') || '',
    };
    this._error = null;
  }

  private _handleCancel() {
    this._editingId = null;
    this._formData = { name: '', baseUrl: '', apiKey: '', models: '' };
    this._error = null;
  }

  private async _handleSave() {
    if (!this._formData.name.trim()) {
      this._error = '请输入服务商名称';
      return;
    }
    if (!this._formData.baseUrl.trim()) {
      this._error = '请输入 Base URL';
      return;
    }

    try {
      const providerData = {
        id: this._editingId === 'new' ? `provider-${Date.now()}` : this._editingId,
        name: this._formData.name,
        baseUrl: this._formData.baseUrl,
        apiKey: this._formData.apiKey,
        models: this._formData.models.split(',').map(m => m.trim()).filter(Boolean),
        enabled: true,
      };

      const url = this._editingId === 'new' ? '/api/llm/providers/add' : `/api/llm/providers/${this._editingId}`;
      const method = this._editingId === 'new' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerData),
      });

      if (response.ok) {
        this._showToast(this._editingId === 'new' ? '服务商添加成功' : '服务商更新成功', 'success');
        await this._fetchProviders();
        this._handleCancel();
      } else {
        const errData = await response.json();
        this._error = errData.message || '保存失败';
      }
    } catch (err) {
      this._error = '网络错误，请重试';
    }
  }

  private async _handleDelete(id: string) {
    if (!confirm('确定要删除此服务商吗？')) return;

    try {
      const response = await fetch(`/api/llm/providers/${id}`, { method: 'DELETE' });
      if (response.ok) {
        this._showToast('服务商已删除', 'success');
        await this._fetchProviders();
      }
    } catch (err) {
      this._error = '删除失败';
    }
  }

  private _toggleApiKeyVisibility(id: string) {
    this._showApiKey = { ...this._showApiKey, [id]: !this._showApiKey[id] };
  }

  private _showToast(message: string, type: 'success' | 'error') {
    this._toast = { message, type };
    setTimeout(() => {
      this._toast = null;
    }, 2000);
  }

  render() {
    if (this._loading) {
      return html`<div class="empty-state">加载中...</div>`;
    }

    return html`
      <div class="service-header">
        <div>
          <div class="service-title">LLM 服务配置</div>
          <div class="service-desc">管理大语言模型服务商，配置 API 密钥和模型列表</div>
        </div>
        ${this._editingId !== 'new'
          ? html`
            <button class="btn btn-primary" @click=${this._handleAddNew}>
              ➕ 添加服务商
            </button>
          `
          : ''}
      </div>

      ${this._error
        ? html`<div class="alert alert--error">⚠️ ${this._error}</div>`
        : ''}

      ${this._toast
        ? html`<div class="toast toast--${this._toast.type}">${this._toast.message}</div>`
        : ''}

      ${this._editingId
        ? html`
          <div class="provider-form">
            <div class="form-title">${this._editingId === 'new' ? '添加新服务商' : '编辑服务商'}</div>
            <div class="form-grid">
              <div class="form-field">
                <label class="form-label form-label--required">服务商名称</label>
                <input 
                  type="text" 
                  class="form-input"
                  .value=${this._formData.name}
                  @input=${(e: Event) => this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value }}
                  placeholder="例如: OpenAI, Anthropic, DeepSeek"
                />
              </div>

              <div class="form-field">
                <label class="form-label form-label--required">Base URL</label>
                <input 
                  type="text" 
                  class="form-input"
                  .value=${this._formData.baseUrl}
                  @input=${(e: Event) => this._formData = { ...this._formData, baseUrl: (e.target as HTMLInputElement).value }}
                  placeholder="例如: https://api.openai.com/v1"
                />
              </div>

              <div class="form-field">
                <label class="form-label">API Key</label>
                <input 
                  type="password" 
                  class="form-input"
                  .value=${this._formData.apiKey}
                  @input=${(e: Event) => this._formData = { ...this._formData, apiKey: (e.target as HTMLInputElement).value }}
                  placeholder="sk-..."
                />
              </div>

              <div class="form-field">
                <label class="form-label">模型列表 (逗号分隔)</label>
                <input 
                  type="text" 
                  class="form-input"
                  .value=${this._formData.models}
                  @input=${(e: Event) => this._formData = { ...this._formData, models: (e.target as HTMLInputElement).value }}
                  placeholder="例如: gpt-4, gpt-3.5-turbo, gpt-4-turbo"
                />
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" @click=${this._handleSave}>✓ 保存</button>
              <button class="btn btn-secondary" @click=${this._handleCancel}>✕ 取消</button>
            </div>
          </div>
        `
        : ''}

      ${this._providers.length === 0 && !this._editingId
        ? html`
          <div class="empty-state">
            <div class="empty-icon">🖥️</div>
            <p>暂无 LLM 服务商配置</p>
            <p>点击上方"添加服务商"按钮开始配置</p>
          </div>
        `
        : html`
          <div class="provider-list">
            ${this._providers.map(provider => html`
              <div class="provider-card ${provider.enabled ? 'provider-card--enabled' : ''}">
                <div class="provider-header">
                  <div class="provider-main">
                    <div class="provider-icon">🖥️</div>
                    <div class="provider-info">
                      <div class="provider-name">${provider.name}</div>
                      <div class="provider-url">${provider.baseUrl}</div>
                    </div>
                  </div>
                  <div class="provider-actions">
                    <button class="btn-icon" @click=${() => this._handleEdit(provider)} title="编辑">
                      ✏️
                    </button>
                    <button class="btn-icon btn-icon--danger" @click=${() => this._handleDelete(provider.id)} title="删除">
                      🗑️
                    </button>
                  </div>
                </div>

                ${provider.apiKey || (provider.models && provider.models.length > 0)
                  ? html`
                    <div class="provider-details">
                      ${provider.apiKey
                        ? html`
                          <div class="api-key-row">
                            <span class="api-key-label">API Key:</span>
                            <code class="api-key-value">
                              ${this._showApiKey[provider.id] ? provider.apiKey : '••••••••••••'}
                            </code>
                            <button class="btn-icon" @click=${() => this._toggleApiKeyVisibility(provider.id)}>
                              ${this._showApiKey[provider.id] ? '🙈' : '👁️'}
                            </button>
                          </div>
                        `
                        : ''}
                      ${provider.models && provider.models.length > 0
                        ? html`
                          <div class="models-list">
                            ${provider.models.map(m => html`<span class="model-tag">${m}</span>`)}
                          </div>
                        `
                        : ''}
                    </div>
                  `
                  : ''}
              </div>
            `)}
          </div>
        `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-llm-service-config': ScLLMServiceConfig;
  }
}
