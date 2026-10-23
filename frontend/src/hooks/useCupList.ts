import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useCupStore } from '../stores/cupStore';

export function useCupList() {
  const cups = useCupStore((s) => s.cups);
  const loading = useCupStore((s) => s.loading);
  const fetchCups = useCupStore((s) => s.fetchCups);
  const clearDetail = useCupStore((s) => s.clearDetail);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeCupId, setActiveCupId] = useState<string | null>(null);

  useEffect(() => {
    fetchCups();
  }, [fetchCups]);

  const openCup = useCallback((cupId: string) => setActiveCupId(cupId), []);

  const closeCup = useCallback(() => {
    setActiveCupId(null);
    clearDetail();
  }, [clearDetail]);

  const requestDelete = useCallback((event: MouseEvent<HTMLButtonElement>, cupId: string) => {
    event.stopPropagation();
    setDeleteTarget(cupId);
  }, []);

  const closeCreate = useCallback(() => setShowCreate(false), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  return {
    cups,
    loading,
    showCreate,
    deleteTarget,
    activeCupId,
    setShowCreate,
    openCup,
    closeCup,
    requestDelete,
    closeCreate,
    closeDelete,
  };
}
