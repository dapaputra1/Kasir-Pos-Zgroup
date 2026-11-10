import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  iconOnly = false,
  showSubtitle = false,
  className = '',
}) => {
  const isDark = variant === 'dark';

  const logoSrc = isDark ? '/logo-grosirpos-white.png' : '/logo-grosirpos.png';
  const iconSrc = '/logo-icon.png';

  const heights = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
  };

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  if (iconOnly) {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src={iconSrc}
          alt="GrosirPOS Logo Icon"
          className={`${iconSizes[size]} object-contain`}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <img
        src={logoSrc}
        alt="GrosirPOS Logo"
        className={`${heights[size]} w-auto object-contain`}
      />
      {showSubtitle && (
        <span
          className={`font-semibold uppercase tracking-wider text-[9px] mt-0.5 ${
            isDark ? 'text-[#BAC7D5]' : 'text-ink-muted'
          }`}
        >
          Sembako Retail & Grosir
        </span>
      )}
    </div>
  );
};
