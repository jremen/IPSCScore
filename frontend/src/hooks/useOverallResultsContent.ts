import { hasHitFactor } from '../utils/hitFactor';
import {
  divisionAppliesForRows,
  resultColumns,
  resultsProfileOfRows,
  ringValuesOfRows,
} from '../utils/resultsProfile';
import type { DqShooter } from '../stores/resultsStore';

export function useOverallResultsContent(overallResults: any[], dqOverall: DqShooter[]) {
  const profile = resultsProfileOfRows(overallResults);
  const divisionApplies = divisionAppliesForRows(overallResults, divisionAppliesForRows(dqOverall));
  const columns = resultColumns(profile, {
    division: divisionApplies,
    hasHitFactor: profile === 'zone' && hasHitFactor(overallResults),
    ringValues: ringValuesOfRows(overallResults),
  });
  return { divisionApplies, columns };
}
