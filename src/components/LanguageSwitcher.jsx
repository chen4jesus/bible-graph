import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 text-xs rounded ${
          i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('zh')}
        className={`px-2 py-1 text-xs rounded ${
          i18n.language === 'zh' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        aria-label="Switch to Chinese"
      >
        中文
      </button>
    </div>
  );
};

export default LanguageSwitcher; 