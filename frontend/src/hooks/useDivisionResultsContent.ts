import { useEffect, useMemo } from 'react';
import { useMatchStore } from '../stores/matchStore';
import { useMatchProgress } from './useMatchProgress';
import { hasHitFactor } from '../utils/hitFactor';
import {
  divisionAppliesForRows,
  resultColumns,
  resultsProfileOfRows,
  ringValuesOfRows,
} from '../utils/resultsProfile';
import type { DqShooter } from '../stores/resultsStore';

export function useDivisionResultsContent(
  divisionResults: Record<string, any[]>,
  dqDivisions: DqShooter[],
) {
  const runningMatchId = useMatchStore((s) => s.runningMatch?.id);
  const progressData = useMatchProgress();

  const scoredData = useMemo(
    () => progressData.scored != null
      ? { scored: progressData.scored, stagesLength: progressData.stagesLength }
      : undefined,
    [progressData.scored, progressData.stagesLength],
  );

  const allRows = Object.values(divisionResults).flat();
  const profile = resultsProfileOfRows(allRows);
  const divisionApplies = divisionAppliesForRows(allRows, divisionAppliesForRows(dqDivisions));
  const columns = resultColumns(profile, {
    division: false,
    hasHitFactor: profile === 'zone' && allRows.some(hasHitFactor),
    ringValues: ringValuesOfRows(allRows),
  });

  useEffect(() => {
    if (!runningMatchId) return;
    progressData.fetchStages(runningMatchId);
    progressData.fetchScoringProgress(runningMatchId);
  }, [runningMatchId]);

  return { scoredData, divisionApplies, columns };
}
