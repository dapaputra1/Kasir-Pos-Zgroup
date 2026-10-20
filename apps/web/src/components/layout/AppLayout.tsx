import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Determine current page title based on route
  const getPageTitle = (pathname: string) => {
    if (pathname === '/' || pathname === '/dashboard') return 'Ringkasan Dashboard';
    if (pathname.startsWith('/products')) return 'Manajemen Produk & Satuan';
    if (pathname.startsWith('/inventory')) return 'Mutasi & Riwayat Stok';
    if (pathname.startsWith('/pos')) return 'Mesin Kasir (POS)';
    if (pathname.startsWith('/sales')) return 'Riwayat Penjualan';
    if (pathname.startsWith('/suppliers')) return 'Supplier & Pembelian';
    if (pathname.startsWith('/users')) return 'Manajemen Pengguna';
    return 'GrosirPOS';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-muted text-ink">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile & Tablet Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative z-50 w-72 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar onItemClick={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header onMenuToggle={() => setMobileOpen(true)} title={getPageTitle(location.pathname)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
