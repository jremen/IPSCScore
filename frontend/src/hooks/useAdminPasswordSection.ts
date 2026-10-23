import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

export function useAdminPasswordSection() {
  const { t } = useTranslation();
  const adminToken = useAuthStore((s) => s.adminToken);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = useCallback(async () => {
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('auth.passwordMismatch') });
      return;
    }

    if (newPassword.length < 10) {
      setMessage({ type: 'error', text: t('auth.passwordTooShort') });
      return;
    }

    setSaving(true);
    try {
      const result = await api.auth.changeAdminPassword(currentPassword, newPassword, adminToken!);
      if (result.success) {
        setMessage({ type: 'success', text: t('auth.passwordChanged') });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.error || t('auth.incorrectPassword') });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('auth.incorrectPassword') });
    } finally {
      setSaving(false);
    }
  }, [adminToken, confirmPassword, currentPassword, newPassword, t]);

  return {
    t,
    currentPassword,
    newPassword,
    confirmPassword,
    saving,
    message,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    handleChangePassword,
  };
}
