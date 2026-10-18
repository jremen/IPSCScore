import type { CalculatedScore } from './ipsc';

/**
 * Score-based (higher-is-better) scoring types: ring targets (Bullseye, Archery,
 * F-Class) and hit counting (NRL22, PRS).
 */

/**
 * Ring values: X=11, 10=10, 9=9, ... 0=miss.
 * X counts as 10 for score but is tracked separately for tie-breaking.
 */
export function calculateRingScore(ring_values: number[]): CalculatedScore {
  const raw_points = ring_values.reduce((sum, v) => (v === 11 ? sum + 10 : sum + v), 0);
  const x_count = ring_values.filter((v) => v === 11).length;

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: 0,
    net_points: Math.round(raw_points * 100) / 100,
    hit_factor: 0,
    x_count,
  };
}

export function calculateHitCountScore(hits: number, point_value: number = 10): CalculatedScore {
  const raw_points = hits * point_value;

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: 0,
    net_points: Math.round(raw_points * 100) / 100,
    hit_factor: 0,
  };
}
