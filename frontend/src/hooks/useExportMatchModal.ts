import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchExport } from './useMatchExport';
import { useEscClose } from './useEscClose';
import { isLocalRuntime } from '../services/data/platform';

export function useExportMatchModal(matchId: string, matchName: string, onClose: () => void) {
  const { t } = useTranslation();
  const { exporting, handleExport, handleExportPsc } = useMatchExport();
  const local = isLocalRuntime();
  useEscClose(onClose);

  const exportNative = useCallback(() => {
    handleExport(matchId, matchName);
    onClose();
  }, [handleExport, matchId, matchName, onClose]);

  const exportPsc = useCallback(() => {
    handleExportPsc(matchId, matchName);
    onClose();
  }, [handleExportPsc, matchId, matchName, onClose]);

  return { t, exporting, local, exportNative, exportPsc };
}
