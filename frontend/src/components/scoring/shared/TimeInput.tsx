import { useTranslation } from 'react-i18next';
import { useTimeInput } from '../../../hooks/useTimeInput';
import type { TimeInputProps } from '../types';

export default function TimeInput({ regular, value, onChange, disabled, className, debounceMs = 600 }: TimeInputProps) {
  const { t } = useTranslation();
  const { inputRef, displayValue, handleChange, handleBlur, handleFocus } = useTimeInput(value, onChange, debounceMs);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      disabled={disabled}
      autoComplete="off"
      placeholder={t('scoring.time')}
      className={`text-center font-semibold px-2! py-2!
        rounded-lg border border-gray-700 bg-gray-700 text-white
        focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2
        dark:focus:border-blue-500 dark:focus:ring-blue-500
        eink:bg-black! eink:text-white! eink:border-black!
        disabled:cursor-not-allowed disabled:opacity-50
        ${className ?? ''}
        ${!regular && 'border-purple-300 dark:border-purple-600 dark:bg-purple-500 text-4xl w-full'}
        `}
    />
  );
}
