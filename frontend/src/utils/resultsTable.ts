import { theme } from 'flowbite-react';
import { twMerge } from 'tailwind-merge';
import { divisionLabel } from './constants';
import { formatHitFactor } from './hitFactor';

export type ColumnKey =
  | 'position' | 'shooter' | 'division' | 'matches' | 'time'
  | 'alpha' | 'charlie' | 'delta' | 'miss' | 'noShootHits' | 'procedurals'
  | 'matchPercent' | 'matchPoints' | 'stagePercent' | 'stagePoints'
  | 'hitFactor' | 'netPoints' | 'hits' | 'misses'
  | `ring:${number}`;

export const RESULTS_PROGRESS_THEME = {
  base: twMerge(theme.progress.base, 'relative overflow-visible!'),
};

const DETAIL_COLUMNS = new Set<string>([
  'division', 'matches', 'time', 'alpha', 'charlie', 'delta', 'miss',
  'noShootHits', 'procedurals', 'matchPercent', 'matchPoints', 'stagePercent',
  'stagePoints', 'hitFactor', 'netPoints', 'hits', 'misses',
]);

export function isDetailColumn(column: ColumnKey): boolean {
  return DETAIL_COLUMNS.has(column) || column.startsWith('ring:');
}

export function columnHeader(column: ColumnKey, t: (key: string, opts?: any) => string): string {
  if (column.startsWith('ring:')) {
    const value = Number(column.slice('ring:'.length));
    if (value === 11) return 'X';
    if (value === 0) return t('results.ringMiss');
    return String(value);
  }

  const map: Record<string, string> = {
    position: t('results.position'),
    shooter: t('results.shooter'),
    division: t('results.division'),
    matches: t('cups.colMatches'),
    time: t('results.time', { defaultValue: 'Time' }),
    alpha: t('results.alpha'),
    charlie: t('results.charlie'),
    delta: t('results.delta'),
    miss: t('results.miss'),
    noShootHits: t('results.noShootHits'),
    procedurals: t('results.proceduralsHeader'),
    matchPercent: t('results.matchPercent'),
    matchPoints: t('results.points'),
    stagePercent: t('results.stagePercent'),
    stagePoints: t('results.points'),
    hitFactor: 'HF',
    netPoints: t('results.netPoints'),
    hits: t('results.hits'),
    misses: t('results.misses'),
  };
  return map[column] ?? '';
}

export function cellValue(column: ColumnKey, row: any): string {
  if (column.startsWith('ring:')) {
    const value = column.slice('ring:'.length);
    return String(row.ring_counts?.[value] ?? 0);
  }

  switch (column) {
    case 'position': return String(row.position);
    case 'shooter': return `${row.first_name} ${row.last_name}`;
    case 'division': return divisionLabel(row.division);
    case 'time': return row.time != null ? Number(row.time).toFixed(2) : '—';
    case 'alpha': return String(row.alpha ?? 0);
    case 'charlie': return String(row.charlie ?? 0);
    case 'delta': return String(row.delta ?? 0);
    case 'miss': return String(row.miss ?? 0);
    case 'noShootHits': return String(row.no_shoot ?? 0);
    case 'procedurals': return String(row.procedurals ?? 0);
    case 'matchPercent': return `${row.match_percent?.toFixed(2)}%`;
    case 'matchPoints': return row.match_points?.toFixed(2);
    case 'stagePercent': return `${row.stage_percent?.toFixed(2)}%`;
    case 'stagePoints': return row.stage_points?.toFixed(2);
    case 'hitFactor': return formatHitFactor(row.hit_factor, '—');
    case 'netPoints': return row.net_points?.toFixed(2);
    case 'matches': return `${row.matches_count ?? 0}/${row.matches_required ?? 0}`;
    case 'hits': return String(row.hits ?? 0);
    case 'misses': return String(row.misses ?? 0);
    default: return '';
  }
}

export function isBoldColumn(column: ColumnKey): boolean {
  return column === 'matchPoints' || column === 'stagePoints';
}

export function cellClassName(column: ColumnKey): string {
  const base = column !== 'shooter' && column !== 'division' ? 'font-mono' : '';
  const bold = isBoldColumn(column) ? 'font-bold' : '';
  const shooter = column === 'shooter' ? 'font-medium dark:text-white whitespace-nowrap' : '';
  return [base, bold, shooter].filter(Boolean).join(' ');
}
