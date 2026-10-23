import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useMatchStore } from '../stores/matchStore';
import { getDefaultDivisionForMatch, getDivisionsForMatch } from '../utils/constants';
import { useBulkAction } from './useBulkAction';
import { useBulkEditForm } from './useBulkEditForm';
import { useEscClose } from './useEscClose';
import type { BulkEditForm } from '../components/shared/BulkEditFormFields';

interface Options {
  matchId: string;
  selectedIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function useBulkEditRegistrationsModal({ matchId, selectedIds, onClose, onSaved }: Options) {
  const { t } = useTranslation();
  const matches = useMatchStore((s) => s.matches);
  const match = matches.find((candidate) => candidate.id === matchId);
  const divisions = getDivisionsForMatch(match);
  const defaultDivision = getDefaultDivisionForMatch(match) ?? 'standard';

  const createInitialForm = useCallback((): BulkEditForm => ({
    changeDivision: false, division: defaultDivision,
    changeCategory: false, category: 'regular',
    changePowerFactor: false, powerFactor: 'minor',
    changeTag: false, tag: '',
    changeSquad: false, squad: '',
  }), [defaultDivision]);

  const { form, setForm, reset } = useBulkEditForm(createInitialForm);

  const buildUpdates = useCallback(() => {
    const updates: Record<string, string | number | null> = {};
    if (form.changeDivision) updates.division = form.division;
    if (form.changeCategory) updates.category = form.category;
    if (form.changePowerFactor) updates.power_factor = form.powerFactor;
    if (form.changeTag) updates.tag = form.tag || null;
    if (form.changeSquad) updates.squad = form.squad ? Number.parseInt(form.squad, 10) : null;
    return updates;
  }, [form]);

  const updates = buildUpdates();
  const hasChanges = Object.keys(updates).length > 0;

  const bulk = useBulkAction({
    operation: () => api.bulkUpdateRegistrations(matchId, selectedIds, updates),
    errorResult: (error: any) => ({
      updated: 0,
      failed: [{ id: '', name: '', reason: error?.message || t('common.unknownError') }],
    }),
    onSuccess: onSaved,
    onClose,
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);
  useEscClose(handleClose);

  return {
    form,
    setForm,
    divisions,
    match,
    hasChanges,
    loading: bulk.loading,
    result: bulk.result,
    handleSave: bulk.execute,
    handleClose,
  };
}
