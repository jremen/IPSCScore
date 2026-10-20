import { useEffect, useState } from 'react';
import { Alert, Label, ToggleSwitch } from 'flowbite-react';
import { useTranslation } from 'react-i18next';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();

/**
 * Desktop-only power management.
 *
 * When this computer acts as the scoring host, other devices connect to it over
 * the LAN. Letting it sleep or hibernate drops those connections, so the host
 * operator can keep it awake from here.
 */
export default function PowerSettings() {
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

  if (!isElectron) return null;

  const handleToggle = async (newValue: boolean) => {
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
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
      <h3 className="text-lg font-semibold dark:text-white">{t('settings.powerTitle')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('settings.powerDescription')}</p>

      <Label htmlFor="prevent-sleep" className="flex cursor-pointer items-center gap-3">
        <ToggleSwitch
          id="prevent-sleep"
          checked={preventSleep}
          onChange={handleToggle}
          disabled={!loaded || saving}
        />
        <span className="dark:text-white">
          {t('settings.preventSleep')}
          {' — '}
          {preventSleep ? t('settings.preventSleepOn') : t('settings.preventSleepOff')}
        </span>
      </Label>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.preventSleepHint')}</p>

      {error && (
        <Alert color="failure" className="mt-2">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
    </div>
  );
}
