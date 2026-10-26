/**
 * Verify the offline WinMSS `.cab` and PractiScore `.psc` importers.
 *
 * Run from the `frontend` directory:
 *   npm run verify:imports
 *
 * The script is read-only: it parses files and builds import payloads without
 * touching SQLite (the native SQLite driver is unavailable under Node).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, strToU8, zipSync } from 'fflate';
import { parseWinMssCabFile } from '../src/services/import/winmssCabImport';
import { buildPscPayload, readPscDocuments } from '../src/services/import/practiscoreParser';
import type { ImportMatchPayload } from '../src/services/import/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${label} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function assertCommonPayload(payload: ImportMatchPayload, label: string) {
  assert(payload.format_version === 1, `${label}: format version`);
  assert(payload.match.id.length > 0, `${label}: match id`);
  assert(payload.match.name.length > 0, `${label}: match name`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(payload.match.date), `${label}: ISO match date`);

  const stageIds = new Set(payload.stages.map((stage) => stage.id));
  const registrationIds = new Set(payload.registrations.map((reg) => reg.id));
  const scoreIds = new Set(payload.stage_scores.map((score) => score.id));

  assertEqual(stageIds.size, payload.stages.length, `${label}: unique stage ids`);
  assertEqual(registrationIds.size, payload.registrations.length, `${label}: unique registration ids`);
  assertEqual(scoreIds.size, payload.stage_scores.length, `${label}: unique score ids`);
  assertEqual(
    new Set(payload.registrations.map((reg) => reg.shooter.id)).size,
    payload.registrations.length,
    `${label}: one registration per shooter`,
  );

  for (const score of payload.stage_scores) {
    assert(stageIds.has(score.stage_id), `${label}: score stage reference`);
    assert(registrationIds.has(score.registration_id), `${label}: score registration reference`);
    assert(Number.isFinite(score.net_points), `${label}: numeric net points`);
    assert(score.net_points >= 0, `${label}: non-negative net points`);
  }
  for (const target of payload.target_scores) {
    assert(scoreIds.has(target.stage_score_id), `${label}: target score reference`);
  }
}

// ── Synthetic Microsoft Cabinet (MSCF) ─────────────────────────────────
function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/**
 * Build a single-folder cabinet so the MSCF reader is exercised without the
 * (untracked, real-name) WinMSS fixture. `mszip` selects MSZIP compression,
 * otherwise files are stored uncompressed.
 */
function buildCabinet(files: Array<{ name: string; data: Uint8Array }>, mszip: boolean): Uint8Array {
  const utf8 = new TextEncoder();
  const contents = concatBytes(files.map((file) => file.data));
  const payload = mszip
    ? concatBytes([new Uint8Array([0x43, 0x4b]), deflateSync(contents)])
    : contents;

  const headerSize = 36;
  const folderSize = 8;
  const fileTableStart = headerSize + folderSize + 8 + payload.length;
  const names = files.map((file) => utf8.encode(file.name));
  const fileTableSize = names.reduce((sum, name) => sum + 16 + name.length + 1, 0);

  const output = new Uint8Array(fileTableStart + fileTableSize);
  const view = new DataView(output.buffer);

  output.set(utf8.encode('MSCF'), 0);
  view.setUint32(4, 0, true);
  view.setUint32(8, output.length, true);
  view.setUint32(12, 0, true);
  view.setUint32(16, fileTableStart, true);
  view.setUint32(20, 0, true);
  view.setUint8(24, 3);
  view.setUint8(25, 1);
  view.setUint16(26, 1, true);
  view.setUint16(28, files.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);

  view.setUint32(36, headerSize + folderSize, true);
  view.setUint16(40, 1, true);
  view.setUint16(42, mszip ? 1 : 0, true);

  view.setUint32(44, 0, true);
  view.setUint16(48, payload.length, true);
  view.setUint16(50, contents.length, true);
  output.set(payload, 52);

  let offset = fileTableStart;
  let folderOffset = 0;
  files.forEach((file, index) => {
    view.setUint32(offset, file.data.length, true);
    view.setUint32(offset + 4, folderOffset, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, 0, true);
    output.set(names[index], offset + 16);
    offset += 16 + names[index].length + 1;
    folderOffset += file.data.length;
  });

  return output;
}

function rowset(rows: Array<Record<string, string>>): Uint8Array {
  const attributes = (row: Record<string, string>) =>
    Object.entries(row).map(([key, value]) => `${key}="${value}"`).join(' ');
  const xml = `<?xml version="1.0"?><xml><rs:data>${
    rows.map((row) => `<z:row ${attributes(row)}/>`).join('')
  }</rs:data></xml>`;
  return new TextEncoder().encode(xml);
}

