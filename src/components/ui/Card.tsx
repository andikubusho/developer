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
    <div className={cn('glass-card group', className)}>
      <div className="stabilized-plate flex flex-col p-0">
        {(title || subtitle) && (
          <div className="px-8 py-6 border-b border-white/20 flex flex-col gap-1.5">
            {title && <h3 className="text-[15px] font-black text-text-primary uppercase tracking-[0.1em] italic">{title}</h3>}
            {subtitle && <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{subtitle}</p>}
          </div>
        )}
        <div className="p-8 flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
};
