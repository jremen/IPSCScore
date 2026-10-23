import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { formatCupPoints, formatHitFactor } from '../../utils/hitFactor';
import { CUP_TABLE_CLASSES as CLASSES, cupMatchSubLabels, matchCupCells } from '../../utils/cup';
import type { CupResultsTableProps } from './types';

/** Cup standings table with a multi-level header: numbered Match groups, Competition % and Total. */
export default function CupResultsTable({ rows, matches, mode, hasDivision }: CupResultsTableProps) {
  const { t } = useTranslation();
  const colsPerMatch = mode === 'hit_factor' ? 2 : 1;
  const totalCols = mode === 'hit_factor' ? 3 : 1;

  const subLabels = cupMatchSubLabels(mode, t);

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
            {matches.flatMap((m) => subLabels.map((label, j) => (
              <TableHeadCell key={`${m.id}-${j}`} className={CLASSES.subHeader}>{label}</TableHeadCell>
            )))}
            {subLabels.map((label, j) => (
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
                return matchCupCells(mr ?? { match_id: m.id, status: 'none' }, mode).map((cell) => (
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
