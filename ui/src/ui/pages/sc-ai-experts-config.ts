/**
 * AI Security Expert Configuration Page
 * 8个安全专家角色与LLM模型绑定配置
 */
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// 预定义的8个安全专家角色
const SECURITY_ROLES = [
  {
    id: 'security-expert',
    name: 'Security Expert',
    nameZh: '安全专家',
    description: '威胁检测、漏洞评估、事件响应、渗透测试',
    icon: '🛡️',
  },
  {
    id: 'privacy-security-officer',
    name: 'Privacy Security Officer',
    nameZh: '隐私安全官',
    description: '安全攻防 + 隐私保护/数据安全合规',
    icon: '🔒',
  },
  {
    id: 'security-architect',
    name: 'Security Architect',
    nameZh: '安全架构师',
    description: '安全攻防 + 基础设施/代码/网络安全',
    icon: '🏗️',
  },
  {
    id: 'business-security-officer',
    name: 'Business Security Officer',
    nameZh: '业务安全官',
    description: '安全攻防 + 供应链安全/业务连续性',
    icon: '💼',
  },
  {
    id: 'chief-security-architect',
    name: 'Chief Security Architect',
    nameZh: '首席安全架构官',
    description: '安全攻防 + 合规 + 技术安全全面负责',
    icon: '👔',
  },
  {
    id: 'supply-chain-security-officer',
    name: 'Supply Chain Security Officer',
    nameZh: '供应链安全官',
    description: '安全攻防 + 隐私合规 + 供应链安全',
    icon: '🔗',
  },
  {
    id: 'business-security-operations',
    name: 'Business Security Operations',
    nameZh: '业务安全运营官',
    description: '安全攻防 + 技术安全 + 业务连续性',
    icon: '⚙️',
  },
  {
    id: 'secuclaw',
    name: 'Enterprise Security Commander',
    nameZh: '全域安全指挥官',
    description: '完整安全攻防 + 全维度安全属性',
    icon: '🎖️',
  },
];

interface LLMProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  enabled: boolean;
}

interface RoleLLMConfig {
  roleId: string;
  providerId: string;
  modelName: string;
}

@customElement('sc-ai-experts-config')
export class ScAIExpertsConfig extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .experts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .experts-title {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .experts-desc {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
    }

    .experts-actions {
      display: flex;
      gap: var(--spacing-sm);
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

    .experts-grid {
      display: grid;
      gap: var(--spacing-md);
    }

    .expert-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      transition: border-color var(--duration-fast);
    }

    .expert-card:hover {
      border-color: var(--border-strong);
    }

    .expert-header {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .expert-icon {
      width: 48px;
      height: 48px;
      background: var(--accent-subtle);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .expert-info {
      flex: 1;
      min-width: 0;
    }

    .expert-name {
      font-weight: 600;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .expert-name-en {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 400;
    }

    .expert-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: var(--spacing-xs);
    }

    .expert-config {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
    }

    .config-field {
      display: grid;
      gap: var(--spacing-xs);
    }

    .config-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .config-select {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-accent);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text);
      font-size: 0.875rem;
      cursor: pointer;
      transition: border-color var(--duration-fast);
    }

    .config-select:focus {
      outline: none;
      border-color: var(--accent);
    }

    .config-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .config-current {
      margin-top: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-accent);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .experts-stats {
      margin-top: var(--spacing-xl);
      padding: var(--spacing-lg);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }

