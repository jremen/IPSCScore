import { Hono } from 'hono';
import { sql } from '../db/client.js';
import {
  matchHasDivisions,
  resolveDivisionForMatch,
  type MatchDivisionContext,
} from '../utils/matchDivisions.js';
import {
  buildScoringMeta,
  parseJsonValue,
  stageScoringProfile,
  type MatchScoringMeta,
  type ResultsProfile,
} from '../utils/resultsScoring.js';
import { loadCombinedMatchPoints } from '../services/combinedResults.js';

export const resultsRoutes = new Hono();

// ── Helper: build match-level CTE query (avoids JOIN fan-out) ───────
// CTE pre-aggregates stage_scores (per-registration) separately from
// target_scores (per-registration) so SUM(stage_points) isn't multiplied
// by the number of target rows. Match-level hit_factor aggregates only
// hit-factor scoring types, so it stays NULL when none apply.
const MATCH_TOTALS_CTE = `
    WITH stage_totals AS (
      SELECT
        ss.registration_id,
        SUM(ss.stage_points) as match_points,
        SUM(ss.net_points) as achieved_points,
        SUM(ss.procedural_count) as procedurals,
        SUM(CASE WHEN st.scoring_type IN ('idpa','action_steel','multi_gun') THEN ss.total_time ELSE ss.time END) as total_time,
        SUM(CASE WHEN st.scoring_type IN ('comstock','virginia','hit_factor') THEN ss.net_points ELSE 0 END) as hf_net_points,
        SUM(CASE WHEN st.scoring_type IN ('comstock','virginia','hit_factor') THEN ss.time ELSE 0 END) as hf_time
      FROM stage_scores ss
      JOIN stages st ON st.id = ss.stage_id
      WHERE ss.match_id = $1
      GROUP BY ss.registration_id
    ),
    target_totals AS (
      SELECT
        ss.registration_id,
        SUM(ts.alpha) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
        SUM(ts.charlie) as charlie,
        SUM(ts.delta) as delta,
        SUM(ts.miss) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
        SUM(ts.no_shoot_hits) as no_shoot
      FROM stage_scores ss
      JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.match_id = $1
      GROUP BY ss.registration_id
    )
`;

const MATCH_HF_COLUMN = `CASE WHEN COALESCE(st.hf_time, 0) > 0 THEN ROUND(st.hf_net_points / st.hf_time, 4) ELSE NULL END as hit_factor,`;

function matchCte(isDq: boolean) {
  const dqFilter = isDq ? 'AND mr.is_dq = TRUE' : 'AND mr.is_dq = FALSE';
  return `
    ${MATCH_TOTALS_CTE}
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      ${isDq ? 'mr.dq_reason,' : ''}
      COALESCE(st.match_points, 0) as match_points,
      COALESCE(st.achieved_points, 0) as achieved_points,
      ${MATCH_HF_COLUMN}
      COALESCE(st.total_time, 0) as time,
      COALESCE(tt.alpha, 0) as alpha,
      COALESCE(tt.charlie, 0) as charlie,
      COALESCE(tt.delta, 0) as delta,
      COALESCE(tt.miss, 0) as miss,
      COALESCE(tt.no_shoot, 0) as no_shoot,
      COALESCE(st.procedurals, 0) as procedurals
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_totals st ON st.registration_id = mr.id
    LEFT JOIN target_totals tt ON tt.registration_id = mr.id
    WHERE mr.match_id = $1 ${dqFilter}
  `;
}

// ── Helper: run CTE query via sql.raw ────────────────────────────────
async function runMatchQuery(matchId: string, isDq: boolean) {
  const query = matchCte(isDq);
  const order = isDq ? 'ORDER BY s.last_name, s.first_name' : 'ORDER BY match_points DESC';
  return sql.unsafe(query.replace(/\$1/g, `'${matchId}'`) + '\n' + order);
}

// ── Scoring-display context ─────────────────────────────────────────
interface BreakdownEntry {
  ring_counts: Record<string, number>;
  hits: number;
  misses: number;
}

interface MatchContext {
  match: MatchDivisionContext;
  meta: MatchScoringMeta;
  breakdown: Map<string, BreakdownEntry>;
  divisionApplies: boolean;
}

interface MatchDivisionInfo {
  match: MatchDivisionContext;
  divisionApplies: boolean;
}

function emptyBreakdown(): BreakdownEntry {
  return { ring_counts: {}, hits: 0, misses: 0 };
}

