import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useShooterStore } from '../stores/shooterStore';
import { useBulkAction } from './useBulkAction';
import { useBulkEditForm } from './useBulkEditForm';
import { useEscClose } from './useEscClose';
import type { BulkEditForm } from '../components/shared/BulkEditFormFields';

const createInitialForm = (): BulkEditForm => ({
  changeDivision: false, division: 'standard',
  changeCategory: false, category: 'regular',
  changePowerFactor: false, powerFactor: 'minor',
  changeTag: false, tag: '',
  changeSquad: false, squad: '',
});

interface Options {
  selectedIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function useBulkEditShootersModal({ selectedIds, onClose, onSaved }: Options) {
  const { t } = useTranslation();
  const bulkUpdate = useShooterStore((s) => s.bulkUpdateShooters);
  const { form, setForm, reset } = useBulkEditForm(createInitialForm);

  const buildUpdates = useCallback(() => {
    const updates: Record<string, string | null> = {};
    if (form.changeDivision) updates.division = form.division;
    if (form.changeCategory) updates.category = form.category;
    if (form.changePowerFactor) updates.power_factor = form.powerFactor;
    if (form.changeTag) updates.tag = form.tag || null;
    return updates;
  }, [form]);

  const updates = buildUpdates();
  const hasChanges = Object.keys(updates).length > 0;

  const bulk = useBulkAction({
    operation: () => api.bulkUpdateShooters(selectedIds, updates),
    errorResult: (error: any) => ({
      updated: 0,
      failed: [{ id: '', reason: error?.message || t('common.unknownError') }],
    }),
    onSuccess: () => {
      bulkUpdate(selectedIds, updates);
      onSaved();
    },
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
    hasChanges,
    loading: bulk.loading,
    result: bulk.result,
    handleSave: bulk.execute,
    handleClose,
  };
}

export type { BulkEditForm };
