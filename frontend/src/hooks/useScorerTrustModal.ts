import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQRCode } from './useQRCode';
import { useEscClose } from './useEscClose';
import { useLanUrl } from './useLanUrl';
import { useCopyToClipboard } from './useCopyToClipboard';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { connectToEventStream } from '../services/sse';
import type { ScorerSession } from '../components/layout/types';

export function useScorerTrustModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const adminToken = useAuthStore((s) => s.adminToken);
  const { domainUrls } = useLanUrl();
  const [trustToken, setTrustToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ScorerSession[]>([]);
  const [deviceMode, setDeviceMode] = useState<'silent' | 'pending'>('pending');
  const [settingMode, setSettingMode] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<number | null>(null);
  const { copied, copy } = useCopyToClipboard();

  useEscClose(show ? onClose : undefined);

  const fetchAll = useCallback(async (initial = false) => {
    if (!adminToken) return;
    if (initial) setLoading(true);
    setError(null);
    try {
      const [info, sessionList, modeResponse] = await Promise.all([
        api.auth.getScorerTrustInfo(adminToken),
        api.auth.getActiveScorerSessions(adminToken),
        api.auth.getScorerDeviceMode(adminToken),
      ]);
      if (info.error) {
        setError(info.error);
      } else {
        setTrustToken(info.trustToken);
        if (!info.trustToken) setError(t('auth.trustNoTokenYet'));
      }
      setSessions(sessionList);
      if (modeResponse.mode) setDeviceMode(modeResponse.mode as 'silent' | 'pending');
    } catch (err: any) {
      setError(err?.message || t('auth.trustLoadError'));
    }
    if (initial) setLoading(false);
  }, [adminToken, t]);

  useEffect(() => {
    if (!show) return;
    fetchAll(true);
    const sse = connectToEventStream(null);
    const refresh = () => fetchAll();
    const unsubs = [
      sse.subscribe('scorer:session:created', refresh),
      sse.subscribe('scorer:session:approved', refresh),
      sse.subscribe('scorer:session:revoked', refresh),
      sse.subscribe('scorer:session:rotated', refresh),
      sse.subscribe('scorer:device:mode-changed', refresh),
    ];
    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
      sse.close();
    };
  }, [show, fetchAll]);

  const handleModeToggle = useCallback(async () => {
    if (!adminToken) return;
    const newMode = deviceMode === 'silent' ? 'pending' : 'silent';
    setSettingMode(true);
    try {
      await api.auth.setScorerDeviceMode(adminToken, newMode);
      setDeviceMode(newMode);
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
    setSettingMode(false);
  }, [adminToken, deviceMode, t]);

  const qrUrl = trustToken && domainUrls?.scoring
    ? `${domainUrls.scoring}?trustToken=${trustToken}`
    : null;
  const qr = useQRCode(qrUrl, { width: 512, margin: 2 });

  const handleRotate = useCallback(async () => {
    if (!adminToken || !confirm(t('auth.trustRotateConfirm'))) return;
    setRotating(true);
    setError(null);
    try {
      const result = await api.auth.rotateScorerTrust(adminToken);
      if (result.error) {
        setError(result.error);
      } else {
        setTrustToken(result.trustToken);
        setSessions([]);
      }
    } catch (err: any) {
      setError(err?.message || t('auth.trustRotateError'));
    }
    setRotating(false);
  }, [adminToken, t]);

  const handleApprove = useCallback(async (sessionId: string) => {
    if (!adminToken) return;
    try {
      await api.auth.approveScorerSession(adminToken, sessionId);
      await fetchAll();
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
  }, [adminToken, fetchAll, t]);

  const handleRevoke = useCallback(async (sessionId: string, deviceLabel: string | null) => {
    if (!adminToken) return;
    if (!confirm(t('auth.trustRevokeConfirm', { device: deviceLabel || t('auth.trustUnknownDevice') }))) return;
    try {
      await api.auth.revokeScorerSession(adminToken, sessionId);
      await fetchAll();
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
  }, [adminToken, fetchAll, t]);

  const handleCleanupDuplicates = useCallback(async () => {
    if (!adminToken) return;
    setCleaningUp(true);
    setCleanupResult(null);
    try {
      const result = await api.auth.cleanupDuplicateScorerSessions(adminToken);
      if (result.error) {
        setError(result.error);
      } else {
        setCleanupResult(result.deleted);
        await fetchAll();
      }
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    }
    setCleaningUp(false);
  }, [adminToken, fetchAll, t]);

  const handleCopyUrl = useCallback(async () => {
    if (qrUrl) await copy(qrUrl);
  }, [copy, qrUrl]);

  const pendingSessions = sessions.filter((session) => !session.approved_at);
  const activeSessions = sessions.filter((session) => session.approved_at);

  return {
    loading,
    error,
    qr,
    qrUrl,
    copied,
    sessions,
    pendingSessions,
    activeSessions,
    deviceMode,
    settingMode,
    rotating,
    cleaningUp,
    cleanupResult,
    handleModeToggle,
    handleRotate,
    handleApprove,
    handleRevoke,
    handleCleanupDuplicates,
    handleCopyUrl,
  };
}
