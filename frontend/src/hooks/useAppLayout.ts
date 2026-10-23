import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import { shouldAttemptApiCall } from '../services/connectivity';
import { useOfflineStatus } from './useOfflineStatus';
import { useOfflineSync } from './useOfflineSync';
import { useRealtimeUpdates } from './useRealtimeUpdates';
import { useScoringStore } from '../stores/scoringStore';
import { useStageStore } from '../stores/stageStore';
import { isKioskResultsPath } from '../utils/domainPaths';

export function useAppLayout() {
  const activeTab = useUIStore((s) => s.activeTab);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isLocalNetwork = useAuthStore((s) => s.isLocalNetwork);
  const domainMode = useAuthStore((s) => s.domainMode);
  const authenticatedMatchId = useAuthStore((s) => s.authenticatedMatchId);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const logout = useAuthStore((s) => s.logout);
  const sessionValidated = useRef(false);
  const [sessionRestoring, setSessionRestoring] = useState(true);
  const prevActiveMatchId = useRef<string | null>(null);

  useOfflineStatus();
  useOfflineSync();
  useRealtimeUpdates();

  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore — iOS Safari standalone
      window.navigator.standalone === true
    );
    if (isStandalone && window.location.pathname === '/') {
      window.location.replace('/scoring');
      return;
    }
    (async () => {
      await restoreSession();
      setSessionRestoring(false);
    })();
    const timeout = setTimeout(() => setSessionRestoring(false), 5000);
    return () => clearTimeout(timeout);
  }, [restoreSession]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) fetchMatches();
  }, [isAuthenticated, isAdmin, fetchMatches]);

  useEffect(() => {
    if (isAuthenticated && !isAdmin && authenticatedMatchId) {
      setActiveMatch(authenticatedMatchId);
    } else if (!isAuthenticated) {
      setActiveMatch(null);
    }
  }, [isAuthenticated, isAdmin, authenticatedMatchId, setActiveMatch]);

  useEffect(() => {
    if (domainMode === 'scoring' || domainMode === 'results') {
      if (sessionValidated.current) return;
      sessionValidated.current = true;

      (async () => {
        let currentMatch: any = null;
        if (shouldAttemptApiCall()) {
          try {
            currentMatch = await api.getCurrentMatch();
          } catch {
            // fall through to IDB
          }
        }
        if (!currentMatch?.id) {
          try {
            currentMatch = await offlineDB.getCachedCurrentMatch();
          } catch {
            // leave state as-is
          }
        }
        if (!currentMatch?.id) return;
        setActiveMatch(currentMatch.id);
        if (isAuthenticated && !isAdmin && authenticatedMatchId && authenticatedMatchId !== currentMatch.id) {
          logout();
        }
      })();
    } else if (isAuthenticated && isAdmin && !activeMatchId && activeTab !== 'matches' && activeTab !== 'cups') {
      (async () => {
        let currentMatch: any = null;
        if (shouldAttemptApiCall()) {
          try {
            currentMatch = await api.getCurrentMatch();
          } catch {
            // fall through to IDB
          }
        }
        if (!currentMatch?.id) {
          try {
            currentMatch = await offlineDB.getCachedCurrentMatch();
          } catch {
            // leave as-is
          }
        }
        if (currentMatch?.id) setActiveMatch(currentMatch.id);
      })();
    }
  }, [domainMode, isAuthenticated, isAdmin, activeTab, activeMatchId, authenticatedMatchId, setActiveMatch, logout]);

  useEffect(() => {
    if (activeMatchId && activeMatchId !== prevActiveMatchId.current) {
      useScoringStore.getState().resetScoringProgress();
      useStageStore.getState().resetStages();
    }
    prevActiveMatchId.current = activeMatchId;
  }, [activeMatchId]);

  return {
    activeTab,
    isAuthenticated,
    isAdmin,
    isLocalNetwork,
    domainMode,
    authenticatedMatchId,
    sessionRestoring,
    isElectron,
    isScoringTab: activeTab === 'scoring',
    isKioskResults: isKioskResultsPath(),
  };
}
