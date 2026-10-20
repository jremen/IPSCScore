import { all, one } from './db';

/**
 * Match result computation for the local (on-device) runtime.
 *
 * The backend does this in PostgreSQL with CTEs and window functions. Here we
 * load the match into memory and compute the same figures in TypeScript, reusing
 * the rounded percentages from `@ipscscore/core` so both runtimes agree exactly.
 *
 * Scale note: a single match is at most a few hundred shooters × ~30 stages, so
 * an in-memory pass is far cheaper than the round trips it replaces.
 */

export interface RegistrationRow {
  id: string;
  shooter_id: string;
  squad: number | null;
  reg_division: string | null;
  reg_category: string | null;
  reg_power_factor: string | null;
  is_dq: number;
  dq_reason: string | null;
  group_id: string | null;
  first_name: string;
  last_name: string;
  tag: string | null;
  division: string;
  category: string;
  power_factor: string;
  region: string;
  email: string | null;
}

export interface ScoreRow {
  id: string;
  registration_id: string;
  stage_id: string;
  scoring_type: string;
  stage_number: number;
  time: number | null;
  total_time: number | null;
  net_points: number;
  hit_factor: number;
  stage_percent: number;
  stage_points: number;
  procedural_count: number;
  is_dnf: number;
}

interface TargetTotals {
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot: number;
}

const HIT_FACTOR_TYPES = ['comstock', 'virginia', 'hit_factor'];
const TIME_BASED_TYPES = ['idpa', 'action_steel', 'multi_gun'];
const CATEGORIES = ['regular', 'junior', 'senior', 'super_senior', 'lady'];

const REGISTRATION_SELECT = `
  SELECT mr.id, mr.shooter_id, mr.squad,
         mr.division AS reg_division, mr.category AS reg_category,
         mr.power_factor AS reg_power_factor, mr.is_dq, mr.dq_reason, mr.group_id,
         s.first_name, s.last_name, s.tag,
         s.division, s.category, s.power_factor, s.region, s.email
  FROM match_registrations mr
  JOIN shooters s ON s.id = mr.shooter_id
  WHERE mr.match_id = ?`;

export async function loadRegistrations(matchId: string): Promise<RegistrationRow[]> {
  return all<RegistrationRow>(REGISTRATION_SELECT, [matchId]);
}

export async function loadScores(matchId: string): Promise<ScoreRow[]> {
  return all<ScoreRow>(
    `SELECT ss.id, ss.registration_id, ss.stage_id, st.scoring_type, st.stage_number,
            ss.time, ss.total_time, ss.net_points, ss.hit_factor,
            ss.stage_percent, ss.stage_points, ss.procedural_count, ss.is_dnf
     FROM stage_scores ss
     JOIN stages st ON st.id = ss.stage_id
     WHERE ss.match_id = ?`,
    [matchId],
  );
}

async function loadTargetTotals(matchId: string): Promise<Map<string, TargetTotals>> {
  const rows = await all<{
    registration_id: string;
    alpha: number;
    steel_hits: number;
    charlie: number;
    delta: number;
    miss: number;
    steel_misses: number;
    no_shoot: number;
  }>(
    `SELECT ss.registration_id,
            COALESCE(SUM(ts.alpha), 0) AS alpha,
            COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = 1 THEN 1 ELSE 0 END), 0) AS steel_hits,
            COALESCE(SUM(ts.charlie), 0) AS charlie,
            COALESCE(SUM(ts.delta), 0) AS delta,
            COALESCE(SUM(ts.miss), 0) AS miss,
            COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = 0 THEN 1 ELSE 0 END), 0) AS steel_misses,
            COALESCE(SUM(ts.no_shoot_hits), 0) AS no_shoot
     FROM stage_scores ss
     JOIN target_scores ts ON ts.stage_score_id = ss.id
     WHERE ss.match_id = ?
     GROUP BY ss.registration_id`,
    [matchId],
  );

  const map = new Map<string, TargetTotals>();
  for (const row of rows) {
    map.set(row.registration_id, {
      // Steel hits count as alphas; steel misses as misses — matching WinMSS.
      alpha: (row.alpha ?? 0) + (row.steel_hits ?? 0),
      charlie: row.charlie ?? 0,
      delta: row.delta ?? 0,
      miss: (row.miss ?? 0) + (row.steel_misses ?? 0),
      no_shoot: row.no_shoot ?? 0,
    });
  }
  return map;
}

function effective(reg: RegistrationRow) {
  return {
    division: reg.reg_division || reg.division,
    category: reg.reg_category || reg.category,
    power_factor: reg.reg_power_factor || reg.power_factor,
  };
}

