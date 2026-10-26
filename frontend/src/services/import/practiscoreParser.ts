/**
 * PractiScore `.psc` parser for the browser/WebView runtime.
 *
 * A `.psc` file is a ZIP archive with `match_def.json` (match, stages,
 * shooters) and `match_scores.json` (per-stage hit data). Mirrors
 * `backend/src/utils/pscMapper.ts` so a match imported on a phone matches what
 * the desktop/web build produces from the same file.
 *
 * Hit data comes in two shapes:
 *   - `ts[]`       packed per-paper-target zone counts (preferred)
 *   - `rawpts`     aggregate points only; zones are then estimated
 */

import { unzipSync } from 'fflate';
import { calculateAggregatedScore } from '@ipscscore/core';
import { newId } from './id';
import type {
  ImportMatchPayload,
  ImportedRegistration,
  ImportedShooter,
  ImportedStage,
  ImportedStageScore,
  ImportedTargetScore,
} from './types';

const PSC_MATCH_TYPE_MAP: Record<string, string> = {
  uspsa_p: 'handgun',
  ipsc: 'handgun',
  '3gnpro': 'multi_gun',
  idpa: 'handgun',
  gadpa: 'handgun',
  precisionrifle: 'long_range',
  proam: 'handgun',
  sc: 'action_steel',
  timeplus: 'handgun',
  timeplus_c: 'handgun',
  timeplus_p: 'handgun',
};

const PSC_DIVISION_MAP: Record<string, string> = {
  Open: 'open',
  Production: 'production',
  'Production Optics': 'production_optics',
  Standard: 'standard',
  Classic: 'classic',
  Revolver: 'revolver',
  PCC: 'pcc_optics',
  'PCC Optics': 'pcc_optics',
  'PCC Iron': 'pcc_iron',
  Limited: 'standard',
  'Limited 10': 'standard',
  L10: 'standard',
  'Single Stack': 'classic',
};

export class PscParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PscParseError';
  }
}

function safeNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickFirst(source: any, ...keys: string[]): any {
  for (const key of keys) {
    if (source != null && source[key] !== undefined) return source[key];
  }
  return undefined;
}

function asText(value: unknown, fallback = ''): string {
  return value === undefined || value === null ? fallback : String(value);
}

function parsePscScoringMethod(raw: string): ImportedStage['scoring_type'] {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('virginia')) return 'virginia';
  if (lower.includes('fixed')) return 'fixed_time';
  if (lower.includes('chrono')) return 'chrono';
  return 'comstock';
}

function parsePscDivision(raw: string): string {
  if (!raw) return 'open';
  const trimmed = raw.trim();
  return PSC_DIVISION_MAP[trimmed] || trimmed.toLowerCase();
}

function parsePscPowerFactor(raw: string): 'major' | 'minor' {
  return (raw || '').toLowerCase().includes('major') ? 'major' : 'minor';
}

function parsePscCategory(raw: unknown): string {
  const value = asText(raw).trim().toLowerCase().replace(/\s+/g, '_');
  return value || 'regular';
}

function mapPscMatchType(matchType: string): string {
  return PSC_MATCH_TYPE_MAP[matchType] || 'handgun';
}

function mapPscOrganization(subtype: string): string {
  return (subtype || '').toLowerCase() === 'uspsa' ? 'USPSA' : 'IPSC';
}

interface DecodedTsHits {
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
}

/** PractiScore packs per-paper-target zone counts into one 32-bit integer. */
export function decodePscTsValue(value: number): DecodedTsHits {
  const raw = Math.max(0, Math.floor(Number(value) || 0));
  return {
    alpha: (raw >>> 0) & 0xf,
    charlie: (raw >>> 8) & 0xf,
    delta: (raw >>> 12) & 0xf,
    no_shoot_hits: (raw >>> 16) & 0xf,
    miss: (raw >>> 20) & 0xf,
  };
}

