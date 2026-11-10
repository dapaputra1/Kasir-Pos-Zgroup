import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixElement?: React.ReactNode;
  suffixElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      prefixElement,
      suffixElement,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-ink uppercase tracking-wider">
            {label}
            {props.required && <span className="text-status-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixElement && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-ink-muted text-sm">
              {prefixElement}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full bg-white text-ink text-sm rounded-md border border-surface-border px-3.5 py-2.5 transition-all placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-surface-subtle disabled:cursor-not-allowed min-h-[42px]',
              prefixElement && 'pl-9',
              suffixElement && 'pr-10',
              error && 'border-status-danger focus:ring-status-danger focus:border-status-danger',
              className
            )}
            {...props}
          />
          {suffixElement && (
            <div className="absolute right-3.5 flex items-center text-ink-muted text-sm">
              {suffixElement}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-status-danger font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-ink-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
