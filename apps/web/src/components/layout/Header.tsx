import React, { useState, useEffect } from 'react';
import { Menu, ShieldCheck, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getRoleDetails } from '../../lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, title }) => {
  const { user } = useAuthStore();
  const roleInfo = user?.role ? getRoleDetails(user.role) : null;

  // Realtime clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-surface-border px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20 sticky top-0">
      <div className="flex items-center gap-3">
        {/* Mobile/Tablet Menu Button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-ink-muted hover:text-ink hover:bg-surface-subtle rounded-md transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-ink leading-tight">{title}</h2>
          <p className="text-[11px] text-ink-muted hidden sm:block">
            Sistem Kasir & Operasional Toko Grosir Sembako
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-muted font-mono">
          <Clock className="w-3.5 h-3.5 text-ink-subtle" />
          <span>{currentTime} WIB</span>
        </div>

        {/* Role badge */}
        {roleInfo && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-surface-muted border-surface-border text-ink">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden sm:inline">{roleInfo.label}</span>
            <span className="sm:hidden">{user?.role}</span>
          </div>
        )}

        {/* Live Status indicator */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-surface-border text-xs text-ink-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-emerald-700">Online</span>
        </div>
      </div>
    </header>
  );
};
