import { sql } from '../db/client.js';
import { stageRankingMode } from '../utils/stageRanking.js';

/**
 * Combined ("all divisions") match points.
 *
 * The `stage_points` stored by `recalculateStage` are division-relative: each
 * stage winner in his own division gets the stage's full points. PractiScore's
 * combined table instead re-scores every stage against the best score in the
 * whole field, so a 60% shooter in a weak division is not shown above an 80%
 * shooter in a strong one.
 *
 * This computes the combined totals on read, leaving the stored division
 * points untouched for the division/category/tag/stage tables.
 */

interface StageInfo {
  id: string;
  scoring_type: string;
  max_points: number | string;
}

interface ScoreInfo {
  stage_id: string;
  registration_id: string;
  hit_factor: number | string | null;
  net_points: number | string | null;
  total_time: number | string | null;
  stage_points: number | string | null;
  is_dnf: boolean | null;
  is_dq: boolean | null;
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Match the SQL window-function rounding: percentage to 4 decimals, points to 2. */
function stagePointsFor(mode: ReturnType<typeof stageRankingMode>, value: number, best: number, maxPoints: number): number {
  if (best <= 0) return 0;
  if (mode === 'time' && value <= 0) return 0;
  const ratio = mode === 'time' ? best / value : value / best;
  return round(ratio * maxPoints, 2);
}

function stageValue(mode: ReturnType<typeof stageRankingMode>, score: ScoreInfo): number {
  switch (mode) {
    case 'hit_factor':
      return num(score.hit_factor);
    case 'net_points':
      return num(score.net_points);
    case 'time':
      return num(score.total_time);
    default:
      return 0;
  }
}

function bestValue(mode: ReturnType<typeof stageRankingMode>, scores: ScoreInfo[]): number {
  const values = scores
    .map((score) => stageValue(mode, score))
    .filter((value) => (mode === 'time' ? value > 0 : value >= 0));

  if (values.length === 0) return 0;
  return mode === 'time' ? Math.min(...values) : Math.max(...values);
}

/**
 * Combined match points per registration, keyed by `registration_id`.
 *
 * Stages whose ranking mode is unknown fall back to their stored (division
 * relative) `stage_points`, so unusual scoring types keep the old behaviour.
 * DQ and DNF scores contribute nothing.
 */
export async function loadCombinedMatchPoints(matchId: string): Promise<Map<string, number>> {
  const stages = (await sql`
    SELECT id, scoring_type, max_points FROM stages WHERE match_id = ${matchId}
  `) as StageInfo[];
  if (stages.length === 0) return new Map();

  const scores = (await sql`
    SELECT ss.stage_id, ss.registration_id, ss.hit_factor, ss.net_points,
           ss.total_time, ss.stage_points, ss.is_dnf, mr.is_dq
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    WHERE ss.match_id = ${matchId}
  `) as ScoreInfo[];
  if (scores.length === 0) return new Map();

  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const scoresByStage = new Map<string, ScoreInfo[]>();
  for (const score of scores) {
    const bucket = scoresByStage.get(score.stage_id);
    if (bucket) bucket.push(score);
    else scoresByStage.set(score.stage_id, [score]);
  }

  const totals = new Map<string, number>();

  for (const [stageId, stageScores] of scoresByStage) {
    const stage = stageById.get(stageId);
    if (!stage) continue;

    const mode = stageRankingMode(stage.scoring_type);
    const maxPoints = num(stage.max_points);
    const eligible = stageScores.filter((score) => !score.is_dq && !score.is_dnf);
    const best = mode === 'none' ? 0 : bestValue(mode, eligible);

    for (const score of stageScores) {
      if (score.is_dq || score.is_dnf) continue;

      const contribution = mode === 'none'
        ? num(score.stage_points)
        : stagePointsFor(mode, stageValue(mode, score), best, maxPoints);

      totals.set(score.registration_id, (totals.get(score.registration_id) ?? 0) + contribution);
    }
  }

  for (const [registrationId, total] of totals) {
    totals.set(registrationId, round(total, 2));
  }

  return totals;
}
