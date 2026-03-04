import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, availableLanguages, getCurrentLanguage } from '../../i18n';

const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = React.useState(getCurrentLanguage());

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    changeLanguage(newLang);
    setCurrentLang(newLang);
  };

  return (
    <select
      value={currentLang}
      onChange={handleChange}
      style={{
        background: '#2a2a3e',
        color: '#fff',
        border: '1px solid #3b3b4f',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.85rem',
        cursor: 'pointer',
      }}
    >
      {availableLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.native}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;