    .stats-title {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-md);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-lg);
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .stat-value--primary { color: var(--accent); }
    .stat-value--ok { color: var(--ok); }
    .stat-value--warn { color: var(--warn); }
    .stat-value--info { color: var(--info); }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: var(--spacing-xs);
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-secondary);
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
  private _roleConfigs: Record<string, RoleLLMConfig> = {};

  @state()
  private _loading = true;

  @state()
  private _saving = false;

  @state()
  private _toast: { message: string; type: 'success' | 'error' } | null = null;

  connectedCallback() {
    super.connectedCallback();
    this._fetchData();
  }

  private async _fetchData() {
    try {
      const [providersRes, configsRes] = await Promise.all([
        fetch('/api/llm/providers'),
        fetch('/api/roles/llm-config'),
      ]);

      if (providersRes.ok) {
        const data = await providersRes.json();
        this._providers = data.providers || [];
      }

      if (configsRes.ok) {
        const data = await configsRes.json();
        const configsMap: Record<string, RoleLLMConfig> = {};
        ;(data.configs || []).forEach((config: RoleLLMConfig) => {
          configsMap[config.roleId] = config;
        });
        this._roleConfigs = configsMap;
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      this._loading = false;
    }
  }

  private _handleRoleConfigChange(roleId: string, field: 'providerId' | 'modelName', value: string) {
    const currentConfig = this._roleConfigs[roleId] || { roleId, providerId: '', modelName: '' };
    
    if (field === 'providerId') {
      const selectedProvider = this._providers.find(p => p.id === value);
      const defaultModel = selectedProvider?.models?.[0] || '';
      this._roleConfigs = {
        ...this._roleConfigs,
        [roleId]: {
          ...currentConfig,
          providerId: value,
          modelName: defaultModel,
        },
      };
    } else {
      this._roleConfigs = {
        ...this._roleConfigs,
        [roleId]: {
          ...currentConfig,
          [field]: value,
        },
      };
    }
  }

  private async _handleSave() {
    this._saving = true;
    try {
      const configs = Object.values(this._roleConfigs).filter(c => c.providerId && c.modelName);
      
      const response = await fetch('/api/roles/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });

      if (response.ok) {
        this._showToast('角色 LLM 配置保存成功', 'success');
      } else {
        this._showToast('保存失败', 'error');
      }
    } catch (err) {
      this._showToast('网络错误', 'error');
    } finally {
      this._saving = false;
    }
  }

  private _handleReset() {
    this._roleConfigs = {};
    this._showToast('已重置为默认配置', 'success');
  }

  private _showToast(message: string, type: 'success' | 'error') {
    this._toast = { message, type };
    setTimeout(() => {
      this._toast = null;
    }, 2000);
  }

  private _getProviderModels(providerId: string): string[] {
    const provider = this._providers.find(p => p.id === providerId);
    return provider?.models || [];
  }

  render() {
    if (this._loading) {
      return html`<div class="empty-state">加载中...</div>`;
    }

    const configuredCount = Object.values(this._roleConfigs).filter(c => c.providerId && c.modelName).length;
    const usedProviders = new Set(Object.values(this._roleConfigs).map(c => c.providerId)).size;

    return html`
      <div class="experts-header">
        <div>
          <div class="experts-title">AI 安全专家配置</div>
          <div class="experts-desc">为每个安全专家角色配置专用的 LLM 模型，支持多角色共享同一模型</div>
        </div>
        <div class="experts-actions">
          <button class="btn btn-secondary" @click=${this._handleReset}>
            🔄 重置
          </button>
          <button class="btn btn-primary" @click=${this._handleSave} ?disabled=${this._saving}>
            ${this._saving ? '保存中...' : '✓ 保存配置'}
          </button>
        </div>
      </div>

      ${this._providers.length === 0
        ? html`
          <div class="empty-state">
            <div class="empty-icon">🛡️</div>
            <p>请先在"LLM 服务配置"中添加服务商</p>
          </div>
        `
        : html`
          <div class="experts-grid">
            ${SECURITY_ROLES.map(role => {
              const config = this._roleConfigs[role.id] || { roleId: role.id, providerId: '', modelName: '' };
              
              return html`
                <div class="expert-card">
                  <div class="expert-header">
                    <div class="expert-icon">${role.icon}</div>
                    <div class="expert-info">
                      <div class="expert-name">
                        ${role.nameZh}
                        <span class="expert-name-en">${role.name}</span>
                      </div>
                      <div class="expert-desc">${role.description}</div>
                    </div>
                  </div>

                  <div class="expert-config">
                    <div class="config-field">
                      <label class="config-label">LLM 服务商</label>
                      <select 
                        class="config-select"
                        .value=${config.providerId}
                        @change=${(e: Event) => this._handleRoleConfigChange(role.id, 'providerId', (e.target as HTMLSelectElement).value)}
                      >
                        <option value="">选择服务商</option>
                        ${this._providers.filter(p => p.enabled).map(p => html`
                          <option value=${p.id} ?selected=${config.providerId === p.id}>${p.name}</option>
                        `)}
                      </select>
                    </div>

                    <div class="config-field">
                      <label class="config-label">模型</label>
                      <select 
                        class="config-select"
                        .value=${config.modelName}
                        ?disabled=${!config.providerId}
                        @change=${(e: Event) => this._handleRoleConfigChange(role.id, 'modelName', (e.target as HTMLSelectElement).value)}
                      >
                        <option value="">选择模型</option>
                        ${this._getProviderModels(config.providerId).map(m => html`
                          <option value=${m} ?selected=${config.modelName === m}>${m}</option>
                        `)}
                      </select>
                    </div>
                  </div>

                  ${config.providerId && config.modelName
                    ? html`
                      <div class="config-current">
                        当前配置: ${this._providers.find(p => p.id === config.providerId)?.name} / ${config.modelName}
                      </div>
                    `
                    : ''}
                </div>
              `;
            })}
          </div>

          <div class="experts-stats">
            <div class="stats-title">配置统计</div>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value stat-value--primary">${SECURITY_ROLES.length}</div>
                <div class="stat-label">安全角色</div>
              </div>
              <div class="stat-item">
                <div class="stat-value stat-value--ok">${configuredCount}</div>
                <div class="stat-label">已配置</div>
              </div>
              <div class="stat-item">
                <div class="stat-value stat-value--warn">${this._providers.filter(p => p.enabled).length}</div>
                <div class="stat-label">可用服务商</div>
              </div>
              <div class="stat-item">
                <div class="stat-value stat-value--info">${usedProviders}</div>
                <div class="stat-label">使用中服务商</div>
              </div>
            </div>
          </div>
        `}
      
      ${this._toast
        ? html`<div class="toast toast--${this._toast.type}">${this._toast.message}</div>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-ai-experts-config': ScAIExpertsConfig;
  }
}
