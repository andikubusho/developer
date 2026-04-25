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
    <div className={cn('glass-card overflow-hidden transition-all duration-300', className)}>
      {(title || subtitle) && (
        <div className="relative z-[1] px-6 py-5 border-b border-white/40 flex flex-col gap-1">
          {title && <h3 className="text-lg font-bold text-text-primary tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs font-medium text-text-secondary">{subtitle}</p>}
        </div>
      )}
      <div className="relative z-[1] p-6">{children}</div>
    </div>
  );
};
