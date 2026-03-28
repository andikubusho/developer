import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, title, subtitle }) => {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100/50 shadow-premium overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/30', className)}>
      {(title || subtitle) && (
        <div className="px-8 py-6 border-b border-slate-50 flex flex-col gap-1">
          {title && <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm font-medium text-slate-400">{subtitle}</p>}
        </div>
      )}
      <div className="p-8">{children}</div>
    </div>
  );
};
