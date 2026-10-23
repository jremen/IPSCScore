import { Alert, Label, ToggleSwitch } from 'flowbite-react';
import { usePowerSettings } from '../../hooks/usePowerSettings';

export default function PowerSettings() {
  const { t, isElectron, preventSleep, loaded, saving, error, handleToggle } = usePowerSettings();

  if (!isElectron) return null;

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
