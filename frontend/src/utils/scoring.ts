/**
 * Client-side scoring preview.
 *
 * The formulas are not implemented here — they live in `@ipscscore/core`, which
 * is also what the standalone mobile builds use to compute and persist scores.
 * This module only adapts the preview call signatures to the shared core.
 */

import {
  calculateActionSteelScore,
  calculateHitCountScore,
  calculateIDPAScore,
  calculateMultiGunScore,
  calculateRingScore,
  calculateScore,
  getPointValues,
} from '@ipscscore/core';
import type { CalculatedScore, PowerFactor, ScoringType, TargetHitInput } from '@ipscscore/core';

export { getPointValues };
export type { TargetHitInput };
export type PreviewScore = CalculatedScore;

// ─── IPSC/USPSA Scoring (Comstock, Virginia Count, Fixed Time) ────────────────

export function calculatePreview(
  targets: TargetHitInput[],
  time: number | null,
  scoring_type: ScoringType,
  power_factor: PowerFactor,
  procedural: number,
  ftsa: number,
  extra_shot: number,
  extra_hit: number,
  stacking: number,
  overtime: number,
): PreviewScore {
  return calculateScore({
    targets,
    time,
    procedural_count: procedural,
    ftsa_count: ftsa,
    extra_shot_count: extra_shot,
    extra_hit_count: extra_hit,
    stacking_count: stacking,
    overtime_shot_count: overtime,
    scoring_type,
    power_factor,
  });
}

// ─── IDPA (Vickers Count) ─────────────────────────────────────────────────────

export interface IDPAPreviewInput {
  targets: TargetHitInput[];
  time: number;
  penalty_pe: number;
  penalty_hnt: number;
  penalty_ftn: number;
  penalty_fp: number;
  penalty_ftdr: number;
}

export function calculateIDPAPreview(input: IDPAPreviewInput): PreviewScore {
  return calculateIDPAScore(input);
}

// ─── Action Steel ─────────────────────────────────────────────────────────────

export interface ActionSteelPreviewInput {
  string_times: number[];
  string_plate_hits: boolean[][];
  drop_worst: number;
  miss_penalty: number;
  stop_plate_miss_cap: number;
}

export function calculateActionSteelPreview(input: ActionSteelPreviewInput): PreviewScore {
  return calculateActionSteelScore({
    ...input,
    // Only used for target-count math the preview does not need.
    number_of_strings: input.string_times.length,
  });
}

// ─── Multi-Gun (3-Gun) ────────────────────────────────────────────────────────

export interface MultiGunPreviewInput {
  time: number;
  penalty_ftn_sec: number;
  penalty_miss_sec: number;
  penalty_no_shoot_sec: number;
  penalty_procedural_sec: number;
}

export function calculateMultiGunPreview(input: MultiGunPreviewInput): PreviewScore {
  // Multi-Gun penalties are counted per violation, not per target.
  return calculateMultiGunScore({ ...input, targets: [] });
}

// ─── Ring-based scoring (Bullseye, Archery, F-Class) ──────────────────────────

export function calculateRingPreview(ring_values: number[]): PreviewScore {
  return calculateRingScore(ring_values);
}

// ─── Hit-count scoring (NRL22, PRS) ───────────────────────────────────────────

export function calculateHitCountPreview(hits: number, point_value: number = 10): PreviewScore {
  return calculateHitCountScore(hits, point_value);
}
