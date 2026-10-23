import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { useShooterStore } from '../stores/shooterStore';
import { getDefaultDivisionForMatch, getDivisionsForMatch } from '../utils/constants';
import { useEscClose } from './useEscClose';
import type { ShooterFormData } from '../components/shared/ShooterFormFields';

interface Options {
  show: boolean;
  matchId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function useCreateShooterModal({ show, matchId, onClose, onCreated }: Options) {
  const addToast = useUIStore((s) => s.addToast);
  const matches = useMatchStore((s) => s.matches);
  const fetchShooters = useShooterStore((s) => s.fetchShooters);
  const { t } = useTranslation();
  const match = matches.find((candidate) => candidate.id === matchId);
  const divisions = getDivisionsForMatch(match);
  const defaultDivision = getDefaultDivisionForMatch(match) ?? 'standard';
  const [squad, setSquad] = useState('');
  const [form, setForm] = useState<ShooterFormData>({
    first_name: '', last_name: '', category: 'regular', tag: null,
    division: defaultDivision, power_factor: 'minor', region: '', email: null,
  });

  useEffect(() => {
    if (!show) return;
    setForm((previous) => ({ ...previous, division: defaultDivision }));
  }, [show, matchId, defaultDivision]);

  const reset = useCallback(() => {
    setForm({
      first_name: '', last_name: '', category: 'regular', tag: null,
      division: defaultDivision, power_factor: 'minor', region: '', email: null,
    });
    setSquad('');
  }, [defaultDivision]);

  const handleCreate = useCallback(async () => {
    if (!form.first_name || !form.last_name || !form.region) return;
    try {
      await api.createAndAddShooter(matchId, {
        ...form,
        squad: squad ? Number.parseInt(squad, 10) : undefined,
      });
      addToast(t('registration.createdAndRegistered'), 'success');
      onClose();
      reset();
      onCreated();
      fetchShooters();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  }, [addToast, fetchShooters, form, matchId, onClose, onCreated, reset, squad, t]);

  useEscClose(onClose);

  return {
    form,
    setForm,
    squad,
    setSquad,
    divisions,
    matchOrganization: match?.organization,
    matchFirearmType: match?.firearm_type,
    handleCreate,
  };
}
