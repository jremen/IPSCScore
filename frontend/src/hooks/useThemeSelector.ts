import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore, type ThemeMode } from '../stores/uiStore';

export function useThemeSelector() {
  const { t } = useTranslation();
  const themeMode = useUIStore((s) => s.themeMode);
  const setThemeMode = useUIStore((s) => s.setThemeMode);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = useCallback(() => setOpen((previous) => !previous), []);
  const selectTheme = useCallback(
    (value: ThemeMode) => {
      setThemeMode(value);
      setOpen(false);
    },
    [setThemeMode],
  );

  return { t, themeMode, open, ref, toggleOpen, selectTheme };
}
