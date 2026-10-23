import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { api } from '../services/api';
import { onMenuAction } from './useMenuActions';
import { isLocalRuntime } from '../services/data/platform';
import { downloadBlob } from '../utils/exportUtils';
import type { CsvImportExportProps } from '../components/shared/types';

export function useCsvImportExport({ type, matchId }: Pick<CsvImportExportProps, 'type' | 'matchId'>) {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const [show, setShow] = useState(false);
  const [exporting, setExporting] = useState(false);
  const local = isLocalRuntime();

  useEffect(() => {
    if (local) return;
    const action =
      type === 'shooters'
        ? 'import-shooters-csv'
        : type === 'registrations'
          ? 'import-registrations-csv'
          : null;
    if (!action) return;
    return onMenuAction(action, () => {
      if (type === 'registrations' && !matchId) return;
      setShow(true);
    });
  }, [type, matchId, local]);

  const exportShooters = useCallback(async () => {
    setExporting(true);
    try {
      const csv = await api.exportShootersCSV();
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'shooters.csv');
      addToast(t('import.csvExported'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  }, [addToast, t]);

  const exportRegistrations = useCallback(async () => {
    if (!matchId) return;
    setExporting(true);
    try {
      const csv = await api.exportRegistrationCSV(matchId);
      downloadBlob(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        `registrations_${matchId}.csv`,
      );
      addToast(t('import.csvExported'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  }, [addToast, matchId, t]);

  const open = useCallback(() => setShow(true), []);
  const close = useCallback(() => setShow(false), []);

  return {
    t,
    local,
    show,
    exporting,
    open,
    close,
    exportShooters,
    exportRegistrations,
  };
}
