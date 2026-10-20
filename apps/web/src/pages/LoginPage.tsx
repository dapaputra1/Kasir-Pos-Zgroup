import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Store, Lock, Mail, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, clearError } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'owner@grosirpos.com',
      password: 'password123',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setSubmitting(true);
      clearError();
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch {
      // Handled in store
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoCredentials = (email: string) => {
    setValue('email', email);
    setValue('password', 'password123');
    clearError();
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md">
            <Store className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-ink">
          Grosir<span className="text-brand-500">POS</span>
        </h2>
        <p className="mt-1 text-center text-xs text-ink-muted">
          Sistem Point of Sale & Operasional Toko Grosir Sembako
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-surface-border rounded-xl sm:px-8">
          <div className="mb-6">
            <h3 className="text-base font-bold text-ink">Masuk ke Akun Anda</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Gunakan kredensial yang telah didaftarkan oleh Administrator.
            </p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{authError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Alamat Email"
              type="email"
              required
              placeholder="nama@grosirpos.com"
              prefixElement={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Kata Sandi (Password)"
              type="password"
              required
              placeholder="••••••••"
              prefixElement={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-bold"
              isLoading={submitting}
            >
              Masuk ke Sistem
            </Button>
          </form>

          {/* Quick Demo Accounts Helper */}
          <div className="mt-6 pt-5 border-t border-surface-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted mb-2.5">
              <UserCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>Akun Demo Cepat (1-Klik):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('owner@grosirpos.com')}
                className="p-2 text-left rounded-md border border-surface-border hover:bg-brand-50 hover:border-brand-300 transition-colors"
              >
                <div className="font-bold text-ink">Owner</div>
                <div className="text-[10px] text-ink-muted truncate">owner@grosirpos.com</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('admin@grosirpos.com')}
                className="p-2 text-left rounded-md border border-surface-border hover:bg-brand-50 hover:border-brand-300 transition-colors"
              >
                <div className="font-bold text-ink">Admin</div>
                <div className="text-[10px] text-ink-muted truncate">admin@grosirpos.com</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('kasir@grosirpos.com')}
                className="p-2 text-left rounded-md border border-surface-border hover:bg-brand-50 hover:border-brand-300 transition-colors"
              >
                <div className="font-bold text-ink">Kasir</div>
                <div className="text-[10px] text-ink-muted truncate">kasir@grosirpos.com</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('gudang@grosirpos.com')}
                className="p-2 text-left rounded-md border border-surface-border hover:bg-brand-50 hover:border-brand-300 transition-colors"
              >
                <div className="font-bold text-ink">Gudang</div>
                <div className="text-[10px] text-ink-muted truncate">gudang@grosirpos.com</div>
              </button>
            </div>
            <p className="text-[11px] text-ink-subtle text-center mt-2.5">
              Password default demo: <code className="font-mono text-ink">password123</code>
            </p>
          </div>
        </div>

        {/* Security notice */}
        <div className="mt-4 text-center text-xs text-ink-subtle flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Sesi diamankan dengan HTTP-Only Cookie & Enkripsi Standar Industri</span>
        </div>
      </div>
    </div>
  );
};
