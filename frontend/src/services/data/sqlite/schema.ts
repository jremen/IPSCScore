/**
 * SQLite schema for the standalone (Android) build.
 *
 * This mirrors the PostgreSQL migrations in `backend/src/db/migrations` with the
 * Postgres-only features translated:
 *
 *   UUID          → TEXT (generated in TypeScript via crypto.randomUUID())
 *   TIMESTAMPTZ   → TEXT (ISO-8601, UTC)
 *   DATE          → TEXT ('YYYY-MM-DD')
 *   BOOLEAN       → INTEGER (0/1)
 *   DECIMAL(n,m)  → REAL
 *   JSONB         → TEXT (JSON.stringify'd)
 *   TEXT[]        → TEXT (JSON array)
 *   CHECK (...)   → same, minus the CHECKs that only list postgres enum values
 *                   we intentionally still enforce
 *
 * Each entry is a single statement so it can be fed to the Capacitor SQLite
 * `execute()` API without relying on multi-statement splitting.
 */

export const SCHEMA_VERSION = 1;

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS meta (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,

  // ── Settings / auth ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS app_settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   )`,

  // ── Matches ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS matches (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     date TEXT NOT NULL,
     organization TEXT NOT NULL,
     firearm_type TEXT NOT NULL,
     match_level INTEGER,
     is_current INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_matches_date ON matches (date DESC)`,
  // At most one match may be current: the index only contains is_current = 1 rows.
  `CREATE UNIQUE INDEX IF NOT EXISTS matches_is_current_true ON matches (is_current) WHERE is_current = 1`,

  // ── Stages ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS stages (
     id TEXT PRIMARY KEY,
     match_id TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
     stage_number INTEGER NOT NULL,
     name TEXT NOT NULL,
     scoring_type TEXT NOT NULL,
     paper_targets INTEGER NOT NULL DEFAULT 0,
     steel_targets INTEGER NOT NULL DEFAULT 0,
     no_shoot_targets INTEGER NOT NULL DEFAULT 0,
     npm_targets INTEGER NOT NULL DEFAULT 0,
     hits_per_paper INTEGER NOT NULL DEFAULT 2,
     min_rounds INTEGER NOT NULL DEFAULT 0,
     max_points REAL NOT NULL DEFAULT 0,
     par_time REAL,
     image_path TEXT,
     briefing TEXT,
     config TEXT NOT NULL DEFAULT '{}',
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     UNIQUE (match_id, stage_number)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_stages_match ON stages (match_id)`,

  // ── Shooters ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS shooters (
     id TEXT PRIMARY KEY,
     first_name TEXT NOT NULL,
     last_name TEXT NOT NULL,
     category TEXT NOT NULL,
     tag TEXT,
     division TEXT NOT NULL,
     power_factor TEXT NOT NULL,
     region TEXT NOT NULL DEFAULT '',
     email TEXT,
     winmss_member_id INTEGER,
     deleted_at TEXT,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_shooters_name ON shooters (last_name, first_name)`,
  `CREATE INDEX IF NOT EXISTS idx_shooters_active ON shooters (last_name, first_name) WHERE deleted_at IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_shooters_winmss_member_id ON shooters (winmss_member_id) WHERE winmss_member_id IS NOT NULL`,

  // ── Registrations ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS match_registrations (
     id TEXT PRIMARY KEY,
     match_id TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
     shooter_id TEXT NOT NULL REFERENCES shooters (id) ON DELETE RESTRICT,
     squad INTEGER,
     division TEXT,
     category TEXT,
     power_factor TEXT,
     is_dq INTEGER NOT NULL DEFAULT 0,
     dq_reason TEXT,
     group_id TEXT,
     registered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     UNIQUE (match_id, shooter_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_match ON match_registrations (match_id)`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_shooter ON match_registrations (shooter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_squad ON match_registrations (match_id, squad)`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_group ON match_registrations (match_id, group_id) WHERE group_id IS NOT NULL`,

  // ── Scores ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS stage_scores (
     id TEXT PRIMARY KEY,
     match_id TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
     stage_id TEXT NOT NULL REFERENCES stages (id) ON DELETE CASCADE,
     registration_id TEXT NOT NULL REFERENCES match_registrations (id) ON DELETE CASCADE,
     time REAL,
     extra_shot_count INTEGER NOT NULL DEFAULT 0,
     extra_hit_count INTEGER NOT NULL DEFAULT 0,
     stacking_count INTEGER NOT NULL DEFAULT 0,
     overtime_shot_count INTEGER NOT NULL DEFAULT 0,
     procedural_count INTEGER NOT NULL DEFAULT 0,
     ftsa_count INTEGER NOT NULL DEFAULT 0,
     is_dnf INTEGER NOT NULL DEFAULT 0,
     raw_points REAL NOT NULL DEFAULT 0,
     penalty_points REAL NOT NULL DEFAULT 0,
     net_points REAL NOT NULL DEFAULT 0,
     hit_factor REAL NOT NULL DEFAULT 0,
     stage_percent REAL NOT NULL DEFAULT 0,
     stage_points REAL NOT NULL DEFAULT 0,
     total_time REAL,
     x_count INTEGER DEFAULT 0,
     score_data TEXT NOT NULL DEFAULT '{}',
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     UNIQUE (stage_id, registration_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_scores_stage ON stage_scores (stage_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scores_registration ON stage_scores (registration_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scores_match ON stage_scores (match_id)`,

  `CREATE TABLE IF NOT EXISTS target_scores (
     id TEXT PRIMARY KEY,
     stage_score_id TEXT NOT NULL REFERENCES stage_scores (id) ON DELETE CASCADE,
     target_index INTEGER NOT NULL,
     target_type TEXT NOT NULL,
     alpha INTEGER NOT NULL DEFAULT 0,
     charlie INTEGER NOT NULL DEFAULT 0,
     delta INTEGER NOT NULL DEFAULT 0,
     miss INTEGER NOT NULL DEFAULT 0,
     no_shoot_hits INTEGER NOT NULL DEFAULT 0,
     steel_hit INTEGER,
     target_data TEXT NOT NULL DEFAULT '{}',
     UNIQUE (stage_score_id, target_index)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_target_scores_stage_score ON target_scores (stage_score_id)`,

  `CREATE TABLE IF NOT EXISTS chrono_results (
     id TEXT PRIMARY KEY,
     stage_score_id TEXT NOT NULL REFERENCES stage_scores (id) ON DELETE CASCADE,
     bullet_weight REAL NOT NULL,
     velocity_1 REAL,
     velocity_2 REAL,
     velocity_3 REAL,
     avg_velocity REAL,
     calculated_pf REAL,
     pf_passed INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     UNIQUE (stage_score_id)
   )`,

  // ── Cups ───────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS cups (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     scoring_mode TEXT NOT NULL DEFAULT 'points',
     minimum_matches INTEGER,
     minimum_participants INTEGER,
     selected_categories TEXT,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   )`,
  `CREATE TABLE IF NOT EXISTS cup_matches (
     id TEXT PRIMARY KEY,
     cup_id TEXT NOT NULL REFERENCES cups (id) ON DELETE CASCADE,
     match_id TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     UNIQUE (cup_id, match_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_cup_matches_cup ON cup_matches (cup_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cup_matches_match ON cup_matches (match_id)`,

  // ── Audit ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_log (
     id TEXT PRIMARY KEY,
     actor_role TEXT NOT NULL,
     actor_token_id TEXT,
     action TEXT NOT NULL,
     target_table TEXT,
     target_id TEXT,
     ip TEXT,
     at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     meta TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_action_time ON audit_log (action, at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log (target_table, target_id)`,
];

/** Settings seeded on first run, mirroring the Postgres defaults. */
export const DEFAULT_SETTINGS: Array<[string, string]> = [
  ['admin_password_hash', ''],
  ['session_epoch', '0'],
];
