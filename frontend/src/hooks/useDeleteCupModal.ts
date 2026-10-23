import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCupStore } from '../stores/cupStore';
import { useUIStore } from '../stores/uiStore';
import { useEscClose } from './useEscClose';

export function useDeleteCupModal(cupId: string | null, onClose: () => void) {
  const { t } = useTranslation();
  const cups = useCupStore((s) => s.cups);
  const deleteCup = useCupStore((s) => s.deleteCup);
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  const cup = cups.find((candidate) => candidate.id === cupId);

  useEscClose(onClose);

  const handleDelete = useCallback(async () => {
    if (!cupId) return;
    setLoading(true);
    try {
      await deleteCup(cupId);
      addToast(t('cups.deleted'), 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, cupId, deleteCup, onClose, t]);

  return { t, cup, loading, handleDelete, handleClose: onClose };
}
