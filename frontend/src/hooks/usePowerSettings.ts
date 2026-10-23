import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();

export function usePowerSettings() {
  const { t } = useTranslation();
  const [preventSleep, setPreventSleep] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isElectron) return;
    let cancelled = false;
    window.electronAPI
      ?.getPreventSleep()
      .then((value) => {
        if (!cancelled) setPreventSleep(value);
      })
      .catch(() => {
        /* fall back to the default (off) */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback(
    async (newValue: boolean) => {
      setPreventSleep(newValue);
      setError('');
      setSaving(true);
      try {
        const active = await window.electronAPI?.setPreventSleep(newValue);
        setPreventSleep(Boolean(active));
      } catch (err: any) {
        setPreventSleep(!newValue);
        setError(err?.message || t('common.unknownError'));
      } finally {
        setSaving(false);
      }
    },
    [t],
  );

  return { t, isElectron, preventSleep, loaded, saving, error, handleToggle };
}
