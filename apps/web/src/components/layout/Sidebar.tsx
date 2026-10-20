import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  History,
  Users,
  Warehouse,
  Boxes,
  LogOut,
  Store,
  Layers,
  UserCheck,
  TrendingUp,
  RotateCcw,
  Barcode,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn, getRoleDetails } from '../../lib/utils';

interface SidebarProps {
  onItemClick?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  shortcut?: string;
  section: 'OPERASIONAL' | 'INVENTORI' | 'RELASI & LAPORAN' | 'SISTEM';
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { user, logout } = useAuthStore();

  const navItems: NavItem[] = [
    // Operasional Kasir
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'],
      section: 'OPERASIONAL',
    },
    {
      to: '/pos',
      label: 'Mesin Kasir (POS)',
      icon: ShoppingCart,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      shortcut: 'F4',
      section: 'OPERASIONAL',
    },
    {
      to: '/sales',
      label: 'Riwayat Penjualan',
      icon: History,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      section: 'OPERASIONAL',
    },
    {
      to: '/returns',
      label: 'Retur Barang',
      icon: RotateCcw,
      roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'],
      section: 'OPERASIONAL',
    },

    // Katalog & Inventori
    {
      to: '/products',
      label: 'Katalog Produk',
      icon: Package,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE', 'CASHIER'],
      section: 'INVENTORI',
    },
    {
      to: '/categories',
      label: 'Kategori Barang',
      icon: Layers,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'INVENTORI',
    },
    {
      to: '/inventory',
      label: 'Stok & Mutasi',
      icon: Boxes,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'INVENTORI',
    },
    {
      to: '/barcode-print',
      label: 'Cetak Barcode',
      icon: Barcode,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'INVENTORI',
    },

    // Relasi & Laporan
    {
      to: '/customers',
      label: 'Pelanggan & Piutang',
      icon: UserCheck,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      section: 'RELASI & LAPORAN',
    },
    {
      to: '/suppliers',
      label: 'Supplier & Kulakan',
      icon: Warehouse,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'RELASI & LAPORAN',
    },
    {
      to: '/reports',
      label: 'Laporan Finansial',
      icon: TrendingUp,
      roles: ['OWNER', 'ADMIN'],
      section: 'RELASI & LAPORAN',
    },

    // Pengaturan
    {
      to: '/users',
      label: 'Kelola Staf',
      icon: Users,
      roles: ['OWNER'],
      section: 'SISTEM',
    },
    {
      to: '/settings',
      label: 'Pengaturan Toko',
      icon: Settings,
      roles: ['OWNER'],
      section: 'SISTEM',
    },
  ];

  const roleInfo = user?.role ? getRoleDetails(user.role) : null;

  const sections: { key: NavItem['section']; label: string }[] = [
    { key: 'OPERASIONAL', label: 'Operasional Kasir' },
    { key: 'INVENTORI', label: 'Inventori & Gudang' },
    { key: 'RELASI & LAPORAN', label: 'Relasi & Keuangan' },
    { key: 'SISTEM', label: 'Sistem' },
  ];

  return (
    <aside className="w-60 h-full bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm text-white tracking-tight leading-none">
              Grosir<span className="text-emerald-400">POS</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
              Toko Sembako Grosir
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {sections.map((sec) => {
          const itemsInSection = navItems.filter(
            (item) => item.section === sec.key && (!user || item.roles.includes(user.role))
          );

          if (itemsInSection.length === 0) return null;

          return (
            <div key={sec.key} className="space-y-0.5">
              <div className="px-2.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {sec.label}
              </div>

              {itemsInSection.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group',
                        isActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={cn(
                              'w-4 h-4 shrink-0 transition-colors',
                              isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.shortcut && (
                          <span
                            className={cn(
                              'font-mono text-[9px] px-1 py-0.5 rounded font-medium',
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                            )}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Footer with Clean Logout */}
      <div className="p-3 border-t border-slate-800 shrink-0 bg-[#0B1120]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate leading-tight">
              {user?.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {roleInfo?.label || user?.role}
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
            title="Keluar dari Sistem"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
