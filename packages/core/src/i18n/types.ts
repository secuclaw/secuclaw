/**
 * i18n Type Definitions
 * 
 * Multi-language support type definitions for SecuClaw
 */

export type Locale = 'zh-CN' | 'en-US' | string;

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  fallback?: Locale;
}

export interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

export interface I18nOptions {
  locale?: Locale;
  fallbackLocale?: Locale;
  messages?: Record<Locale, TranslationMessages>;
}

export interface I18nInstance {
  locale: Locale;
  fallbackLocale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  getLocale: () => Locale;
  getAvailableLocales: () => LocaleConfig[];
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: 'zh-CN',
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    direction: 'ltr',
    fallback: 'en-US',
  },
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    direction: 'ltr',
    fallback: 'zh-CN',
  },
];

export const DEFAULT_LOCALE: Locale = 'zh-CN';
export const FALLBACK_LOCALE: Locale = 'en-US';
