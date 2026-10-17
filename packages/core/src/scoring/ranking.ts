/**
 * Stage ranking helpers.
 *
 * stage_percent normalises a shooter's stage value against the best value on the
 * stage; stage_points then scales it by the stage's max points. Percentages are
 * rounded to 4 decimals, points to 2 — matching the SQL window-function ranking
 * used by the backend so client and server agree to the last digit.
 */

/** Higher-is-better ranking (hit factor, net points). */
export function calculateStagePercent(shooterValue: number, highestValue: number): number {
  if (highestValue <= 0) return 0;
  return Math.round((shooterValue / highestValue) * 1000000) / 10000;
}

export function calculateStagePoints(stagePercent: number, maxPoints: number): number {
  return Math.round((stagePercent / 100) * maxPoints * 100) / 100;
}

/** Lower-is-better ranking (IDPA, Action Steel, Multi-Gun times). */
export function calculateTimeBasedPercent(shooterTime: number, lowestTime: number): number {
  if (shooterTime <= 0 || lowestTime <= 0) return 0;
  return Math.round((lowestTime / shooterTime) * 1000000) / 10000;
}

/**
 * Percent + points for a higher-is-better stage value (hit factor, net points).
 *
 * `stage_points` is derived from the *unrounded* ratio, matching the backend's
 * `ROUND((value / best) * maxPoints, 2)` so both produce identical figures.
 */
export function rankHigherIsBetter(
  value: number,
  best: number,
  maxPoints: number,
): { stage_percent: number; stage_points: number } {
  if (best <= 0) return { stage_percent: 0, stage_points: 0 };
  const ratio = value / best;
  return {
    stage_percent: Math.round(ratio * 1000000) / 10000,
    stage_points: Math.round(ratio * maxPoints * 100) / 100,
  };
}

/** Percent + points for a lower-is-better stage value (total time). */
export function rankLowerIsBetter(
  value: number,
  best: number,
  maxPoints: number,
): { stage_percent: number; stage_points: number } {
  if (best <= 0 || value <= 0) return { stage_percent: 0, stage_points: 0 };
  const ratio = best / value;
  return {
    stage_percent: Math.round(ratio * 1000000) / 10000,
    stage_points: Math.round(ratio * maxPoints * 100) / 100,
  };
}
