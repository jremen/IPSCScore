/**
 * Offline match importers for the standalone (Capacitor) builds.
 *
 * The desktop/web app uploads WinMSS and PractiScore files to the backend,
 * which owns the parsers. A phone has no backend, so the same formats are
 * parsed in the WebView and persisted through the local SQLite layer:
 *
 *   .cab → WinMSS archive of ADO XML rowsets
 *   .psc → PractiScore ZIP of match_def.json + match_scores.json
 *
 * Both reuse `importMatchData` (the `.match.json` insert path) and then
 * recalculate stage rankings, so imported results behave exactly like locally
 * scored stages.
 */

import { one, run } from '../data/sqlite/db';
import { recalculateMatch } from '../data/sqlite/scoring';
import { importMatchData } from '../data/sqlite/transfer';
import { parsePscFile } from './practiscoreParser';
import type { ImportMatchPayload } from './types';
import { inspectWinMssCab, parseWinMssCabFile } from './winmssCabImport';

const MDB_EXTENSION = /\.(mdb|accdb)$/i;

interface ImportSummary {
  success: true;
  match_id: string;
  matches: Array<{ id: string; name: string; date: string; imported: boolean; updated?: boolean }>;
  stages: Array<{ id: string; name: string; stage_number: number }>;
  shooters: { created: number; skipped: number; errors: string[] };
  registrations: { created: number; skipped: number };
  scores: { created: number; skipped: number; errors: string[] };
  warnings: string[];
  counts: {
    stages: number;
    registrations: number;
    scores: number;
    targets: number;
    chrono: number;
  };
  synced_shooters?: boolean;
}

function assertNotDatabase(file: File): void {
  if (MDB_EXTENSION.test(file.name)) {
    throw new Error(
      'WinMSS .mdb/.accdb files can only be imported in the desktop app. In WinMSS open the match and use "Export to .cab", then import that file here.',
    );
  }
}

/**
 * Replace an earlier import of the same match instead of creating a duplicate.
 *
 * WinMSS/PractiScore files carry no stable IPSCScore match ID, so re-importing
 * the same match would otherwise leave two copies on the device. The existing
 * match keeps its ID (and any reference to it) but its stages/scores are
 * rebuilt from the file.
 */
async function replaceExistingMatch(
  payload: ImportMatchPayload,
): Promise<{ replaced: boolean; wasCurrent: boolean }> {
  const existing = await one<{ id: string; is_current: number }>(
    `SELECT id, is_current FROM matches WHERE name = ? AND date = ? LIMIT 1`,
    [payload.match.name, payload.match.date],
  );
  if (!existing) return { replaced: false, wasCurrent: false };

  await run(`DELETE FROM matches WHERE id = ?`, [existing.id]);
  payload.match.id = existing.id;
  payload.warnings.push(
    `Match "${payload.match.name}" already existed on this device; its local data was replaced by the imported file.`,
  );
  return { replaced: true, wasCurrent: existing.is_current === 1 };
}

async function persistPayload(payload: ImportMatchPayload): Promise<ImportSummary> {
  const { replaced, wasCurrent } = await replaceExistingMatch(payload);
  const imported = await importMatchData(payload);

  // Deleting the old match cleared `is_current`; keep the user's selection.
  if (wasCurrent) {
    await run(`UPDATE matches SET is_current = 1 WHERE id = ?`, [imported.match_id]);
  }

  try {
    await recalculateMatch(imported.match_id);
  } catch (err: any) {
    payload.warnings.push(`Scores were imported but stage ranking failed: ${err.message}`);
  }

  const shooterErrors = payload.warnings.filter((warning) => /missing name/i.test(warning));

  return {
    success: true,
    match_id: imported.match_id,
    matches: [{
      id: imported.match_id,
      name: payload.match.name,
      date: payload.match.date,
      imported: true,
      updated: replaced || undefined,
    }],
    stages: payload.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      stage_number: stage.stage_number,
    })),
    shooters: {
      created: imported.shooters.created,
      skipped: payload.stats?.shooters_skipped ?? shooterErrors.length,
      errors: shooterErrors,
    },
    registrations: { created: payload.registrations.length, skipped: 0 },
    scores: {
      created: payload.stage_scores.length,
      skipped: payload.stats?.score_rows_skipped ?? 0,
      errors: [],
    },
    warnings: payload.warnings,
    counts: imported.counts,
  };
}

/** Import a WinMSS `.cab` archive (or its ZIP-wrapped variant) offline. */
export async function importWinMssFile(file: File): Promise<ImportSummary> {
  assertNotDatabase(file);
  if (!/\.cab$/i.test(file.name)) {
    throw new Error('Select a WinMSS .cab file exported from WinMSS.');
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const payload = await parseWinMssCabFile(data, file.name);
  return persistPayload(payload);
}

/** Inspect a WinMSS `.cab` archive without importing it. */
export async function inspectWinMssFile(file: File) {
  assertNotDatabase(file);
  if (!/\.cab$/i.test(file.name)) {
    throw new Error('Inspection of .mdb/.accdb files requires the desktop app. Use a .cab export on mobile.');
  }
  const data = new Uint8Array(await file.arrayBuffer());
  return inspectWinMssCab(data);
}

/** Import a PractiScore `.psc` archive offline. */
export async function importPscMatchFile(file: File): Promise<ImportSummary> {
  if (!/\.psc$/i.test(file.name)) {
    throw new Error('Select a PractiScore .psc file.');
  }
  const payload = await parsePscFile(file);
  const result = await persistPayload(payload);
  return { ...result, synced_shooters: payload.warnings.some((warning) => warning.includes('created from score data only')) };
}
