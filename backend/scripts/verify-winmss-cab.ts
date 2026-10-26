/**
 * Verify the WinMSS .cab parser against the fixture in `vysledky/WinMSS.cab`.
 *
 * Run from the repository root:
 *   npx tsx backend/scripts/verify-winmss-cab.ts
 *
 * This script is intentionally dependency-free and does not touch the database.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { parseWinMssCab } from '../src/utils/winmssCabParser.js';
import { WINMSS_CATEGORY_MAP, WINMSS_DIVISION_MAP } from '../src/utils/winmssMapper.js';
import { calculateAggregatedScore } from '../src/utils/scoringCalc.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const fixture = path.join(repoRoot, 'vysledky', 'WinMSS.cab');
if (!fs.existsSync(fixture)) {
  console.log('WinMSS CAB fixture not found; skipping verification.');
  process.exit(0);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${label} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

const cab = await parseWinMssCab(fs.readFileSync(fixture));

// ── Match ──────────────────────────────────────────────────────────────
assertEqual(cab.match.name, 'Finále Prešovskej ligy 2026, 25. október 2026', 'match name');
assertEqual(cab.match.date, '2026-10-24', 'match date');
assertEqual(cab.match.level, 1, 'match level');
assertEqual(cab.match.firearmId, 1, 'match firearm id');

// ── Rowsets ────────────────────────────────────────────────────────────
assertEqual(cab.members.length, 43, 'members');
assertEqual(cab.enrollments.length, 43, 'enrollments');
assertEqual(cab.stages.length, 6, 'stages');
assertEqual(cab.scores.length, 254, 'score rows');
assertEqual(cab.scores.filter((score) => score.removed || score.flagForDelete).length, 4, 'removed scores');
assertEqual(cab.scores.filter((score) => !score.removed && !score.flagForDelete).length, 250, 'active scores');

// ── Stage mapping ──────────────────────────────────────────────────────
const stage1 = cab.stages.find((stage) => stage.stageId === 1);
assert(stage1, 'stage 1 exists');
assertEqual(stage1.paperTargets, 9, 'stage 1 paper');
assertEqual(stage1.popperTargets + stage1.plateTargets, 7, 'stage 1 steel');
assertEqual(stage1.vanishingTargets, 0, 'stage 1 vanish metadata');
assertEqual(stage1.penaltyTargets, 32, 'stage 1 raw TrgtPenlty preserved');
assertEqual(stage1.minRounds, 25, 'stage 1 min rounds');
assertEqual(stage1.maxPoints, 125, 'stage 1 max points');

// ── Division/category mapping ──────────────────────────────────────────
const divisions = new Map<string, number>();
for (const enrollment of cab.enrollments) {
  const division = enrollment.divisionId
    ? WINMSS_DIVISION_MAP[enrollment.divisionId] ?? `unknown:${enrollment.divisionId}`
    : 'unknown:none';
  divisions.set(division, (divisions.get(division) ?? 0) + 1);
}
assertEqual(divisions.get('open'), 4, 'open count');
assertEqual(divisions.get('standard'), 11, 'standard count');
assertEqual(divisions.get('production'), 5, 'production count');
assertEqual(divisions.get('production_optics'), 12, 'production optics count');
assertEqual(divisions.get('pcc_optics'), 7, 'pcc optics count');
assertEqual(divisions.get('optics'), 4, 'optics count (DivId 50)');

const categories = new Map<string, number>();
for (const enrollment of cab.enrollments) {
  const category = WINMSS_CATEGORY_MAP[enrollment.categoryId ?? 0] ?? `unknown:${enrollment.categoryId}`;
  categories.set(category, (categories.get(category) ?? 0) + 1);
}
assertEqual(categories.get('regular'), 26, 'regular count');
assertEqual(categories.get('lady'), 2, 'lady count');
assertEqual(categories.get('junior'), 2, 'junior count');
assertEqual(categories.get('senior'), 12, 'senior count');
assertEqual(categories.get('super_senior'), 1, 'super senior count');

// ── Power factor and DQ ────────────────────────────────────────────────
assertEqual(cab.enrollments.filter((enrollment) => enrollment.majorPowerFactor).length, 2, 'major PF count');
const dq = cab.enrollments.find((enrollment) => enrollment.isDisqualified);
assert(dq, 'one DQ enrollment');
assertEqual(dq.memberId, 39, 'DQ member id');
assertEqual(WINMSS_DIVISION_MAP[dq.divisionId ?? 0], 'optics', 'DQ member division');
assert(dq.disqualificationMemo.includes('Unsafe Gun Handling'), 'DQ memo preserved');

// ── Score math matches WinMSS FinalScore/HitFactor ─────────────────────
const sample = cab.scores.find((score) => score.memberId === 1 && score.stageId === 1);
assert(sample, 'sample score exists');
assertEqual(sample.alpha, 22, 'sample alpha');
assertEqual(sample.charlie, 2, 'sample charlie');
assertEqual(sample.delta, 1, 'sample delta');
assertEqual(sample.time, 23.21, 'sample time');
assertEqual(sample.finalScore, 117, 'sample WinMSS final score');

const calculated = calculateAggregatedScore({
  total_alpha: sample.alpha,
  total_charlie: sample.charlie,
  total_delta: sample.delta,
  total_miss: sample.misses,
  total_no_shoot: sample.penalties,
  total_steel: 7,
  steel_hit_count: 7,
  procedural_count: sample.proceduralErrors,
  ftsa_count: 0,
  extra_shot_count: sample.extraShots,
  extra_hit_count: 0,
  stacking_count: 0,
  overtime_shot_count: sample.overtimeShots,
  time: sample.time,
  scoring_type: 'comstock',
  power_factor: 'minor',
});
assertEqual(calculated.net_points, 117, 'calculated net points');
assert(Math.abs(calculated.hit_factor - 5.0409) < 0.0001, `calculated hit factor (${calculated.hit_factor})`);

// ── ZIP fallback ──────────────────────────────────────────────────────
const zipSourceDir = path.join(repoRoot, 'vysledky', 'winmssCab');
if (fs.existsSync(zipSourceDir)) {
  const zip = new JSZip();
  for (const name of ['THEMATCH.XML', 'MEMBER.XML', 'ENROLLED.XML', 'STAGE.XML', 'SCORE.XML']) {
    zip.file(name, fs.readFileSync(path.join(zipSourceDir, name)));
  }
  const zipped = await parseWinMssCab(await zip.generateAsync({ type: 'nodebuffer' }));
  assertEqual(zipped.match.name, cab.match.name, 'ZIP fallback match name');
  assertEqual(zipped.members.length, cab.members.length, 'ZIP fallback member count');
  assertEqual(zipped.scores.length, cab.scores.length, 'ZIP fallback score count');
}

console.log('WinMSS CAB fixture verification passed.');
console.log(`  match: ${cab.match.name} (${cab.match.date})`);
console.log(`  rows: ${cab.members.length} members, ${cab.enrollments.length} enrollments, ${cab.stages.length} stages, ${cab.scores.length} scores`);
console.log(`  divisions: ${[...divisions.entries()].map(([name, count]) => `${name}=${count}`).join(', ')}`);
console.log(`  DQ: member ${dq.memberId} (${dq.disqualificationMemo})`);
