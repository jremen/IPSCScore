import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { formatCupPoints, formatHitFactor } from '../../utils/hitFactor';
import type { CupMatchRef, CupMatchResult, CupResultRow, CupScoringMode } from '../../types/cup';

interface CupResultsTableProps {
  rows: CupResultRow[];
  matches: CupMatchRef[];
  mode: CupScoringMode;
  hasDivision: boolean;
}

const CLASSES = {
  header: 'px-1.5 py-1 font-semibold uppercase tracking-wide',
  subHeader: 'px-1.5 py-0.5  font-semibold',
  matchHeader: 'px-1.5 py-1font-bold',
  cell: 'px-1.5 py-1 font-monotext-center whitespace-nowrap',
  nameCell: 'px-1.5 py-1 font-medium whitespace-nowrap',
  excluded: 'line-through text-gray-400 dark:text-gray-500',
  bold: 'font-bold',
  totalSep: 'border-l-2 border-gray-300 dark:border-gray-600',
};

function matchCells(m: CupMatchResult, mode: CupScoringMode): { key: string; value: string; excluded: boolean }[] {
  if (m.status === 'none') {
    return mode === 'hit_factor'
      ? [{ key: `${m.match_id}-np`, value: '', excluded: false }, { key: `${m.match_id}-t`, value: '', excluded: false }]
      : [{ key: `${m.match_id}-p`, value: '', excluded: false }];
  }
  const isExcluded = m.status === 'excluded';
  if (mode === 'hit_factor') {
    return [
      { key: `${m.match_id}-np`, value: formatCupPoints(m.net_points), excluded: isExcluded },
      { key: `${m.match_id}-t`, value: m.time != null ? m.time.toFixed(2) : '—', excluded: isExcluded },
    ];
  }
  return [{ key: `${m.match_id}-p`, value: formatCupPoints(m.points), excluded: isExcluded }];
}

/** Cup standings table with a multi-level header: numbered Match groups, Competition % and Total. */
export default function CupResultsTable({ rows, matches, mode, hasDivision }: CupResultsTableProps) {
  const { t } = useTranslation();
  const colsPerMatch = mode === 'hit_factor' ? 2 : 1;
  const totalCols = mode === 'hit_factor' ? 3 : 1;

  const subLabels = () =>
    mode === 'hit_factor'
      ? [t('cups.colPts'), t('results.time')]
      : [t('cups.colPts')];

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <Table striped>
        <TableHead>
          <TableRow>
            <TableHeadCell rowSpan={3} className={CLASSES.header}>#</TableHeadCell>
            <TableHeadCell rowSpan={3} className={`${CLASSES.header} text-left`}>{t('results.shooter')}</TableHeadCell>
            {hasDivision && <TableHeadCell rowSpan={3} className={`${CLASSES.header} text-left`}>{t('results.division')}</TableHeadCell>}
            <TableHeadCell colSpan={matches.length * colsPerMatch} className={CLASSES.matchHeader}>
              {t('cups.colMatch')}
            </TableHeadCell>
            <TableHeadCell rowSpan={3} className={CLASSES.header}>{t('results.matchPercent')}</TableHeadCell>
            <TableHeadCell colSpan={totalCols} className={`${CLASSES.matchHeader} ${CLASSES.totalSep}`}>{t('cups.colTotal')}</TableHeadCell>
          </TableRow>
          <TableRow>
            {matches.map((m, i) => (
              <TableHeadCell key={m.id} colSpan={colsPerMatch} className={CLASSES.matchHeader}>{i + 1}.</TableHeadCell>
            ))}
          </TableRow>
          <TableRow>
            {matches.flatMap((m) => subLabels().map((label, j) => (
              <TableHeadCell key={`${m.id}-${j}`} className={CLASSES.subHeader}>{label}</TableHeadCell>
            )))}
            {subLabels().map((label, j) => (
              <TableHeadCell key={`total-${j}`} className={CLASSES.subHeader}>{label}</TableHeadCell>
            ))}
            {mode === 'hit_factor' && <TableHeadCell key="total-hf" className={CLASSES.subHeader}>HF</TableHeadCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.shooter_id}>
              <TableCell className={CLASSES.cell}>{r.position}</TableCell>
              <TableCell className={CLASSES.nameCell}><span className="text-blue-600 eink:border-none! dark:text-blue-400 font-medium whitespace-nowrap">{r.first_name} {r.last_name}</span></TableCell>
              {hasDivision && <TableCell className={CLASSES.cell}>{r.division}</TableCell>}
              {matches.flatMap((m) => {
                const mr = r.matches.find((x) => x.match_id === m.id);
                return matchCells(mr ?? { match_id: m.id, status: 'none' }, mode).map((cell) => (
                  <TableCell
                    key={cell.key}
                    className={`${CLASSES.cell} ${cell.excluded ? CLASSES.excluded : ''}`}
                    title={cell.excluded ? t('cups.excludedTooltip') : undefined}
                  >
                    {cell.value}
                  </TableCell>
                ));
              })}
              <TableCell className={`${CLASSES.cell} ${CLASSES.bold}`}>{Number(r.match_percent).toFixed(2)}%</TableCell>
              {mode === 'hit_factor' ? (
                <>
                  <TableCell className={`${CLASSES.cell} ${CLASSES.bold} ${CLASSES.totalSep}`}>{formatCupPoints(r.net_points)}</TableCell>
                  <TableCell className={`${CLASSES.cell} ${CLASSES.bold}`}>{r.time?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell className={`${CLASSES.cell} ${CLASSES.bold}`}>{formatHitFactor(r.hit_factor, '—')}</TableCell>
                </>
              ) : (
                <TableCell className={`${CLASSES.cell} ${CLASSES.bold} ${CLASSES.totalSep}`}>{formatCupPoints(r.match_points)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
