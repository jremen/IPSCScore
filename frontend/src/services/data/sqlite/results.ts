import { all, one } from './db';
import { parseJson } from './mappers';
import { rankHigherIsBetter, rankLowerIsBetter } from '@ipscscore/core';
import { getDivisionsForMatch, resolveDivisionForMatch } from '../../../utils/constants';
import {
  matchResultsProfile,
  matchRingValues,
  ringValuesForStage,
  scoringTypeProfile,
  stageRankingMode,
  type ResultsProfile,
  type StageRankingMode,
} from '../../../utils/resultsProfile';

/**
 * Match result computation for the local (on-device) runtime.
 *
 * The backend does this in PostgreSQL with CTEs and window functions. Here we
 * load the match into memory and compute the same figures in TypeScript, reusing
 * the rounded percentages from `@ipscore/core` so both runtimes agree exactly.
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
  config: string | null;
  stage_number: number;
  time: number | null;
  total_time: number | null;
  net_points: number;
  hit_factor: number;
  stage_percent: number;
  stage_points: number;
  max_points: number;
  procedural_count: number;
  is_dnf: number;
  score_data: string | null;
}

interface TargetTotals {
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot: number;
}

interface MatchInfo {
  organization: string;
  firearm_type: string;
}

interface StageRow {
  id: string;
  stage_number: number;
  name: string;
  scoring_type: string;
  config: string | null;
}

interface Breakdown {
  ring_counts: Record<string, number>;
  hits: number;
  misses: number;
}

interface ScoreBreakdownRow {
  registration_id: string;
  scoring_type: string;
  config: string | null;
  score_data: string | null;
}

interface TargetBreakdownRow {
  registration_id: string;
  scoring_type: string;
  config: string | null;
  target_data: string | null;
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
    `SELECT ss.id, ss.registration_id, ss.stage_id, st.scoring_type, st.config, st.stage_number,
            st.max_points,
            ss.time, ss.total_time, ss.net_points, ss.hit_factor,
            ss.stage_percent, ss.stage_points, ss.procedural_count, ss.is_dnf, ss.score_data
     FROM stage_scores ss
     JOIN stages st ON st.id = ss.stage_id
     WHERE ss.match_id = ?`,
    [matchId],
  );
}

async function loadMatchInfo(matchId: string): Promise<MatchInfo | null> {
  return one<MatchInfo>(
    `SELECT organization, firearm_type FROM matches WHERE id = ?`,
    [matchId],
  );
}

async function loadStageRows(matchId: string): Promise<StageRow[]> {
  return all<StageRow>(
    `SELECT id, stage_number, name, scoring_type, config
     FROM stages WHERE match_id = ? ORDER BY stage_number`,
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

async function loadMatchTargetRows(matchId: string): Promise<TargetBreakdownRow[]> {
  return all<TargetBreakdownRow>(
    `SELECT ss.registration_id, st.scoring_type, st.config, ts.target_data
     FROM stage_scores ss
     JOIN stages st ON st.id = ss.stage_id
     JOIN target_scores ts ON ts.stage_score_id = ss.id
     WHERE ss.match_id = ?`,
    [matchId],
  );
}

async function loadStageTargetRows(stageId: string): Promise<TargetBreakdownRow[]> {
  return all<TargetBreakdownRow>(
    `SELECT ss.registration_id, st.scoring_type, st.config, ts.target_data
     FROM stage_scores ss
     JOIN stages st ON st.id = ss.stage_id
     JOIN target_scores ts ON ts.stage_score_id = ss.id
     WHERE ss.stage_id = ?`,
    [stageId],
  );
}

function emptyBreakdown(): Breakdown {
  return { ring_counts: {}, hits: 0, misses: 0 };
}

function buildBreakdown(
  scoreRows: ScoreBreakdownRow[],
  targetRows: TargetBreakdownRow[],
): Map<string, Breakdown> {
  const breakdown = new Map<string, Breakdown>();
  const entryFor = (registrationId: string) => {
    let entry = breakdown.get(registrationId);
    if (!entry) {
      entry = emptyBreakdown();
      breakdown.set(registrationId, entry);
    }
    return entry;
  };

  for (const row of scoreRows) {
    if (scoringTypeProfile(row.scoring_type, parseJson(row.config, {})) !== 'ring') continue;
    const scoreData = parseJson<any>(row.score_data, {});
    const ringValues: unknown[] = Array.isArray(scoreData?.ring_values) ? scoreData.ring_values : [];
    const entry = entryFor(row.registration_id);
    for (const value of ringValues) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) continue;
      const key = String(numeric);
      entry.ring_counts[key] = (entry.ring_counts[key] ?? 0) + 1;
    }
  }

  for (const row of targetRows) {
    if (scoringTypeProfile(row.scoring_type, parseJson(row.config, {})) !== 'hit_count') continue;
    const targetData = parseJson<any>(row.target_data, {});
    const entry = entryFor(row.registration_id);
    if (targetData?.hit === true) entry.hits += 1;
    else entry.misses += 1;
  }

  return breakdown;
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
  achieved_points: number;
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
      totals = {
        match_points: 0,
        achieved_points: 0,
        procedurals: 0,
        total_time: 0,
        hf_net_points: 0,
        hf_time: 0,
      };
      map.set(score.registration_id, totals);
    }

    totals.match_points += score.stage_points ?? 0;
    totals.achieved_points += score.net_points ?? 0;
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

function stageValue(mode: StageRankingMode, score: ScoreRow): number {
  switch (mode) {
    case 'hit_factor':
      return Number(score.hit_factor ?? 0);
    case 'net_points':
      return Number(score.net_points ?? 0);
    case 'time':
      return Number(score.total_time ?? 0);
    default:
      return 0;
  }
}

/**
 * Combined ("all divisions") match points, mirroring the backend.
 *
 * Stored `stage_points` are division-relative: each division's stage winner
 * gets the full stage points. The combined table re-scores every stage against
 * the best value in the whole field, so shooters from different divisions are
 * comparable. Unknown scoring types fall back to the stored division points.
 */
