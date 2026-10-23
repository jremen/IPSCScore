import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useShooterSearch } from './useShooterSearch';
import { useEscClose } from './useEscClose';

interface Options {
  matchId: string;
  registeredShooterIds: string[];
  onAdded: () => void;
  onClose: () => void;
}

export function useAddShooterModal({ matchId, registeredShooterIds, onAdded, onClose }: Options) {
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();
  const [squad, setSquad] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const excludedIds = [...registeredShooterIds, ...addedIds];
  const { shooters, loading, search, setSearch } = useShooterSearch(excludedIds);

  const handleAdd = useCallback(async (shooterId: string) => {
    try {
      await api.registerShooters(matchId, {
        shooterId,
        squad: squad ? Number.parseInt(squad, 10) : undefined,
      });
      addToast(t('registration.registered'), 'success');
      setAddedIds((previous) => new Set(previous).add(shooterId));
      onAdded();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  }, [addToast, matchId, onAdded, squad, t]);

  const handleClose = useCallback(() => {
    setAddedIds(new Set());
    setSquad('');
    setSearch('');
    onClose();
  }, [onClose, setSearch]);
  useEscClose(handleClose);

  return { squad, setSquad, shooters, loading, search, setSearch, handleAdd, handleClose };
}
