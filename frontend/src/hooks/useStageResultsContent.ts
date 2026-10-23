import { hasHitFactor } from '../utils/hitFactor';
import {
  divisionAppliesForRows,
  resultColumns,
  resultsProfileOfRows,
  ringValuesOfRows,
} from '../utils/resultsProfile';

export function useStageResultsContent(stageResults: any[]) {
  const items = stageResults.map((stage) => {
    const profile = (stage.scoring_profile as ReturnType<typeof resultsProfileOfRows>) || resultsProfileOfRows(stage.scores);
    const divisionApplies = typeof stage.division_applies === 'boolean'
      ? stage.division_applies
      : divisionAppliesForRows(stage.scores);
    const ringValues = Array.isArray(stage.ring_values) && stage.ring_values.length > 0
      ? stage.ring_values as number[]
      : ringValuesOfRows(stage.scores);

    const columnsFor = (scores: any[], includeDivision: boolean) => resultColumns(profile, {
      stage: true,
      division: includeDivision,
      hasHitFactor: profile === 'zone' && scores.some(hasHitFactor),
      ringValues,
    });

    return { stage, profile, divisionApplies, columnsFor };
  });

  return { items };
}
