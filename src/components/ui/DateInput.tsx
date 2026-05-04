import React, { useRef } from 'react';
import { cn, formatDate } from '../../lib/utils';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  className?: string;
  name?: string;
}

/**
 * DateInput — Komponen input tanggal dengan format Indonesia (DD/MM/YYYY).
 * 
 * CATATAN DEFAULT: Semua tanggal di aplikasi ini WAJIB menggunakan format Indonesia (DD/MM/YYYY).
 * Komponen ini adalah standar untuk semua input tanggal di seluruh modul.
 * 
 * Cara kerja:
 * - Menampilkan tanggal dalam format DD/MM/YYYY
 * - Klik di mana saja pada input akan membuka native date picker
 * - Nilai internal tetap YYYY-MM-DD untuk kompatibilitas database
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, value, onChange, error, className, name, ...rest }, ref) => {
    const hiddenRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
      if (hiddenRef.current) {
        try {
          hiddenRef.current.showPicker();
        } catch {
          hiddenRef.current.focus();
          hiddenRef.current.click();
        }
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-4">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Visible display — format Indonesia DD/MM/YYYY */}
          <div
            onClick={handleClick}
            className={cn(
              'flex h-[52px] w-full rounded-2xl glass-input-3d px-6 py-2 text-sm font-black text-text-primary items-center cursor-pointer select-none',
              error && 'shadow-[inset_4px_4px_8px_rgba(255,100,100,0.1),_0_0_0_2px_rgba(255,100,100,0.5)]',
              className
            )}
          >
            {value ? formatDate(value) : <span className="text-text-muted opacity-40">DD/MM/YYYY</span>}
          </div>
          {/* Hidden native date input for picker */}
          <input
            ref={hiddenRef}
            type="date"
            name={name}
            value={value || ''}
            onChange={handleChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <Calendar 
            onClick={handleClick}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-dark cursor-pointer opacity-60 hover:opacity-100 transition-opacity" 
          />
        </div>
        {error && <p className="text-xs font-semibold text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
