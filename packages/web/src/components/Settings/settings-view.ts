import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { t, I18nController, i18n, setLocale, getLocale, type Locale } from '../../i18n';

@customElement('settings-view')
export class SettingsView extends LitElement {
  private i18n = new I18nController(this);

  @state()
  private activeTab = 'llm';

  static styles = css`
    :host { display: block; padding: 1.5rem; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem 0; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #2a2a4a; padding-bottom: 0.5rem; }
    .tab { padding: 0.5rem 1rem; background: transparent; border: none; color: #888; cursor: pointer; font-size: 0.9rem; border-radius: 6px; transition: all 0.2s; }
    .tab:hover { background: #2a2a4a; color: #fff; }
    .tab.active { background: #3b82f6; color: #fff; }
    .section { background: #1a1a2e; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
    .section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
    .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #2a2a4a; }
    .setting-row:last-child { border-bottom: none; }
    .setting-label { color: #a0a0b0; font-size: 0.9rem; }
    .language-selector { display: flex; gap: 0.5rem; }
    .lang-btn { padding: 0.5rem 1rem; background: #2a2a4a; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .lang-btn:hover { background: #3a3a5a; }
    .lang-btn.active { background: #3b82f6; }
    .form-group { margin-bottom: 1rem; }
    .form-label { display: block; font-size: 0.85rem; color: #888; margin-bottom: 0.5rem; }
    .form-input { width: 100%; padding: 0.75rem; background: #0f0f1a; border: 1px solid #2a2a4a; border-radius: 6px; color: #fff; font-size: 0.9rem; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: #3b82f6; }
    .btn { padding: 0.75rem 1.5rem; background: #3b82f6; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 0.9rem; }
    .btn:hover { background: #2563eb; }
  `;

  private currentLang = i18n.getLocale();

  render() {
    return html`
      <h1>${t('settings.title')}</h1>
      
      <div class="tabs">
        <button class="tab ${this.activeTab === 'general' ? 'active' : ''}" @click=${() => this.activeTab = 'general'}>
          ${t('settings.general') || 'General'}
        </button>
        <button class="tab ${this.activeTab === 'llm' ? 'active' : ''}" @click=${() => this.activeTab = 'llm'}>
          ${t('settings.llmConfig')}
        </button>
      </div>

      ${this.activeTab === 'general' ? html`
        <div class="section">
          <div class="section-title">${t('settings.language') || 'Language'}</div>
          <div class="setting-row">
            <span class="setting-label">${t('settings.selectLanguage') || 'Select Language'}</span>
            <div class="language-selector">
              <button 
                class="lang-btn ${this.currentLang === 'zh-CN' ? 'active' : ''}"
                @click=${() => this.changeLanguage('zh-CN')}
              >
                �🇳🇨 简体中文
              </button>
              <button 
                class="lang-btn ${this.currentLang === 'en-US' ? 'active' : ''}"
                @click=${() => this.changeLanguage('en-US')}
              >
                🇺🇸 English
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      ${this.activeTab === 'llm' ? html`
        <div class="section">
          <div class="section-title">${t('settings.llmConfig')}</div>
          <div class="form-group">
            <label class="form-label">${t('settings.providerName') || 'Provider Name'}</label>
            <input type="text" class="form-input" placeholder="OpenAI">
          </div>
          <div class="form-group">
            <label class="form-label">${t('settings.apiEndpoint')}</label>
            <input type="text" class="form-input" placeholder="https://api.openai.com/v1">
          </div>
          <div class="form-group">
            <label class="form-label">${t('settings.apiKey')}</label>
            <input type="password" class="form-input" placeholder="sk-...">
          </div>
          <button class="btn">${t('common.save')}</button>
        </div>
      ` : ''}
    `;
  }

  private changeLanguage(locale: Locale) {
    setLocale(locale);
    this.currentLang = locale;
    this.requestUpdate();
  }
}
