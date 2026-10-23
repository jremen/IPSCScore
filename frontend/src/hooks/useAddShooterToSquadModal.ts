import { useCallback, useMemo, useState } from 'react';
import { useEscClose } from './useEscClose';
import { filterRegistrationsByName } from '../utils/registration';
import type { RegistrationWithShooter } from '../types/scoring';

interface Options {
  targetSquad: number;
  registrations: RegistrationWithShooter[];
  onAdd: (registrationId: string) => void;
  onClose: () => void;
}

export function useAddShooterToSquadModal({ targetSquad, registrations, onAdd, onClose }: Options) {
  const [query, setQuery] = useState('');

  const available = useMemo(
    () => registrations.filter((registration) => registration.squad !== targetSquad),
    [registrations, targetSquad],
  );
  const filtered = useMemo(
    () => filterRegistrationsByName(available, query),
    [available, query],
  );

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);
  useEscClose(handleClose);

  const handleAdd = useCallback((registrationId: string) => {
    onAdd(registrationId);
    handleClose();
  }, [handleClose, onAdd]);

  return { query, setQuery, filtered, handleClose, handleAdd };
}