function addRingValue(entry: BreakdownEntry, value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  const key = String(numeric);
  entry.ring_counts[key] = (entry.ring_counts[key] ?? 0) + 1;
}

/** Ring counts and hit/miss totals for every registration in the match. */
async function loadMatchBreakdown(matchId: string): Promise<Map<string, BreakdownEntry>> {
  const breakdown = new Map<string, BreakdownEntry>();
  const entryFor = (registrationId: string) => {
    let entry = breakdown.get(registrationId);
    if (!entry) {
      entry = emptyBreakdown();
      breakdown.set(registrationId, entry);
    }
    return entry;
  };

  const scoreRows = await sql`
    SELECT ss.registration_id, st.scoring_type, st.config, ss.score_data
    FROM stage_scores ss
    JOIN stages st ON st.id = ss.stage_id
    WHERE ss.match_id = ${matchId}
  `;

  for (const row of scoreRows as any[]) {
    if (stageScoringProfile(row.scoring_type, row.config) !== 'ring') continue;
    const scoreData = parseJsonValue(row.score_data);
    const ringValues = Array.isArray(scoreData?.ring_values) ? scoreData.ring_values : [];
    const entry = entryFor(row.registration_id);
    for (const value of ringValues) addRingValue(entry, value);
  }

  const targetRows = await sql`
    SELECT ss.registration_id, st.scoring_type, st.config, ts.target_data
    FROM stage_scores ss
    JOIN stages st ON st.id = ss.stage_id
    JOIN target_scores ts ON ts.stage_score_id = ss.id
    WHERE ss.match_id = ${matchId}
  `;

  for (const row of targetRows as any[]) {
    if (stageScoringProfile(row.scoring_type, row.config) !== 'hit_count') continue;
    const targetData = parseJsonValue(row.target_data);
    const entry = entryFor(row.registration_id);
    if (targetData?.hit === true) entry.hits += 1;
    else entry.misses += 1;
  }

  return breakdown;
}

/** Ring counts and hit/miss totals for one stage. */
async function loadStageBreakdown(stageId: string): Promise<Map<string, BreakdownEntry>> {
  const breakdown = new Map<string, BreakdownEntry>();
  const entryFor = (registrationId: string) => {
    let entry = breakdown.get(registrationId);
    if (!entry) {
      entry = emptyBreakdown();
      breakdown.set(registrationId, entry);
    }
    return entry;
  };

  const scoreRows = await sql`
    SELECT ss.registration_id, st.scoring_type, st.config, ss.score_data
    FROM stage_scores ss
    JOIN stages st ON st.id = ss.stage_id
    WHERE ss.stage_id = ${stageId}
  `;

  for (const row of scoreRows as any[]) {
    if (stageScoringProfile(row.scoring_type, row.config) !== 'ring') continue;
    const scoreData = parseJsonValue(row.score_data);
    const ringValues = Array.isArray(scoreData?.ring_values) ? scoreData.ring_values : [];
    const entry = entryFor(row.registration_id);
    for (const value of ringValues) addRingValue(entry, value);
  }

  const targetRows = await sql`
    SELECT ss.registration_id, st.scoring_type, st.config, ts.target_data
    FROM stage_scores ss
    JOIN stages st ON st.id = ss.stage_id
    JOIN target_scores ts ON ts.stage_score_id = ss.id
    WHERE ss.stage_id = ${stageId}
  `;

  for (const row of targetRows as any[]) {
    if (stageScoringProfile(row.scoring_type, row.config) !== 'hit_count') continue;
    const targetData = parseJsonValue(row.target_data);
    const entry = entryFor(row.registration_id);
    if (targetData?.hit === true) entry.hits += 1;
    else entry.misses += 1;
  }

  return breakdown;
}

async function loadMatchDivisionInfo(matchId: string): Promise<MatchDivisionInfo> {
  const [match] = await sql`SELECT organization, firearm_type FROM matches WHERE id = ${matchId}`;
  const matchContext: MatchDivisionContext = match ?? {};
  return {
    match: matchContext,
    divisionApplies: matchHasDivisions(matchContext),
  };
}

async function loadMatchContext(matchId: string): Promise<MatchContext> {
  const divisionInfo = await loadMatchDivisionInfo(matchId);
  const stageRows = await sql`SELECT scoring_type, config FROM stages WHERE match_id = ${matchId}`;
  return {
    ...divisionInfo,
    meta: buildScoringMeta(stageRows as any),
    breakdown: await loadMatchBreakdown(matchId),
  };
}

