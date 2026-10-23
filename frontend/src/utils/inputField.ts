import type { InputFieldProps } from '../components/shared/types';

export function getInputFieldSizeClass(sizing: InputFieldProps['sizing']): string {
  if (sizing === 'lg') return 'p-4 pr-7';
  if (sizing === 'md') return 'p-2.5 pr-7';
  if (sizing === 'sm') return 'p-2 pr-7';
  return 'py-0.5 px-1.5 pr-6 text-xs';
}

export function getInputFieldColorClass(color: InputFieldProps['color']): string {
  if (color === 'failure') {
    return 'border-red-500 bg-red-50 text-red-900 placeholder-red-400 focus:border-red-500 focus:ring-red-500 dark:bg-red-100 dark:border-red-400 dark:text-red-900';
  }
  if (color === 'warning') {
    return 'border-yellow-400 bg-yellow-50 text-yellow-900 placeholder-yellow-400 focus:border-yellow-400 focus:ring-yellow-400';
  }
  return 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500';
}

export function getInputFieldSpinnerBorderClass(color: InputFieldProps['color']): string {
  if (color === 'failure') return 'border-red-400 dark:border-red-400';
  if (color === 'warning') return 'border-yellow-400';
  return 'border-gray-300 dark:border-gray-600';
}

/**
 * Returns the accepted value or `null` when the typed input should be ignored.
 */
export function sanitizeInputFieldValue(
  value: string,
  decimal: boolean,
  numeric: boolean,
): string | null {
  if (decimal && value !== '' && value !== '-' && !/^-?\d*([.,]\d*)?$/.test(value)) {
    return null;
  }
  if (numeric && value !== '' && !/^\d*$/.test(value)) {
    return null;
  }
  return decimal ? value.replace(/,/g, '.') : value;
}
