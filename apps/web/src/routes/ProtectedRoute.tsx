import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Role } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Check session on mount if not yet verified
    if (!isAuthenticated && isLoading) {
      checkAuth();
    }
  }, [isAuthenticated, isLoading, checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-ink-muted font-medium">Memverifikasi sesi aman...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center text-xs text-rose-800">
        <p className="font-bold text-sm">Akses Terbatas</p>
        <p className="mt-1">
          Peran Anda ({user.role}) tidak memiliki hak akses untuk halaman ini.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
