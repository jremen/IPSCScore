import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useResultsStore, type DqShooter, type OverallResult } from '../stores/resultsStore';
import { hasHitFactor } from '../utils/hitFactor';
import { useKioskAutoplay } from './useKioskAutoplay';
import type { ColumnKey } from '../components/results/ResultsTable';

/** Fallback poll interval when SSE is unavailable. */
const REFRESH_INTERVAL_MS = 60000;

/** Columns shown in the kiosk division table. */
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

/** Cell alignment + typography for a kiosk division table column. */
export function cellClass(col: ColumnKey): string {
  if (col === 'position') return 'px-6 py-3 text-center font-mono font-bold';
  if (col === 'shooter') return 'px-6 py-3 text-left font-semibold text-white whitespace-nowrap';
  return 'px-6 py-3 text-right font-mono tabular-nums';
}

/** Header alignment for a kiosk division table column. */
export function headerClass(col: ColumnKey): string {
  if (col === 'position') return 'text-center';
  if (col === 'shooter') return 'text-left';
  return 'text-right';
}

/** View model consumed by `PublicResultsKioskView`. */
export interface PublicResultsKioskModel {
  /** Current-match name, or an empty string until it is resolved. */
  matchName: string;
  /** No current match exists (show the "no match" screen). */
  noMatch: boolean;
  /** The current-match lookup has finished at least once. */
  resolved: boolean;
  /** Division results for the active match have loaded. */
  ready: boolean;
  /** When the results were last refreshed (for the "updated at" label). */
  lastRefresh: Date;
  /** Active match id, or null before it is resolved. */
  activeMatchId: string | null;
  /** Division keys, sorted alphabetically. */
  divisionKeys: string[];
  /** Division currently on screen, or null when there are none. */
  activeDivision: string | null;
  /** Zero-based index of the active division, or -1 when there is none. */
  divisionIndex: number;
  /** Result rows for the active division. */
  rows: OverallResult[];
  /** Disqualified shooters for the active division. */
  dqRows: DqShooter[];
  /** Visible columns for the current match (drops HF when unused). */
  columns: ColumnKey[];
  /** Match completion percentage from the public progress summary. */
  progressValue: number;
  /** Callback ref for the scrolling viewport that drives autoplay. */
  setViewportEl: (el: HTMLDivElement | null) => void;
}

/**
 * All state, data-fetching and rotation logic for the TV kiosk
 * (`PublicResultsKioskView`).
 *
 * Shows one division at a time, rotating automatically. Divisions that do not
 * fit on screen are slowly scrolled from top to bottom before advancing.
 */
export function usePublicResultsKiosk(): PublicResultsKioskModel {
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
  const [progressValue, setProgressValue] = useState(0);

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

  // Public, PII-free completion percentage (the kiosk cannot read the
  // protected `scoring-progress` endpoint).
  const loadProgress = useCallback(async (matchId: string) => {
    try {
      const progress = await api.getPublicMatchProgress(matchId);
      setProgressValue(progress?.progressValue ?? 0);
    } catch {
      // Transient failure — keep the last known value.
    }
  }, []);

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
      setProgressValue(0);
      return;
    }
    let cancelled = false;
    setReady(false);
    void loadProgress(activeMatchId);
    fetchByDivision(activeMatchId).finally(() => {
      if (!cancelled) {
        setReady(true);
        setLastRefresh(new Date());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeMatchId, fetchByDivision, loadProgress]);

  // Fallback poll for live updates (SSE drives the fast path).
  useEffect(() => {
    const interval = setInterval(() => {
      const id = useUIStore.getState().activeMatchId;
      if (id) {
        fetchByDivision(id);
        void loadProgress(id);
        setLastRefresh(new Date());
      }
      void resolveCurrentMatch();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchByDivision, resolveCurrentMatch, loadProgress]);

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

  const divisionIndex = activeDivision ? divisionKeys.indexOf(activeDivision) : -1;

  return {
    matchName,
    noMatch,
    resolved,
    ready,
    lastRefresh,
    activeMatchId,
    divisionKeys,
    activeDivision,
    divisionIndex,
    rows,
    dqRows,
    columns,
    progressValue,
    setViewportEl,
  };
}