interface MatchTotals {
  match_points: number;
  procedurals: number;
  total_time: number;
  hf_net_points: number;
  hf_time: number;
}

function aggregateTotals(scores: ScoreRow[]): Map<string, MatchTotals> {
  const map = new Map<string, MatchTotals>();

  for (const score of scores) {
    let totals = map.get(score.registration_id);
    if (!totals) {
      totals = { match_points: 0, procedurals: 0, total_time: 0, hf_net_points: 0, hf_time: 0 };
      map.set(score.registration_id, totals);
    }

    totals.match_points += score.stage_points ?? 0;
    totals.procedurals += score.procedural_count ?? 0;

    if (TIME_BASED_TYPES.includes(score.scoring_type)) {
      totals.total_time += score.total_time ?? 0;
    } else {
      totals.total_time += score.time ?? 0;
    }

    if (HIT_FACTOR_TYPES.includes(score.scoring_type)) {
      totals.hf_net_points += score.net_points ?? 0;
      totals.hf_time += score.time ?? 0;
    }
  }

  return map;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

interface ResultRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: string;
  category: string;
  power_factor: string;
  tag: string | null;
  is_dq: boolean;
  dq_reason?: string | null;
  match_points: number;
  hit_factor: number | null;
  time: number;
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot: number;
  procedurals: number;
}

function buildRow(
  reg: RegistrationRow,
  totals: MatchTotals | undefined,
  targets: TargetTotals | undefined,
): ResultRow {
  const eff = effective(reg);
  const hfTime = totals?.hf_time ?? 0;

  return {
    registration_id: reg.id,
    first_name: reg.first_name,
    last_name: reg.last_name,
    division: eff.division,
    category: eff.category,
    power_factor: eff.power_factor,
    tag: reg.tag,
    is_dq: reg.is_dq === 1,
    dq_reason: reg.dq_reason,
    match_points: round(totals?.match_points ?? 0, 2),
    hit_factor: hfTime > 0 ? round((totals?.hf_net_points ?? 0) / hfTime, 4) : null,
    time: round(totals?.total_time ?? 0, 2),
    alpha: targets?.alpha ?? 0,
    charlie: targets?.charlie ?? 0,
    delta: targets?.delta ?? 0,
    miss: targets?.miss ?? 0,
    no_shoot: targets?.no_shoot ?? 0,
    procedurals: totals?.procedurals ?? 0,
  };
}

function percentAgainstBest(points: number, best: number): number {
  return best > 0 ? round((points / best) * 100, 2) : 0;
}

interface MatchContext {
  active: ResultRow[];
  dq: ResultRow[];
}

async function loadContext(matchId: string): Promise<MatchContext> {
  const [registrations, scores, targetTotals] = await Promise.all([
    loadRegistrations(matchId),
    loadScores(matchId),
    loadTargetTotals(matchId),
  ]);

  const totalsByReg = aggregateTotals(scores);
  const active: ResultRow[] = [];
  const dq: ResultRow[] = [];

  for (const reg of registrations) {
    const row = buildRow(reg, totalsByReg.get(reg.id), targetTotals.get(reg.id));
    if (row.is_dq) dq.push(row);
    else active.push(row);
  }

  active.sort((a, b) => b.match_points - a.match_points);
  dq.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));

  return { active, dq };
}

function withPositions(rows: ResultRow[]) {
  const best = rows.length > 0 ? rows[0].match_points : 0;
  return rows.map((row, index) => ({
    ...row,
    position: index + 1,
    match_percent: percentAgainstBest(row.match_points, best),
  }));
}

function dqRows(rows: ResultRow[]) {
  return rows.map((row) => ({ ...row, match_percent: 0 }));
}

function groupByDivision(rows: ResultRow[]): Record<string, ResultRow[]> {
  const groups: Record<string, ResultRow[]> = {};
  for (const row of rows) {
    const key = row.division || 'unknown';
    (groups[key] ||= []).push(row);
  }
  return groups;
}

function groupedWithPositions(rows: ResultRow[]) {
  const out: Record<string, any[]> = {};
  for (const [division, group] of Object.entries(groupByDivision(rows))) {
    out[division] = withPositions(group);
  }
  return out;
}

// ── Public queries ───────────────────────────────────────────────────────