function buildStageSkeleton(rawStages: any[], warnings: string[]): {
  stages: ImportedStage[];
  byNumber: Map<number, ImportedStage>;
} {
  const stages: ImportedStage[] = [];

  rawStages.forEach((raw, index) => {
    if (raw?.stage_deleted === true) {
      const number = pickFirst(raw, 'stage_number', 'stageNumber') || index + 1;
      const name = pickFirst(raw, 'stage_name', 'stageName', 'name') || 'unnamed';
      warnings.push(`Stage #${number} (${name}) is marked deleted — skipping`);
      return;
    }

    const rawTargets = raw.stage_targets;
    let paperTargets = 0;
    if (Array.isArray(rawTargets)) {
      paperTargets = rawTargets.filter((target: any) => target?.target_deleted !== true).length;
    } else if (rawTargets != null) {
      paperTargets = safeNum(rawTargets);
    }

    const poppers = safeNum(pickFirst(raw, 'stage_poppers', 'poppers'));
    const plates = safeNum(pickFirst(raw, 'stage_plates', 'plates'));
    const steelTargets = poppers + plates;
    const noShootTargets = safeNum(
      pickFirst(raw, 'stage_noshoots', 'stage_no_shoot_targets', 'noShootTargets', 'no_shoots'),
    );
    const hitsPerPaper = 2;
    const minRounds = safeNum(
      pickFirst(raw, 'stage_minrounds', 'stage_min_rounds', 'minRounds', 'min_rounds'),
    ) || (paperTargets * hitsPerPaper + steelTargets);
    const maxPoints = safeNum(
      pickFirst(raw, 'stage_maxpoints', 'stage_max_points', 'maxPoints', 'max_points'),
    ) || (paperTargets * 10 + steelTargets * 5);
    const scoringRaw = pickFirst(raw, 'stage_scoring', 'stage_scoring_method', 'scoring', 'scoringMethod') || '';

    const stageNumber = safeNum(pickFirst(raw, 'stage_number', 'stageNumber')) || index + 1;
    stages.push({
      id: newId(),
      stage_number: stageNumber,
      name: asText(pickFirst(raw, 'stage_name', 'stageName', 'name'), `Stage ${stageNumber}`),
      scoring_type: parsePscScoringMethod(asText(scoringRaw)),
      paper_targets: paperTargets,
      steel_targets: steelTargets,
      no_shoot_targets: noShootTargets,
      npm_targets: 0,
      hits_per_paper: hitsPerPaper,
      min_rounds: minRounds,
      max_points: maxPoints,
      par_time: null,
      briefing: null,
      config: {
        source: 'practiscore_psc',
        psc: {
          stage_uuid: pickFirst(raw, 'stage_uuid', 'stageUuid') || null,
          poppers,
          plates,
        },
      },
    });
  });

  const byNumber = new Map<number, ImportedStage>();
  for (const stage of stages) byNumber.set(stage.stage_number, stage);
  return { stages, byNumber };
}

interface ShooterBuild {
  shooter: ImportedShooter;
  registration: ImportedRegistration;
}

function buildShooter(raw: any, index: number, warnings: string[]): ShooterBuild | null {
  const firstName = asText(pickFirst(raw, 'sh_fn', 'sh_first_name', 'firstName', 'first_name', 'fn'));
  const lastName = asText(pickFirst(raw, 'sh_ln', 'sh_last_name', 'lastName', 'last_name', 'ln'));
  if (!firstName && !lastName) {
    warnings.push(`Shooter entry at index ${index} has empty name — skipping`);
    return null;
  }

  const division = parsePscDivision(asText(pickFirst(raw, 'sh_dvp', 'division', 'div')));
  const powerFactor = parsePscPowerFactor(
    asText(pickFirst(raw, 'sh_pf', 'powerFactor', 'power_factor', 'pf')),
  );
  const category = parsePscCategory(pickFirst(raw, 'sh_ctg', 'category', 'sh_category', 'ctg'));
  const squad = safeNum(pickFirst(raw, 'sh_sq', 'squad', 'sh_squad'));

  const shooter: ImportedShooter = {
    id: asText(pickFirst(raw, 'sh_uuid', 'sh_id', 'uuid', 'id')) || newId(),
    first_name: firstName || 'Unknown',
    last_name: lastName || `Shooter ${index + 1}`,
    category,
    division,
    power_factor: powerFactor,
    region: asText(pickFirst(raw, 'sh_region', 'region', 'country')),
    email: asText(pickFirst(raw, 'sh_email', 'email')) || null,
  };

  return {
    shooter,
    registration: {
      id: newId(),
      squad: squad > 0 ? squad : null,
      division_override: division,
      category_override: category,
      power_factor_override: powerFactor,
      is_dq: false,
      dq_reason: null,
      shooter,
    },
  };
}

