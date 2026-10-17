import type { Organization, PowerFactor, ScoringType } from '../domain';
import { getPointValues } from './pointValues';

export interface TargetHitInput {
  target_type: 'paper' | 'steel' | 'no_shoot' | 'npm';
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
  hits_per_paper: number;
}

export interface ScoreCalculationInput {
  targets: TargetHitInput[];
  time: number | null;
  procedural_count: number;
  ftsa_count: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  scoring_type: ScoringType;
  power_factor: PowerFactor;
  par_time?: number | null;
}

export interface CalculatedScore {
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
  total_time?: number;
  x_count?: number;
}

/** Scoring types that rank by hit factor (net_points / time). */
export const HIT_FACTOR_TYPES: ReadonlyArray<ScoringType> = ['comstock', 'virginia', 'hit_factor'];

/**
 * Core IPSC/USPSA score calculation.
 *
 * Handles Comstock, Virginia Count, Hit Factor and Fixed Time. Miss handling is
 * deliberately global: if ANY target carries an explicit miss count, every
 * target's `miss` field is trusted; otherwise misses are derived from
 * `hits_per_paper` for legacy (WinMSS-imported) scores.
 */
export function calculateScore(input: ScoreCalculationInput): CalculatedScore {
  const pv = getPointValues(input.power_factor);
  let raw_points = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;

  const hasExplicitMissData = input.targets.some((t) => t.miss > 0);

  for (const target of input.targets) {
    if (target.target_type === 'paper') {
      // Best N hits per target, highest value first.
      const hits: number[] = [];
      for (let i = 0; i < target.alpha; i++) hits.push(pv.alpha);
      for (let i = 0; i < target.charlie; i++) hits.push(pv.charlie);
      for (let i = 0; i < target.delta; i++) hits.push(pv.delta);
      hits.sort((a, b) => b - a);
      raw_points += hits.slice(0, target.hits_per_paper).reduce((s, v) => s + v, 0);

      const totalScoringHits = target.alpha + target.charlie + target.delta;
      miss_count += hasExplicitMissData
        ? target.miss
        : Math.max(0, target.hits_per_paper - totalScoringHits);

      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'steel') {
      if (target.steel_hit) raw_points += pv.steel;
      else miss_count += 1;
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'no_shoot') {
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'npm') {
      if (target.steel_hit) raw_points += pv.steel; // +5 bonus, miss is free
      no_shoot_hit_count += target.no_shoot_hits;
    }
  }

  let penalty_points = 0;

  if (input.scoring_type === 'comstock' || input.scoring_type === 'hit_factor') {
    penalty_points = miss_count * 10
      + no_shoot_hit_count * 10
      + input.ftsa_count * 10
      + input.procedural_count * 10;
  } else if (input.scoring_type === 'virginia') {
    penalty_points = miss_count * 10
      + no_shoot_hit_count * 10
      + input.ftsa_count * 10
      + input.procedural_count * 10
      + input.extra_shot_count * 10
      + input.extra_hit_count * 10
      + input.stacking_count * 10;
  } else if (input.scoring_type === 'fixed_time') {
    // Fixed Time: misses are NOT penalised; overtime shots are -5 each.
    penalty_points = no_shoot_hit_count * 10
      + input.procedural_count * 10
      + input.extra_shot_count * 10
      + input.extra_hit_count * 10
      + input.stacking_count * 10
      + input.overtime_shot_count * 5;
  }

  const net_points = raw_points - penalty_points;

  let hit_factor = 0;
  if (HIT_FACTOR_TYPES.includes(input.scoring_type) && input.time && input.time > 0) {
    hit_factor = Math.max(0, net_points / input.time);
  }

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: Math.round(penalty_points * 100) / 100,
    net_points: Math.round(net_points * 100) / 100,
    hit_factor: Math.round(hit_factor * 10000) / 10000,
  };
}

/** Hit Factor is scored exactly like Comstock. */
export function calculateHitFactorScore(input: Omit<ScoreCalculationInput, 'scoring_type'>): CalculatedScore {
  return calculateScore({ ...input, scoring_type: 'hit_factor' });
}

export interface AggregatedScoreInput {
  /** Includes steel hits — WinMSS counts steel as an A (5 points). */
  total_alpha: number;
  total_charlie: number;
  total_delta: number;
  /** Includes missed steel targets. */
  total_miss: number;
  total_no_shoot: number;
  total_steel: number;
  steel_hit_count: number;
  procedural_count: number;
  ftsa_count: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  time: number;
  scoring_type: ScoringType;
  power_factor: PowerFactor;
}

/**
 * Aggregated (WinMSS) scoring.
 *
 * WinMSS stores zone totals per stage rather than a per-target breakdown, so this
 * bypasses the per-target "best N" capping. Steel is already folded into
 * `total_alpha`, so it must NOT be added again.
 */
export function calculateAggregatedScore(input: AggregatedScoreInput): CalculatedScore {
  const pv = getPointValues(input.power_factor);

  const raw_points = input.total_alpha * pv.alpha
    + input.total_charlie * pv.charlie
    + input.total_delta * pv.delta;

  let penalty_points = 0;

  if (input.scoring_type === 'comstock' || input.scoring_type === 'hit_factor') {
    penalty_points = (input.total_miss + input.total_no_shoot
      + input.ftsa_count + input.procedural_count) * 10;
  } else if (input.scoring_type === 'virginia') {
    penalty_points = (input.total_miss + input.total_no_shoot
      + input.ftsa_count + input.procedural_count) * 10
      + (input.extra_shot_count + input.extra_hit_count + input.stacking_count) * 10;
  } else if (input.scoring_type === 'fixed_time') {
    penalty_points = input.total_no_shoot * 10
      + input.procedural_count * 10
      + (input.extra_shot_count + input.extra_hit_count + input.stacking_count) * 10
      + input.overtime_shot_count * 5;
  }

  const net_points = raw_points - penalty_points;

  let hit_factor = 0;
  if (HIT_FACTOR_TYPES.includes(input.scoring_type) && input.time && input.time > 0) {
    hit_factor = Math.max(0, net_points / input.time);
  }

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: Math.round(penalty_points * 100) / 100,
    net_points: Math.round(net_points * 100) / 100,
    hit_factor: Math.round(hit_factor * 10000) / 10000,
  };
}

// Re-exported for callers that need the organization-aware PF check alongside scoring.
export type { Organization };