function combinedMatchPoints(
  scores: ScoreRow[],
  registrations: RegistrationRow[],
): Map<string, number> {
  const disqualified = new Set(
    registrations.filter((reg) => reg.is_dq === 1).map((reg) => reg.id),
  );

  const scoresByStage = new Map<string, ScoreRow[]>();
  for (const score of scores) {
    const bucket = scoresByStage.get(score.stage_id);
    if (bucket) bucket.push(score);
    else scoresByStage.set(score.stage_id, [score]);
  }

  const totals = new Map<string, number>();

  for (const stageScores of scoresByStage.values()) {
    const mode = stageRankingMode(stageScores[0]?.scoring_type);
    const maxPoints = Number(stageScores[0]?.max_points ?? 0);
    const eligible = stageScores.filter(
      (score) => !disqualified.has(score.registration_id) && score.is_dnf !== 1,
    );
    const values = eligible
      .map((score) => stageValue(mode, score))
      .filter((value) => (mode === 'time' ? value > 0 : value >= 0));
    const best = values.length === 0
      ? 0
      : mode === 'time'
        ? Math.min(...values)
        : Math.max(...values);

    for (const score of eligible) {
      const value = stageValue(mode, score);
      const contribution = mode === 'none'
        ? Number(score.stage_points ?? 0)
        : mode === 'time'
          ? rankLowerIsBetter(value, best, maxPoints).stage_points
          : rankHigherIsBetter(value, best, maxPoints).stage_points;

      totals.set(score.registration_id, (totals.get(score.registration_id) ?? 0) + contribution);
    }
  }

  for (const [registrationId, total] of totals) {
    totals.set(registrationId, round(total, 2));
  }

  return totals;
}