interface ScoreBuildContext {
  stage: ImportedStage;
  stageNumber: number;
  registration: ImportedRegistration;
  warnings: string[];
  scoreId: string;
  targets: ImportedTargetScore[];
}

function estimateTargets(
  ctx: ScoreBuildContext,
  rawPoints: number,
  poppersHit: number,
  poppersMiss: number,
): void {
  const { stage, scoreId, targets } = ctx;
  const paperSlots = stage.paper_targets * stage.hits_per_paper;
  const paperPoints = Math.max(0, rawPoints - poppersHit * 5);

  if (paperSlots > 0 && stage.paper_targets > 0) {
    const hitsPerTarget = Math.floor(paperSlots / stage.paper_targets);
    const extra = paperSlots % stage.paper_targets;
    for (let i = 0; i < stage.paper_targets; i++) {
      targets.push({
        id: newId(),
        stage_score_id: scoreId,
        target_index: i + 1,
        target_type: 'paper',
        alpha: Math.min(hitsPerTarget + (i < extra ? 1 : 0), 5),
        charlie: 0,
        delta: 0,
        miss: 0,
        no_shoot_hits: 0,
        steel_hit: null,
      });
    }
    // The estimate only approximates the zone split; keep the reported points
    // authoritative by noting the difference once per stage/shooter.
    const estimatedPoints = targets
      .filter((target) => target.target_type === 'paper')
      .reduce((sum, target) => sum + target.alpha * 5, 0);
    if (Math.abs(estimatedPoints - paperPoints) > 5) {
      ctx.warnings.push(
        `Stage #${ctx.stageNumber}, shooter ${ctx.registration.shooter.id.slice(0, 8)}: paper points estimated from zone counts (${estimatedPoints} vs reported ${paperPoints})`,
      );
    }
  }

  for (let i = 0; i < stage.steel_targets; i++) {
    const hit = i < poppersHit;
    targets.push({
      id: newId(),
      stage_score_id: scoreId,
      target_index: stage.paper_targets + i + 1,
      target_type: 'steel',
      alpha: 0,
      charlie: 0,
      delta: 0,
      miss: !hit && i < poppersHit + poppersMiss ? 1 : 0,
      no_shoot_hits: 0,
      steel_hit: hit,
    });
  }
}

