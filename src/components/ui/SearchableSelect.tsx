import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  label: string;
  value: string | number;
  className?: string;
}

interface SearchableSelectProps {
  label?: string;
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  error,
  className,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={cn('w-full space-y-2', className)} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 flex items-center justify-between text-sm font-black text-slate-700 transition-all shadow-sm',
            isOpen && 'border-accent-lavender bg-white ring-4 ring-accent-lavender/10',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-rose-300 bg-rose-50'
          )}
        >
          <span className={cn('truncate', !selectedOption && 'text-slate-400 font-bold')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-white rounded-[24px] border-2 border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-accent-lavender transition-all"
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-between group',
                      option.value === value 
                        ? 'bg-accent-dark text-white' 
                        : cn('text-slate-600 hover:bg-slate-50 hover:text-accent-dark', option.className)
                    )}
                  >
                    {option.label}
                    {option.value === value && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tidak ditemukan</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-500 font-bold mt-1 ml-1">{error}</p>}
    </div>
  );
};
