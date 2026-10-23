import { Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, Badge, Progress } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import {
  RESULTS_PROGRESS_THEME as PROGRESS_THEME,
  cellClassName,
  cellValue,
  columnHeader,
  isBoldColumn,
  isDetailColumn,
} from '../../utils/resultsTable';
import type { ResultsTableProps } from './types';

export type { ColumnKey } from '../../utils/resultsTable';
export { cellValue, columnHeader } from '../../utils/resultsTable';

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
