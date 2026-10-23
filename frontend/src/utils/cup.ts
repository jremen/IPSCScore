import type { CupTab } from '../hooks/useCupExport';
import type { CupMatchResult, CupResultRow, CupScoringMode } from '../types/cup';
import { CATEGORIES } from './constants';
import { formatCupPoints } from './hitFactor';

export const CUP_OUTPUT_CATEGORIES = CATEGORIES.filter((category) => category.value !== 'regular');

export const CUP_TABLE_CLASSES = {
  header: 'px-1.5 py-1 font-semibold uppercase tracking-wide',
  subHeader: 'px-1.5 py-0.5  font-semibold',
  matchHeader: 'px-1.5 py-1font-bold',
  cell: 'px-1.5 py-1 font-monotext-center whitespace-nowrap',
  nameCell: 'px-1.5 py-1 font-medium whitespace-nowrap',
  excluded: 'line-through text-gray-400 dark:text-gray-500',
  bold: 'font-bold',
  totalSep: 'border-l-2 border-gray-300 dark:border-gray-600',
};

export function matchCupCells(
  match: CupMatchResult,
  mode: CupScoringMode,
): { key: string; value: string; excluded: boolean }[] {
  if (match.status === 'none') {
    return mode === 'hit_factor'
      ? [
          { key: `${match.match_id}-np`, value: '', excluded: false },
          { key: `${match.match_id}-t`, value: '', excluded: false },
        ]
      : [{ key: `${match.match_id}-p`, value: '', excluded: false }];
  }
  const excluded = match.status === 'excluded';
  if (mode === 'hit_factor') {
    return [
      { key: `${match.match_id}-np`, value: formatCupPoints(match.net_points), excluded },
      { key: `${match.match_id}-t`, value: match.time != null ? match.time.toFixed(2) : '—', excluded },
    ];
  }
  return [{ key: `${match.match_id}-p`, value: formatCupPoints(match.points), excluded }];
}

export function cupMatchSubLabels(mode: CupScoringMode, t: (key: string) => string): string[] {
  return mode === 'hit_factor'
    ? [t('cups.colPts'), t('results.time')]
    : [t('cups.colPts')];
}

export const CUP_TABS: { key: CupTab; labelKey: string }[] = [
  { key: 'byDivision', labelKey: 'results.byDivision' },
  { key: 'overall', labelKey: 'results.overall' },
  { key: 'byCategory', labelKey: 'results.byCategory' },
  { key: 'byTag', labelKey: 'results.byTag' },
];

export function getCupDisplayLimit(showAllShooters: boolean, limitInput: string): number | null {
  if (showAllShooters) return null;
  const parsed = Number(limitInput);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export function limitCupRows(rows: CupResultRow[], limit: number | null): CupResultRow[] {
  return limit != null ? rows.slice(0, limit) : rows;
}
