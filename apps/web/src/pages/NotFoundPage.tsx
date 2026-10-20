import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-black text-ink mb-1">Halaman Tidak Ditemukan</h1>
      <p className="text-xs text-ink-muted max-w-sm mb-6">
        Halaman yang Anda tuju mungkin telah dipindahkan atau tidak tersedia di sistem GrosirPOS.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Kembali ke Dashboard
      </Button>
    </div>
  );
};
