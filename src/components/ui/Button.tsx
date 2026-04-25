import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  as?: 'button' | 'span' | 'div';
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  disabled,
  as = 'button',
  ...props
}) => {
  const variants = {
    primary: 'glass-mint text-accent-dark hover:brightness-105 active:shadow-pressed active:scale-[0.98]',
    secondary: 'glass-convex text-text-primary active:scale-[0.98]',
    outline: 'border border-white/40 bg-transparent hover:bg-white/20 text-text-primary shadow-convex active:shadow-pressed active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-white/20 text-text-secondary hover:text-text-primary active:scale-[0.98]',
    danger: 'glass-peach text-accent-dark hover:brightness-105 active:shadow-pressed active:scale-[0.98]',
    dark: 'glass-lavender text-accent-dark hover:brightness-105 active:shadow-pressed active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const Component = as as any;

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center rounded-pill font-bold transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={Component === 'button' ? (disabled || isLoading) : undefined}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </Component>
  );
};
