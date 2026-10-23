import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore, type Language } from '../stores/uiStore';

export function useLanguageSelector() {
  const { t, i18n } = useTranslation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const changeLanguage = useCallback(
    (next: Language) => {
      setLanguage(next);
      i18n.changeLanguage(next);
    },
    [i18n, setLanguage],
  );

  return { t, language, changeLanguage };
}