const syntheticCabFiles = {
  'THEMATCH.XML': rowset([{
    MatchId: '1',
    MatchName: 'Synthetic CAB Match',
    MatchDt: '2026-02-01T00:00:00',
    MatchLevel: '2',
    FirearmId: '1',
  }]),
  'MEMBER.XML': rowset([{
    MemberId: '1',
    Firstname: 'Test',
    Lastname: 'Shooter',
    RegionId: 'SVK',
    Email: 'test@example.com',
    Female: 'False',
    DfltDivId: '1',
    DfltCatId: '0',
  }]),
  'ENROLLED.XML': rowset([{
    MatchId: '1',
    MemberId: '1',
    CompId: '1',
    DivId: '1',
    CatId: '0',
    SquadId: '1',
    MajorPF: 'False',
    IsDisq: 'False',
  }]),
  'STAGE.XML': rowset([{
    MatchId: '1',
    StageId: '1',
    StageName: 'Synthetic Stage',
    FirearmId: '1',
    ScoringId: '1',
    TrgtPaper: '2',
    TrgtPopper: '1',
    TrgtPlates: '0',
    TrgtVanish: '0',
    TrgtPenlty: '0',
    MinRounds: '5',
    MaxPoints: '25',
  }]),
  'SCORE.XML': rowset([{
    MatchId: '1',
    StageId: '1',
    MemberId: '1',
    ScoreA: '4',
    ScoreC: '0',
    ScoreD: '0',
    Misses: '0',
    Penalties: '0',
    ProcError: '0',
    ShootTime: '5',
    Remove: 'False',
    FlagDelete: 'False',
    IsDisq: 'False',
    FinalScore: '20',
    HitFactor: '4',
  }]),
};

for (const mszip of [false, true]) {
  const label = mszip ? 'mszip cab' : 'stored cab';
  const cabinet = buildCabinet(
    Object.entries(syntheticCabFiles).map(([name, data]) => ({ name, data })),
    mszip,
  );
  const payload = await parseWinMssCabFile(cabinet, 'synthetic.cab');
  assertCommonPayload(payload, label);

  assertEqual(payload.match.name, 'Synthetic CAB Match', `${label}: match name`);
  assertEqual(payload.match.date, '2026-02-01', `${label}: match date`);
  assertEqual(payload.match.match_level, 2, `${label}: match level`);
  assertEqual(payload.stages.length, 1, `${label}: stage count`);
  assertEqual(payload.registrations.length, 1, `${label}: registration count`);
  assertEqual(payload.registrations[0].division_override, 'open', `${label}: division`);
  assertEqual(payload.stats?.score_rows_skipped, 0, `${label}: no skipped scores`);

  assertEqual(payload.stage_scores.length, 1, `${label}: score count`);
  assertEqual(payload.stage_scores[0].raw_points, 20, `${label}: raw points`);
  assertEqual(payload.stage_scores[0].net_points, 20, `${label}: net points`);
  assertEqual(payload.stage_scores[0].hit_factor, 4, `${label}: hit factor`);
  assertEqual(payload.target_scores.length, 3, `${label}: target rows`);
  assertEqual(
    payload.target_scores.filter((target) => target.target_type === 'steel').length,
    1,
    `${label}: steel target`,
  );
}

// ── WinMSS .cab fixture ─────────────────────────────────────────────────
const cabFixture = path.join(repoRoot, 'vysledky', 'WinMSS.cab');
let cabPayload: ImportMatchPayload | null = null;

