import {
  calculateActionSteelScore,
  calculateAggregatedScore,
  calculateChronoPf,
  calculateHitCountScore,
  calculateIDPAScore,
  calculateMultiGunScore,
  calculateRingScore,
  calculateScore,
  checkPfPassed,
  rankHigherIsBetter,
  rankLowerIsBetter,
  type CalculatedScore,
  type ChronoData,
  type ScoreData,
  type ScoringType,
  type StageConfig,
  type TargetScore,
} from '@ipscscore/core';
import { all, nowIso, one, run, transaction, uuid } from './db';
import { parseJson, toStageScore, toTargetScore, toChrono } from './mappers';

/**
 * Score computation and stage recalculation for the local runtime.
 *
 * Every formula lives in `@ipscscore/core`; this module only dispatches on the
 * stage's scoring type and persists the result. Ranking uses the same rounded
 * ratios as the backend's SQL window functions, so results are identical whether
 * the match was scored on a phone or against PostgreSQL.
 */

export interface SaveScorePayload {
  time: number | null;
  targets: TargetScore[];
  procedural_count: number;
  ftsa_count: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  is_dnf: boolean;
  chrono?: ChronoData | null;
  score_data?: ScoreData;
}

interface StageRow {
  id: string;
  match_id: string;
  scoring_type: ScoringType;
  hits_per_paper: number;
  par_time: number | null;
  max_points: number;
  config: string | null;
}

function hitsFrom(targets: TargetScore[]) {
  return targets.map((t) => ({
    target_type: t.target_type,
    alpha: t.alpha || 0,
    charlie: t.charlie || 0,
    delta: t.delta || 0,
    miss: t.miss || 0,
    no_shoot_hits: t.no_shoot_hits || 0,
    steel_hit: t.steel_hit ?? null,
    hits_per_paper: 0,
  }));
}

/**
 * Dispatch to the right formula for the stage's scoring type.
 * Returns the calculated points plus the ranking value (total_time / x_count).
 */
