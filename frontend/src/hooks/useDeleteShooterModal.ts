import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useEscClose } from './useEscClose';

interface ShooterMatch {
  match_id: string;
  match_name: string;
  date?: string | null;
}

export function useDeleteShooterModal({ show, onClose, shooter, onDeleted }: {
  show: boolean;
  onClose: () => void;
  shooter: { id: string; first_name: string; last_name: string } | null;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<ShooterMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  useEscClose(onClose);

  useEffect(() => {
    if (!show || !shooter) {
      setMatches([]);
      return;
    }
    setMatchesLoading(true);
    api.getShooterMatches(shooter.id)
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setMatchesLoading(false));
  }, [show, shooter]);

  const handleDelete = useCallback(async () => {
    if (!shooter) return;
    setLoading(true);
    try {
      await api.deleteShooter(shooter.id);
      onDeleted();
      onClose();
    } catch {
      // Error toast is handled by the caller
    } finally {
      setLoading(false);
    }
  }, [onClose, onDeleted, shooter]);

  return {
    loading,
    matches,
    matchesLoading,
    shooterName: shooter ? `${shooter.first_name} ${shooter.last_name}` : '',
    handleDelete,
  };
}
