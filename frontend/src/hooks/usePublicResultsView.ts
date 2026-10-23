import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { useResultsStore } from '../stores/resultsStore';
import { useSSEStore } from '../stores/sseStore';

const AUTO_REFRESH_INTERVAL = 30000;
const SSE_FALLBACK_INTERVAL = 300000;

export function usePublicResultsView() {
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const sseConnected = useSSEStore((s) => s.connected);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);
  const fetchOverall = useResultsStore((s) => s.fetchOverall);
  const fetchByDivision = useResultsStore((s) => s.fetchByDivision);
  const fetchByStage = useResultsStore((s) => s.fetchByStage);
  const fetchByCategory = useResultsStore((s) => s.fetchByCategory);
  const fetchByTag = useResultsStore((s) => s.fetchByTag);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [matchName, setMatchName] = useState('');
  const [publicMatch, setPublicMatch] = useState<any>(null);

  useEffect(() => {
    setActiveTab('results');
    (async () => {
      try {
        const currentMatch = await api.getCurrentMatch();
        if (currentMatch?.id) {
          setActiveMatch(currentMatch.id);
          setMatchName(currentMatch.name || '');
          setPublicMatch(currentMatch);
        } else {
          setError('noCurrentMatch');
        }
      } catch {
        await fetchMatches();
        setError('noCurrentMatch');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchMatches, setActiveMatch, setActiveTab]);

  useEffect(() => {
    if (!activeMatchId) return;
    fetchOverall(activeMatchId);
    fetchByDivision(activeMatchId);
    fetchByStage(activeMatchId);
    fetchByCategory(activeMatchId);
    fetchByTag(activeMatchId);
  }, [activeMatchId, fetchByCategory, fetchByDivision, fetchByStage, fetchByTag, fetchOverall]);

  const refreshResults = useCallback(() => {
    const currentMatchId = useUIStore.getState().activeMatchId;
    if (!currentMatchId) return;
    fetchOverall(currentMatchId);
    fetchByDivision(currentMatchId);
    fetchByStage(currentMatchId);
    fetchByCategory(currentMatchId);
    fetchByTag(currentMatchId);
    setLastRefresh(new Date());
  }, [fetchByCategory, fetchByDivision, fetchByStage, fetchByTag, fetchOverall]);

  useEffect(() => {
    const interval = setInterval(refreshResults, sseConnected ? SSE_FALLBACK_INTERVAL : AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshResults, sseConnected]);

  return {
    loading,
    error,
    lastRefresh,
    matchName,
    publicMatch,
  };
}
