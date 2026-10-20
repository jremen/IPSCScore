import { all, one, run, nowIso, transaction } from './db';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from './schema';

/**
 * Match transfer and full-database backup for the standalone mobile builds.
 *
 * The match format intentionally matches `backend/src/routes/matchExport.ts`
 * one-for-one, so a `.match.json` file can move between the desktop/web app and
 * a phone in either direction. The IDs are preserved: a match imported on the
 * phone keeps the same identity it had on the desktop.
 *
 * The backup is a different thing: it captures every local table (settings,
 * matches, shooters, scores, cups) as a portable JSON document so a device can
 * be restored after a reinstall. It is not a PostgreSQL dump and must not be
 * confused with the `.sql` backup the server/Electron build produces.
 */

const FORMAT_VERSION = 1;
const BACKUP_FORMAT = 'ipscscore-mobile-backup';

/** Settings that belong to the current session and must not travel in a backup. */
const TRANSIENT_SETTINGS = new Set(['local_admin_token', 'session_epoch']);

function bool(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return (JSON.parse(String(value)) ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

// ── Match export ─────────────────────────────────────────────────────────

export async function exportMatch(matchId: string): Promise<Blob> {
  const match = await one<any>(
    `SELECT id, name, date, organization, firearm_type, match_level
     FROM matches WHERE id = ?`,
    [matchId],
  );
  if (!match) throw new Error('Match not found');

  const stages = await all<any>(
    `SELECT id, stage_number, name, scoring_type, paper_targets, steel_targets,
            no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points,
            par_time, briefing, config
     FROM stages WHERE match_id = ? ORDER BY stage_number`,
    [matchId],
  );

  const registrations = await all<any>(
    `SELECT mr.id, mr.squad, mr.division AS division_override,
            mr.category AS category_override, mr.power_factor AS power_factor_override,
            mr.is_dq, mr.dq_reason,
            s.id AS shooter_id, s.first_name, s.last_name, s.category, s.division,
            s.power_factor, s.region, s.email, s.winmss_member_id
     FROM match_registrations mr
     JOIN shooters s ON s.id = mr.shooter_id
     WHERE mr.match_id = ?`,
    [matchId],
  );

  const stageScores = await all<any>(
    `SELECT id, stage_id, registration_id, time, extra_shot_count, extra_hit_count,
            stacking_count, overtime_shot_count, procedural_count, ftsa_count,
            is_dnf, raw_points, penalty_points, net_points, hit_factor,
            stage_percent, stage_points, total_time, x_count, score_data
     FROM stage_scores WHERE match_id = ?`,
    [matchId],
  );

  const targetScores = await all<any>(
    `SELECT t.id, t.stage_score_id, t.target_index, t.target_type, t.alpha,
            t.charlie, t.delta, t.miss, t.no_shoot_hits, t.steel_hit, t.target_data
     FROM target_scores t
     JOIN stage_scores s ON s.id = t.stage_score_id
     WHERE s.match_id = ?`,
    [matchId],
  );

  const chronoResults = await all<any>(
    `SELECT c.id, c.stage_score_id, c.bullet_weight, c.velocity_1, c.velocity_2,
            c.velocity_3, c.avg_velocity, c.calculated_pf, c.pf_passed
     FROM chrono_results c
     JOIN stage_scores s ON s.id = c.stage_score_id
     WHERE s.match_id = ?`,
    [matchId],
  );

  const payload = {
    format_version: FORMAT_VERSION,
    exported_at: nowIso(),
    match: {
      id: match.id,
      name: match.name,
      date: match.date,
      organization: match.organization,
      firearm_type: match.firearm_type,
      match_level: match.match_level,
    },
    stages: stages.map((stage) => ({
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
      config: parseJson(stage.config, {}),
    })),
    registrations: registrations.map((reg) => ({
      id: reg.id,
      shooter: {
        id: reg.shooter_id,
        first_name: reg.first_name,
        last_name: reg.last_name,
        category: reg.category,
        division: reg.division,
        power_factor: reg.power_factor,
        region: reg.region,
        email: reg.email,
        winmss_member_id: reg.winmss_member_id,
      },
      squad: reg.squad,
      division_override: reg.division_override,
      category_override: reg.category_override,
      power_factor_override: reg.power_factor_override,
      is_dq: bool(reg.is_dq),
      dq_reason: reg.dq_reason,
    })),
    stage_scores: stageScores.map((score) => ({
      id: score.id,
      stage_id: score.stage_id,
      registration_id: score.registration_id,
      time: score.time,
      extra_shot_count: score.extra_shot_count,
      extra_hit_count: score.extra_hit_count,
      stacking_count: score.stacking_count,
      overtime_shot_count: score.overtime_shot_count,
      procedural_count: score.procedural_count,
      ftsa_count: score.ftsa_count,
      is_dnf: bool(score.is_dnf),
      raw_points: score.raw_points,
      penalty_points: score.penalty_points,
      net_points: score.net_points,
      hit_factor: score.hit_factor,
      stage_percent: score.stage_percent,
      stage_points: score.stage_points,
      total_time: score.total_time,
      x_count: score.x_count,
      score_data: parseJson(score.score_data, {}),
    })),
    target_scores: targetScores.map((target) => ({
      id: target.id,
      stage_score_id: target.stage_score_id,
      target_index: target.target_index,
      target_type: target.target_type,
      alpha: target.alpha,
      charlie: target.charlie,
      delta: target.delta,
      miss: target.miss,
      no_shoot_hits: target.no_shoot_hits,
      steel_hit: target.steel_hit === null ? null : bool(target.steel_hit),
      target_data: parseJson(target.target_data, {}),
    })),
    chrono_results: chronoResults.map((chrono) => ({
      id: chrono.id,
      stage_score_id: chrono.stage_score_id,
      bullet_weight: chrono.bullet_weight,
      velocity_1: chrono.velocity_1,
      velocity_2: chrono.velocity_2,
      velocity_3: chrono.velocity_3,
      avg_velocity: chrono.avg_velocity,
      calculated_pf: chrono.calculated_pf,
      pf_passed: bool(chrono.pf_passed),
    })),
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

// ── Match import ─────────────────────────────────────────────────────────

export interface MatchImportCounts {
  stages: number;
  registrations: number;
  scores: number;
  targets: number;
  chrono: number;
}

export async function importMatch(file: File): Promise<{
  success: boolean;
  match_id: string;
  counts: MatchImportCounts;
}> {
  let data: any;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (!data || typeof data !== 'object' || !data.match || !Array.isArray(data.stages) || !Array.isArray(data.registrations)) {
    throw new Error('Invalid match export file: missing required fields');
  }
  if (Number(data.format_version) !== FORMAT_VERSION) {
    throw new Error(`Unsupported match file version: ${data.format_version}`);
  }

  const matchId = String(data.match.id ?? '');
  if (!matchId) throw new Error('Invalid match export file: missing match id');

  const existing = await one<{ id: string }>(`SELECT id FROM matches WHERE id = ?`, [matchId]);
  if (existing) {
    throw new Error('A match with this ID already exists (MATCH_ID_CONFLICT)');
  }

  const stages = asArray(data.stages);
  const registrations = asArray(data.registrations);
  const stageScores = asArray(data.stage_scores);
  const targetScores = asArray(data.target_scores);
  const chronoResults = asArray(data.chrono_results);

  await transaction(async () => {
    // Shooters may already exist on this device (same person, another match).
    // Keep the local record in that case — same behaviour as the backend import.
    const seen = new Set<string>();
    for (const reg of registrations) {
      const shooter = reg?.shooter;
      if (!shooter?.id || seen.has(shooter.id)) continue;
      seen.add(shooter.id);
      await run(
        `INSERT OR IGNORE INTO shooters
           (id, first_name, last_name, category, division, power_factor, region, email, winmss_member_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shooter.id,
          shooter.first_name ?? '',
          shooter.last_name ?? '',
          shooter.category ?? '',
          shooter.division ?? '',
          shooter.power_factor ?? '',
          shooter.region ?? '',
          shooter.email ?? null,
          shooter.winmss_member_id ?? null,
        ],
      );
    }

    await run(
      `INSERT INTO matches (id, name, date, organization, firearm_type, match_level, is_current)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        matchId,
        data.match.name ?? '',
        data.match.date ?? new Date().toISOString().slice(0, 10),
        data.match.organization ?? '',
        data.match.firearm_type ?? '',
        data.match.match_level ?? null,
      ],
    );

    for (const stage of stages) {
      await run(
        `INSERT INTO stages
           (id, match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
            no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points,
            par_time, briefing, config)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stage.id,
          matchId,
          stage.stage_number,
          stage.name ?? '',
          stage.scoring_type,
          stage.paper_targets ?? 0,
          stage.steel_targets ?? 0,
          stage.no_shoot_targets ?? 0,
          stage.npm_targets ?? 0,
          stage.hits_per_paper ?? 2,
          stage.min_rounds ?? 0,
          stage.max_points ?? 0,
          stage.par_time ?? null,
          stage.briefing ?? null,
          json(stage.config),
        ],
      );
    }

    for (const reg of registrations) {
      await run(
        `INSERT INTO match_registrations
           (id, match_id, shooter_id, squad, division, category, power_factor, is_dq, dq_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reg.id,
          matchId,
          reg.shooter?.id,
          reg.squad ?? null,
          reg.division_override ?? null,
          reg.category_override ?? null,
          reg.power_factor_override ?? null,
          reg.is_dq ? 1 : 0,
          reg.dq_reason ?? null,
        ],
      );
    }

    for (const score of stageScores) {
      await run(
        `INSERT INTO stage_scores
           (id, match_id, stage_id, registration_id, time, extra_shot_count, extra_hit_count,
            stacking_count, overtime_shot_count, procedural_count, ftsa_count, is_dnf,
            raw_points, penalty_points, net_points, hit_factor, stage_percent, stage_points,
            total_time, x_count, score_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          score.id,
          matchId,
          score.stage_id,
          score.registration_id,
          score.time ?? null,
          score.extra_shot_count ?? 0,
          score.extra_hit_count ?? 0,
          score.stacking_count ?? 0,
          score.overtime_shot_count ?? 0,
          score.procedural_count ?? 0,
          score.ftsa_count ?? 0,
          score.is_dnf ? 1 : 0,
          score.raw_points ?? 0,
          score.penalty_points ?? 0,
          score.net_points ?? 0,
          score.hit_factor ?? 0,
          score.stage_percent ?? 0,
          score.stage_points ?? 0,
          score.total_time ?? null,
          score.x_count ?? 0,
          json(score.score_data),
        ],
      );
    }

    for (const target of targetScores) {
      await run(
        `INSERT INTO target_scores
           (id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss,
            no_shoot_hits, steel_hit, target_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          target.id,
          target.stage_score_id,
          target.target_index,
          target.target_type,
          target.alpha ?? 0,
          target.charlie ?? 0,
          target.delta ?? 0,
          target.miss ?? 0,
          target.no_shoot_hits ?? 0,
          target.steel_hit === null || target.steel_hit === undefined ? null : target.steel_hit ? 1 : 0,
          json(target.target_data),
        ],
      );
    }

    for (const chrono of chronoResults) {
      await run(
        `INSERT INTO chrono_results
           (id, stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3,
            avg_velocity, calculated_pf, pf_passed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chrono.id,
          chrono.stage_score_id,
          chrono.bullet_weight,
          chrono.velocity_1 ?? null,
          chrono.velocity_2 ?? null,
          chrono.velocity_3 ?? null,
          chrono.avg_velocity ?? null,
          chrono.calculated_pf ?? null,
          chrono.pf_passed ? 1 : 0,
        ],
      );
    }
  });

  return {
    success: true,
    match_id: matchId,
    counts: {
      stages: stages.length,
      registrations: registrations.length,
      scores: stageScores.length,
      targets: targetScores.length,
      chrono: chronoResults.length,
    },
  };
}

// ── Full backup / restore ────────────────────────────────────────────────

interface BackupTable {
  name: string;
  columns: string[];
}

/**
 * Insert order: parents before children. Restore deletes in reverse.
 * Columns are a whitelist — a backup file is untrusted input, so nothing from
 * the document is ever interpolated into SQL.
 */
const BACKUP_TABLES: BackupTable[] = [
  {
    name: 'shooters',
    columns: [
      'id', 'first_name', 'last_name', 'category', 'tag', 'division', 'power_factor',
      'region', 'email', 'winmss_member_id', 'deleted_at', 'created_at', 'updated_at',
    ],
  },
  {
    name: 'matches',
    columns: [
      'id', 'name', 'date', 'organization', 'firearm_type', 'match_level',
      'is_current', 'created_at', 'updated_at',
    ],
  },
  {
    name: 'stages',
    columns: [
      'id', 'match_id', 'stage_number', 'name', 'scoring_type', 'paper_targets',
      'steel_targets', 'no_shoot_targets', 'npm_targets', 'hits_per_paper',
      'min_rounds', 'max_points', 'par_time', 'image_path', 'briefing', 'config',
      'created_at', 'updated_at',
    ],
  },
  {
    name: 'match_registrations',
    columns: [
      'id', 'match_id', 'shooter_id', 'squad', 'division', 'category', 'power_factor',
      'is_dq', 'dq_reason', 'group_id', 'registered_at',
    ],
  },
  {
    name: 'stage_scores',
    columns: [
      'id', 'match_id', 'stage_id', 'registration_id', 'time', 'extra_shot_count',
      'extra_hit_count', 'stacking_count', 'overtime_shot_count', 'procedural_count',
      'ftsa_count', 'is_dnf', 'raw_points', 'penalty_points', 'net_points', 'hit_factor',
      'stage_percent', 'stage_points', 'total_time', 'x_count', 'score_data',
      'created_at', 'updated_at',
    ],
  },
  {
    name: 'target_scores',
    columns: [
      'id', 'stage_score_id', 'target_index', 'target_type', 'alpha', 'charlie',
      'delta', 'miss', 'no_shoot_hits', 'steel_hit', 'target_data',
    ],
  },
  {
    name: 'chrono_results',
    columns: [
      'id', 'stage_score_id', 'bullet_weight', 'velocity_1', 'velocity_2', 'velocity_3',
      'avg_velocity', 'calculated_pf', 'pf_passed', 'created_at', 'updated_at',
    ],
  },
  {
    name: 'cups',
    columns: [
      'id', 'name', 'scoring_mode', 'minimum_matches', 'minimum_participants',
      'selected_categories', 'created_at', 'updated_at',
    ],
  },
  {
    name: 'cup_matches',
    columns: ['id', 'cup_id', 'match_id', 'created_at'],
  },
  {
    name: 'app_settings',
    columns: ['key', 'value', 'updated_at'],
  },
  {
    name: 'audit_log',
    columns: [
      'id', 'actor_role', 'actor_token_id', 'action', 'target_table', 'target_id',
      'ip', 'at', 'meta',
    ],
  },
];

export async function exportBackup(): Promise<Blob> {
  const tables: Record<string, unknown[]> = {};

  for (const table of BACKUP_TABLES) {
    const rows = await all<Record<string, unknown>>(
      `SELECT ${table.columns.join(', ')} FROM ${table.name}`,
    );
    tables[table.name] =
      table.name === 'app_settings'
        ? rows.filter((row) => !TRANSIENT_SETTINGS.has(String(row.key)))
        : rows;
  }

  const payload = {
    format: BACKUP_FORMAT,
    format_version: FORMAT_VERSION,
    schema_version: SCHEMA_VERSION,
    exported_at: nowIso(),
    tables,
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function restoreBackup(file: File): Promise<{ success: boolean; message: string }> {
  let data: any;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (!data || data.format !== BACKUP_FORMAT || !data.tables || typeof data.tables !== 'object') {
    throw new Error('This is not an IPSCScore mobile backup file');
  }
  if (Number(data.format_version) !== FORMAT_VERSION) {
    throw new Error(`Unsupported backup version: ${data.format_version}`);
  }
  if (Number(data.schema_version) !== SCHEMA_VERSION) {
    throw new Error(
      `This backup uses database schema ${data.schema_version}, but this app uses schema ${SCHEMA_VERSION}`,
    );
  }

  for (const table of BACKUP_TABLES) {
    const rows = data.tables[table.name];
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`Invalid backup: "${table.name}" is not a list`);
    }
  }

  // A match is either current or not; two would violate the unique index.
  const currentMatches = asArray<any>(data.tables.matches).filter((row) => bool(row?.is_current));
  if (currentMatches.length > 1) {
    throw new Error('Invalid backup: more than one match is marked as current');
  }

  await transaction(async () => {
    for (const table of [...BACKUP_TABLES].reverse()) {
      await run(`DELETE FROM ${table.name}`);
    }

    for (const table of BACKUP_TABLES) {
      const rows = asArray<Record<string, unknown>>(data.tables[table.name]);
      for (const row of rows) {
        const columns = table.columns.filter((column) => row[column] !== undefined);
        if (columns.length === 0) continue;
        await run(
          `INSERT INTO ${table.name} (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((column) => row[column]),
        );
      }
    }
  });

  // Never leave the device without its required settings, even if the backup
  // predates them.
  for (const [key, value] of DEFAULT_SETTINGS) {
    await run(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]);
  }

  return { success: true, message: 'Backup restored' };
}
