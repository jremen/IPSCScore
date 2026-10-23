import { useEffect } from 'react';
import { useMatchStore } from '../stores/matchStore';
import { useUIStore } from '../stores/uiStore';
import { useSSEStore } from '../stores/sseStore';
import { useMatchProgress } from './useMatchProgress';
import { POLL_INTERVAL_MS, SSE_FALLBACK_INTERVAL_MS } from '../utils/matchProgress';

export function useMatchProgressView(externalProgress?: number) {
  const runningMatchId = useMatchStore((s) => s.runningMatch?.id);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const effectiveMatchId = runningMatchId ?? activeMatchId;
  const sseConnected = useSSEStore((s) => s.connected);
  const {
    scoredLength,
    stagesLength,
    registrationsLength,
    fetchRegistrations,
    fetchScoringProgress,
    fetchStages,
  } = useMatchProgress();

  useEffect(() => {
    if (externalProgress !== undefined) return;
    if (!effectiveMatchId) return;

    fetchRegistrations(effectiveMatchId);
    fetchStages(effectiveMatchId);
    fetchScoringProgress(effectiveMatchId);

    const interval = setInterval(
      () => fetchScoringProgress(effectiveMatchId),
      sseConnected ? SSE_FALLBACK_INTERVAL_MS : POLL_INTERVAL_MS,
    );

    return () => clearInterval(interval);
  }, [effectiveMatchId, sseConnected, externalProgress, fetchRegistrations, fetchScoringProgress, fetchStages]);

  const full = stagesLength * registrationsLength;
  const computedProgress =
    full > 0 ? Math.min(100, Number(((scoredLength / full) * 100).toFixed(2))) : 0;

  return {
    progressValue: externalProgress !== undefined ? externalProgress : computedProgress,
  };
}
