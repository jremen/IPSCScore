import type { CalculatedScore } from './ipsc';
import { getPointValues } from './pointValues';

/**
 * Time-based scoring types (IDPA, Action Steel, Multi-Gun) express penalties as
 * added seconds rather than deducted points. `total_time` is the ranking value.
 */

// ── IDPA (Vickers Count) ──────────────────────────────────────────────────

export interface IDPAInput {
  targets: Array<{
    target_type: 'paper' | 'steel' | 'no_shoot' | 'npm';
    alpha: number; // -0 points down
    charlie: number; // -1 point down
    delta: number; // -3 points down
    miss: number;
    no_shoot_hits: number;
    steel_hit: boolean | null;
    hits_per_paper: number;
  }>;
  time: number;
  penalty_pe: number; // Procedural Error: +3s
  penalty_hnt: number; // Hit on No-Shoot: +5s
  penalty_ftn: number; // Failure to Neutralize: +5s
  penalty_fp: number; // Flagrant Penalty: +10s
  penalty_ftdr: number; // Failure to Do Right: +20s
}

export function calculateIDPAScore(input: IDPAInput): CalculatedScore {
  let points_down = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;

  const hasExplicitMissData = input.targets.some((t) => t.miss > 0);

  for (const target of input.targets) {
    if (target.target_type === 'paper') {
      points_down += target.charlie * 1 + target.delta * 3;

      const totalHits = target.alpha + target.charlie + target.delta;
      miss_count += hasExplicitMissData
        ? target.miss
        : Math.max(0, target.hits_per_paper - totalHits);

      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'steel') {
      if (!target.steel_hit) miss_count += 1;
    } else if (target.target_type === 'no_shoot') {
      no_shoot_hit_count += target.no_shoot_hits;
    }
    // npm: no effect in time-based IDPA scoring
  }

  const penalty_seconds = miss_count * 5
    + no_shoot_hit_count * 5
    + input.penalty_pe * 3
    + input.penalty_hnt * 5
    + input.penalty_ftn * 5
    + input.penalty_fp * 10
    + input.penalty_ftdr * 20;

  const total_time = input.time + points_down + penalty_seconds;

  return {
    raw_points: points_down,
    penalty_points: 0,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100,
  };
}

// ── Action Steel ──────────────────────────────────────────────────────────

export interface ActionSteelInput {
  string_times: number[];
  string_plate_hits: boolean[][];
  number_of_strings: number;
  drop_worst: number;
  miss_penalty: number;
  stop_plate_miss_cap: number;
}

export function calculateActionSteelScore(input: ActionSteelInput): CalculatedScore {
  const adjustedTimes: number[] = [];

  for (let i = 0; i < input.string_times.length; i++) {
    const time = input.string_times[i];
    const hits = input.string_plate_hits[i] || [];
    const misses = hits.filter((h) => !h).length;
    const stopMissed = hits.length > 0 ? !hits[hits.length - 1] : true;

    let adjusted = time + misses * input.miss_penalty;
    if (stopMissed) adjusted = Math.min(adjusted, input.stop_plate_miss_cap);
    adjustedTimes.push(adjusted);
  }

  const sorted = [...adjustedTimes].sort((a, b) => a - b);
  const kept = sorted.slice(0, Math.max(1, sorted.length - input.drop_worst));
  const total_time = kept.reduce((s, t) => s + t, 0);

  return {
    raw_points: 0,
    penalty_points: 0,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100,
  };
}

// ── Multi-Gun (3-Gun) ─────────────────────────────────────────────────────

export interface MultiGunInput {
  time: number;
  targets: Array<{ neutralized: boolean }>;
  penalty_ftn_sec: number; // +5s
  penalty_miss_sec: number; // +10s
  penalty_no_shoot_sec: number; // +5s
  penalty_procedural_sec: number; // +5s
}

export function calculateMultiGunScore(input: MultiGunInput): CalculatedScore {
  const penalty_seconds = input.penalty_ftn_sec * 5
    + input.penalty_miss_sec * 10
    + input.penalty_no_shoot_sec * 5
    + input.penalty_procedural_sec * 5;

  const total_time = input.time + penalty_seconds;

  return {
    raw_points: 0,
    penalty_points: Math.round(penalty_seconds * 100) / 100,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100,
  };
}

// Re-export so callers can compute point values without an extra import path.
export { getPointValues };