function decorateMatchRow(row: any, context: MatchContext) {
  const entry = context.breakdown.get(row.registration_id);
  const profile = context.meta.profile;
  const achievedPoints = Number(row.achieved_points ?? 0);
  const matchPoints = profile === 'zone' ? Number(row.match_points ?? 0) : achievedPoints;

  return {
    ...row,
    division: resolveDivisionForMatch(context.match, row.division) ?? '',
    division_applies: context.divisionApplies,
    scoring_profile: profile,
    ring_values: profile === 'ring' ? context.meta.ring_values : null,
    ring_counts: profile === 'ring' ? (entry?.ring_counts ?? {}) : null,
    hits: profile === 'hit_count' ? (entry?.hits ?? 0) : null,
    misses: profile === 'hit_count' ? (entry?.misses ?? 0) : null,
    achieved_points: achievedPoints,
    match_points: matchPoints,
    hit_factor: row.hit_factor != null ? Number(row.hit_factor) : null,
    match_percent: 0,
    position: 0,
  };
}

function prepareMatchRows(
  rows: any[],
  context: MatchContext,
  isDq: boolean,
  combinedPoints?: Map<string, number> | null,
) {
  const decorated = rows.map((row) => {
    const result = decorateMatchRow(row, context);
    const combined = combinedPoints?.get(row.registration_id);
    if (!isDq && combined != null) {
      // Combined table: match points are re-scored against the whole field.
      result.match_points = combined;
    }
    return result;
  });
  if (!isDq) {
    // Non-zone profiles rank by achieved points, not by the stored
    // division-relative stage points.
    decorated.sort((a, b) => b.match_points - a.match_points);
  }
  return decorated;
}

function rankGroup(rows: any[]) {
  const highest = rows.length > 0 ? Number(rows[0].match_points) : 0;
  return rows.map((row, index) => ({
    ...row,
    position: index + 1,
    match_percent: highest > 0 ? Math.round((Number(row.match_points) / highest) * 10000) / 100 : 0,
  }));
}

function groupAndRank(rows: any[], divisionApplies: boolean) {
  const groups: Record<string, any[]> = {};
  for (const row of rows) {
    const division = divisionApplies ? (row.division || 'unknown') : 'all';
    if (!groups[division]) groups[division] = [];
    groups[division].push(row);
  }
  const result: Record<string, any[]> = {};
  for (const [division, group] of Object.entries(groups)) {
    result[division] = rankGroup(group);
  }
  return result;
}

// Overall results (cross-division)
resultsRoutes.get('/matches/:matchId/results/overall', async (c) => {
  const matchId = c.req.param('matchId');
  const context = await loadMatchContext(matchId);

  // Hit-factor matches with divisions are ranked against the whole field,
  // mirroring PractiScore's combined table. Everything else (single division,
  // ring/hit-count scoring) already ranks correctly from the stored points.
  const combined = context.meta.profile === 'zone' && context.divisionApplies
    ? await loadCombinedMatchPoints(matchId)
    : null;

  const results = await runMatchQuery(matchId, false);
  const ranked = rankGroup(prepareMatchRows(results, context, false, combined));

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = prepareMatchRows(dq, context, true);

  return c.json({ results: ranked, dq: dqRanked });
});

// Match progress summary — aggregate counts only.
//
// The TV kiosk is an unauthenticated public view but needs a completion
// percentage, which normally comes from the protected `scoring-progress`
// endpoint. This returns only counts (no registration or stage identifiers),
// so it is safe to expose alongside the other public results reads.
resultsRoutes.get('/matches/:matchId/results/progress', async (c) => {
  const matchId = c.req.param('matchId');

  const [row] = await sql`
    SELECT
      (SELECT COUNT(*) FROM match_registrations
        WHERE match_id = ${matchId} AND is_dq = FALSE) AS registrations_length,
      (SELECT COUNT(*) FROM stages WHERE match_id = ${matchId}) AS stages_length,
      (SELECT COUNT(DISTINCT ss.stage_id || ':' || ss.registration_id)
         FROM stage_scores ss
         JOIN match_registrations mr ON mr.id = ss.registration_id
        WHERE ss.match_id = ${matchId} AND mr.is_dq = FALSE) AS scored_length
  `;

  const registrationsLength = Number(row?.registrations_length ?? 0);
  const stagesLength = Number(row?.stages_length ?? 0);
  const scoredLength = Number(row?.scored_length ?? 0);
  const full = stagesLength * registrationsLength;
  const progressValue = full > 0
    ? Math.min(100, Math.round((scoredLength / full) * 10000) / 100)
    : 0;

  return c.json({ scoredLength, stagesLength, registrationsLength, progressValue });
});