if (fs.existsSync(cabFixture)) {
  cabPayload = await parseWinMssCabFile(fs.readFileSync(cabFixture), 'WinMSS.cab');
  assertCommonPayload(cabPayload, 'cab');

  assertEqual(cabPayload.match.name, 'Finále Prešovskej ligy 2026, 25. október 2026', 'cab match name');
  assertEqual(cabPayload.match.date, '2026-10-24', 'cab match date');
  assertEqual(cabPayload.match.match_level, 1, 'cab match level');
  assertEqual(cabPayload.match.firearm_type, 'handgun', 'cab firearm type');
  assertEqual(cabPayload.stages.length, 6, 'cab stage count');
  assertEqual(cabPayload.registrations.length, 43, 'cab registration count');
  assertEqual(cabPayload.stage_scores.length, 250, 'cab active score count');
  assertEqual(cabPayload.stats?.score_rows_skipped, 4, 'cab removed score rows');
  assertEqual(
    cabPayload.stages.reduce((sum, stage) => sum + stage.max_points, 0),
    635,
    'cab total stage points',
  );

  const divisions = countBy(cabPayload.registrations, (reg) => reg.division_override ?? 'none');
  assertEqual(divisions.get('open'), 4, 'cab open');
  assertEqual(divisions.get('standard'), 11, 'cab standard');
  assertEqual(divisions.get('production'), 5, 'cab production');
  assertEqual(divisions.get('production_optics'), 12, 'cab production optics');
  assertEqual(divisions.get('pcc_optics'), 7, 'cab pcc optics');
  assertEqual(divisions.get('optics'), 4, 'cab optics');

  const categories = countBy(cabPayload.registrations, (reg) => reg.category_override ?? 'none');
  assertEqual(categories.get('regular'), 26, 'cab regular');
  assertEqual(categories.get('lady'), 2, 'cab lady');
  assertEqual(categories.get('junior'), 2, 'cab junior');
  assertEqual(categories.get('senior'), 12, 'cab senior');
  assertEqual(categories.get('super_senior'), 1, 'cab super senior');

  const dq = cabPayload.registrations.find((reg) => reg.is_dq);
  assert(dq, 'cab DQ registration');
  assertEqual(dq.shooter.winmss_member_id, 39, 'cab DQ member id');
  assertEqual(dq.division_override, 'optics', 'cab DQ division');
  assert(dq.dq_reason?.includes('Unsafe Gun Handling'), 'cab DQ reason');

  assertEqual(
    cabPayload.registrations.filter((reg) => reg.power_factor_override === 'major').length,
    2,
    'cab major power factor',
  );
  assert(
    cabPayload.registrations.every((reg) => typeof reg.shooter.winmss_member_id === 'number'),
    'cab shooters keep their WinMSS member id',
  );

  const stage1Scores = cabPayload.stage_scores.filter(
    (score) => score.stage_id === cabPayload!.stages[0].id,
  );
  assert(stage1Scores.length > 0, 'cab stage 1 has scores');
  const stage1Targets = cabPayload.target_scores.filter(
    (target) => target.stage_score_id === stage1Scores[0].id,
  );
  assert(stage1Targets.some((target) => target.target_type === 'paper'), 'cab paper targets');
  assert(stage1Targets.some((target) => target.target_type === 'steel'), 'cab steel targets');

  // ZIP-wrapped WinMSS exports are accepted too.
  const zipSourceDir = path.join(repoRoot, 'vysledky', 'winmssCab');
  if (fs.existsSync(zipSourceDir)) {
    const files: Record<string, Uint8Array> = {};
    for (const name of ['THEMATCH.XML', 'MEMBER.XML', 'ENROLLED.XML', 'STAGE.XML', 'SCORE.XML']) {
      files[name] = new Uint8Array(fs.readFileSync(path.join(zipSourceDir, name)));
    }
    const zipped = await parseWinMssCabFile(zipSync(files), 'WinMSS.cab');
    assertEqual(zipped.match.name, cabPayload.match.name, 'zip fallback match name');
    assertEqual(zipped.registrations.length, cabPayload.registrations.length, 'zip fallback registrations');
    assertEqual(zipped.stage_scores.length, cabPayload.stage_scores.length, 'zip fallback scores');
  }
} else {
  console.log('WinMSS CAB fixture not found; skipping .cab verification.');
}

// ── PractiScore .psc (synthetic) ────────────────────────────────────────
const packedTs = (alpha: number, charlie: number, delta: number, miss: number, ns: number): number =>
  (alpha & 0xf)
  | ((charlie & 0xf) << 8)
  | ((delta & 0xf) << 12)
  | ((ns & 0xf) << 16)
  | ((miss & 0xf) << 20);

const matchDef = {
  match_name: 'PSC Offline Test',
  match_date: '2026-01-17',
  match_type: 'ipsc',
  match_subtype: 'ipsc',
  match_stages: [
    {
      stage_number: 1,
      stage_name: 'Stage One',
      stage_targets: [{ target_number: 1 }, { target_number: 2 }],
      stage_poppers: 1,
      stage_plates: 0,
      stage_noshoots: 1,
      stage_minrounds: 5,
      stage_maxpoints: 25,
      stage_scoring: 'Comstock',
    },
  ],
  match_shooters: [
    {
      sh_uuid: 'shooter-1',
      sh_fn: 'Ján',
      sh_ln: 'Testovací',
      sh_dvp: 'Production Optics',
      sh_pf: 'Minor',
      sh_ctg: 'Senior',
      sh_region: 'SVK',
      sh_sq: 3,
    },
  ],
};

