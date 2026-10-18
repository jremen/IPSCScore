import { calculateStageParams, summariseStages, type StageConfig } from '@ipscscore/core';
import { all, nowIso, one, run, transaction, uuid } from './db';
import { parseJson, toMatch, toOptionalNumber, toStage } from './mappers';
import { recalculateStage } from './scoring';

/** Matches and stages CRUD against the local SQLite database. */

export async function listMatches() {
  const rows = await all<any>(
    `SELECT m.*, (SELECT COUNT(*) FROM match_registrations mr WHERE mr.match_id = m.id) AS shooter_count
     FROM matches m
     ORDER BY m.date DESC`,
  );
  return rows.map((row) => ({
    ...toMatch(row),
    shooter_count: Number(row.shooter_count ?? 0),
  }));
}

export async function getMatch(id: string) {
  const row = await one<any>(`SELECT * FROM matches WHERE id = ?`, [id]);
  if (!row) throw new Error('Match not found');

  const stageRows = await all<any>(
    `SELECT * FROM stages WHERE match_id = ? ORDER BY stage_number`,
    [id],
  );
  const stages = stageRows.map(toStage);

  const countRow = await one<{ count: number }>(
    `SELECT COUNT(*) AS count FROM match_registrations WHERE match_id = ?`,
    [id],
  );

  return {
    ...toMatch(row),
    stages,
    shooter_count: Number(countRow?.count ?? 0),
    summary: summariseStages(stages),
  };
}

export async function getCurrentMatch() {
  const row = await one<any>(`SELECT * FROM matches WHERE is_current = 1`);
  return row ? toMatch(row) : null;
}

export async function setCurrentMatch(id: string) {
  await transaction(async () => {
    await run(`UPDATE matches SET is_current = 0 WHERE is_current = 1`);
    await run(`UPDATE matches SET is_current = 1, updated_at = ? WHERE id = ?`, [nowIso(), id]);
  });
  return { success: true };
}

export async function unsetCurrentMatch() {
  await run(`UPDATE matches SET is_current = 0 WHERE is_current = 1`);
  return { success: true };
}

export async function createMatch(data: {
  name: string;
  date: string;
  organization: string;
  firearm_type: string;
  match_level?: number | null;
}) {
  const id = uuid();
  const now = nowIso();
  await run(
    `INSERT INTO matches (id, name, date, organization, firearm_type, match_level, is_current, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, data.name, data.date, data.organization, data.firearm_type, data.match_level ?? null, now, now],
  );
  const row = await one<any>(`SELECT * FROM matches WHERE id = ?`, [id]);
  return toMatch(row!);
}

export async function updateMatch(id: string, data: Record<string, unknown>) {
  const existing = await one<any>(`SELECT * FROM matches WHERE id = ?`, [id]);
  if (!existing) throw new Error('Match not found');

  const levelProvided = Object.prototype.hasOwnProperty.call(data, 'match_level');
  const level = levelProvided ? toOptionalNumber(data.match_level) : toOptionalNumber(existing.match_level);

  await run(
    `UPDATE matches
     SET name = ?, date = ?, organization = ?, firearm_type = ?, match_level = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.name ?? existing.name,
      data.date ?? existing.date,
      data.organization ?? existing.organization,
      data.firearm_type ?? existing.firearm_type,
      level,
      nowIso(),
      id,
    ],
  );

  const row = await one<any>(`SELECT * FROM matches WHERE id = ?`, [id]);
  return toMatch(row!);
}

export async function deleteMatch(id: string) {
  // Child rows (stages, registrations, scores, targets) cascade via FK.
  await run(`DELETE FROM matches WHERE id = ?`, [id]);
  return { deleted: true };
}

export async function bulkDeleteMatches(matchIds: string[]) {
  let deleted = 0;
  const failed: Array<{ id: string; name: string; reason: string }> = [];

  for (const id of matchIds) {
    try {
      const row = await one<{ name: string }>(`SELECT name FROM matches WHERE id = ?`, [id]);
      if (!row) {
        failed.push({ id, name: id, reason: 'Match not found' });
        continue;
      }
      await run(`DELETE FROM matches WHERE id = ?`, [id]);
      deleted++;
    } catch (error) {
      failed.push({ id, name: id, reason: (error as Error).message });
    }
  }

  return { deleted, failed };
}

