import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';

export function useAdminLoginPage() {
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const { t } = useTranslation();
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!password) return;
      await adminLogin(password);
    },
    [adminLogin, password],
  );

  return { t, loading, error, password, setPassword, handleSubmit };
}