export async function matchProgress(matchId: string) {
  const [registrations, scores, stages] = await Promise.all([
    loadRegistrations(matchId),
    loadScores(matchId),
    all<{ id: string }>(`SELECT id FROM stages WHERE match_id = ?`, [matchId]),
  ]);

  const nonDqIds = new Set(registrations.filter((r) => r.is_dq !== 1).map((r) => r.id));
  const scoredPairs = new Set<string>();
  for (const score of scores) {
    if (nonDqIds.has(score.registration_id)) {
      scoredPairs.add(`${score.stage_id}:${score.registration_id}`);
    }
  }

  const scoredLength = scoredPairs.size;
  const stagesLength = stages.length;
  const registrationsLength = nonDqIds.size;
  const full = stagesLength * registrationsLength;
  const progressValue = full > 0
    ? Math.min(100, round((scoredLength / full) * 100, 2))
    : 0;

  return { scoredLength, stagesLength, registrationsLength, progressValue };
}

export async function overallResults(matchId: string) {
  const { active, dq } = await loadContext(matchId);
  return { results: withPositions(active), dq: dqRows(dq) };
}

export async function divisionResults(matchId: string) {
  const { active, dq } = await loadContext(matchId);
  return { ...groupedWithPositions(active), dq: dqRows(dq) };
}

export async function categoryResults(matchId: string) {
  const { active, dq } = await loadContext(matchId);
  const out: Record<string, Record<string, any[]>> = {};

  for (const category of CATEGORIES) {
    const rows = active
      .filter((row) => row.category === category)
      .sort((a, b) => a.division.localeCompare(b.division) || b.match_points - a.match_points);
    if (rows.length === 0) continue;
    out[category] = groupedWithPositions(rows);
  }

  return { ...out, dq: dqRows(dq) };
}

export async function tagResults(matchId: string) {
  const { active, dq } = await loadContext(matchId);
  const out: Record<string, Record<string, any[]>> = {};

  const tags = [...new Set(active.map((r) => r.tag).filter((t): t is string => !!t))].sort();
  for (const tag of tags) {
    const rows = active
      .filter((row) => row.tag === tag)
      .sort((a, b) => a.division.localeCompare(b.division) || b.match_points - a.match_points);
    out[tag] = groupedWithPositions(rows);
  }

  return { ...out, dq: dqRows(dq) };
}

export async function singleStageResults(matchId: string, stageId: string) {  const rows = await all<any>(
    `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent,
            ss.stage_points, ss.time,
            s.first_name, s.last_name,
            COALESCE(mr.division, s.division) AS division,
            COALESCE(mr.category, s.category) AS category,
            mr.is_dq, mr.dq_reason
     FROM stage_scores ss
     JOIN match_registrations mr ON mr.id = ss.registration_id
     JOIN shooters s ON s.id = mr.shooter_id
     WHERE ss.stage_id = ? AND mr.is_dq = 0
     ORDER BY ss.stage_points DESC`,
    [stageId],
  );

  const dqScores = await all<any>(
    `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.time,
            s.first_name, s.last_name,
            COALESCE(mr.division, s.division) AS division,
            COALESCE(mr.category, s.category) AS category,
            mr.is_dq, mr.dq_reason
     FROM stage_scores ss
     JOIN match_registrations mr ON mr.id = ss.registration_id
     JOIN shooters s ON s.id = mr.shooter_id
     WHERE ss.stage_id = ? AND mr.is_dq = 1
     ORDER BY s.last_name, s.first_name`,
    [stageId],
  );

  return {
    results: rows.map((row, index) => ({ ...row, position: index + 1 })),
    dq: dqScores,
  };
}