interface ResultRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: string;
  division_applies: boolean;
  category: string;
  power_factor: string;
  tag: string | null;
  is_dq: boolean;
  dq_reason?: string | null;
  scoring_profile: ResultsProfile;
  ring_values: number[] | null;
  ring_counts: Record<string, number> | null;
  hits: number | null;
  misses: number | null;
  achieved_points: number;
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
  breakdown: Breakdown | undefined,
  profile: ResultsProfile,
  ringValues: number[],
  matchInfo: MatchInfo | null,
): ResultRow {
  const eff = effective(reg);
  const hfTime = totals?.hf_time ?? 0;
  const achievedPoints = round(totals?.achieved_points ?? 0, 2);
  const divisionApplies = getDivisionsForMatch(matchInfo).length > 0;

  return {
    registration_id: reg.id,
    first_name: reg.first_name,
    last_name: reg.last_name,
    division: resolveDivisionForMatch(matchInfo, reg.reg_division ?? reg.division) ?? '',
    division_applies: divisionApplies,
    category: eff.category,
    power_factor: eff.power_factor,
    tag: reg.tag,
    is_dq: reg.is_dq === 1,
    dq_reason: reg.dq_reason,
    scoring_profile: profile,
    ring_values: profile === 'ring' ? ringValues : null,
    ring_counts: profile === 'ring' ? (breakdown?.ring_counts ?? {}) : null,
    hits: profile === 'hit_count' ? (breakdown?.hits ?? 0) : null,
    misses: profile === 'hit_count' ? (breakdown?.misses ?? 0) : null,
    achieved_points: achievedPoints,
    match_points: profile === 'zone' ? round(totals?.match_points ?? 0, 2) : achievedPoints,
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
  profile: ResultsProfile;
  ringValues: number[];
  divisionApplies: boolean;
  matchInfo: MatchInfo | null;
  /** Combined match points per registration (zone matches with divisions). */
  combined: Map<string, number> | null;
}

async function loadContext(matchId: string): Promise<MatchContext> {
  const [registrations, scores, targetTotals, targetRows, matchInfo, stages] = await Promise.all([
    loadRegistrations(matchId),
    loadScores(matchId),
    loadTargetTotals(matchId),
    loadMatchTargetRows(matchId),
    loadMatchInfo(matchId),
    loadStageRows(matchId),
  ]);

  const stagesForProfile = stages.map((stage) => ({
    scoring_type: stage.scoring_type,
    config: parseJson(stage.config, {}),
  }));
  const profile = matchResultsProfile(stagesForProfile);
  const ringValues = matchRingValues(stagesForProfile);
  const breakdown = buildBreakdown(scores as ScoreBreakdownRow[], targetRows);
  const totalsByReg = aggregateTotals(scores);
  const active: ResultRow[] = [];
  const dq: ResultRow[] = [];

  for (const reg of registrations) {
    const row = buildRow(
      reg,
      totalsByReg.get(reg.id),
      targetTotals.get(reg.id),
      breakdown.get(reg.id),
      profile,
      ringValues,
      matchInfo,
    );
    if (row.is_dq) dq.push(row);
    else active.push(row);
  }

  active.sort((a, b) => b.match_points - a.match_points);
  dq.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));

  const divisionApplies = getDivisionsForMatch(matchInfo).length > 0;
  const combined = profile === 'zone' && divisionApplies
    ? combinedMatchPoints(scores, registrations)
    : null;

  return {
    active,
    dq,
    profile,
    ringValues,
    divisionApplies,
    matchInfo,
    combined,
  };
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

function groupByDivision(rows: ResultRow[], divisionApplies: boolean): Record<string, ResultRow[]> {
  const groups: Record<string, ResultRow[]> = {};
  for (const row of rows) {
    const key = divisionApplies ? (row.division || 'unknown') : 'all';
    (groups[key] ||= []).push(row);
  }
  return groups;
}

