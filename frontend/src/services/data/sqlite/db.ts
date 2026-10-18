import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { DEFAULT_SETTINGS, SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema';

/**
 * Connection layer for the on-device SQLite database.
 *
 * The plugin is imported dynamically so that neither the web nor the Electron
 * bundle ever pulls in the native Capacitor code — only the Android build does.
 */

export const DB_NAME = 'ipscscore';

let connection: SQLiteDBConnection | null = null;
let opening: Promise<SQLiteDBConnection> | null = null;

/**
 * True while an explicit transaction opened by `transaction()` is in flight.
 *
 * The Capacitor SQLite plugin wraps every `run`/`execute` in its own implicit
 * transaction by default (`transaction = true`). Nesting that inside our
 * explicit `beginTransaction()` makes it try a second `BEGIN`, which the native
 * layer rejects with "Already in transaction". The helpers below therefore pass
 * `transaction = false` whenever our own transaction is open.
 */
let inTransaction = false;

/** Values SQLite accepts once booleans/undefined have been normalised. */
export type SqlValue = string | number | null;

export function normalizeValue(value: unknown): SqlValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older WebViews (Android 4.4-style randomness is not a concern here,
  // but the ids only need to be unique within one device).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

async function openConnection(): Promise<SQLiteDBConnection> {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  // Web dev/preview needs the jeep-sqlite element; native platforms do not.
  try {
    const consistency = await sqlite.checkConnectionsConsistency();
    if (consistency.result) {
      const existing = await sqlite.isConnection(DB_NAME, false);
      if (existing.result) {
        const db = await sqlite.retrieveConnection(DB_NAME, false);
        return db;
      }
    }
  } catch {
    // Non-fatal: fall through to createConnection.
  }

  const db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', SCHEMA_VERSION, false);
  await db.open();
  await applySchema(db);
  return db;
}

async function applySchema(db: SQLiteDBConnection): Promise<void> {
  await db.execute('PRAGMA foreign_keys = ON;');

  // NOTE: sqlite_master has no `value` column — only name/type/sql/… — so probe
  // for the table's name, not a value. Querying `value` throws
  // "no such column: value" on every launch, before login is even attempted.
  const { values } = await db.query(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meta'`,
  );

  if (!values || values.length === 0) {
    for (const statement of SCHEMA_STATEMENTS) {
      await db.execute(statement);
    }
    await db.run(
      `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
      ['schema_version', String(SCHEMA_VERSION)],
    );
  } else {
    await migrate(db);
  }

  for (const [key, value] of DEFAULT_SETTINGS) {
    await db.run(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]);
  }
}

/**
 * Incremental upgrades. Version 1 is the initial on-device schema, so there is
 * nothing to migrate yet; future bumps add branches here (v1 → v2 → …).
 */
async function migrate(db: SQLiteDBConnection): Promise<void> {
  const { values } = await db.query(`SELECT value FROM meta WHERE key = 'schema_version'`);
  const current = Number(values?.[0]?.value ?? 0);

  if (current >= SCHEMA_VERSION) return;

  // No migrations published yet — create any tables a newer schema added.
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execute(statement);
  }

  await db.run(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    'schema_version',
    String(SCHEMA_VERSION),
  ]);
}

/** Get (and lazily open) the singleton database connection. */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (connection) return connection;
  if (!opening) {
    opening = openConnection()
      .then((db) => {
        connection = db;
        return db;
      })
      .finally(() => {
        opening = null;
      });
  }
  return opening;
}

export async function closeDb(): Promise<void> {
  if (!connection) return;
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  await sqlite.closeConnection(DB_NAME, false);
  connection = null;
}

// ── Query helpers ────────────────────────────────────────────────────────

export async function all<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  const result = await db.query(sql, values.map(normalizeValue));
  return (result.values ?? []) as T[];
}

export async function one<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
): Promise<T | null> {
  const rows = await all<T>(sql, values);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql: string, values: unknown[] = []): Promise<number> {
  const db = await getDb();
  // Let the plugin manage its own transaction only when we are not already
  // inside one; otherwise the extra BEGIN fails with "Already in transaction".
  const result = await db.run(sql, values.map(normalizeValue), !inTransaction);
  return result.changes?.changes ?? 0;
}

// ── Transactions ─────────────────────────────────────────────────────────

/**
 * Run `fn` inside a single SQLite transaction.
 *
 * A score save touches `stage_scores`, `target_scores`, `chrono_results` and the
 * stage-wide ranking of every other shooter — it must all land or none of it.
 * Nested calls join the outer transaction rather than failing, because the
 * recalculation step legitimately wants to run inside the save.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDb();

  if (inTransaction) {
    return fn();
  }

  inTransaction = true;
  try {
    await db.beginTransaction();
  } catch (error) {
    // Don't leave the flag set if the BEGIN itself failed — otherwise every
    // later call would skip its own transaction.
    inTransaction = false;
    throw error;
  }

  try {
    const result = await fn();
    await db.commitTransaction();
    return result;
  } catch (error) {
    try {
      await db.rollbackTransaction();
    } catch {
      // Rollback failures must not mask the original error.
    }
    throw error;
  } finally {
    inTransaction = false;
  }
}

/** ISO-8601 timestamp accepted by `nowIso`-seeded columns. */
export const ISO_NOW_SQL = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
