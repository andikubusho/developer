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
            'flex h-[52px] w-full rounded-2xl glass-input-3d px-6 py-2 text-sm font-black text-text-primary placeholder:text-text-muted focus:outline-none',
            (props.type === 'date' || props.type === 'datetime-local') && 'cursor-pointer',
            error && 'shadow-[inset_4px_4px_8px_rgba(255,100,100,0.1),_0_0_0_2px_rgba(255,100,100,0.5)]',
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