// Results by division — per-division rankings with positions and match_percent
resultsRoutes.get('/matches/:matchId/results/divisions', async (c) => {
  const matchId = c.req.param('matchId');
  const context = await loadMatchContext(matchId);

  const results = await runMatchQuery(matchId, false);
  const divisionResults = groupAndRank(
    prepareMatchRows(results, context, false),
    context.divisionApplies,
  );

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = prepareMatchRows(dq, context, true);

  return c.json({ ...divisionResults, dq: dqRanked });
});

interface StageScoringContext {
  meta: MatchScoringMeta;
  breakdown: Map<string, BreakdownEntry>;
}

async function stageScoringContext(stage: any): Promise<StageScoringContext> {
  return {
    meta: buildScoringMeta([{ scoring_type: stage.scoring_type, config: stage.config }]),
    breakdown: await loadStageBreakdown(stage.id),
  };
}

function decorateStageRow(
  row: any,
  stageContext: StageScoringContext,
  matchContext: MatchDivisionInfo,
) {
  const entry = stageContext.breakdown.get(row.registration_id);
  const profile = stageContext.meta.profile;
  return {
    ...row,
    division: resolveDivisionForMatch(matchContext.match, row.division) ?? '',
    division_applies: matchContext.divisionApplies,
    scoring_profile: profile,
    ring_values: profile === 'ring' ? stageContext.meta.ring_values : null,
    ring_counts: profile === 'ring' ? (entry?.ring_counts ?? {}) : null,
    hits: profile === 'hit_count' ? (entry?.hits ?? 0) : null,
    misses: profile === 'hit_count' ? (entry?.misses ?? 0) : null,
    achieved_points: Number(row.net_points ?? 0),
    hit_factor: row.hit_factor != null ? Number(row.hit_factor) : 0,
    net_points: Number(row.net_points ?? 0),
    stage_percent: Number(row.stage_percent ?? 0),
    stage_points: profile === 'zone' ? Number(row.stage_points ?? 0) : Number(row.net_points ?? 0),
    time: row.time != null ? Number(row.time) : null,
    procedural_count: Number(row.procedural_count ?? 0),
    position: 0,
    division_position: 0,
  };
}

function rankStageRows(rows: any[], profile: ResultsProfile, divisionApplies: boolean) {
  const groups: Record<string, any[]> = {};
  for (const row of rows) {
    const division = divisionApplies ? (row.division || 'unknown') : 'all';
    if (!groups[division]) groups[division] = [];
    groups[division].push(row);
  }

  const grouped: Record<string, any[]> = {};
  for (const [division, group] of Object.entries(groups)) {
    const sorted = [...group].sort((a, b) => (
      profile === 'zone' ? b.stage_points - a.stage_points : b.net_points - a.net_points
    ));
    const best = profile === 'zone'
      ? sorted[0]?.stage_points ?? 0
      : sorted[0]?.net_points ?? 0;

    grouped[division] = sorted.map((row, index) => ({
      ...row,
      position: index + 1,
      division_position: index + 1,
      stage_percent: profile === 'zone'
        ? row.stage_percent
        : (best > 0 ? Math.round((row.net_points / best) * 10000) / 100 : 0),
    }));
  }

  // The flat list carries the overall stage position; the grouped rows keep
  // their per-division position for the division sub-tables.
  const flat = Object.values(grouped).flat().map((row) => ({ ...row }));
  flat.sort((a, b) => (
    profile === 'zone' ? b.stage_points - a.stage_points : b.net_points - a.net_points
  ));
  flat.forEach((row, index) => { row.position = index + 1; });

  return { grouped, flat };
}

