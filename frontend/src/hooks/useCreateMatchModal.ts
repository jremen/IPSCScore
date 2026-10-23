import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../stores/matchStore';
import { useUIStore } from '../stores/uiStore';
import { useEscClose } from './useEscClose';
import { createInitialMatchForm, toDateInputValue } from '../utils/matchList';
import type { FirearmType, MatchLevel, Organization } from '../types/match';

export function useCreateMatchModal(onClose: () => void) {
  const createMatch = useMatchStore((s) => s.createMatch);
  const markCurrent = useMatchStore((s) => s.markCurrent);
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [form, setForm] = useState(createInitialMatchForm);

  const handleCreate = useCallback(async () => {
    if (!form.name || !form.date) return;
    try {
      const match = await createMatch({
        name: form.name,
        date: form.date,
        organization: form.organization,
        firearm_type: form.firearm_type,
        match_level: form.match_level === '' ? null : form.match_level,
      });
      onClose();
      setForm(createInitialMatchForm());
      await markCurrent(match.id);
      await setActiveMatch(match.id);
    } catch (err: any) {
      addToast(err.message || t('common.error'), 'error');
    }
  }, [addToast, createMatch, form, markCurrent, onClose, setActiveMatch, t]);

  const handleClose = useCallback(() => {
    onClose();
    setForm(createInitialMatchForm());
  }, [onClose]);

  useEscClose(handleClose);

  const setName = useCallback(
    (name: string) => setForm((previous) => ({ ...previous, name })),
    [],
  );

  const setDate = useCallback(
    (date: Date | null) => setForm((previous) => ({ ...previous, date: toDateInputValue(date) })),
    [],
  );

  const setOrganization = useCallback(
    (organization: Organization) => setForm((previous) => ({ ...previous, organization })),
    [],
  );

  const setFirearmType = useCallback(
    (firearmType: FirearmType) => setForm((previous) => ({ ...previous, firearm_type: firearmType })),
    [],
  );

  const setMatchLevel = useCallback(
    (matchLevel: '' | MatchLevel) => setForm((previous) => ({ ...previous, match_level: matchLevel })),
    [],
  );

  return {
    t,
    form,
    handleCreate,
    handleClose,
    setName,
    setDate,
    setOrganization,
    setFirearmType,
    setMatchLevel,
  };
}
