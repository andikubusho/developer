import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ children, className, ...props }) => {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-hide glass-card', className)}>
      <table className="w-full text-left border-collapse relative z-[1]" {...props}>
        {children}
      </table>
    </div>
  );
};

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => {
  return (
    <thead className={cn('bg-slate-50/80 border-b border-slate-200/60 backdrop-blur-glass-sm', className)} {...props}>
      {children}
    </thead>
  );
};

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => {
  return (
    <tbody className={cn('divide-y divide-white/20', className)} {...props}>
      {children}
    </tbody>
  );
};

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { isHoverable?: boolean }> = ({ children, className, isHoverable = true, ...props }) => {
  return (
    <tr className={cn(
      'transition-all duration-200',
      isHoverable && 'hover:bg-white/40',
      className
    )} {...props}>
      {children}
    </tr>
  );
};

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => {
  return (
    <th className={cn(
      'px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest',
      className
    )} {...props}>
      {children}
    </th>
  );
};

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => {
  return (
    <td className={cn(
      'px-6 py-4 text-sm font-bold text-text-primary',
      className
    )} {...props}>
      {children}
    </td>
  );
};