// ── Stages ───────────────────────────────────────────────────────────────

export async function listStages(matchId: string) {
  const rows = await all<any>(`SELECT * FROM stages WHERE match_id = ? ORDER BY stage_number`, [matchId]);
  return rows.map(toStage);
}

export async function getStage(id: string) {
  const row = await one<any>(`SELECT * FROM stages WHERE id = ?`, [id]);
  if (!row) throw new Error('Stage not found');
  return toStage(row);
}

interface StageInput {
  name: string;
  scoring_type: string;
  paper_targets?: number;
  steel_targets?: number;
  no_shoot_targets?: number;
  npm_targets?: number;
  hits_per_paper?: number;
  par_time?: number | null;
  briefing?: string | null;
  config?: StageConfig;
}

export async function createStage(matchId: string, data: StageInput) {
  const maxRow = await one<{ max_num: number }>(
    `SELECT COALESCE(MAX(stage_number), 0) AS max_num FROM stages WHERE match_id = ?`,
    [matchId],
  );
  const stageNumber = Number(maxRow?.max_num ?? 0) + 1;

  const paper = data.paper_targets ?? 0;
  const steel = data.steel_targets ?? 0;
  const noShoot = data.no_shoot_targets ?? 0;
  const npm = data.npm_targets ?? 0;
  const hitsPerPaper = data.hits_per_paper ?? 2;
  const config = data.config ?? {};

  const { min_rounds, max_points } = calculateStageParams(
    data.scoring_type, paper, steel, noShoot, npm, hitsPerPaper, config,
  );

  const id = uuid();
  const now = nowIso();

  await run(
    `INSERT INTO stages (
       id, match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
       no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points,
       par_time, briefing, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, matchId, stageNumber, data.name, data.scoring_type, paper, steel, noShoot, npm,
      hitsPerPaper, min_rounds, max_points, data.par_time ?? null,
      data.briefing ?? null, JSON.stringify(config), now, now,
    ],
  );

  return getStage(id);
}

export async function updateStage(id: string, data: Partial<StageInput>) {
  const existing = await one<any>(`SELECT * FROM stages WHERE id = ?`, [id]);
  if (!existing) throw new Error('Stage not found');

  const config: StageConfig = data.config ?? parseJson<StageConfig>(existing.config, {});
  const paper = data.paper_targets ?? existing.paper_targets;
  const steel = data.steel_targets ?? existing.steel_targets;
  const noShoot = data.no_shoot_targets ?? existing.no_shoot_targets;
  const npm = data.npm_targets ?? existing.npm_targets;
  const hitsPerPaper = data.hits_per_paper ?? existing.hits_per_paper;
  const scoringType = data.scoring_type ?? existing.scoring_type;

  const { min_rounds, max_points } = calculateStageParams(
    scoringType, paper, steel, noShoot, npm, hitsPerPaper, config,
  );

  await run(
    `UPDATE stages SET
       name = ?, scoring_type = ?, paper_targets = ?, steel_targets = ?,
       no_shoot_targets = ?, npm_targets = ?, hits_per_paper = ?,
       min_rounds = ?, max_points = ?, par_time = ?, briefing = ?, config = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.name ?? existing.name, scoringType, paper, steel, noShoot, npm, hitsPerPaper,
      min_rounds, max_points,
      data.par_time !== undefined ? data.par_time : existing.par_time,
      data.briefing !== undefined ? data.briefing : existing.briefing,
      JSON.stringify(config), nowIso(), id,
    ],
  );

  // Stage sizing changed, so every ranking on this stage must be recomputed.
  await recalculateStage(existing.match_id, id);

  return getStage(id);
}

export async function deleteStage(id: string) {
  await run(`DELETE FROM stages WHERE id = ?`, [id]);
  return { deleted: true };
}
