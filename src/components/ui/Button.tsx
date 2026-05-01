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
    primary: 'btn-3d bg-accent-lavender text-white filter brightness-110 shadow-glow-lavender',
    secondary: 'btn-3d bg-white/40 text-text-primary',
    outline: 'btn-3d border-white/60 bg-transparent text-text-primary hover:bg-white/20',
    ghost: 'hover:bg-white/40 text-text-secondary hover:text-text-primary transition-all duration-300',
    danger: 'btn-3d bg-rose-500 text-white shadow-glow-peach',
  };

  const sizes = {
    sm: 'px-5 py-2.5 text-[10px] uppercase tracking-widest font-black',
    md: 'px-8 py-3.5 text-xs uppercase tracking-widest font-black',
    lg: 'px-10 py-4.5 text-sm uppercase tracking-widest font-black',
  };

  const Component = as as any;

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center rounded-2xl font-black transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-lavender/70 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={Component === 'button' ? (disabled || isLoading) : undefined}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </Component>
  );
};