function groupedWithPositions(rows: ResultRow[], divisionApplies: boolean) {
  const out: Record<string, any[]> = {};
  for (const [division, group] of Object.entries(groupByDivision(rows, divisionApplies))) {
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

/** Replace division-relative points with combined points and re-rank. */
function applyCombinedPoints(rows: ResultRow[], combined: Map<string, number>): ResultRow[] {
  return rows
    .map((row) => {
      const points = combined.get(row.registration_id);
      return points == null ? row : { ...row, match_points: points };
    })
    .sort((a, b) => b.match_points - a.match_points);
}

export async function overallResults(matchId: string) {
  const { active, dq, combined } = await loadContext(matchId);
  const ranked = combined ? applyCombinedPoints(active, combined) : active;
  return { results: withPositions(ranked), dq: dqRows(dq) };
}

export async function divisionResults(matchId: string) {
  const { active, dq, divisionApplies } = await loadContext(matchId);
  return { ...groupedWithPositions(active, divisionApplies), dq: dqRows(dq) };
}

export async function categoryResults(matchId: string) {
  const { active, dq, divisionApplies } = await loadContext(matchId);
  const out: Record<string, Record<string, any[]>> = {};

  for (const category of CATEGORIES) {
    const rows = active
      .filter((row) => row.category === category)
      .sort((a, b) => (
        divisionApplies
          ? a.division.localeCompare(b.division) || b.match_points - a.match_points
          : b.match_points - a.match_points
      ));
    if (rows.length === 0) continue;
    out[category] = groupedWithPositions(rows, divisionApplies);
  }

  return { ...out, dq: dqRows(dq) };
}

export async function tagResults(matchId: string) {
  const { active, dq, divisionApplies } = await loadContext(matchId);
  const out: Record<string, Record<string, any[]>> = {};

  const tags = [...new Set(active.map((r) => r.tag).filter((t): t is string => !!t))].sort();
  for (const tag of tags) {
    const rows = active
      .filter((row) => row.tag === tag)
      .sort((a, b) => (
        divisionApplies
          ? a.division.localeCompare(b.division) || b.match_points - a.match_points
          : b.match_points - a.match_points
      ));
    out[tag] = groupedWithPositions(rows, divisionApplies);
  }

  return { ...out, dq: dqRows(dq) };
}

interface StageScoreRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  division: string;
  category?: string;
  is_dq: number;
  dq_reason?: string | null;
  hit_factor: number | null;
  net_points: number;
  stage_percent: number;
  stage_points: number;
  time: number | null;
  procedural_count: number;
  score_data: string | null;
  scoring_type: string;
  config: string | null;
  alpha?: number;
  charlie?: number;
  delta?: number;
  miss?: number;
  no_shoot?: number;
}

function decorateStageRow(
  row: StageScoreRow,
  profile: ResultsProfile,
  ringValues: number[],
  breakdown: Breakdown | undefined,
  matchInfo: MatchInfo | null,
  divisionApplies: boolean,
) {
  const netPoints = Number(row.net_points ?? 0);
  return {
    ...row,
    division: resolveDivisionForMatch(matchInfo, row.division) ?? '',
    division_applies: divisionApplies,
    scoring_profile: profile,
    ring_values: profile === 'ring' ? ringValues : null,
    ring_counts: profile === 'ring' ? (breakdown?.ring_counts ?? {}) : null,
    hits: profile === 'hit_count' ? (breakdown?.hits ?? 0) : null,
    misses: profile === 'hit_count' ? (breakdown?.misses ?? 0) : null,
    achieved_points: netPoints,
    hit_factor: row.hit_factor != null ? Number(row.hit_factor) : 0,
    net_points: netPoints,
    stage_percent: Number(row.stage_percent ?? 0),
    stage_points: profile === 'zone' ? Number(row.stage_points ?? 0) : netPoints,
    time: row.time != null ? Number(row.time) : null,
    procedural_count: Number(row.procedural_count ?? 0),
    position: 0,
    division_position: 0,
  };
}

function rankStageRows(
  rows: ReturnType<typeof decorateStageRow>[],
  profile: ResultsProfile,
  divisionApplies: boolean,
) {
  const groups: Record<string, ReturnType<typeof decorateStageRow>[]> = {};
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
        : percentAgainstBest(row.net_points, best),
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

async function loadStageBreakdown(stageId: string) {
  const [scoreRows, targetRows] = await Promise.all([
    all<ScoreBreakdownRow>(
      `SELECT ss.registration_id, st.scoring_type, st.config, ss.score_data
       FROM stage_scores ss
       JOIN stages st ON st.id = ss.stage_id
       WHERE ss.stage_id = ?`,
      [stageId],
    ),
    loadStageTargetRows(stageId),
  ]);
  return buildBreakdown(scoreRows, targetRows);
}

export async function singleStageResults(matchId: string, stageId: string) {
  const [matchInfo, stage] = await Promise.all([
    loadMatchInfo(matchId),
    one<StageRow>(
      `SELECT id, stage_number, name, scoring_type, config
       FROM stages WHERE id = ? AND match_id = ?`,
      [stageId, matchId],
    ),
  ]);
  if (!stage) return { results: [], dq: [] };

  const profile = scoringTypeProfile(stage.scoring_type, parseJson(stage.config, {}));
  const ringValues = ringValuesForStage(stage.scoring_type, parseJson(stage.config, {}));
  const divisionApplies = getDivisionsForMatch(matchInfo).length > 0;
  const breakdown = await loadStageBreakdown(stageId);

  const rows = await all<StageScoreRow>(
    `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent,
            ss.stage_points, ss.time, ss.procedural_count, ss.score_data,
            st.scoring_type, st.config,
            s.first_name, s.last_name,
            COALESCE(mr.division, s.division) AS division,
            COALESCE(mr.category, s.category) AS category,
            mr.is_dq, mr.dq_reason
     FROM stage_scores ss
     JOIN stages st ON st.id = ss.stage_id
     JOIN match_registrations mr ON mr.id = ss.registration_id
     JOIN shooters s ON s.id = mr.shooter_id
     WHERE ss.stage_id = ? AND mr.is_dq = 0`,
    [stageId],
  );

  const dqScores = await all<StageScoreRow>(
    `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent,
            ss.stage_points, ss.time, ss.procedural_count, ss.score_data,
            st.scoring_type, st.config,
            s.first_name, s.last_name,
            COALESCE(mr.division, s.division) AS division,
            COALESCE(mr.category, s.category) AS category,
            mr.is_dq, mr.dq_reason
     FROM stage_scores ss
     JOIN stages st ON st.id = ss.stage_id
     JOIN match_registrations mr ON mr.id = ss.registration_id
     JOIN shooters s ON s.id = mr.shooter_id
     WHERE ss.stage_id = ? AND mr.is_dq = 1
     ORDER BY s.last_name, s.first_name`,
    [stageId],
  );

  const decorated = rows.map((row) => decorateStageRow(
    row, profile, ringValues, breakdown.get(row.registration_id), matchInfo, divisionApplies,
  ));
  const ranked = rankStageRows(decorated, profile, divisionApplies);

  return {
    scoring_profile: profile,
    ring_values: profile === 'ring' ? ringValues : [],
    division_applies: divisionApplies,
    results: ranked.flat,
    dq: dqScores.map((row) => decorateStageRow(
      row, profile, ringValues, breakdown.get(row.registration_id), matchInfo, divisionApplies,
    )),
  };
}

export async function stageResults(matchId: string) {
  const [matchInfo, stages] = await Promise.all([
    loadMatchInfo(matchId),
    loadStageRows(matchId),
  ]);
  const divisionApplies = getDivisionsForMatch(matchInfo).length > 0;
  const output: any[] = [];

  for (const stage of stages) {
    const profile = scoringTypeProfile(stage.scoring_type, parseJson(stage.config, {}));
    const ringValues = ringValuesForStage(stage.scoring_type, parseJson(stage.config, {}));
    const breakdown = await loadStageBreakdown(stage.id);

    const scores = await all<StageScoreRow>(
      `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent,
              ss.stage_points, ss.time, ss.procedural_count, ss.score_data,
              st.scoring_type, st.config,
              s.first_name, s.last_name,
              COALESCE(mr.division, s.division) AS division,
              mr.is_dq,
              COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = 1 THEN 1 ELSE 0 END), 0) AS alpha,
              COALESCE(SUM(ts.charlie), 0) AS charlie,
              COALESCE(SUM(ts.delta), 0) AS delta,
              COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = 0 THEN 1 ELSE 0 END), 0) AS miss,
              COALESCE(SUM(ts.no_shoot_hits), 0) AS no_shoot
       FROM stage_scores ss
       JOIN stages st ON st.id = ss.stage_id
       JOIN match_registrations mr ON mr.id = ss.registration_id
       JOIN shooters s ON s.id = mr.shooter_id
       LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
       WHERE ss.stage_id = ? AND mr.is_dq = 0
       GROUP BY ss.id
       ORDER BY division, ss.stage_points DESC`,
      [stage.id],
    );

    const decorated = scores.map((row) => decorateStageRow(
      row, profile, ringValues, breakdown.get(row.registration_id), matchInfo, divisionApplies,
    ));
    const ranked = rankStageRows(decorated, profile, divisionApplies);

    const dqScores = await all<StageScoreRow>(
      `SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent,
              ss.stage_points, ss.time, ss.procedural_count, ss.score_data,
              st.scoring_type, st.config,
              s.first_name, s.last_name,
              COALESCE(mr.division, s.division) AS division,
              mr.is_dq, mr.dq_reason
       FROM stage_scores ss
       JOIN stages st ON st.id = ss.stage_id
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
      scoring_profile: profile,
      ring_values: profile === 'ring' ? ringValues : [],
      division_applies: divisionApplies,
      scores: ranked.flat,
      dq_scores: dqScores.map((row) => decorateStageRow(
        row, profile, ringValues, breakdown.get(row.registration_id), matchInfo, divisionApplies,
      )),
      divisions: ranked.grouped,
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

  const matchInfo = await loadMatchInfo(matchId);
  const registration = {
    first_name: reg.first_name,
    last_name: reg.last_name,
    division: resolveDivisionForMatch(matchInfo, reg.reg_division ?? reg.shooter_division) ?? '',
    division_applies: getDivisionsForMatch(matchInfo).length > 0,
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
