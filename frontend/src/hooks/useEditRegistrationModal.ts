import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { getDivisionsForMatch } from '../utils/constants';
import { useEscClose } from './useEscClose';
import type { RegistrationWithShooter } from '../types/scoring';

const EMPTY_FORM = { squad: '', division: '', category: '', power_factor: '', tag: '' };

interface Options {
  matchId: string;
  registration: RegistrationWithShooter | null;
  onClose: () => void;
  onSaved: () => void;
}

export function useEditRegistrationModal({ matchId, registration, onClose, onSaved }: Options) {
  const addToast = useUIStore((s) => s.addToast);
  const matches = useMatchStore((s) => s.matches);
  const { t } = useTranslation();
  const match = matches.find((candidate) => candidate.id === matchId);
  const divisions = getDivisionsForMatch(match);
  const divisionApplies = divisions.length > 0;
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!registration) return;
    const storedOverride = registration.reg_division as string | null | undefined;
    const overrideIsValid = Boolean(storedOverride)
      && divisions.some((division) => division.value === storedOverride);
    setForm({
      squad: registration.squad === null || registration.squad === undefined ? '' : String(registration.squad),
      division: divisionApplies && overrideIsValid ? storedOverride! : '',
      category: registration.reg_category || '',
      power_factor: registration.reg_power_factor || '',
      tag: registration.tag || '',
    });
  }, [registration, divisionApplies, match?.organization, match?.firearm_type, divisions]);

  const handleSave = useCallback(async () => {
    if (!matchId || !registration) return;
    await api.updateRegistration(matchId, registration.id, {
      squad: form.squad ? Number.parseInt(form.squad, 10) : null,
      division: form.division || null,
      category: form.category || null,
      power_factor: form.power_factor || null,
      tag: form.tag || null,
    });
    addToast(t('registration.updated'), 'success');
    onClose();
    onSaved();
  }, [addToast, form, matchId, onClose, onSaved, registration, t]);

  useEscClose(onClose);

  return { form, setForm, divisions, divisionApplies, handleSave };
}
