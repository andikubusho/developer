import React from 'react';
import { NumericFormat, NumericFormatProps } from 'react-number-format';
import { cn } from '../../lib/utils';

interface NumberInputProps extends Omit<NumericFormatProps, 'customInput'> {
  label?: string;
  error?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <NumericFormat
          getInputRef={ref}
          thousandSeparator="."
          decimalSeparator=","
          className={cn(
            'flex h-10 w-full rounded-xl glass-input px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
