import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-hide rounded-2xl border border-slate-100', className)}>
      <table className="w-full text-left border-collapse">
        {children}
      </table>
    </div>
  );
};

export const THead: React.FC<TableProps> = ({ children, className }) => {
  return (
    <thead className={cn('bg-slate-50/50 border-b border-slate-100', className)}>
      {children}
    </thead>
  );
};

export const TBody: React.FC<TableProps> = ({ children, className }) => {
  return (
    <tbody className={cn('divide-y divide-slate-50', className)}>
      {children}
    </tbody>
  );
};

export const TR: React.FC<TableProps & { isHoverable?: boolean }> = ({ children, className, isHoverable = true }) => {
  return (
    <tr className={cn(
      'transition-all duration-200',
      isHoverable && 'hover:bg-indigo-50/30',
      className
    )}>
      {children}
    </tr>
  );
};

export const TH: React.FC<TableProps> = ({ children, className }) => {
  return (
    <th className={cn(
      'px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest',
      className
    )}>
      {children}
    </th>
  );
};

export const TD: React.FC<TableProps> = ({ children, className }) => {
  return (
    <td className={cn(
      'px-6 py-4 text-sm font-medium text-slate-600',
      className
    )}>
      {children}
    </td>
  );
};
