import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDatabaseBackup } from './useDatabaseBackup';
import { useTabMenuAction } from './useTabMenuAction';
import { api } from '../services/api';
import { isLocalRuntime } from '../services/data/platform';
import type { RestorePreview } from '../components/settings/types';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();

export function useDatabaseSettings() {
  const { exporting, importing, handleExport, handleImport } = useDatabaseBackup();
  const { t } = useTranslation();
  const local = isLocalRuntime();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [backupFolder, setBackupFolder] = useState('');
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [lastFull, setLastFull] = useState<string | null>(null);
  const [deltasSinceFull, setDeltasSinceFull] = useState(0);
  const [diskUsage, setDiskUsage] = useState(0);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');
  const [folderAccessible, setFolderAccessible] = useState(true);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restoring, setRestoring] = useState(false);

  useTabMenuAction('export-database-backup', () => {
    if (!exporting && !importing) handleExport();
  });
  useTabMenuAction('import-database-backup', () => {
    if (!exporting && !importing) fileInputRef.current?.click();
  });

  const loadStatus = useCallback(async () => {
    try {
      const status = await api.getLocalBackupStatus();
      setBackupFolder(status.folder);
      setBackupEnabled(status.enabled);
      setLastFull(status.lastFullBackupAt);
      setDeltasSinceFull(status.deltasSinceFull);
      setDiskUsage(status.diskUsage);
      setFolderAccessible(status.folderAccessible);
    } catch {
      // Not configured yet
    }
  }, []);

  useEffect(() => {
    if (isElectron) loadStatus();
  }, [loadStatus]);

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirm(true);
    }
    event.target.value = '';
  }, []);

  const confirmImport = useCallback(async () => {
    if (!selectedFile) return;
    setShowConfirm(false);
    await handleImport(selectedFile);
    setSelectedFile(null);
  }, [handleImport, selectedFile]);

  const cancelImport = useCallback(() => {
    setShowConfirm(false);
    setSelectedFile(null);
  }, []);

  const pickBackupFolder = useCallback(async () => {
    const path = await window.electronAPI?.pickBackupFolder();
    if (!path) return;
    try {
      await api.saveLocalBackupConfig({ folder: path, enabled: true });
      setBackupFolder(path);
      setBackupEnabled(true);
      setMessage(t('localBackup.folderSet'));
      await loadStatus();
    } catch (err: any) {
      setMessage(err.message);
    }
  }, [loadStatus, t]);

  const handleBackupNow = useCallback(async () => {
    setTriggering(true);
    try {
      const result = await api.triggerLocalBackup();
      setMessage(t('localBackup.backupDone', { key: result.key }));
      await loadStatus();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setTriggering(false);
    }
  }, [loadStatus, t]);

  const handleToggle = useCallback(async (newValue: boolean) => {
    setBackupEnabled(newValue);
    try {
      await api.saveLocalBackupConfig({ enabled: newValue });
    } catch (err: any) {
      setBackupEnabled(!newValue);
      setMessage(err.message);
    }
  }, []);

  const handleRestoreFolder = useCallback(async () => {
    const folder = await window.electronAPI?.pickBackupFolder();
    if (!folder) return;
    try {
      const preview = await api.previewLocalBackupFolder(folder);
      setRestorePreview({ folder, ...preview });
      setShowRestoreConfirm(true);
    } catch (err: any) {
      setMessage(err.message);
    }
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!restorePreview) return;
    setShowRestoreConfirm(false);
    setRestoring(true);
    try {
      const result = await api.restoreLocalBackupFromFolder(restorePreview.folder);
      setMessage(t('localBackup.restoreDone', { deltas: result.deltasApplied }));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setRestoring(false);
      setRestorePreview(null);
    }
  }, [restorePreview, t]);

  const cancelRestore = useCallback(() => {
    setShowRestoreConfirm(false);
    setRestorePreview(null);
  }, []);

  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t('database.unitsByte')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('database.unitsKb')}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('database.unitsMb')}`;
  }, [t]);

  return {
    isElectron,
    local,
    fileInputRef,
    selectedFile,
    showConfirm,
    backupFolder,
    backupEnabled,
    lastFull,
    deltasSinceFull,
    diskUsage,
    triggering,
    message,
    folderAccessible,
    showRestoreConfirm,
    restorePreview,
    restoring,
    exporting,
    importing,
    handleExport,
    handleImportClick,
    handleFileSelect,
    confirmImport,
    cancelImport,
    pickBackupFolder,
    handleBackupNow,
    handleToggle,
    handleRestoreFolder,
    confirmRestore,
    cancelRestore,
    formatBytes,
  };
}