// Per-stage results (grouped by division within each stage)
resultsRoutes.get('/matches/:matchId/results/stages', async (c) => {
  const matchId = c.req.param('matchId');
  const matchContext = await loadMatchDivisionInfo(matchId);

  const stages = await sql`
    SELECT id, stage_number, name, scoring_type, config
    FROM stages WHERE match_id = ${matchId} ORDER BY stage_number
  `;
  const stageResults = [];

  for (const stage of stages as any[]) {
    const stageContext = await stageScoringContext(stage);

    const scores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time, ss.procedural_count,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq,
             COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
             COALESCE(SUM(ts.charlie), 0) as charlie,
             COALESCE(SUM(ts.delta), 0) as delta,
             COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
             COALESCE(SUM(ts.no_shoot_hits), 0) as no_shoot
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = FALSE
      GROUP BY ss.id, ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time, ss.procedural_count,
               s.first_name, s.last_name, s.division, mr.division, mr.is_dq
      ORDER BY division, ss.stage_points DESC
    `;

    const normalizedScores = (scores as any[]).map((s) => decorateStageRow(s, stageContext, matchContext));
    const ranked = rankStageRows(normalizedScores, stageContext.meta.profile, matchContext.divisionApplies);

    const dqScores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time, ss.procedural_count,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq, mr.dq_reason,
             COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
             COALESCE(SUM(ts.charlie), 0) as charlie,
             COALESCE(SUM(ts.delta), 0) as delta,
             COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
             COALESCE(SUM(ts.no_shoot_hits), 0) as no_shoot
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = TRUE
      GROUP BY ss.id, ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time, ss.procedural_count,
               s.first_name, s.last_name, s.division, mr.division, mr.is_dq, mr.dq_reason
      ORDER BY s.last_name, s.first_name
    `;

    stageResults.push({
      stage_id: stage.id,
      stage_number: stage.stage_number,
      stage_name: stage.name,
      scoring_profile: stageContext.meta.profile,
      ring_values: stageContext.meta.ring_values,
      division_applies: matchContext.divisionApplies,
      scores: ranked.flat,
      dq_scores: (dqScores as any[]).map((s) => decorateStageRow(s, stageContext, matchContext)),
      divisions: ranked.grouped,
    });
  }

  return c.json(stageResults);
});

// Single stage results
resultsRoutes.get('/matches/:matchId/results/stages/:stageId', async (c) => {
  const { matchId, stageId } = c.req.param();
  const matchContext = await loadMatchDivisionInfo(matchId);

  const [stage] = await sql`
    SELECT id, scoring_type, config FROM stages WHERE id = ${stageId} AND match_id = ${matchId}
  `;
  if (!stage) return c.json({ error: 'Stage not found' }, 404);

  const stageContext = await stageScoringContext(stage);

  const scores = await sql`
    SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time,
           s.first_name, s.last_name,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           mr.is_dq
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND mr.is_dq = FALSE
    ORDER BY ss.stage_points DESC
  `;

  const dqScores = await sql`
    SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time,
           s.first_name, s.last_name,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           mr.is_dq, mr.dq_reason
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND mr.is_dq = TRUE
    ORDER BY s.last_name, s.first_name
  `;

  const normalized = (scores as any[]).map((s) => decorateStageRow(s, stageContext, matchContext));
  const ranked = rankStageRows(normalized, stageContext.meta.profile, matchContext.divisionApplies);

  return c.json({
    scoring_profile: stageContext.meta.profile,
    ring_values: stageContext.meta.ring_values,
    division_applies: matchContext.divisionApplies,
    results: ranked.flat,
    dq: (dqScores as any[]).map((s) => decorateStageRow(s, stageContext, matchContext)),
  });
});

// Results by category (grouped by division within each category)
resultsRoutes.get('/matches/:matchId/results/categories', async (c) => {
  const matchId = c.req.param('matchId');
  const context = await loadMatchContext(matchId);

  const categories = ['regular', 'junior', 'senior', 'super_senior', 'lady'];
  const categoryResults: Record<string, Record<string, any[]>> = {};

  for (const cat of categories) {
    const query = `
      ${MATCH_TOTALS_CTE}
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(st.match_points, 0) as match_points,
        COALESCE(st.achieved_points, 0) as achieved_points,
        ${MATCH_HF_COLUMN}
        COALESCE(st.total_time, 0) as time,
        COALESCE(tt.alpha, 0) as alpha,
        COALESCE(tt.charlie, 0) as charlie,
        COALESCE(tt.delta, 0) as delta,
        COALESCE(tt.miss, 0) as miss,
        COALESCE(tt.no_shoot, 0) as no_shoot,
        COALESCE(st.procedurals, 0) as procedurals
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_totals st ON st.registration_id = mr.id
      LEFT JOIN target_totals tt ON tt.registration_id = mr.id
      WHERE mr.match_id = $1 AND COALESCE(mr.category, s.category) = $2 AND mr.is_dq = FALSE
      ORDER BY division, match_points DESC
    `;
    const results = await sql.unsafe(query.replace(/\$1/g, `'${matchId}'`).replace(/\$2/g, `'${cat}'`));

    if (results.length > 0) {
      categoryResults[cat] = groupAndRank(
        prepareMatchRows(results as any[], context, false),
        context.divisionApplies,
      );
    }
  }

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = prepareMatchRows(dq, context, true);

  return c.json({ ...categoryResults, dq: dqRanked });
});

