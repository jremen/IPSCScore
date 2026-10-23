import { useCallback } from 'react';
import {
  getInputFieldColorClass,
  getInputFieldSizeClass,
  getInputFieldSpinnerBorderClass,
  sanitizeInputFieldValue,
} from '../utils/inputField';
import type { InputFieldProps } from '../components/shared/types';

export function useInputField({
  value,
  onChange,
  step = '0.01',
  min,
  max,
  sizing = 'sm',
  color,
  decimal = false,
  numeric = false,
}: Pick<
  InputFieldProps,
  'value' | 'onChange' | 'step' | 'min' | 'max' | 'sizing' | 'color' | 'decimal' | 'numeric'
>) {
  const stepNum = parseFloat(step) || 0.01;

  const increment = useCallback(() => {
    const current = parseFloat(String(value)) || 0;
    const next = parseFloat((current + stepNum).toFixed(10));
    const maxNum = max !== undefined ? parseFloat(max) : Infinity;
    onChange(String(Math.min(next, maxNum)));
  }, [value, stepNum, max, onChange]);

  const decrement = useCallback(() => {
    const current = parseFloat(String(value)) || 0;
    const next = parseFloat((current - stepNum).toFixed(10));
    const minNum = min !== undefined ? parseFloat(min) : -Infinity;
    onChange(String(Math.max(next, minNum)));
  }, [value, stepNum, min, onChange]);

  const handleChange = useCallback(
    (rawValue: string) => {
      const next = sanitizeInputFieldValue(rawValue, decimal, numeric);
      if (next !== null) onChange(next);
    },
    [decimal, numeric, onChange],
  );

  return {
    increment,
    decrement,
    sizeClass: getInputFieldSizeClass(sizing),
    colorClass: getInputFieldColorClass(color),
    spinnerBorderClass: getInputFieldSpinnerBorderClass(color),
    handleChange,
  };
}
