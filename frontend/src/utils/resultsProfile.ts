import type { ColumnKey } from '../components/results/ResultsTable';

/**
 * How a match's results should be presented.
 *
 *  - `zone`      — IPSC/USPSA/IDPA style hit zones (A/C/D/M) + time/HF
 *  - `ring`      — Bullseye / Archery / ISSF / F-Class ring counts + points
 *  - `hit_count` — NRL22 / PRS style hit & miss counts + points
 */
export type ResultsProfile = 'zone' | 'ring' | 'hit_count';

interface StageLike {
  scoring_type?: string | null;
  config?: any;
}

function configOf(config: any): any {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
  return config;
}

/** Ring values used by a ring-scored stage. 0 is the miss entry. */
export function ringValuesForStage(scoringType: string | null | undefined, config?: any): number[] {
  switch (scoringType) {
    case 'archery':
      return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    case 'issf':
      return [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    case 'long_range':
      return configOf(config)?.variant === 'f_class'
        ? [11, 10, 9, 8, 7, 6, 5, 0]
        : [];
    case 'bullseye':
      return [11, 10, 9, 8, 7, 6, 5, 0];
    default:
      return [];
  }
}

export function scoringTypeProfile(
  scoringType: string | null | undefined,
  config?: any,
): ResultsProfile {
  switch (scoringType) {
    case 'bullseye':
    case 'archery':
    case 'issf':
      return 'ring';
    case 'long_range':
      return configOf(config)?.variant === 'f_class' ? 'ring' : 'hit_count';
    case 'nrl22':
      return 'hit_count';
    default:
      return 'zone';
  }
}

/** Pick one profile for the whole match. Mixed profiles fall back to zones. */
export function matchResultsProfile(stages: StageLike[] | null | undefined): ResultsProfile {
  const profiles = (stages ?? [])
    .filter((stage) => stage?.scoring_type && stage.scoring_type !== 'chrono')
    .map((stage) => scoringTypeProfile(stage.scoring_type, stage.config));

  if (profiles.length === 0) return 'zone';
  return profiles.every((profile) => profile === profiles[0]) ? profiles[0] : 'zone';
}

/** Union of every ring value used by the match's ring-scored stages. */
export function matchRingValues(stages: StageLike[] | null | undefined): number[] {
  const values = new Set<number>();
  for (const stage of stages ?? []) {
    for (const value of ringValuesForStage(stage.scoring_type, stage.config)) {
      values.add(value);
    }
  }
  return [...values].sort((a, b) => b - a);
}

/** Read the profile advertised by a result row (set by both runtimes). */
export function resultsProfileOfRows(rows: any[] | null | undefined): ResultsProfile {
  const row = (rows ?? []).find((r) => r?.scoring_profile);
  return (row?.scoring_profile as ResultsProfile) || 'zone';
}

/** Read the ring values advertised by result rows, falling back to observed counts. */
export function ringValuesOfRows(rows: any[] | null | undefined): number[] {
  const row = (rows ?? []).find((r) => Array.isArray(r?.ring_values) && r.ring_values.length > 0);
  if (row) return row.ring_values as number[];

  const observed = new Set<number>();
  for (const r of rows ?? []) {
    for (const key of Object.keys(r?.ring_counts ?? {})) {
      const value = Number(key);
      if (Number.isFinite(value)) observed.add(value);
    }
  }
  if (observed.size === 0) return [];
  observed.add(0);
  return [...observed].sort((a, b) => b - a);
}

export function divisionAppliesForRows(
  rows: any[] | null | undefined,
  fallback = true,
): boolean {
  const row = (rows ?? []).find((r) => typeof r?.division_applies === 'boolean');
  return row ? row.division_applies : fallback;
}

export function ringColumnKeys(values: number[]): ColumnKey[] {
  return values.map((value) => `ring:${value}` as ColumnKey);
}

interface ResultColumnOptions {
  /** Stage results rather than match totals. */
  stage?: boolean;
  /** Include the division column (only when divisions apply). */
  division?: boolean;
  /** Zone scoring only: include the HF column when the match has one. */
  hasHitFactor?: boolean;
  /** Ring values to render for ring scoring. */
  ringValues?: number[];
}

/**
 * Columns for a result table/exports. The same helper drives the screen,
 * kiosk, CSV, HTML, PDF and print output so they cannot drift apart.
 */
export function resultColumns(
  profile: ResultsProfile,
  options: ResultColumnOptions = {},
): ColumnKey[] {
  const { stage = false, division = false, hasHitFactor = false, ringValues = [] } = options;

  const columns: ColumnKey[] = ['position', 'shooter'];
  if (division) columns.push('division');

  if (profile === 'ring') {
    columns.push(...ringColumnKeys(ringValues));
    columns.push(stage ? 'stagePercent' : 'matchPercent');
    columns.push(stage ? 'stagePoints' : 'matchPoints');
    return columns;
  }

  if (profile === 'hit_count') {
    columns.push('hits', 'misses');
    columns.push(stage ? 'stagePercent' : 'matchPercent');
    columns.push(stage ? 'stagePoints' : 'matchPoints');
    return columns;
  }

  columns.push('time', 'alpha', 'charlie', 'delta', 'miss', 'noShootHits', 'procedurals');
  if (stage) {
    columns.push('stagePercent', 'stagePoints');
    if (hasHitFactor) columns.push('hitFactor');
    columns.push('netPoints');
  } else {
    columns.push('matchPercent');
    if (hasHitFactor) columns.push('hitFactor');
    columns.push('matchPoints');
  }
  return columns;
}