function buildScoreStage(
  rawStage: any,
  stagesByNumber: Map<number, ImportedStage>,
  stagesById: Map<string, ImportedStage>,
  registrations: Map<string, ImportedRegistration>,
  warnings: string[],
): { scores: ImportedStageScore[]; targets: ImportedTargetScore[] } {
  const scores: ImportedStageScore[] = [];
  const targets: ImportedTargetScore[] = [];

  const stageNumber = safeNum(pickFirst(rawStage, 'stage_number', 'stageNumber'));
  const stageUuid = asText(pickFirst(rawStage, 'stage_uuid', 'stageUuid'));
  const stage = stagesByNumber.get(stageNumber) || stagesById.get(stageUuid);
  if (!stage) {
    warnings.push(`Score for stage #${stageNumber} (${stageUuid}) — stage not found in match_def, skipping`);
    return { scores, targets };
  }

  const memberScores: any[] = rawStage.stage_stagescores || rawStage.stageScores || [];

  for (const memberScore of memberScores) {
    const shooterUuid = asText(
      pickFirst(memberScore, 'shtr', 'shooterId', 'shooter_uuid', 'sh_uuid'),
    );
    if (!shooterUuid) {
      warnings.push('Score entry missing shooter reference (shtr) — skipping');
      continue;
    }

    let registration = registrations.get(shooterUuid);
    if (!registration) {
      // Score rows for a shooter who is not in match_def: create a placeholder
      // so the stage result is not silently dropped.
      const shooter: ImportedShooter = {
        id: shooterUuid,
        first_name: `PSC-${shooterUuid.slice(0, 8)}`,
        last_name: '(synced)',
        category: 'regular',
        division: 'open',
        power_factor: 'minor',
        region: '',
        email: null,
      };
      registration = {
        id: newId(),
        squad: null,
        division_override: 'open',
        category_override: 'regular',
        power_factor_override: 'minor',
        is_dq: false,
        dq_reason: null,
        shooter,
      };
      registrations.set(shooterUuid, registration);
    }

    const rawPoints = safeNum(pickFirst(memberScore, 'rawpts', 'rawPoints', 'raw_points'));
    const poppersHit = safeNum(
      pickFirst(memberScore, 'poph', 'poppersHit', 'poppers_hit', 'steel_hit'),
    );
    const poppersMiss = safeNum(
      pickFirst(memberScore, 'popm', 'poppersMiss', 'poppers_miss', 'steel_miss'),
    );

    const procCounts: any[] = memberScore.proc_cnts || memberScore.proc_counts
      || memberScore.proceduralCounts || [];
    let proceduralCount = safeNum(
      pickFirst(memberScore, 'proc', 'procedurals', 'procedural', 'procedural_count'),
    );
    if (proceduralCount === 0 && procCounts.length > 0) {
      proceduralCount = procCounts.reduce((sum: number, count: any) => {
        const value = typeof count === 'object' ? Object.values(count)[0] : count;
        return sum + safeNum(value);
      }, 0);
    }

    const timeArray: number[] = Array.isArray(memberScore.str)
      ? memberScore.str.map(safeNum)
      : (memberScore.time ? [safeNum(memberScore.time)] : []);
    const time = timeArray.length > 0 ? timeArray[0] : 0;
    const totalTime = timeArray.reduce((sum: number, value: number) => sum + value, 0);
    const isDnf = pickFirst(memberScore, 'aprv', 'approved', 'isApproved') === false
      || pickFirst(memberScore, 'dnf', 'is_dnf') === true;

    const scoreId = newId();
    const tsArray: number[] = Array.isArray(memberScore.ts) ? memberScore.ts : [];
    const hasValidTs = tsArray.length > 0;

    let computedRaw = rawPoints;
    let penaltyPoints = 0;
    let netPoints = 0;
    let hitFactor = 0;
    const scoreTargets: ImportedTargetScore[] = [];

    if (hasValidTs) {
      let totalAlpha = 0;
      let totalCharlie = 0;
      let totalDelta = 0;
      let totalPaperMiss = 0;
      let totalPaperNoShoot = 0;
      const decodedTs: DecodedTsHits[] = [];

      for (let index = 0; index < tsArray.length; index++) {
        const decoded = decodePscTsValue(tsArray[index]);
        decodedTs.push(decoded);
        totalAlpha += decoded.alpha;
        totalCharlie += decoded.charlie;
        totalDelta += decoded.delta;
        totalPaperMiss += decoded.miss;
        totalPaperNoShoot += decoded.no_shoot_hits;

        scoreTargets.push({
          id: newId(),
          stage_score_id: scoreId,
          target_index: index + 1,
          target_type: 'paper',
          alpha: decoded.alpha,
          charlie: decoded.charlie,
          delta: decoded.delta,
          miss: decoded.miss,
          no_shoot_hits: decoded.no_shoot_hits,
          steel_hit: null,
        });
      }

      let steelIndex = tsArray.length + 1;
      for (let i = 0; i < poppersHit; i++) {
        scoreTargets.push({
          id: newId(),
          stage_score_id: scoreId,
          target_index: steelIndex++,
          target_type: 'steel',
          alpha: 0,
          charlie: 0,
          delta: 0,
          miss: 0,
          no_shoot_hits: 0,
          steel_hit: true,
        });
      }
      for (let i = 0; i < poppersMiss; i++) {
        scoreTargets.push({
          id: newId(),
          stage_score_id: scoreId,
          target_index: steelIndex++,
          target_type: 'steel',
          alpha: 0,
          charlie: 0,
          delta: 0,
          miss: 0,
          no_shoot_hits: 0,
          steel_hit: false,
        });
      }

      const calc = calculateAggregatedScore({
        total_alpha: totalAlpha + poppersHit,
        total_charlie: totalCharlie,
        total_delta: totalDelta,
        total_miss: totalPaperMiss + poppersMiss,
        total_no_shoot: totalPaperNoShoot,
        total_steel: poppersHit + poppersMiss,
        steel_hit_count: poppersHit,
        procedural_count: proceduralCount,
        ftsa_count: 0,
        extra_shot_count: 0,
        extra_hit_count: 0,
        stacking_count: 0,
        overtime_shot_count: 0,
        time,
        scoring_type: stage.scoring_type,
        power_factor: registration.power_factor_override ?? registration.shooter.power_factor,
      });

      computedRaw = calc.raw_points;
      penaltyPoints = calc.penalty_points;
      netPoints = Math.max(0, calc.net_points);
      hitFactor = calc.hit_factor;

      if (Math.abs(calc.raw_points - rawPoints) > 1) {
        warnings.push(
          `Stage #${stageNumber}, shooter ${shooterUuid.slice(0, 8)}: computed rawpts ${calc.raw_points} ≠ reported ${rawPoints}`,
        );
      }
    } else {
      warnings.push(
        `Stage #${stageNumber}, shooter ${shooterUuid.slice(0, 8)}: no ts data, hit distribution estimated`,
      );
      estimateTargets(
        {
          stage,
          stageNumber,
          registration,
          warnings,
          scoreId,
          targets: scoreTargets,
        },
        rawPoints,
        poppersHit,
        poppersMiss,
      );

      penaltyPoints = proceduralCount * 10 + poppersMiss * 10;
      netPoints = Math.max(0, rawPoints - penaltyPoints);
      hitFactor = totalTime > 0 ? Math.round((netPoints / totalTime) * 10000) / 10000 : 0;
    }

    const scoreData: Record<string, unknown> = {
      source: 'practiscore_v2',
      raw: memberScore,
      aggregated: {
        rawpts: rawPoints,
        poph: poppersHit,
        popm: poppersMiss,
        procedural_count: proceduralCount,
        proc_cnts: procCounts,
        time,
        total_time: totalTime,
        str: timeArray,
        ts: tsArray,
      },
    };
    if (hasValidTs) {
      scoreData.decoded = { ts: tsArray.map(decodePscTsValue) };
    }

    scores.push({
      id: scoreId,
      stage_id: stage.id,
      registration_id: registration.id,
      time,
      extra_shot_count: 0,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: 0,
      procedural_count: proceduralCount,
      ftsa_count: 0,
      is_dnf: isDnf,
      raw_points: computedRaw,
      penalty_points: penaltyPoints,
      net_points: netPoints,
      hit_factor: hitFactor,
      total_time: totalTime || time,
      x_count: 0,
      score_data: scoreData,
    });
    targets.push(...scoreTargets);
  }

  return { scores, targets };
}

