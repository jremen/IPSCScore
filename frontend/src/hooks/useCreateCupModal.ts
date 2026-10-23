import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCupStore } from '../stores/cupStore';
import { useUIStore } from '../stores/uiStore';
import { useEscClose } from './useEscClose';
import type { CreateCupModalProps } from '../components/cup/types';

export function useCreateCupModal({
  show,
  onClose,
  onCreated,
  preselectedMatchIds = [],
}: Pick<CreateCupModalProps, 'show' | 'onClose' | 'onCreated' | 'preselectedMatchIds'>) {
  const { t } = useTranslation();
  const createCup = useCupStore((s) => s.createCup);
  const addToast = useUIStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [scoringMode, setScoringMode] = useState<'hit_factor' | 'points'>('hit_factor');
  const [minimum, setMinimum] = useState('');
  const [minimumParticipants, setMinimumParticipants] = useState('');
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setName('');
    setScoringMode('hit_factor');
    setMinimum('');
    setMinimumParticipants('');
    setCategories(new Set());
    setError(null);
    setSelected(new Set(preselectedMatchIds));
  }, [show, preselectedMatchIds]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  useEscClose(handleClose);

  const toggleMatch = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((value: string) => {
    setCategories((previous) => {
      const next = new Set(previous);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError(t('cups.nameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const parseMin = Number(minimum);
      const parseMinPart = Number(minimumParticipants);
      const cup = await createCup({
        name: name.trim(),
        scoring_mode: scoringMode,
        minimum_matches:
          minimum === '' ? null : Number.isInteger(parseMin) && parseMin >= 1 ? parseMin : null,
        minimum_participants:
          minimumParticipants === ''
            ? null
            : Number.isInteger(parseMinPart) && parseMinPart >= 1
              ? parseMinPart
              : null,
        selected_categories: categories.size > 0 ? Array.from(categories) : null,
        matchIds: Array.from(selected),
      });
      addToast(t('cups.created'), 'success');
      handleClose();
      onCreated?.(cup.id);
    } catch (err: any) {
      setError(err.message || t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  }, [
    addToast,
    categories,
    createCup,
    handleClose,
    minimum,
    minimumParticipants,
    name,
    onCreated,
    scoringMode,
    selected,
    t,
  ]);

  return {
    t,
    name,
    setName,
    scoringMode,
    setScoringMode,
    minimum,
    setMinimum,
    minimumParticipants,
    setMinimumParticipants,
    categories,
    selected,
    error,
    saving,
    toggleMatch,
    toggleCategory,
    handleCreate,
    handleClose,
  };
}
