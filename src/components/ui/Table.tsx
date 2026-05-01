import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ children, className, ...props }) => {
  return (
    <div className={cn('glass-card w-full', className)}>
      <div className="stabilized-plate p-0 overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse" {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => {
  return (
    <thead className={cn('bg-white/20 border-b border-white/20', className)} {...props}>
      {children}
    </thead>
  );
};

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => {
  return (
    <tbody className={cn('divide-y divide-transparent', className)} {...props}>
      {children}
    </tbody>
  );
};

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { isHoverable?: boolean }> = ({ children, className, isHoverable = true, ...props }) => {
  return (
    <tr className={cn(
      'transition-all duration-300 etched-line',
      isHoverable && 'hover:bg-white/40 hover:shadow-3d-inset',
      className
    )} {...props}>
      {children}
    </tr>
  );
};

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => {
  return (
    <th className={cn(
      'px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]',
      className
    )} {...props}>
      {children}
    </th>
  );
};

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => {
  return (
    <td className={cn(
      'px-8 py-5 text-sm font-bold text-text-primary',
      className
    )} {...props}>
      {children}
    </td>
  );
};
