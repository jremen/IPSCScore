import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchExport } from './useMatchExport';
import { useEscClose } from './useEscClose';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { isLocalRuntime } from '../services/data/platform';
import type { ImportResult, ImportTab, WinMssInspection } from '../components/match/types';

export function useImportMatchModal({ onClose, onImported }: {
  onClose: () => void;
  onImported: () => void;
}) {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);
  const { importing, handleImport } = useMatchExport();
  const local = isLocalRuntime();

  const [activeTab, setActiveTab] = useState<ImportTab>('json');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pscFile, setPscFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [winmssImporting, setWinmssImporting] = useState(false);
  const [winmssInspecting, setWinmssInspecting] = useState(false);
  const [winmssResult, setWinmssResult] = useState<ImportResult | null>(null);
  const [winmssInspectData, setWinmssInspectData] = useState<WinMssInspection | null>(null);
  const [winmssError, setWinmssError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setPscFile(null);
    setError('');
    setWinmssResult(null);
    setWinmssError(null);
    setWinmssInspectData(null);
    setWinmssImporting(false);
    setWinmssInspecting(false);
    onClose();
  }, [onClose]);
  useEscClose(handleClose);

  const detectTab = useCallback((filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.mdb') || lower.endsWith('.accdb') || lower.endsWith('.cab')) setActiveTab('winmss');
    else if (lower.endsWith('.psc')) setActiveTab('psc');
    else setActiveTab('json');
  }, []);

  const handleJsonFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setError('');
    detectTab(file.name);
  }, [detectTab]);

  const handlePscFileSelected = useCallback((file: File) => {
    setPscFile(file);
    setError('');
  }, []);

  const handleJsonConfirm = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await handleImport(selectedFile, 'json');
      setSelectedFile(null);
      setError('');
      onImported();
      handleClose();
    } catch (err: any) {
      if (err.message?.includes('MATCH_ID_CONFLICT') || err.message?.includes('already exists')) {
        setError(t('matches.matchIdConflict'));
      } else {
        setError(err.message || t('matches.importError'));
      }
    }
  }, [handleClose, handleImport, onImported, selectedFile, t]);

  const handlePscConfirm = useCallback(async () => {
    if (!pscFile) return;
    try {
      await handleImport(pscFile, 'psc');
      setPscFile(null);
      setError('');
      onImported();
      handleClose();
    } catch (err: any) {
      setError(err.message || t('matches.importError'));
    }
  }, [handleClose, handleImport, onImported, pscFile, t]);

  // Mobile builds parse `.cab` locally; Access databases need the desktop app.
  const winmssDropzone = useMemo(() => {
    const accept: Record<string, string[]> = local
      ? {
          'application/octet-stream': ['.cab'],
          'application/zip': ['.cab'],
          'application/x-cab': ['.cab'],
          'application/x-cab-compressed': ['.cab'],
          'application/vnd.ms-cab-compressed': ['.cab'],
        }
      : {
          'application/x-msaccess': ['.mdb', '.accdb'],
          'application/octet-stream': ['.mdb', '.accdb', '.cab'],
          'application/zip': ['.cab'],
          'application/x-cab': ['.cab'],
          'application/x-cab-compressed': ['.cab'],
          'application/vnd.ms-cab-compressed': ['.cab'],
        };

    return {
      accept,
      inspectAccept: local ? '.cab' : '.mdb,.accdb,.cab',
      dragHint: local ? t('import.winMss.dragDropCabOffline') : t('import.winMss.dragDropMdb'),
      browseHint: local ? t('import.winMss.orBrowseCabOffline') : t('import.winMss.orBrowse'),
    };
  }, [local, t]);

  const handleWinMssImport = useCallback(async (file: File) => {
    setWinmssImporting(true);
    setWinmssError(null);
    setWinmssResult(null);
    setWinmssInspectData(null);
    try {
      const importResult = await api.importWinMSS(file) as ImportResult;
      setWinmssResult(importResult);
      addToast(`${t('import.winMss.title')} — ${t('import.winMss.importCompleted')}`, 'success');
      await fetchMatches();
    } catch (err: any) {
      setWinmssError(err.message || '');
      addToast(err.message || '', 'error');
    } finally {
      setWinmssImporting(false);
    }
  }, [addToast, fetchMatches, t]);

  const handleWinMssInspect = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = winmssDropzone.inspectAccept;
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      setWinmssInspecting(true);
      try {
        const data = await api.inspectWinMSS(input.files[0]) as WinMssInspection;
        setWinmssInspectData(data);
      } catch (err: any) {
        setWinmssError(err.message || '');
      } finally {
        setWinmssInspecting(false);
      }
    };
    input.click();
  }, [winmssDropzone.inspectAccept]);

  const handleWinmssInspectBack = useCallback(() => setWinmssInspectData(null), []);
  const handleWinmssImportAnother = useCallback(() => {
    setWinmssResult(null);
    setWinmssError(null);
  }, []);

  const tabItems = useMemo(() => {
    const className = (tab: ImportTab) =>
      `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        activeTab === tab
          ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
      }`;
    return [
      { id: 'json' as const, label: 'IPSCScore JSON', className: className('json') },
      { id: 'winmss' as const, label: t('import.winMss.title'), className: className('winmss') },
      { id: 'psc' as const, label: 'Practiscore (.psc)', className: className('psc') },
    ];
  }, [activeTab, t]);

  return {
    local,
    importing,
    activeTab,
    setActiveTab,
    selectedFile,
    pscFile,
    error,
    winmssImporting,
    winmssInspecting,
    winmssResult,
    winmssInspectData,
    winmssError,
    winmssDropzone,
    tabItems,
    handleClose,
    handleJsonFileSelected,
    handlePscFileSelected,
    handleJsonConfirm,
    handlePscConfirm,
    handleWinMssImport,
    handleWinMssInspect,
    handleWinmssInspectBack,
    handleWinmssImportAnother,
  };
}