const matchScores = {
  match_scores: [
    {
      stage_number: 1,
      stage_stagescores: [
        {
          shtr: 'shooter-1',
          rawpts: 22,
          poph: 1,
          popm: 0,
          proc: 0,
          str: [4.5],
          ts: [packedTs(2, 0, 0, 0, 0), packedTs(1, 1, 0, 0, 0)],
        },
      ],
    },
  ],
};

const pscZip = zipSync({
  'match_def.json': strToU8(JSON.stringify(matchDef)),
  'match_scores.json': strToU8(JSON.stringify(matchScores)),
});

const documents = readPscDocuments(pscZip);
const pscPayload = buildPscPayload(documents.matchDef, documents.matchScores);
assertCommonPayload(pscPayload, 'psc');

assertEqual(pscPayload.match.name, 'PSC Offline Test', 'psc match name');
assertEqual(pscPayload.match.date, '2026-01-17', 'psc match date');
assertEqual(pscPayload.match.organization, 'IPSC', 'psc organization');
assertEqual(pscPayload.match.firearm_type, 'handgun', 'psc firearm type');
assertEqual(pscPayload.stages.length, 1, 'psc stage count');
assertEqual(pscPayload.stages[0].max_points, 25, 'psc max points');
assertEqual(pscPayload.registrations.length, 1, 'psc registration count');
assertEqual(pscPayload.registrations[0].squad, 3, 'psc squad');
assertEqual(pscPayload.registrations[0].division_override, 'production_optics', 'psc division');
assertEqual(pscPayload.registrations[0].category_override, 'senior', 'psc category');
assertEqual(pscPayload.registrations[0].power_factor_override, 'minor', 'psc power factor');

assertEqual(pscPayload.stage_scores.length, 1, 'psc score count');
const pscScore = pscPayload.stage_scores[0];
// 3 A + 1 C on paper, plus one steel hit (steel counts as an A in the aggregate).
assertEqual(pscScore.raw_points, 23, 'psc raw points');
assertEqual(pscScore.penalty_points, 0, 'psc penalty points');
assertEqual(pscScore.net_points, 23, 'psc net points');
assertEqual(pscScore.hit_factor, Math.round((23 / 4.5) * 10000) / 10000, 'psc hit factor');
assertEqual(pscScore.time, 4.5, 'psc time');
assertEqual(pscScore.total_time, 4.5, 'psc total time');

assertEqual(pscPayload.target_scores.length, 3, 'psc target rows');
assertEqual(
  pscPayload.target_scores.filter((target) => target.target_type === 'paper').length,
  2,
  'psc paper targets',
);
const steel = pscPayload.target_scores.find((target) => target.target_type === 'steel');
assert(steel?.steel_hit === true, 'psc steel hit');

// A .psc without a shooter list still imports the people found in the scores.
const withoutShooters = buildPscPayload({ ...matchDef, match_shooters: [] }, matchScores);
assertEqual(withoutShooters.registrations.length, 1, 'psc synced shooter registration');
assertEqual(withoutShooters.registrations[0].shooter.first_name, 'PSC-shooter-', 'psc synced shooter name');
assert(
  withoutShooters.warnings.some((warning) => warning.includes('created from score data only')),
  'psc synced shooter warning',
);

// ── Round-trip through the ZIP reader ──────────────────────────────────
const reRead = readPscDocuments(new Uint8Array(pscZip));
assertEqual(reRead.matchDef.match_name, matchDef.match_name, 'psc JSON survives the archive round-trip');
assertEqual(reRead.matchScores.match_scores.length, 1, 'psc score document survives the archive round-trip');

console.log('Offline import verification passed.');
if (cabPayload) {
  console.log(`  cab: ${cabPayload.match.name} (${cabPayload.match.date})`);
  console.log(
    `       ${cabPayload.stages.length} stages, ${cabPayload.registrations.length} shooters, ${cabPayload.stage_scores.length} scores, ${cabPayload.target_scores.length} targets`,
  );
}
console.log(
  `  psc: ${pscPayload.match.name} (${pscPayload.match.date}) — ${pscPayload.stage_scores.length} score, ${pscPayload.target_scores.length} targets`,
);
