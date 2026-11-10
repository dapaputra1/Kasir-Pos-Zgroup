import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-xs border border-brand-600',
      secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 border border-brand-200 shadow-xs',
      outline: 'border border-surface-border bg-white text-ink hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 active:bg-brand-100 shadow-xs',
      danger: 'bg-status-danger text-white hover:bg-[#9F3B3B] active:bg-[#8A3232] shadow-xs border border-status-danger',
      ghost: 'text-ink hover:bg-brand-50 hover:text-brand-700 active:bg-brand-100',
    };

    const sizes = {
      sm: 'h-9 px-3.5 text-xs rounded-md gap-1.5 min-h-[36px]',
      md: 'h-10 px-4 text-sm rounded-md gap-2 min-h-[42px]',
      lg: 'h-12 px-6 text-base rounded-md gap-2.5 min-h-[46px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