export async function stageResults(matchId: string) {
  const stages = await all<{ id: string; stage_number: number; name: string }>(
    `SELECT id, stage_number, name FROM stages WHERE match_id = ? ORDER BY stage_number`,
    [matchId],
  );

  const output: any[] = [];

  for (const stage of stages) {
    const scores = await all<any>(
      `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent,
              ss.stage_points, ss.time, ss.procedural_count,
              s.first_name, s.last_name,
              COALESCE(mr.division, s.division) AS division,
              mr.is_dq,
              COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = 1 THEN 1 ELSE 0 END), 0) AS alpha,
              COALESCE(SUM(ts.charlie), 0) AS charlie,
              COALESCE(SUM(ts.delta), 0) AS delta,
              COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = 0 THEN 1 ELSE 0 END), 0) AS miss,
              COALESCE(SUM(ts.no_shoot_hits), 0) AS no_shoot
       FROM stage_scores ss
       JOIN match_registrations mr ON mr.id = ss.registration_id
       JOIN shooters s ON s.id = mr.shooter_id
       LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
       WHERE ss.stage_id = ? AND mr.is_dq = 0
       GROUP BY ss.id
       ORDER BY division, ss.stage_points DESC`,
      [stage.id],
    );

    const groups = groupByDivision(scores as ResultRow[]);
    const groupedScores: any[] = [];
    for (const [, divScores] of Object.entries(groups)) {
      divScores.forEach((score, index) => {
        groupedScores.push({ ...score, position: index + 1, division_position: index + 1 });
      });
    }
    groupedScores.sort((a, b) => b.stage_points - a.stage_points);
    groupedScores.forEach((score, index) => {
      score.position = index + 1;
    });

    const dqScores = await all<any>(
      `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.time, ss.procedural_count,
              s.first_name, s.last_name,
              COALESCE(mr.division, s.division) AS division,
              mr.is_dq, mr.dq_reason
       FROM stage_scores ss
       JOIN match_registrations mr ON mr.id = ss.registration_id
       JOIN shooters s ON s.id = mr.shooter_id
       WHERE ss.stage_id = ? AND mr.is_dq = 1
       ORDER BY s.last_name, s.first_name`,
      [stage.id],
    );

    output.push({
      stage_id: stage.id,
      stage_number: stage.stage_number,
      stage_name: stage.name,
      scores: groupedScores,
      dq_scores: dqScores,
      divisions: Object.fromEntries(
        Object.entries(groups).map(([division, divScores]) => [
          division,
          divScores.map((score, index) => ({ ...score, position: index + 1 })),
        ]),
      ),
    });
  }

  return output;
}

/**
 * Per-stage breakdown for one shooter, including target-level detail.
 * Used by the shooter summary / scorecard screens.
 */
export async function shooterStageSummaries(matchId: string, registrationId: string) {
  const reg = await one<any>(
    `SELECT mr.id, mr.division AS reg_division, mr.category AS reg_category,
            mr.power_factor AS reg_power_factor, mr.is_dq,
            s.first_name, s.last_name, s.division AS shooter_division,
            s.category AS shooter_category, s.power_factor AS shooter_power_factor
     FROM match_registrations mr
     JOIN shooters s ON s.id = mr.shooter_id
     WHERE mr.id = ? AND mr.match_id = ?`,
    [registrationId, matchId],
  );
  if (!reg) throw new Error('Registration not found');

  const registration = {
    first_name: reg.first_name,
    last_name: reg.last_name,
    division: reg.reg_division || reg.shooter_division,
    category: reg.reg_category || reg.shooter_category,
    power_factor: reg.reg_power_factor || reg.shooter_power_factor,
    is_dq: reg.is_dq === 1,
  };

  const stages = await all<any>(
    `SELECT * FROM stages WHERE match_id = ? ORDER BY stage_number`,
    [matchId],
  );

  const summaries: any[] = [];

  for (const stage of stages) {
    const score = await one<any>(
      `SELECT * FROM stage_scores WHERE stage_id = ? AND registration_id = ?`,
      [stage.id, registrationId],
    );
    if (!score) continue;

    const targets = await all<any>(
      `SELECT target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits,
              steel_hit, target_data
       FROM target_scores WHERE stage_score_id = ? ORDER BY target_index`,
      [score.id],
    );

    summaries.push({
      stage: {
        id: stage.id,
        stage_number: stage.stage_number,
        name: stage.name,
        scoring_type: stage.scoring_type,
        paper_targets: stage.paper_targets,
        steel_targets: stage.steel_targets,
        no_shoot_targets: stage.no_shoot_targets,
        npm_targets: stage.npm_targets,
        hits_per_paper: stage.hits_per_paper,
        min_rounds: stage.min_rounds,
        max_points: stage.max_points,
        par_time: stage.par_time,
        briefing: stage.briefing,
        config: stage.config,
      },
      score: {
        time: score.time,
        raw_points: Number(score.raw_points),
        penalty_points: Number(score.penalty_points),
        net_points: Number(score.net_points),
        hit_factor: Number(score.hit_factor),
        stage_percent: Number(score.stage_percent),
        stage_points: Number(score.stage_points),
        total_time: score.total_time != null ? Number(score.total_time) : null,
        x_count: score.x_count || 0,
        is_dnf: score.is_dnf === 1,
        score_data: JSON.parse(score.score_data || '{}'),
        targets: targets.map((t) => ({
          target_index: t.target_index,
          target_type: t.target_type,
          alpha: t.alpha || 0,
          charlie: t.charlie || 0,
          delta: t.delta || 0,
          miss: t.miss || 0,
          no_shoot_hits: t.no_shoot_hits || 0,
          steel_hit: t.steel_hit === null || t.steel_hit === undefined ? null : t.steel_hit === 1,
          target_data: JSON.parse(t.target_data || '{}'),
        })),
      },
    });
  }

  return { registration, stages: summaries };
}
