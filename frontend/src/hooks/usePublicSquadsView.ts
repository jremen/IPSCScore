import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import { useUIStore } from '../stores/uiStore';
import { groupRegistrationsBySquad, sortedSquadNumbers } from '../utils/registration';
import type { RegistrationWithShooter } from '../types/scoring';

export function usePublicSquadsView() {
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'noCurrentMatch' | 'loadError' | null>(null);
  const [matchName, setMatchName] = useState('');
  const [registrations, setRegistrations] = useState<RegistrationWithShooter[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const loadData = useCallback(async () => {
    let currentMatch: any = null;
    try {
      currentMatch = await api.getCurrentMatch();
    } catch {
      try {
        currentMatch = await offlineDB.getCachedCurrentMatch();
      } catch {
        // leave as-is
      }
    }

    if (!currentMatch?.id) {
      setError('noCurrentMatch');
      setLoading(false);
      return;
    }

    setActiveMatch(currentMatch.id);
    setMatchName(currentMatch.name || '');

    try {
      const nextRegistrations = await api.getRegistrations(currentMatch.id);
      setRegistrations(nextRegistrations);
      setIsOffline(false);
      try {
        await offlineDB.cacheRegistrations(currentMatch.id, nextRegistrations);
        await offlineDB.cacheMatches([currentMatch]);
      } catch {
        // Non-fatal
      }
    } catch {
      try {
        const cachedRegistrations = await offlineDB.getCachedRegistrations(currentMatch.id);
        if (cachedRegistrations.length > 0) {
          setRegistrations(cachedRegistrations);
          setIsOffline(true);
        } else {
          setError('loadError');
        }
      } catch {
        setError('loadError');
      }
    }

    setLoading(false);
  }, [setActiveMatch]);

  useEffect(() => {
    setActiveTab('squads');
    loadData();
  }, [setActiveTab, loadData]);

  const squadData = useMemo(() => groupRegistrationsBySquad(registrations), [registrations]);
  const sortedSquads = useMemo(() => sortedSquadNumbers(squadData), [squadData]);
  const unassigned = squadData[0] || [];

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    loadData();
  }, [loadData]);

  return {
    loading,
    error,
    matchName,
    squadData,
    sortedSquads,
    unassigned,
    isOffline,
    handleRetry,
  };
}
