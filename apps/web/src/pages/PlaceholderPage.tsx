import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface PlaceholderProps {
  title: string;
  stage: string;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, stage, description }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-surface-border p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
        <Clock className="w-7 h-7" />
      </div>
      <span className="inline-block px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold rounded-full mb-3">
        {stage}
      </span>
      <h2 className="text-xl font-bold text-ink mb-2">{title}</h2>
      <p className="text-xs text-ink-muted leading-relaxed mb-6 max-w-md mx-auto">
        {description}
      </p>

      <div className="bg-surface-muted border border-surface-border rounded-lg p-4 text-left text-xs space-y-2 mb-6">
        <div className="font-bold text-ink">Fondasi yang sudah siap untuk modul ini:</div>
        <div className="flex items-center gap-2 text-ink-muted">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Skema database multi-satuan & konversi barang grosir aktif</span>
        </div>
        <div className="flex items-center gap-2 text-ink-muted">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Sistem audit trail mutasi stok (Stock Movements) siap pakai</span>
        </div>
        <div className="flex items-center gap-2 text-ink-muted">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Autentikasi aman dan RBAC backend siap tervalidasi</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Kembali ke Dashboard
      </Button>
    </div>
  );
};
