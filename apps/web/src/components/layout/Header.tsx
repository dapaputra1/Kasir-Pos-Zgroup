import React, { useState, useEffect } from 'react';
import { Menu, ShieldCheck, Clock, Store } from 'lucide-react';
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
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20 sticky top-0">
      <div className="flex items-center gap-3.5">
        {/* Mobile/Tablet Menu Button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-200/60"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
              {title}
            </h2>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5 mt-0.5 font-medium">
            <Store className="w-3 h-3 text-slate-400" />
            <span>Grosir Sembako Nusantara — ZGroup</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live Digital Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-mono font-semibold tabular-nums shadow-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || '00:00:00'}</span>
        </div>

        {/* Role badge */}
        {roleInfo && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/80 text-emerald-800 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{roleInfo.label}</span>
            <span className="sm:hidden">{user?.role}</span>
          </div>
        )}
      </div>
    </header>
  );
};