// Results by tag (grouped by division within each tag)
resultsRoutes.get('/matches/:matchId/results/tags', async (c) => {
  const matchId = c.req.param('matchId');
  const context = await loadMatchContext(matchId);

  const tags = await sql`
    SELECT DISTINCT s.tag FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId} AND s.tag IS NOT NULL AND s.tag != ''
    ORDER BY s.tag
  `;

  const tagResults: Record<string, Record<string, any[]>> = {};

  for (const { tag } of tags as any[]) {
    const query = `
      ${MATCH_TOTALS_CTE}
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(st.match_points, 0) as match_points,
        COALESCE(st.achieved_points, 0) as achieved_points,
        ${MATCH_HF_COLUMN}
        COALESCE(st.total_time, 0) as time,
        COALESCE(tt.alpha, 0) as alpha,
        COALESCE(tt.charlie, 0) as charlie,
        COALESCE(tt.delta, 0) as delta,
        COALESCE(tt.miss, 0) as miss,
        COALESCE(tt.no_shoot, 0) as no_shoot,
        COALESCE(st.procedurals, 0) as procedurals
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_totals st ON st.registration_id = mr.id
      LEFT JOIN target_totals tt ON tt.registration_id = mr.id
      WHERE mr.match_id = $1 AND s.tag = $2 AND mr.is_dq = FALSE
      ORDER BY division, match_points DESC
    `;
    const results = await sql.unsafe(query.replace(/\$1/g, `'${matchId}'`).replace(/\$2/g, `'${tag}'`));

    if (results.length > 0) {
      tagResults[tag] = groupAndRank(
        prepareMatchRows(results as any[], context, false),
        context.divisionApplies,
      );
    }
  }

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = prepareMatchRows(dq, context, true);

  return c.json({ ...tagResults, dq: dqRanked });
});

// Per-stage score details for a single shooter, including target-level data
resultsRoutes.get('/matches/:matchId/shooters/:registrationId/stage-summaries', async (c) => {
  const { matchId, registrationId } = c.req.param();

  const [reg] = await sql`
    SELECT mr.id, mr.division as reg_division, mr.category as reg_category, mr.power_factor as reg_power_factor,
           mr.is_dq,
           s.first_name, s.last_name, s.division as shooter_division, s.category as shooter_category, s.power_factor as shooter_power_factor
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.id = ${registrationId} AND mr.match_id = ${matchId}
  `;

  if (!reg) return c.json({ error: 'Registration not found' }, 404);

  const [match] = await sql`SELECT organization, firearm_type FROM matches WHERE id = ${matchId}`;
  const registration = {
    first_name: reg.first_name,
    last_name: reg.last_name,
    division: resolveDivisionForMatch(match ?? {}, reg.reg_division ?? reg.shooter_division) ?? '',
    division_applies: matchHasDivisions(match ?? {}),
    category: reg.reg_category || reg.shooter_category,
    power_factor: reg.reg_power_factor || reg.shooter_power_factor,
    is_dq: reg.is_dq,
  };

  const stages = await sql`SELECT * FROM stages WHERE match_id = ${matchId} ORDER BY stage_number`;

  const stageSummaries = [];

  for (const stage of stages) {
    const [score] = await sql`
      SELECT * FROM stage_scores WHERE stage_id = ${stage.id} AND registration_id = ${registrationId}
    `;

    if (!score) continue;

    const targets = await sql`
      SELECT target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data
      FROM target_scores WHERE stage_score_id = ${score.id} ORDER BY target_index
    `;

    stageSummaries.push({
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
        is_dnf: score.is_dnf,
        score_data: score.score_data || null,
        targets: targets.map((t: any) => ({
          target_index: t.target_index,
          target_type: t.target_type,
          alpha: t.alpha || 0,
          charlie: t.charlie || 0,
          delta: t.delta || 0,
          miss: t.miss || 0,
          no_shoot_hits: t.no_shoot_hits || 0,
          steel_hit: t.steel_hit,
          target_data: t.target_data || null,
        })),
      },
    });
  }

  return c.json({ registration, stages: stageSummaries });
});
