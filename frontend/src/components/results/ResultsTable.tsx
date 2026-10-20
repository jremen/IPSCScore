import { Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, Badge, Progress, theme } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import { formatHitFactor } from '../../utils/hitFactor';
import { ScoringProgressEntry } from "../../types/scoring";
import { twMerge } from "tailwind-merge";

const PROGRESS_THEME = { base: twMerge(theme.progress.base, "relative overflow-visible!") };

export type ColumnKey =
  | 'position' | 'shooter' | 'division' | 'matches' | 'time'
  | 'alpha' | 'charlie' | 'delta' | 'miss' | 'noShootHits' | 'procedurals'
  | 'matchPercent' | 'matchPoints' | 'stagePercent' | 'stagePoints'
  | 'hitFactor' | 'netPoints' | 'hits' | 'misses'
  | `ring:${number}`;

interface ResultsTableProps {
  results: any[];
  scored?: {scored: ScoringProgressEntry[] | undefined, stagesLength: number};
  columns: ColumnKey[];
  showDqBadge?: boolean;
  onShooterClick?: (registrationId: string) => void;
}

const DETAIL_COLUMNS = new Set<string>([
  'division', 'matches', 'time', 'alpha', 'charlie', 'delta', 'miss',
  'noShootHits', 'procedurals', 'matchPercent', 'matchPoints', 'stagePercent',
  'stagePoints', 'hitFactor', 'netPoints', 'hits', 'misses',
]);

export function isDetailColumn(col: ColumnKey): boolean {
  return DETAIL_COLUMNS.has(col) || col.startsWith('ring:');
}

export function columnHeader(col: ColumnKey, t: (key: string, opts?: any) => string): string {
  if (col.startsWith('ring:')) {
    const value = Number(col.slice('ring:'.length));
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
  return map[col] ?? '';
}

export function cellValue(col: ColumnKey, r: any): string {
  if (col.startsWith('ring:')) {
    const value = col.slice('ring:'.length);
    return String(r.ring_counts?.[value] ?? 0);
  }

  switch (col) {
    case 'position': return String(r.position);
    case 'shooter': return `${r.first_name} ${r.last_name}`;
    case 'division': return divisionLabel(r.division);
    case 'time': return r.time != null ? Number(r.time).toFixed(2) : '—';
    case 'alpha': return String(r.alpha ?? 0);
    case 'charlie': return String(r.charlie ?? 0);
    case 'delta': return String(r.delta ?? 0);
    case 'miss': return String(r.miss ?? 0);
    case 'noShootHits': return String(r.no_shoot ?? 0);
    case 'procedurals': return String(r.procedurals ?? 0);
    case 'matchPercent': return `${r.match_percent?.toFixed(2)}%`;
    case 'matchPoints': return r.match_points?.toFixed(2);
    case 'stagePercent': return `${r.stage_percent?.toFixed(2)}%`;
    case 'stagePoints': return r.stage_points?.toFixed(2);
    case 'hitFactor': return formatHitFactor(r.hit_factor, '—');
    case 'netPoints': return r.net_points?.toFixed(2);
    case 'matches': return `${r.matches_count ?? 0}/${r.matches_required ?? 0}`;
    case 'hits': return String(r.hits ?? 0);
    case 'misses': return String(r.misses ?? 0);
    default: return '';
  }
}

function isBoldColumn(col: ColumnKey): boolean {
  return col === 'matchPoints' || col === 'stagePoints';
}

export function cellClassName(col: ColumnKey): string {
  const base = col !== 'shooter' && col !== 'division' ? 'font-mono' : '';
  const bold = isBoldColumn(col) ? 'font-bold' : '';
  const shooter = col === 'shooter' ? 'font-medium dark:text-white whitespace-nowrap' : '';
  return [base, bold, shooter].filter(Boolean).join(' ');
}

/** Shared results table — responsive: desktop table, mobile card layout */
export default function ResultsTable({ results, scored, columns, showDqBadge = true, onShooterClick }: ResultsTableProps) {
  const { t } = useTranslation();
  const detailColumns = columns.filter(isDetailColumn);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block md:overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableHeadCell key={col}>{columnHeader(col, t)}</TableHeadCell>
              ))}
              {scored && <TableHeadCell>{t('results.progress')}</TableHeadCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((r) => {
              const progress = r.is_dq ? 100 : scored?.stagesLength && scored?.scored ? scored?.scored?.filter(shooter => shooter.registration_id === r.registration_id).length / scored?.stagesLength * 100 : 0;
              const progressText = r.is_dq ? `${scored?.stagesLength ?? 0} / ${scored?.stagesLength ?? 0}` : scored?.stagesLength && scored?.scored ? `${scored?.scored?.filter(shooter => shooter.registration_id === r.registration_id).length} / ${scored?.stagesLength}` : "";
              return <TableRow key={r.registration_id ?? r.shooter_id} className={r.is_dq ? 'bg-red-50' : ''}>
                {columns.map(col => (
                  <TableCell key={col} className={cellClassName(col)}>
                    {col === 'shooter' && showDqBadge && r.is_dq ? (
                      <span className="flex items-center gap-1">
                        {onShooterClick ? (
                          <button onClick={() => onShooterClick(r.registration_id)} className="text-blue-600 eink:border-none! dark:text-blue-400 hover:underline font-medium whitespace-nowrap">
                            {cellValue(col, r)}
                          </button>
                        ) : cellValue(col, r)}
                        <Badge color="failure" className="ml-1">{t('scoring.dq')}</Badge>
                      </span>
                    ) : col === 'shooter' && onShooterClick ? (
                      <button onClick={() => onShooterClick(r.registration_id)} className="text-blue-600 eink:border-none! dark:text-blue-400 hover:underline font-medium whitespace-nowrap">
                        {cellValue(col, r)}
                      </button>
                    ) : cellValue(col, r)}
                  </TableCell>
                ))}
                {scored && <TableCell>
                  <Progress theme={PROGRESS_THEME} className="[&_span]:absolute [&_span]:-top-4 [&_span]:text-xs [&_span]:left-1/2 [&_span]:-translate-x-1/2" progress={progress} textLabel={progressText} labelText />
                </TableCell>}
              </TableRow>
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards: placement + name on top, compact stats below */}
      <div className="md:hidden divide-y dark:divide-gray-700">
        {results.map((r) => {
          const compactStats = detailColumns.filter(col => {
            if (col === 'division') return false;
            const val = cellValue(col, r);
            return val !== '0' && val !== '0.00' && val !== '0.00%' && val !== '—' && val !== '−0';
          });
          return (
            <div key={r.registration_id ?? r.shooter_id} className={`px-3 py-2.5 ${r.is_dq ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                {columns.includes('position') && (
                  <span className="font-mono w-12 font-bold text-lg dark:text-white">{r.position}</span>
                )}
                {columns.includes('shooter') && (
                  <span className="font-medium dark:text-white text-lg">
                    {onShooterClick ? (
                      <button onClick={() => onShooterClick(r.registration_id)} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {r.first_name} {r.last_name}
                      </button>
                    ) : `${r.first_name} ${r.last_name}`}
                    {showDqBadge && r.is_dq && <Badge color="failure" className="ml-1">{t('scoring.dq')}</Badge>}
                  </span>
                )}
              </div>
              {compactStats.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {compactStats.map(col => (
                    <span key={col}>
                      <span className="text-gray-500 dark:text-gray-300">{columnHeader(col, t)}</span>{' '}
                      <span className={`font-mono ${isBoldColumn(col) ? 'font-bold' : ''} dark:text-white`}>
                        {cellValue(col, r)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
