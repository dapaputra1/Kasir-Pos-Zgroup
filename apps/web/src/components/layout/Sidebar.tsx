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
  badge?: string;
  section: 'KASIR' | 'INVENTORI' | 'REKANAN' | 'SISTEM';
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { user, logout } = useAuthStore();

  const navItems: NavItem[] = [
    // Operasional Kasir
    {
      to: '/',
      label: 'Ringkasan Dashboard',
      icon: LayoutDashboard,
      roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'],
      section: 'KASIR',
    },
    {
      to: '/pos',
      label: 'Mesin Kasir (POS)',
      icon: ShoppingCart,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      badge: 'F4',
      section: 'KASIR',
    },
    {
      to: '/sales',
      label: 'Riwayat Transaksi',
      icon: History,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      section: 'KASIR',
    },
    {
      to: '/returns',
      label: 'Retur Penjualan & Beli',
      icon: RotateCcw,
      roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'],
      section: 'KASIR',
    },

    // Katalog & Inventori
    {
      to: '/products',
      label: 'Master Produk & Satuan',
      icon: Package,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE', 'CASHIER'],
      section: 'INVENTORI',
    },
    {
      to: '/categories',
      label: 'Kategori Sembako',
      icon: Layers,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'INVENTORI',
    },
    {
      to: '/inventory',
      label: 'Mutasi Stok & Opname',
      icon: Boxes,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'INVENTORI',
    },
    {
      to: '/barcode-print',
      label: 'Cetak Barcode & Price Tag',
      icon: Barcode,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'INVENTORI',
    },

    // Rekanan & Pembukuan
    {
      to: '/customers',
      label: 'Pelanggan & Piutang Bon',
      icon: UserCheck,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      section: 'REKANAN',
    },
    {
      to: '/suppliers',
      label: 'Supplier & Kulakan Restock',
      icon: Warehouse,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
      section: 'REKANAN',
    },
    {
      to: '/reports',
      label: 'Laporan Finansial & Kas',
      icon: TrendingUp,
      roles: ['OWNER', 'ADMIN'],
      section: 'REKANAN',
    },

    // Pengaturan
    {
      to: '/users',
      label: 'Manajemen Staf & Akses',
      icon: Users,
      roles: ['OWNER'],
      section: 'SISTEM',
    },
    {
      to: '/settings',
      label: 'Pengaturan Toko & Struk',
      icon: Settings,
      roles: ['OWNER'],
      section: 'SISTEM',
    },
  ];

  const roleInfo = user?.role ? getRoleDetails(user.role) : null;

  const sections: { key: NavItem['section']; label: string }[] = [
    { key: 'KASIR', label: 'OPERASIONAL KASIR' },
    { key: 'INVENTORI', label: 'KATALOG & GUDANG' },
    { key: 'REKANAN', label: 'REKANAN & PEMBUKUAN' },
    { key: 'SISTEM', label: 'SISTEM & PENGATURAN' },
  ];

  return (
    <aside className="w-64 h-full bg-[#0B1320] text-slate-200 flex flex-col border-r border-slate-800/80 select-none shadow-xl">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 shrink-0 bg-gradient-to-b from-[#101B2B] to-[#0B1320]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-950 font-black text-lg">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
            Grosir<span className="text-emerald-400 font-black">POS</span>
          </h1>
          <p className="text-[10px] text-emerald-300/80 font-bold tracking-wider uppercase truncate">
            Sistem Sembako ZGroup
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-4">
        {sections.map((sec) => {
          const itemsInSection = navItems.filter(
            (item) => item.section === sec.key && (!user || item.roles.includes(user.role))
          );

          if (itemsInSection.length === 0) return null;

          return (
            <div key={sec.key} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400/90 uppercase tracking-widest">
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
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group min-h-[40px]',
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40 font-bold'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                      )
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700 px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070D16] shrink-0 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800/70">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || 'Kasir POS'}</p>
            <p className="text-[10px] text-emerald-400 font-semibold truncate">
              {roleInfo?.label || user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Akun</span>
        </button>
      </div>
    </aside>
  );
};
