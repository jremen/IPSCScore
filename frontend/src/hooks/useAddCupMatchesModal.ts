import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCupStore } from '../stores/cupStore';
import { useUIStore } from '../stores/uiStore';
import { useEscClose } from './useEscClose';

export function useAddCupMatchesModal({ show, onClose, cupId }: {
  show: boolean;
  onClose: () => void;
  cupId: string;
}) {
  const addMatches = useCupStore((s) => s.addMatches);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  useEscClose(onClose);

  useEffect(() => {
    if (show) setSelected(new Set());
  }, [show]);

  const toggleMatch = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await addMatches(cupId, Array.from(selected));
      addToast(t('cups.matchesAdded'), 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSaving(false);
    }
  }, [addMatches, addToast, cupId, onClose, selected, t]);

  return { selected, saving, toggleMatch, handleSave };
}