export function computeScore(
  stage: Pick<StageRow, 'scoring_type' | 'hits_per_paper' | 'par_time' | 'config'>,
  powerFactor: string,
  payload: SaveScorePayload,
): { calc: CalculatedScore; total_time: number | null; x_count: number } {
  const config: StageConfig = typeof stage.config === 'string'
    ? parseJson<StageConfig>(stage.config, {})
    : (stage.config ?? {});
  const scoringType = stage.scoring_type;
  const scoreData = payload.score_data ?? {};
  const hitsPerPaper = Number(stage.hits_per_paper) || 2;

  const withHitsPerPaper = payload.targets.map((t) => ({
    target_type: t.target_type,
    alpha: t.alpha || 0,
    charlie: t.charlie || 0,
    delta: t.delta || 0,
    miss: t.miss || 0,
    no_shoot_hits: t.no_shoot_hits || 0,
    steel_hit: t.steel_hit ?? null,
    hits_per_paper: hitsPerPaper,
  }));

  const aggregated = (scoreData as any).aggregated;
  const isAggregated =
    aggregated && ['comstock', 'virginia', 'fixed_time', 'hit_factor'].includes(scoringType);

  let calc: CalculatedScore;
  let total_time: number | null = null;
  let x_count = 0;

  if (isAggregated) {
    calc = calculateAggregatedScore({
      total_alpha: aggregated.alpha || 0,
      total_charlie: aggregated.charlie || 0,
      total_delta: aggregated.delta || 0,
      total_miss: aggregated.miss || 0,
      total_no_shoot: aggregated.no_shoot || 0,
      total_steel: aggregated.steel_count || 0,
      steel_hit_count: aggregated.steel_count || 0,
      procedural_count: aggregated.procedural || payload.procedural_count,
      ftsa_count: payload.ftsa_count,
      extra_shot_count: payload.extra_shot_count,
      extra_hit_count: payload.extra_hit_count,
      stacking_count: payload.stacking_count,
      overtime_shot_count: payload.overtime_shot_count,
      time: payload.time ?? 0,
      scoring_type: scoringType,
      power_factor: powerFactor as 'minor' | 'major',
    });
  } else if (['comstock', 'virginia', 'fixed_time', 'hit_factor'].includes(scoringType)) {
    calc = calculateScore({
      targets: withHitsPerPaper,
      time: payload.time,
      procedural_count: payload.procedural_count,
      ftsa_count: payload.ftsa_count,
      extra_shot_count: payload.extra_shot_count,
      extra_hit_count: payload.extra_hit_count,
      stacking_count: payload.stacking_count,
      overtime_shot_count: payload.overtime_shot_count,
      scoring_type: scoringType,
      power_factor: powerFactor as 'minor' | 'major',
      par_time: stage.par_time,
    });
  } else if (scoringType === 'idpa') {
    calc = calculateIDPAScore({
      targets: hitsFrom(payload.targets).map((t) => ({ ...t, hits_per_paper: hitsPerPaper })),
      time: payload.time ?? 0,
      penalty_pe: scoreData.penalty_pe || 0,
      penalty_hnt: scoreData.penalty_hnt || 0,
      penalty_ftn: scoreData.penalty_ftn || 0,
      penalty_fp: scoreData.penalty_fp || 0,
      penalty_ftdr: scoreData.penalty_ftdr || 0,
    });
    total_time = calc.total_time ?? null;
  } else if (scoringType === 'action_steel') {
    calc = calculateActionSteelScore({
      string_times: scoreData.string_times || [],
      string_plate_hits: scoreData.string_plate_hits || [],
      number_of_strings: config.number_of_strings || 5,
      drop_worst: config.drop_worst ?? 1,
      miss_penalty: 3,
      stop_plate_miss_cap: 30,
    });
    total_time = calc.total_time ?? null;
  } else if (scoringType === 'multi_gun') {
    calc = calculateMultiGunScore({
      time: payload.time ?? 0,
      targets: payload.targets.map((t) => ({ neutralized: t.target_data?.neutralized ?? false })),
      penalty_ftn_sec: scoreData.penalty_ftn_sec || 0,
      penalty_miss_sec: scoreData.penalty_miss_sec || 0,
      penalty_no_shoot_sec: scoreData.penalty_no_shoot_sec || 0,
      penalty_procedural_sec: scoreData.penalty_procedural_sec || 0,
    });
    total_time = calc.total_time ?? null;
  } else if (
    ['bullseye', 'archery', 'issf'].includes(scoringType) ||
    (scoringType === 'long_range' && config.variant === 'f_class')
  ) {
    calc = calculateRingScore(scoreData.ring_values || []);
    x_count = calc.x_count ?? 0;
  } else if (scoringType === 'nrl22' || scoringType === 'long_range') {
    const hits = payload.targets.filter((t) => t.target_data?.hit === true).length;
    calc = calculateHitCountScore(hits, config.point_value || 10);
  } else if (scoringType === 'chrono') {
    calc = { raw_points: 0, penalty_points: 0, net_points: 0, hit_factor: 0 };
  } else {
    calc = calculateScore({
      targets: withHitsPerPaper,
      time: payload.time,
      procedural_count: payload.procedural_count,
      ftsa_count: payload.ftsa_count,
      extra_shot_count: payload.extra_shot_count,
      extra_hit_count: payload.extra_hit_count,
      stacking_count: payload.stacking_count,
      overtime_shot_count: payload.overtime_shot_count,
      scoring_type: 'comstock',
      power_factor: powerFactor as 'minor' | 'major',
      par_time: stage.par_time,
    });
  }

  return { calc, total_time, x_count };
}

// ── Persistence ──────────────────────────────────────────────────────────

