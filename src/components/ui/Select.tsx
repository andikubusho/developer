import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-bold text-slate-700 tracking-tight">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2364748b%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27M6%208l4%204%204-4%27%2F%3E%3C%2Fsvg%3E")] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10',
            error && 'border-danger focus:border-danger focus:ring-danger/10',
            className
          )}
          {...props}
        >
          <option value="" disabled>Pilih opsi...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="font-medium">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs font-semibold text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
