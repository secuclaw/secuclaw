/**
 * i18n Loader
 * 
 * Loads and manages translation messages for SecuClaw
 */

import type { Locale, TranslationMessages, LocaleConfig } from './types.js';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, FALLBACK_LOCALE } from './types.js';

// Import locale messages
import zhCN from './locales/zh-CN.json' with { type: 'json' };
import enUS from './locales/en-US.json' with { type: 'json' };

/**
 * Get all available locales
 */
export function getAvailableLocales(): LocaleConfig[] {
  return SUPPORTED_LOCALES;
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.some(l => l.code === locale);
}

/**
 * Get locale config by code
 */
export function getLocaleConfig(locale: Locale): LocaleConfig | undefined {
  return SUPPORTED_LOCALES.find(l => l.code === locale);
}

/**
 * Load messages for a specific locale
 */
export function loadMessages(locale: Locale): TranslationMessages {
  const messages: Record<string, TranslationMessages> = {
    'zh-CN': zhCN as TranslationMessages,
    'en-US': enUS as TranslationMessages,
  };

  return messages[locale] || messages[DEFAULT_LOCALE] || {};
}

/**
 * Deep merge translation objects
 */
export function mergeMessages(
  base: TranslationMessages,
  override: TranslationMessages
): TranslationMessages {
  const result: TranslationMessages = { ...base };

  for (const key of Object.keys(override)) {
    if (
      typeof override[key] === 'object' &&
      typeof result[key] === 'object'
    ) {
      result[key] = mergeMessages(
        result[key] as TranslationMessages,
        override[key] as TranslationMessages
      );
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(
  obj: TranslationMessages,
  path: string
): string | undefined {
  const keys = path.split('.');
  let current: TranslationMessages | string = obj;

  for (const key of keys) {
    if (typeof current === 'object' && key in current) {
      current = current[key] as TranslationMessages;
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolate string with parameters
 */
export function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return String(params[key] ?? `{{${key}}}`);
  });
}

/**
 * Detect system locale
 */
export function detectSystemLocale(): Locale {
  // Check environment variables
  const envLocale =
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    process.env.LANGUAGE;

  if (envLocale) {
    // Normalize locale string (e.g., "zh_CN.UTF-8" -> "zh-CN")
    const normalized = envLocale
      .split('.')[0]
      .replace('_', '-')
      .toLowerCase();

    // Find matching supported locale
    const match = SUPPORTED_LOCALES.find(
      l => l.code.toLowerCase() === normalized
    );
    if (match) {
      return match.code;
    }

    // Try language code only (e.g., "zh" -> "zh-CN")
    const langCode = normalized.split('-')[0];
    const langMatch = SUPPORTED_LOCALES.find(l =>
      l.code.toLowerCase().startsWith(langCode)
    );
    if (langMatch) {
      return langMatch.code;
    }
  }

  return DEFAULT_LOCALE;
}

export {
  zhCN,
  enUS,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
};