export async function saveScore(
  matchId: string,
  stageId: string,
  registrationId: string,
  payload: SaveScorePayload,
): Promise<{ score: any; calcResult: CalculatedScore }> {
  const stage = await one<StageRow>(
    `SELECT id, match_id, scoring_type, hits_per_paper, par_time, max_points, config
     FROM stages WHERE id = ?`,
    [stageId],
  );
  if (!stage) throw new Error('Stage not found');

  const registration = await one<{ power_factor: string | null; shooter_pf: string }>(
    `SELECT mr.power_factor, s.power_factor AS shooter_pf
     FROM match_registrations mr JOIN shooters s ON s.id = mr.shooter_id
     WHERE mr.id = ?`,
    [registrationId],
  );
  if (!registration) throw new Error('Registration not found');

  const powerFactor = registration.power_factor || registration.shooter_pf;
  const { calc, total_time, x_count } = computeScore(stage, powerFactor, payload);
  const scoreDataJson = JSON.stringify(payload.score_data ?? {});

  let scoreId = '';

  await transaction(async () => {
    const existing = await one<{ id: string }>(
      `SELECT id FROM stage_scores WHERE stage_id = ? AND registration_id = ?`,
      [stageId, registrationId],
    );

    scoreId = existing?.id ?? uuid();
    const now = nowIso();

    await run(
      `INSERT INTO stage_scores (
         id, match_id, stage_id, registration_id, time,
         extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count,
         procedural_count, ftsa_count, is_dnf,
         raw_points, penalty_points, net_points, hit_factor,
         total_time, x_count, score_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (stage_id, registration_id) DO UPDATE SET
         time = excluded.time,
         extra_shot_count = excluded.extra_shot_count,
         extra_hit_count = excluded.extra_hit_count,
         stacking_count = excluded.stacking_count,
         overtime_shot_count = excluded.overtime_shot_count,
         procedural_count = excluded.procedural_count,
         ftsa_count = excluded.ftsa_count,
         is_dnf = excluded.is_dnf,
         raw_points = excluded.raw_points,
         penalty_points = excluded.penalty_points,
         net_points = excluded.net_points,
         hit_factor = excluded.hit_factor,
         total_time = excluded.total_time,
         x_count = excluded.x_count,
         score_data = excluded.score_data,
         updated_at = excluded.updated_at`,
      [
        scoreId, matchId, stageId, registrationId, payload.time ?? null,
        payload.extra_shot_count, payload.extra_hit_count, payload.stacking_count,
        payload.overtime_shot_count, payload.procedural_count, payload.ftsa_count,
        payload.is_dnf ? 1 : 0,
        calc.raw_points, calc.penalty_points, calc.net_points, calc.hit_factor,
        total_time, x_count, scoreDataJson, now, now,
      ],
    );

    // Replace the target rows rather than diffing them — the payload is the
    // authoritative full set for this score.
    await run(`DELETE FROM target_scores WHERE stage_score_id = ?`, [scoreId]);

    for (const target of payload.targets) {
      await run(
        `INSERT INTO target_scores (
           id, stage_score_id, target_index, target_type, alpha, charlie, delta,
           miss, no_shoot_hits, steel_hit, target_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(), scoreId, target.target_index, target.target_type,
          target.alpha || 0, target.charlie || 0, target.delta || 0,
          target.miss || 0, target.no_shoot_hits || 0,
          target.steel_hit === null || target.steel_hit === undefined ? null : target.steel_hit ? 1 : 0,
          JSON.stringify(target.target_data ?? {}),
        ],
      );
    }

    if (payload.chrono && stage.scoring_type === 'chrono') {
      const chronoResult = calculateChronoPf(
        payload.chrono.bullet_weight,
        payload.chrono.velocity_1,
        payload.chrono.velocity_2,
        payload.chrono.velocity_3,
      );
      const match = await one<{ organization: string }>(
        `SELECT organization FROM matches WHERE id = ?`,
        [matchId],
      );
      const pfCheck = checkPfPassed(
        chronoResult.calculatedPf,
        powerFactor as 'minor' | 'major',
        (match?.organization ?? 'IPSC') as any,
      );

      await run(
        `INSERT INTO chrono_results (
           id, stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3,
           avg_velocity, calculated_pf, pf_passed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (stage_score_id) DO UPDATE SET
           bullet_weight = excluded.bullet_weight,
           velocity_1 = excluded.velocity_1,
           velocity_2 = excluded.velocity_2,
           velocity_3 = excluded.velocity_3,
           avg_velocity = excluded.avg_velocity,
           calculated_pf = excluded.calculated_pf,
           pf_passed = excluded.pf_passed,
           updated_at = excluded.updated_at`,
        [
          uuid(), scoreId, payload.chrono.bullet_weight,
          payload.chrono.velocity_1 ?? null, payload.chrono.velocity_2 ?? null,
          payload.chrono.velocity_3 ?? null, chronoResult.avgVelocity,
          chronoResult.calculatedPf, pfCheck.passed ? 1 : 0, nowIso(), nowIso(),
        ],
      );

      if (pfCheck.reclassifyTo) {
        await run(`UPDATE match_registrations SET power_factor = ? WHERE id = ?`, [
          pfCheck.reclassifyTo,
          registrationId,
        ]);
      }
    }

    await recalculateStage(matchId, stageId);
  });

  const saved = await getShooterScore(matchId, stageId, registrationId);
  return { score: saved, calcResult: calc };
}

/**
 * Recompute `stage_percent` / `stage_points` for every score on a stage.
 *
 * Ranking is per-division and ignores DQ/DNF shooters when determining the best
 * result; DQ and DNF shooters are then zeroed so they never distort standings.
 */
export async function recalculateStage(matchId: string, stageId: string): Promise<void> {
  const stage = await one<StageRow>(
    `SELECT id, match_id, scoring_type, hits_per_paper, par_time, max_points, config
     FROM stages WHERE id = ?`,
    [stageId],
  );
  if (!stage) return;

  const config = parseJson<StageConfig>(stage.config, {});
  const maxPoints = Number(stage.max_points) || 0;
  const scoringType = stage.scoring_type;

  const rows = await all<{
    id: string;
    registration_id: string;
    hit_factor: number;
    net_points: number;
    total_time: number | null;
    division: string;
    is_dq: number;
    is_dnf: number;
  }>(
    `SELECT ss.id, ss.registration_id, ss.hit_factor, ss.net_points, ss.total_time,
            COALESCE(mr.division, s.division) AS division, mr.is_dq, ss.is_dnf
     FROM stage_scores ss
     JOIN match_registrations mr ON mr.id = ss.registration_id
     JOIN shooters s ON s.id = mr.shooter_id
     WHERE ss.stage_id = ?`,
    [stageId],
  );

  const lowerIsBetter = isLowerBetter(scoringType);

  // Best value per division, computed from eligible (non-DQ, non-DNF) rows only.
  const bestByDivision = new Map<string, number>();
  for (const row of rows) {
    if (row.is_dq === 1 || row.is_dnf === 1) continue;
    const value = rankValue(scoringType, row);
    if (value === null) continue;
    const current = bestByDivision.get(row.division);
    if (current === undefined) {
      bestByDivision.set(row.division, value);
    } else {
      bestByDivision.set(row.division, lowerIsBetter ? Math.min(current, value) : Math.max(current, value));
    }
  }

  for (const row of rows) {
    // DQ and DNF shooters are zeroed so they never distort the standings.
    if (row.is_dq === 1 || row.is_dnf === 1) {
      await run(`UPDATE stage_scores SET stage_percent = 0, stage_points = 0 WHERE id = ?`, [row.id]);
      continue;
    }

    const value = rankValue(scoringType, row);
    const best = bestByDivision.get(row.division);

    if (value === null || best === undefined) {
      await run(`UPDATE stage_scores SET stage_percent = 0, stage_points = 0 WHERE id = ?`, [row.id]);
      continue;
    }

    const ranking = lowerIsBetter
      ? rankLowerIsBetter(value, best, maxPoints)
      : rankHigherIsBetter(value, best, maxPoints);

    await run(
      `UPDATE stage_scores SET stage_percent = ?, stage_points = ? WHERE id = ?`,
      [ranking.stage_percent, ranking.stage_points, row.id],
    );
  }
}

/** IDPA / Action Steel / Multi-Gun rank by lowest total time; everything else by highest. */
function isLowerBetter(scoringType: ScoringType): boolean {
  return ['idpa', 'action_steel', 'multi_gun'].includes(scoringType);
}

function rankValue(
  scoringType: ScoringType,
  row: { hit_factor: number; net_points: number; total_time: number | null },
): number | null {
  if (['comstock', 'virginia', 'hit_factor'].includes(scoringType)) return row.hit_factor;

  if (['idpa', 'action_steel', 'multi_gun'].includes(scoringType)) {
    const time = row.total_time ?? 0;
    return time > 0 ? time : null;
  }

  // fixed_time, ring-based, hit-count and everything else rank by net points.
  return row.net_points;
}

export async function recalculateMatch(matchId: string): Promise<{ recalculated: boolean; stage_count: number }> {
  const stages = await all<{ id: string }>(`SELECT id FROM stages WHERE match_id = ?`, [matchId]);
  await transaction(async () => {
    for (const stage of stages) {
      await recalculateStage(matchId, stage.id);
    }
  });
  return { recalculated: true, stage_count: stages.length };
}

// ── Reads ────────────────────────────────────────────────────────────────

async function loadTargets(stageScoreId: string): Promise<TargetScore[]> {
  const rows = await all(`SELECT * FROM target_scores WHERE stage_score_id = ? ORDER BY target_index`, [
    stageScoreId,
  ]);
  return rows.map(toTargetScore);
}

export async function getShooterScore(matchId: string, stageId: string, registrationId: string) {
  const row = await one<Record<string, any>>(
    `SELECT * FROM stage_scores WHERE stage_id = ? AND registration_id = ?`,
    [stageId, registrationId],
  );
  if (!row) return null;

  const targets = await loadTargets(String(row.id));
  const chrono = await one<Record<string, any>>(
    `SELECT * FROM chrono_results WHERE stage_score_id = ?`,
    [row.id],
  );
  return toStageScore(row, targets, toChrono(chrono));
}

export async function getStageScores(matchId: string, stageId: string) {
  const rows = await all<Record<string, any>>(
    `SELECT * FROM stage_scores WHERE stage_id = ? ORDER BY created_at`,
    [stageId],
  );

  const scores = [];
  for (const row of rows) {
    const targets = await loadTargets(String(row.id));
    const chrono = await one<Record<string, any>>(
      `SELECT * FROM chrono_results WHERE stage_score_id = ?`,
      [row.id],
    );
    scores.push(toStageScore(row, targets, toChrono(chrono)));
  }
  return scores;
}

export async function getScoringProgress(matchId: string) {
  const scored = await all<{ stage_id: string; registration_id: string; squad: number | null }>(
    `SELECT ss.stage_id, ss.registration_id, mr.squad
     FROM stage_scores ss
     JOIN match_registrations mr ON mr.id = ss.registration_id
     WHERE ss.match_id = ?`,
    [matchId],
  );
  return { scored };
}
