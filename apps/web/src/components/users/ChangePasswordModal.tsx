import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { UserStaff } from '../../types/user';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserStaff | null;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (newPassword.length < 6) {
        throw new Error('Password baru minimal 6 karakter.');
      }
      return api.patch(`/users/${user.id}/password`, { newPassword });
    },
    onSuccess: () => {
      alert(`Password untuk ${user?.name} berhasil diubah!`);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || err.message || 'Gagal mengubah password.');
    },
  });

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reset Password: ${user.name}`}
      size="sm"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
          <p>
            Email: <span className="font-semibold text-gray-900">{user.email}</span>
          </p>
          <p>
            Role: <span className="font-semibold text-gray-900">{user.role}</span>
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Password Baru <span className="text-rose-500">*</span>
          </label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button type="submit" isLoading={mutation.isPending} className="flex items-center gap-1.5">
            <KeyRound className="w-4 h-4" />
            <span>Simpan Password</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
