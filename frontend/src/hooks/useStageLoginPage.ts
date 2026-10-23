import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getOrCreateDeviceId, useAuthStore } from '../stores/authStore';
import { isLocalRuntime } from '../services/data/platform';
import { isOnlineSync } from '../services/connectivity';
import { parseTrustToken, isStandaloneDisplayMode } from '../utils/stageLogin';

export function useStageLoginPage() {
  const { t } = useTranslation();
  const loginWithTrustToken = useAuthStore((s) => s.loginWithTrustToken);
  const autoLogin = useAuthStore((s) => s.autoLogin);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const isLocalNetwork = useAuthStore((s) => s.isLocalNetwork);
  const pendingApproval = useAuthStore((s) => s.pendingApproval);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  const deviceID = getOrCreateDeviceId();
  const isStandalone = useMemo(isStandaloneDisplayMode, []);
  const isOffline = !isOnlineSync();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trustToken = params.get('trustToken');
    if (!trustToken) return;
    void loginWithTrustToken(trustToken);
  }, [loginWithTrustToken]);

  useEffect(() => {
    if (isLocalRuntime()) return;
    const sessionToken = localStorage.getItem('auth_scorer_token');
    if (sessionToken) return;
    if (autoLoginAttempted) return;
    setAutoLoginAttempted(true);
    autoLogin();
  }, [autoLogin, autoLoginAttempted]);

  const togglePasteMode = useCallback(() => {
    setPasteMode((previous) => !previous);
    setPasteError('');
  }, []);

  const changePastedUrl = useCallback((value: string) => {
    setPastedUrl(value);
    setPasteError('');
  }, []);

  const handlePasteSubmit = useCallback(async () => {
    if (!pastedUrl.trim()) {
      setPasteError(t('auth.trustPasteInvalid'));
      return;
    }
    const parsed = parseTrustToken(pastedUrl);
    if (parsed.error === 'invalid') {
      setPasteError(t('auth.trustPasteInvalid'));
      return;
    }
    if (parsed.error === 'missing') {
      setPasteError(t('auth.trustPasteNoToken'));
      return;
    }
    if (!parsed.token) return;
    setPasteError('');
    await loginWithTrustToken(parsed.token);
  }, [loginWithTrustToken, pastedUrl, t]);

  const handleCheckLogin = useCallback(async () => {
    if (pendingApproval) {
      const trustToken = localStorage.getItem('auth_trust_token');
      if (trustToken) await loginWithTrustToken(trustToken);
      return;
    }
    await autoLogin();
  }, [autoLogin, loginWithTrustToken, pendingApproval]);

  return {
    t,
    loading,
    error,
    isLocalNetwork,
    pendingApproval,
    deviceID,
    isStandalone,
    isOffline,
    pasteMode,
    pastedUrl,
    pasteError,
    changePastedUrl,
    togglePasteMode,
    handlePasteSubmit,
    handleCheckLogin,
  };
}
