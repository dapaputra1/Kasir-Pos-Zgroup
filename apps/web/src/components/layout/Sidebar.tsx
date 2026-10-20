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
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { user, logout } = useAuthStore();

  const navItems: NavItem[] = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'],
    },
    {
      to: '/pos',
      label: 'Kasir POS',
      icon: ShoppingCart,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      badge: 'F4',
    },
    {
      to: '/sales',
      label: 'Riwayat Transaksi',
      icon: History,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
    },
    {
      to: '/returns',
      label: 'Retur Barang',
      icon: RotateCcw,
      roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'],
    },
    {
      to: '/customers',
      label: 'Pelanggan & Piutang',
      icon: UserCheck,
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
    },
    {
      to: '/products',
      label: 'Manajemen Produk',
      icon: Package,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE', 'CASHIER'],
    },
    {
      to: '/categories',
      label: 'Kategori Produk',
      icon: Layers,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
    },
    {
      to: '/barcode-print',
      label: 'Cetak Barcode & Rak',
      icon: Barcode,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
    },
    {
      to: '/inventory',
      label: 'Mutasi Stok & Opname',
      icon: Boxes,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
    },
    {
      to: '/suppliers',
      label: 'Supplier & Kulakan',
      icon: Warehouse,
      roles: ['OWNER', 'ADMIN', 'WAREHOUSE'],
    },
    {
      to: '/reports',
      label: 'Laporan Finansial',
      icon: TrendingUp,
      roles: ['OWNER', 'ADMIN'],
    },
    {
      to: '/users',
      label: 'Kelola Pengguna',
      icon: Users,
      roles: ['OWNER'],
    },
    {
      to: '/settings',
      label: 'Pengaturan Toko',
      icon: Settings,
      roles: ['OWNER'],
    },
  ];

  const roleInfo = user?.role ? getRoleDetails(user.role) : null;

  return (
    <aside className="w-64 h-full bg-[#111A24] text-white flex flex-col border-r border-[#1C2836] select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1C2836] shrink-0">
        <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-sm font-black text-lg">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            Grosir<span className="text-brand-400">POS</span>
          </h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
            Sembako Wholesale
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Menu Utama
        </div>

        {navItems
          .filter((item) => !user || item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group min-h-[42px]',
                    isActive
                      ? 'bg-brand-500 text-white shadow-xs font-semibold'
                      : 'text-gray-300 hover:bg-[#1A2634] hover:text-white'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] bg-[#223142] text-gray-300 px-1.5 py-0.5 rounded font-normal shrink-0">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-[#1C2836] bg-[#0E151E] shrink-0 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-md bg-[#16202C]">
          <div className="w-9 h-9 rounded-full bg-brand-700 text-brand-100 flex items-center justify-center font-bold text-sm shrink-0 border border-brand-500/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Kasir POS'}</p>
            <p className="text-[11px] text-brand-300 font-medium truncate">
              {roleInfo?.label || user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-md transition-colors min-h-[38px]"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar (Logout)</span>
        </button>
      </div>
    </aside>
  );
};
