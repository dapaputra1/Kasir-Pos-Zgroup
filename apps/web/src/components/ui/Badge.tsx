import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface-subtle text-ink border-surface-border',
    success: 'bg-brand-50 text-brand-700 border-brand-200',
    warning: 'bg-[#FBF5EB] text-[#C6923D] border-[#EEDBB8]',
    danger: 'bg-[#FDF2F2] text-[#B64545] border-[#F0C2C2]',
    info: 'bg-brand-50 text-brand-700 border-brand-200',
    outline: 'bg-transparent text-ink border-surface-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border tracking-wide whitespace-nowrap',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
