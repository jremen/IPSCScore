import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatTimeDisplay, formatTimeOnBlur, parseTimeString } from '../utils/timeFormat';

export function useTimeInput(value: number | null, onChange: (value: number | null) => void, debounceMs = 600) {
  const [displayValue, setDisplayValue] = useState(() => formatTimeDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = useRef(false);
  const rawDigits = useRef('');
  const dotAutoInserted = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<number | null>(value);
  const pendingCursorRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing.current) {
      setDisplayValue(formatTimeDisplay(value));
      rawDigits.current = '';
      dotAutoInserted.current = false;
      pendingValueRef.current = value;
    }
  }, [value]);

  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const position = pendingCursorRef.current;
      pendingCursorRef.current = null;
      inputRef.current.setSelectionRange(position, position);
    }
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        onChange(pendingValueRef.current);
      }
    };
  }, [onChange]);

  const flushDebouncedOnChange = useCallback((parsed: number | null) => {
    pendingValueRef.current = parsed;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onChange(pendingValueRef.current);
    }, debounceMs);
  }, [debounceMs, onChange]);

  const computeCursorPosition = (rawInput: string, cursorPosInRaw: number, digits: string): number => {
    const digitsBeforeCursor = rawInput.slice(0, cursorPosInRaw).replace(/[^0-9]/g, '').length;
    if (digits.length >= 4) {
      const secondsCount = digits.length - 2;
      return digitsBeforeCursor <= secondsCount ? digitsBeforeCursor : digitsBeforeCursor + 1;
    }
    return digitsBeforeCursor;
  };

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const cursorPos = event.target.selectionStart ?? raw.length;

    if (raw === '') {
      setDisplayValue('');
      rawDigits.current = '';
      dotAutoInserted.current = false;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      onChange(null);
      return;
    }

    const cleaned = raw.replace(',', '.');

    if (cleaned.includes('.') && !dotAutoInserted.current) {
      if (!/^-?\d*\.\d*$/.test(cleaned)) return;
      setDisplayValue(cleaned);
      rawDigits.current = '';
      const parsed = parseFloat(cleaned);
      flushDebouncedOnChange(Number.isNaN(parsed) ? null : parsed);
      pendingCursorRef.current = cursorPos;
      return;
    }

    const digits = cleaned.replace(/[^0-9]/g, '');
    if (!digits) {
      setDisplayValue('');
      rawDigits.current = '';
      dotAutoInserted.current = false;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      onChange(null);
      return;
    }

    rawDigits.current = digits;

    if (digits.length >= 4) {
      const seconds = digits.slice(0, -2);
      const fractions = digits.slice(-2);
      const formatted = `${seconds}.${fractions}`;
      dotAutoInserted.current = true;
      pendingCursorRef.current = computeCursorPosition(cleaned, cursorPos, digits);
      setDisplayValue(formatted);
      const parsed = parseFloat(formatted);
      flushDebouncedOnChange(Number.isNaN(parsed) ? null : parsed);
    } else {
      dotAutoInserted.current = false;
      pendingCursorRef.current = computeCursorPosition(cleaned, cursorPos, digits);
      setDisplayValue(digits);
      const parsed = parseFloat(digits);
      flushDebouncedOnChange(Number.isNaN(parsed) ? null : parsed);
    }
  }, [flushDebouncedOnChange, onChange]);

  const handleBlur = useCallback(() => {
    isEditing.current = false;
    pendingCursorRef.current = null;
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    dotAutoInserted.current = false;
    rawDigits.current = '';
    const formatted = formatTimeOnBlur(displayValue);
    setDisplayValue(formatted);
    const parsed = parseTimeString(formatted);
    pendingValueRef.current = parsed;
    onChange(parsed);
  }, [displayValue, onChange]);

  const handleFocus = useCallback(() => {
    isEditing.current = true;
  }, []);

  return { inputRef, displayValue, handleChange, handleBlur, handleFocus };
}
