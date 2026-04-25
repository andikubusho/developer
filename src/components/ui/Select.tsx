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
          <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-4">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-pill glass-input px-6 py-2 text-sm font-medium text-text-primary focus:outline-none appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%231A1A2E%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%272%27%20d%3D%27M6%208l4%204%204-4%27%2F%3E%3C%2Fsvg%3E")] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat pr-10',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
            className
          )}
          {...props}
        >
          <option value="" disabled className="bg-white">Pilih opsi...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-text-primary">
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
