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
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 sticky top-0">
      <div className="flex items-center gap-3">
        {/* Mobile Toggle */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <h1 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
            {title}
          </h1>
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Toko Aktif
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime} WIB</span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* User & Role Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-slate-900 leading-none">
              {user?.name}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              <span>{roleInfo?.label || user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
