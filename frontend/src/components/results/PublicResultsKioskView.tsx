import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import { useResultsStore } from '../../stores/resultsStore';
import { divisionLabel } from '../../utils/constants';
import { hasHitFactor } from '../../utils/hitFactor';
import { useKioskAutoplay } from '../../hooks/useKioskAutoplay';
import { columnHeader, cellValue, type ColumnKey } from './ResultsTable';
import MatchProgress from "../layout/MatchProgress";

const REFRESH_INTERVAL_MS = 30000; // fallback poll when SSE is unavailable
const DIVISION_COLUMNS: ColumnKey[] = [
  'position',
  'shooter',
  'time',
  'alpha',
  'charlie',
  'delta',
  'miss',
  'noShootHits',
  'procedurals',
  'matchPercent',
  'hitFactor',
  'matchPoints',
];

function cellClass(col: ColumnKey): string {
  if (col === 'position') return 'px-6 py-3 text-center font-mono font-bold';
  if (col === 'shooter') return 'px-6 py-3 text-left font-semibold text-white whitespace-nowrap';
  return 'px-6 py-3 text-right font-mono tabular-nums';
}

function headerClass(col: ColumnKey): string {
  if (col === 'position') return 'text-center';
  if (col === 'shooter') return 'text-left';
  return 'text-right';
}

/**
 * TV kiosk presentation of the current match results.
 *
 * Shows one division at a time, rotating automatically. Divisions that do not
 * fit on screen are slowly scrolled from top to bottom before advancing.
 * Reachable at `/results/kiosk` — the standard `/results` page (and its QR
 * code) is untouched.
 */
export default function PublicResultsKioskView() {
  const { t } = useTranslation();
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const divisionResults = useResultsStore((s) => s.divisionResults);
  const dqDivisions = useResultsStore((s) => s.dqDivisions);
  const fetchByDivision = useResultsStore((s) => s.fetchByDivision);

  const [matchName, setMatchName] = useState('');
  const [noMatch, setNoMatch] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [ready, setReady] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const [currentDivision, setCurrentDivision] = useState<string | null>(null);
  const [cycleId, setCycleId] = useState(0);
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);

  const resolveCurrentMatch = useCallback(async () => {
    try {
      const current = await api.getCurrentMatch();
      if (current?.id) {
        setNoMatch(false);
        setMatchName(current.name || '');
        if (current.id !== useUIStore.getState().activeMatchId) {
          setActiveMatch(current.id);
        }
      } else {
        setNoMatch(true);
      }
    } catch {
      // Network hiccup — keep whatever we were displaying.
    } finally {
      setResolved(true);
    }
  }, [setActiveMatch]);

  // The kiosk is a results view; this also makes the shared realtime hook
  // refresh division results on `score:saved` events.
  useEffect(() => {
    setActiveTab('results');
    void resolveCurrentMatch();
  }, [setActiveTab, resolveCurrentMatch]);

  // Initial division load whenever the active match changes.
  useEffect(() => {
    if (!activeMatchId) {
      setReady(false);
      return;
    }
    let cancelled = false;
    setReady(false);
    fetchByDivision(activeMatchId).finally(() => {
      if (!cancelled) {
        setReady(true);
        setLastRefresh(new Date());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeMatchId, fetchByDivision]);

  // Fallback poll for live updates (SSE drives the fast path).
  useEffect(() => {
    const interval = setInterval(() => {
      const id = useUIStore.getState().activeMatchId;
      if (id) {
        fetchByDivision(id);
        setLastRefresh(new Date());
      }
      void resolveCurrentMatch();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchByDivision, resolveCurrentMatch]);

  const divisionKeys = useMemo(
    () => Object.keys(divisionResults).sort((a, b) => a.localeCompare(b)),
    [divisionResults],
  );

  const activeDivision = divisionKeys.includes(currentDivision ?? '')
    ? currentDivision
    : divisionKeys[0] ?? null;

  useEffect(() => {
    if (activeDivision && activeDivision !== currentDivision) {
      setCurrentDivision(activeDivision);
    }
  }, [activeDivision, currentDivision]);

  const rows = activeDivision ? divisionResults[activeDivision] ?? [] : [];
  const dqRows = useMemo(
    () => (activeDivision ? dqDivisions.filter((d) => d.division === activeDivision) : []),
    [activeDivision, dqDivisions],
  );

  const showHitFactor = useMemo(
    () => Object.values(divisionResults).some((divisionRows) => hasHitFactor(divisionRows)),
    [divisionResults],
  );
  const columns = useMemo(
    () => (showHitFactor ? DIVISION_COLUMNS : DIVISION_COLUMNS.filter((col) => col !== 'hitFactor')),
    [showHitFactor],
  );

  const goNext = useCallback(() => {
    if (divisionKeys.length === 0) return;
    setCurrentDivision((prev) => {
      const index = prev ? divisionKeys.indexOf(prev) : -1;
      const nextIndex = (index + 1) % divisionKeys.length;
      return divisionKeys[nextIndex];
    });
    setCycleId((c) => c + 1);
  }, [divisionKeys]);

  useKioskAutoplay({
    itemKey: `${activeDivision ?? ''}#${cycleId}`,
    viewport: viewportEl,
    onAdvance: goNext,
    enabled: Boolean(activeDivision),
  });

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

  const divisionIndex = activeDivision ? divisionKeys.indexOf(activeDivision) : -1;

  return (
    <KioskShell>
      <header className="flex shrink-0 items-center justify-between gap-8 border-b border-slate-800 px-10 py-5">
        <div className="min-w-0">
          <h1 className="truncate text-4xl font-bold tracking-tight text-white">
            🏆 {matchName || t('results.publicTitle')}
          </h1>
          <p className="text-xl text-slate-400">{t('results.kioskSubtitle')}</p>
        </div>
        <div className="mx-auto">
          <MatchProgress size="xl" width="w-80" />
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
              <h2 className="text-5xl font-bold text-white">{divisionLabel(activeDivision)}</h2>
              <span className="text-2xl font-medium text-slate-500">
                {divisionIndex + 1} / {divisionKeys.length}
              </span>
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
                        className={`border-b border-slate-800/70  odd:bg-white even:bg-gray-50 odd:dark:bg-slate-900 even:dark:bg-slate-700 `}
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

function KioskShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {children}
    </div>
  );
}
