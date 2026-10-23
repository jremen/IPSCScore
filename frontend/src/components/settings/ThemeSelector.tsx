import { THEME_OPTIONS } from './themeOptions';
import { useThemeSelector } from '../../hooks/useThemeSelector';

export function ThemeSelector() {
  const { t, themeMode, open, ref, toggleOpen, selectTheme } = useThemeSelector();
  const current = THEME_OPTIONS.find((option) => option.value === themeMode);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={t('settings.themeAriaLabel')}
        onClick={toggleOpen}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-colors cursor-pointer"
      >
        {current?.icon}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => selectTheme(option.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer
                ${themeMode === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 text-gray-800 dark:hover:bg-gray-700 dark:text-white'}
              `}
            >
              {option.icon}
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
