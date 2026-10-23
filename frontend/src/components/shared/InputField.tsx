import { Label } from 'flowbite-react';
import { forwardRef, memo } from 'react';
import { TbChevronDown, TbChevronUp } from 'react-icons/tb';
import { useInputField } from '../../hooks/useInputField';
import type { InputFieldProps } from './types';

export const InputField = memo(
  forwardRef<HTMLInputElement, InputFieldProps>(
    (
      {
        id,
        label,
        value,
        onChange,
        onBlur,
        onFocus,
        onKeyDown,
        type = 'number',
        step = '0.01',
        min,
        max,
        unit,
        required,
        placeholder,
        sizing = 'sm',
        color,
        disabled,
        className,
        decimal = false,
        numeric = false,
      },
      ref,
    ) => {
      const { increment, decrement, sizeClass, colorClass, spinnerBorderClass, handleChange } =
        useInputField({ value, onChange, step, min, max, sizing, color, decimal, numeric });

      return (
        <div>
          {(label || unit) && (
            <div className="mb-1 flex items-center justify-between">
              {label && (
                <Label htmlFor={id} className="text-sm">
                  {label}
                </Label>
              )}
              {unit && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {unit}
                </span>
              )}
            </div>
          )}
          <div className="relative">
            <input
              ref={ref}
              id={id}
              type={decimal || numeric ? 'text' : type}
              inputMode={decimal ? 'decimal' : numeric ? 'numeric' : undefined}
              step={type === 'number' && !decimal && !numeric ? step : undefined}
              min={type === 'number' && !decimal && !numeric ? min : undefined}
              max={type === 'number' && !decimal && !numeric ? max : undefined}
              value={Number(value).toString()}
              onChange={(event) => handleChange(event.target.value)}
              onBlur={onBlur}
              onFocus={onFocus}
              onKeyDown={onKeyDown}
              required={required}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              className={`block w-full [appearance:textfield] rounded-lg border text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${sizeClass} ${colorClass} ${className ?? ''}`}
            />
            {type === 'number' && !decimal && !numeric && (
              <div
                className={`absolute top-0 right-0 flex h-full flex-col border-l ${spinnerBorderClass}`}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={increment}
                  disabled={disabled}
                  className="flex flex-1 items-center justify-center px-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                >
                  <TbChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={decrement}
                  disabled={disabled}
                  className={`flex flex-1 items-center justify-center border-t px-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 ${spinnerBorderClass}`}
                >
                  <TbChevronDown className="size-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    },
  ),
);

InputField.displayName = 'InputField';
