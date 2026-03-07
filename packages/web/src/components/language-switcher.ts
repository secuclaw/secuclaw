import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { i18n, t, setLocale, getLocale, I18nController, type Locale } from '../i18n';

const availableLanguages = [
  { code: 'zh-CN', name: '简体中文', native: '简体中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', native: 'English', flag: '🇺🇸' },
];

@customElement('language-switcher')
export class LanguageSwitcher extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    .language-selector {
      position: relative;
      display: inline-block;
    }

    .language-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .language-btn:hover {
      background: #2a2a4a;
    }

    .language-flag {
      font-size: 1rem;
    }

    .language-name {
      flex: 1;
    }

    .dropdown-arrow {
      font-size: 0.6rem;
      color: #888;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 0.25rem;
      min-width: 140px;
      background: #1a1a2e;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      overflow: hidden;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      color: #a0a0b0;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }

    .dropdown-item:hover {
      background: #2a2a4a;
      color: #fff;
    }

    .dropdown-item.active {
      background: #3b82f6;
      color: #fff;
    }
  `;

  private i18n = new I18nController(this);

  @state()
  private isOpen = false;

  // Get current locale dynamically - I18nController triggers re-render on locale change
  private get currentLang(): Locale {
    return i18n.getLocale();
  }

  private toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  private closeDropdown() {
    this.isOpen = false;
  }

  private selectLanguage(code: Locale) {
    setLocale(code);
    this.closeDropdown();
  }

  private getCurrentLanguageInfo() {
    return availableLanguages.find(lang => lang.code === this.currentLang) || availableLanguages[0];
  }

  render() {
    const current = this.getCurrentLanguageInfo();

    return html`
      <div class="language-selector" @blur=${this.closeDropdown} tabindex="0">
        <button 
          class="language-btn" 
          @click=${this.toggleDropdown}
          aria-label="Select language"
        >
          <span class="language-flag">${current.flag}</span>
          <span class="language-name">${current.native}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        
        <div class="dropdown ${this.isOpen ? 'open' : ''}">
          ${availableLanguages.map(lang => html`
            <button 
              class="dropdown-item ${lang.code === this.currentLang ? 'active' : ''}"
              @click=${() => this.selectLanguage(lang.code as Locale)}
            >
              <span class="language-flag">${lang.flag}</span>
              <span>${lang.native}</span>
            </button>
          `)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'language-switcher': LanguageSwitcher;
  }
}