/** Convert parsed PractiScore documents into a local import payload. */
export function buildPscPayload(matchDef: any, matchScores: any): ImportMatchPayload {
  const warnings: string[] = [];

  const matchName = asText(
    matchDef.match_name || matchDef.matchName || matchDef.name,
    'Imported Match',
  );
  const rawDate = asText(matchDef.match_date || matchDef.matchDate || matchDef.date);
  const matchDate = rawDate.slice(0, 10) || new Date().toISOString().slice(0, 10);

  const rawStages: any[] = matchDef.match_stages || matchDef.stages || matchDef.match_stage || [];
  const { stages, byNumber } = buildStageSkeleton(rawStages, warnings);
  if (stages.length === 0) warnings.push('No stages found in PSC match file');

  const stagesById = new Map<string, ImportedStage>();
  for (const stage of stages) {
    const uuid = (stage.config as any)?.psc?.stage_uuid;
    if (uuid) stagesById.set(String(uuid), stage);
  }

  const registrations = new Map<string, ImportedRegistration>();
  const rawShooters: any[] = matchDef.match_shooters || matchDef.shooters
    || matchDef.match_shtrs || matchDef.shtrs || [];
  rawShooters.forEach((raw, index) => {
    const built = buildShooter(raw, index, warnings);
    if (!built) return;
    registrations.set(built.shooter.id, built.registration);
  });
  const shootersSkipped = rawShooters.length - registrations.size;

  const scoreStages: any[] = matchScores.match_scores || matchScores.scores || [];
  const stageScores: ImportedStageScore[] = [];
  const targetScores: ImportedTargetScore[] = [];
  let syncedShooters = false;

  for (const rawStage of scoreStages) {
    const before = registrations.size;
    const built = buildScoreStage(rawStage, byNumber, stagesById, registrations, warnings);
    if (registrations.size > before) syncedShooters = true;
    stageScores.push(...built.scores);
    targetScores.push(...built.targets);
  }

  if (syncedShooters) {
    const synced = new Set(stageScores.map((score) => score.registration_id)).size
      - rawShooters.length;
    warnings.push(
      `${Math.max(synced, 0)} shooter(s) created from score data only (no shooter list in PSC match_def)`,
    );
  }

  return {
    format_version: 1,
    match: {
      id: newId(),
      name: matchName,
      date: matchDate,
      organization: mapPscOrganization(matchDef.match_subtype || ''),
      firearm_type: mapPscMatchType(matchDef.match_type || ''),
      match_level: null,
    },
    stages,
    registrations: [...registrations.values()],
    stage_scores: stageScores,
    target_scores: targetScores,
    chrono_results: [],
    warnings,
    stats: {
      shooters_total: rawShooters.length,
      shooters_skipped: shootersSkipped,
      score_rows_skipped: 0,
    },
  };
}

