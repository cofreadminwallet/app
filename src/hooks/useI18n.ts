import { useState, useEffect, useCallback } from 'react';
import { I18nService, AppLanguage, TranslationKey } from '../services/i18nService';

export function useI18n() {
  const [language, setLanguageState] = useState<AppLanguage>(() => I18nService.getLanguage());

  useEffect(() => {
    const unsubscribe = I18nService.subscribe((newLang) => {
      setLanguageState(newLang);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const changeLanguage = useCallback((newLang: AppLanguage) => {
    I18nService.setLanguage(newLang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return I18nService.t(key, language);
  }, [language]);

  return {
    language,
    changeLanguage,
    t,
  };
}
