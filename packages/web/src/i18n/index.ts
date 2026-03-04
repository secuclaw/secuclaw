import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
};

// Get saved locale or default to browser language
const getDefaultLocale = (): string => {
  // Check localStorage first
  const saved = localStorage.getItem('locale');
  if (saved && resources[saved as keyof typeof resources]) {
    return saved;
  }
  
  // Check browser language
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  
  return 'en-US';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDefaultLocale(),
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

// Helper to change language
export const changeLanguage = (locale: string) => {
  i18n.changeLanguage(locale);
  localStorage.setItem('locale', locale);
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Available languages
export const availableLanguages = [
  { code: 'zh-CN', name: '简体中文', native: '简体中文' },
  { code: 'en-US', name: 'English', native: 'English' },
];
