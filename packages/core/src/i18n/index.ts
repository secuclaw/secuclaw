/**
 * SecuClaw i18n Module
 * 
 * Internationalization support for SecuClaw CLI and skills
 */

import type { I18nInstance, I18nOptions, Locale, TranslationMessages } from './types.js';
import {
  loadMessages,
  getNestedValue,
  interpolate,
  detectSystemLocale,
  getAvailableLocales,
  isLocaleSupported,
  getLocaleConfig,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
} from './loader.js';

export type { Locale, LocaleConfig, TranslationMessages, I18nInstance };
export { getAvailableLocales, isLocaleSupported, getLocaleConfig, detectSystemLocale };

/**
 * Create i18n instance
 */
export function createI18n(options: I18nOptions = {}): I18nInstance {
  // Priority: options.locale > SECUCLAW_LOCALE env > system locale > default
  let currentLocale: Locale = options.locale || 
    (process.env.SECUCLAW_LOCALE as Locale) || 
    detectSystemLocale() || 
    DEFAULT_LOCALE;
  
  // Validate the locale
  if (!isLocaleSupported(currentLocale)) {
    currentLocale = DEFAULT_LOCALE;
  }
  
  const fallbackLocale: Locale = options.fallbackLocale || FALLBACK_LOCALE;

  /**
   * Translate a key to localized message
   */
  function t(key: string, params?: Record<string, string | number>): string {
    // Try current locale first
    const currentMessages = loadMessages(currentLocale);
    let message = getNestedValue(currentMessages, key);

    // Fall back to fallback locale
    if (!message && currentLocale !== fallbackLocale) {
      const fallbackMessages = loadMessages(fallbackLocale);
      message = getNestedValue(fallbackMessages, key);
    }

    // Return key if no translation found
    if (!message) {
      return key;
    }

    // Interpolate parameters if provided
    if (params) {
      return interpolate(message, params);
    }

    return message;
  }

  /**
   * Set current locale
   */
  function setLocale(locale: Locale): void {
    if (isLocaleSupported(locale)) {
      currentLocale = locale;
    } else {
      console.warn(`Locale "${locale}" is not supported. Using "${currentLocale}".`);
    }
  }

  /**
   * Get current locale
   */
  function getLocale(): Locale {
    return currentLocale;
  }

  /**
   * Get all available locales
   */
  function getLocales(): import('./types.js').LocaleConfig[] {
    return getAvailableLocales();
  }

  return {
    locale: currentLocale,
    fallbackLocale,
    t,
    setLocale,
    getLocale,
    getAvailableLocales: getLocales,
  };
}

// Default instance
let defaultI18n: I18nInstance | null = null;

/**
 * Get or create default i18n instance
 */
export function getI18n(options?: I18nOptions): I18nInstance {
  if (!defaultI18n) {
    defaultI18n = createI18n(options);
  }
  return defaultI18n;
}

/**
 * Set locale for default instance
 */
export function setLocale(locale: Locale): void {
  getI18n().setLocale(locale);
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
  return getI18n().getLocale();
}

/**
 * Translate using default instance
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return getI18n().t(key, params);
}

// Re-export types and constants
export { DEFAULT_LOCALE, FALLBACK_LOCALE };
