import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import { columnHeader, cellValue } from '../../utils/resultsTable';
import MatchProgress from '../layout/MatchProgress';
import KioskShell from './KioskShell';
import { usePublicResultsKiosk, cellClass, headerClass } from '../../hooks/usePublicResultsKiosk';

/**
 * TV kiosk presentation of the current match results.
 *
 * Shows one division at a time, rotating automatically. Divisions that do not
 * fit on screen are slowly scrolled from top to bottom before advancing.
 * Reachable at `/results/kiosk` — the standard `/results` page (and its QR
 * code) is untouched.
 *
 * All data-fetching and rotation state lives in `usePublicResultsKiosk`.
 */
export default function PublicResultsKioskView() {
  const { t } = useTranslation();
  const {
    matchName,
    noMatch,
    resolved,
    ready,
    lastRefresh,
    activeMatchId,
    divisionKeys,
    activeDivision,
    divisionIndex,
    divisionApplies,
    rows,
    dqRows,
    columns,
    progressValue,
    setViewportEl,
  } = usePublicResultsKiosk();

  if (noMatch || (resolved && !activeMatchId)) {
    return (
      <KioskShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl">🏆</div>
          <h1 className="text-4xl font-bold text-white">{t('results.publicTitle')}</h1>
          <p className="max-w-2xl text-2xl text-slate-400">{t('results.noCurrentMatch')}</p>
        </div>
      </KioskShell>
    );
  }

  if (!resolved || (activeMatchId && !ready)) {
    return (
      <KioskShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-b-blue-500" />
          <p className="text-2xl text-slate-400">{t('results.loading')}</p>
        </div>
      </KioskShell>
    );
  }

  return (
    <KioskShell>
      <header className="flex shrink-0 items-center justify-between gap-8 border-b border-slate-800 px-10 py-5">
        <div className="min-w-0">
          <h1 className="truncate text-4xl font-bold tracking-tight text-white">
            🏆 {matchName || t('results.publicTitle')}
          </h1>
          <p className="text-xl text-slate-400">
            {divisionApplies ? t('results.kioskSubtitle') : t('results.title')}
          </p>
        </div>
        <div className="mx-auto">
          <MatchProgress size="xl" width="w-80" variant="kiosk" progressValue={progressValue} />
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-2 text-xl font-semibold text-emerald-400">
            <span className="inline-block size-3 animate-pulse rounded-full bg-emerald-400" />
            {t('results.kioskLive')}
          </div>
          <p className="text-lg text-slate-400">
            {t('results.kioskUpdated', { time: lastRefresh.toLocaleTimeString() })}
          </p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {activeDivision ? (
          <>
            <div className="flex shrink-0 items-end justify-between gap-6 px-10 pb-3 pt-6">
              <h2 className="text-5xl font-bold text-white">
                {divisionApplies ? divisionLabel(activeDivision) : t('results.allShooters')}
              </h2>
              {divisionApplies && (
                <span className="text-2xl font-medium text-slate-500">
                  {divisionIndex + 1} / {divisionKeys.length}
                </span>
              )}
            </div>

            <div ref={setViewportEl} className="kiosk-viewport min-h-0 flex-1 overflow-hidden px-10">
              <table className="w-full border-collapse text-2xl">
                <thead className="text-slate-400">
                  <tr className="text-left text-lg uppercase tracking-wider">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className={`sticky top-0 z-10 border-b-2 border-slate-700 bg-slate-950 px-6 py-3 ${headerClass(col)}`}
                      >
                        {columnHeader(col, t)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const medalClass =
                      row.position === 1
                        ? 'text-amber-300'
                        : row.position === 2
                          ? 'text-slate-200'
                          : row.position === 3
                            ? 'text-orange-400'
                            : 'text-slate-300';
                    return (
                      <tr
                        key={row.registration_id}
                        className={`border-b border-slate-800/70  odd:bg-slate-900 even:bg-slate-700`}
                      >
                        {columns.map((col) => (
                          <td key={col} className={`${cellClass(col)} ${col === 'position' ? medalClass : 'text-slate-100'}`}>
                            {cellValue(col, row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {dqRows.length > 0 && (
                <section className="mt-10 border-t-2 border-red-900/40 pb-8 pt-6">
                  <h3 className="mb-3 text-3xl font-bold text-red-400">
                    ⛔ {t('results.disqualified')}
                  </h3>
                  <div className="grid grid-cols-1 gap-x-12 gap-y-2 xl:grid-cols-2">
                    {dqRows.map((shooter) => (
                      <div
                        key={shooter.registration_id}
                        className="flex items-baseline justify-between gap-6 text-xl"
                      >
                        <span className="font-semibold text-red-200">
                          {shooter.first_name} {shooter.last_name}
                        </span>
                        <span className="shrink-0 text-red-400">{shooter.dq_reason || 'DQ'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-3xl text-slate-400">{t('results.empty')}</p>
          </div>
        )}
      </main>

      {divisionKeys.length > 1 && (
        <footer className="flex shrink-0 items-center justify-center gap-2 py-4">
          {divisionKeys.map((division) => (
            <span
              key={division}
              className={`h-2 rounded-full transition-all ${
                division === activeDivision ? 'w-10 bg-blue-500' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </footer>
      )}
    </KioskShell>
  );
}
