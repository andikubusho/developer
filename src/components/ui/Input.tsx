import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-xs font-black text-text-secondary uppercase tracking-widest ml-4">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'flex h-11 w-full rounded-pill glass-input px-6 py-2 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-lavender/70 focus-visible:ring-offset-1',
            (props.type === 'date' || props.type === 'datetime-local') && 'cursor-pointer',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
            className
          )}
          onClick={(e) => {
            if (props.type === 'date' || props.type === 'datetime-local') {
              try {
                (e.currentTarget as any).showPicker();
              } catch (err) {
                // Fallback if showPicker is not supported
              }
            }
            props.onClick?.(e);
          }}
          {...props}
        />
        {error && <p id={errorId} className="text-xs font-semibold text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
