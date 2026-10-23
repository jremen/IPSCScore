import { hasHitFactor } from '../utils/hitFactor';
import {
  divisionAppliesForRows,
  resultColumns,
  resultsProfileOfRows,
  ringValuesOfRows,
} from '../utils/resultsProfile';
import type { DqShooter } from '../stores/resultsStore';

export function useTagResultsContent(tagResults: Record<string, any>, dqTags: DqShooter[]) {
  const allTagRows = Object.values(tagResults).flatMap(
    (divisions) => Object.values(divisions as Record<string, any[]>).flat(),
  );
  const dqShowDivision = divisionAppliesForRows(allTagRows, divisionAppliesForRows(dqTags));

  const sections = Object.entries(tagResults).map(([tag, divisions]) => {
    const rows = Object.values(divisions as Record<string, any[]>).flat();
    const profile = resultsProfileOfRows(rows);
    const divisionApplies = divisionAppliesForRows(rows, dqShowDivision);
    const columns = resultColumns(profile, {
      division: false,
      hasHitFactor: profile === 'zone' && rows.some(hasHitFactor),
      ringValues: ringValuesOfRows(rows),
    });
    return { tag, divisions: divisions as Record<string, any[]>, divisionApplies, columns };
  });

  return { dqShowDivision, sections };
}
