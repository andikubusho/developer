import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-hide glass-card', className)}>
      <table className="w-full text-left border-collapse">
        {children}
      </table>
    </div>
  );
};

export const THead: React.FC<TableProps> = ({ children, className }) => {
  return (
    <thead className={cn('bg-white/30 border-b border-white/40 backdrop-blur-glass-sm', className)}>
      {children}
    </thead>
  );
};

export const TBody: React.FC<TableProps> = ({ children, className }) => {
  return (
    <tbody className={cn('divide-y divide-white/20', className)}>
      {children}
    </tbody>
  );
};

export const TR: React.FC<TableProps & { isHoverable?: boolean }> = ({ children, className, isHoverable = true }) => {
  return (
    <tr className={cn(
      'transition-all duration-200',
      isHoverable && 'hover:bg-white/40',
      className
    )}>
      {children}
    </tr>
  );
};

export const TH: React.FC<TableProps> = ({ children, className }) => {
  return (
    <th className={cn(
      'px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest',
      className
    )}>
      {children}
    </th>
  );
};

export const TD: React.FC<TableProps> = ({ children, className }) => {
  return (
    <td className={cn(
      'px-6 py-4 text-sm font-bold text-text-primary',
      className
    )}>
      {children}
    </td>
  );
};
