import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-bold text-slate-700 tracking-tight">
            {label}
          </label>
        )
        }
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-all placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm',
            error && 'border-danger focus:border-danger focus:ring-danger/10',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-semibold text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
