import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';
import { isLocalRuntime } from '../services/data/platform';
import { saveBlobToDevice } from '../utils/exportUtils';

/** Session keys that must not survive a restore (the database behind them changed). */
const SESSION_KEYS = ['admin_token', 'auth_role', 'auth_trust_token', 'auth_scorer_token', 'auth_match_id'];

export function useDatabaseBackup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await api.exportBackup();
      const date = new Date().toISOString().slice(0, 10);
      const extension = isLocalRuntime() ? 'json' : 'sql';
      const saved = await saveBlobToDevice(blob, `ipscscore-backup-${date}.${extension}`);
      if (!saved) throw new Error(t('database.exportError'));
      addToast(t('database.exportSuccess'), 'success');
    } catch (err: any) {
      addToast(err.message || t('database.exportError'), 'error');
    } finally {
      setExporting(false);
    }
  }, [addToast, t]);

  const handleImport = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const result = await api.importBackup(file);
      if (isLocalRuntime()) {
        // Whatever admin session existed belongs to the replaced database.
        for (const key of SESSION_KEYS) localStorage.removeItem(key);
      }
      addToast(t('database.importSuccess'), 'success');
      // Reload the page after a short delay so the new data shows
      setTimeout(() => window.location.reload(), 1500);
      return result;
    } catch (err: any) {
      addToast(err.message || t('database.importError'), 'error');
    } finally {
      setImporting(false);
    }
  }, [addToast, t]);

  return { exporting, importing, handleExport, handleImport };
}
