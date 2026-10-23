import { hasHitFactor } from '../utils/hitFactor';
import {
  divisionAppliesForRows,
  resultColumns,
  resultsProfileOfRows,
  ringValuesOfRows,
} from '../utils/resultsProfile';
import type { DqShooter } from '../stores/resultsStore';

export function useCategoryResultsContent(categoryResults: Record<string, any>, dqCategories: DqShooter[]) {
  const categoryRows = Object.values(categoryResults).flatMap(
    (divisions) => Object.values(divisions as Record<string, any[]>).flat(),
  );
  const dqShowDivision = divisionAppliesForRows(categoryRows, divisionAppliesForRows(dqCategories));

  const sections = Object.entries(categoryResults).map(([category, divisions]) => {
    const rows = Object.values(divisions as Record<string, any[]>).flat();
    const profile = resultsProfileOfRows(rows);
    const divisionApplies = divisionAppliesForRows(rows, dqShowDivision);
    const columns = resultColumns(profile, {
      division: false,
      hasHitFactor: profile === 'zone' && rows.some(hasHitFactor),
      ringValues: ringValuesOfRows(rows),
    });
    return { category, divisions: divisions as Record<string, any[]>, divisionApplies, columns };
  });

  return { dqShowDivision, sections };
}