function decodeJsonBytes(data: Uint8Array): string {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(data.subarray(2));
  }
  return new TextDecoder('utf-8').decode(data);
}

/** Read `match_def.json` + `match_scores.json` out of a `.psc` archive. */
export function readPscDocuments(data: Uint8Array): { matchDef: any; matchScores: any } {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch (err: any) {
    throw new PscParseError(`File is not a valid PractiScore .psc archive: ${err.message}`);
  }

  const byName = new Map<string, Uint8Array>();
  for (const [name, content] of Object.entries(files)) {
    const base = name.split('/').pop()?.toLowerCase();
    if (base && !byName.has(base)) byName.set(base, content);
  }

  const def = byName.get('match_def.json');
  const scores = byName.get('match_scores.json');
  if (!def || !scores) {
    throw new PscParseError('Invalid .psc file: missing match_def.json and/or match_scores.json');
  }

  try {
    return {
      matchDef: JSON.parse(decodeJsonBytes(def)),
      matchScores: JSON.parse(decodeJsonBytes(scores)),
    };
  } catch {
    throw new PscParseError('Invalid JSON in .psc file');
  }
}

/** Parse a `.psc` file into a local import payload. */
export async function parsePscFile(file: File): Promise<ImportMatchPayload> {
  const data = new Uint8Array(await file.arrayBuffer());
  const { matchDef, matchScores } = readPscDocuments(data);
  return buildPscPayload(matchDef, matchScores);
}
