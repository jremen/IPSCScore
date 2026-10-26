import { calculateAggregatedScore } from '@ipscscore/core';
import { newId } from './id';
import {
  WINMSS_CATEGORY_MAP,
  WINMSS_DIVISION_MAP,
  inferHitsPerPaper,
  inferScoringType,
  mapFirearmType,
} from './winmssMapper';
import {
  parseWinMssCab,
  type WinMssCabData,
  type WinMssCabEnrollment,
  type WinMssCabMember,
  type WinMssCabStage,
} from './winmssCabParser';
import type {
  ImportMatchPayload,
  ImportedRegistration,
  ImportedShooter,
  ImportedStage,
  ImportedStageScore,
  ImportedTargetScore,
} from './types';

/**
 * WinMSS `.cab` → normalized match payload for the offline (SQLite) runtime.
 *
 * Mirrors `backend/src/services/winmssCabImport.ts`: one match per archive,
 * shooters restricted to enrolled members, stage points computed from the
 * aggregate zone totals WinMSS exports (no per-target breakdown exists).
 */

const DEFAULT_DIVISION = 'production';
const DEFAULT_CATEGORY = 'regular';

interface ConvertContext {
  warnings: string[];
  unknownDivisions: Set<number>;
  unknownCategories: Set<number>;
}

function resolveDivision(id: number | null, ctx: ConvertContext): string {
  if (id === null || id <= 0) return DEFAULT_DIVISION;
  const mapped = WINMSS_DIVISION_MAP[id];
  if (mapped) return mapped;
  if (!ctx.unknownDivisions.has(id)) {
    ctx.unknownDivisions.add(id);
    ctx.warnings.push(
      `Unknown WinMSS division ID ${id}; imported as "${DEFAULT_DIVISION}".`,
    );
  }
  return DEFAULT_DIVISION;
}

function resolveCategory(id: number | null, ctx: ConvertContext): string {
  if (id === null || id <= 0) return DEFAULT_CATEGORY;
  const mapped = WINMSS_CATEGORY_MAP[id];
  if (mapped) return mapped;
  if (!ctx.unknownCategories.has(id)) {
    ctx.unknownCategories.add(id);
    ctx.warnings.push(
      `Unknown WinMSS category ID ${id}; imported as "${DEFAULT_CATEGORY}".`,
    );
  }
  return DEFAULT_CATEGORY;
}

function normalizeSquad(id: number | null): number | null {
  return id === null || id <= 0 ? null : id;
}

function registrationDqReason(enrollment: WinMssCabEnrollment): string | null {
  if (!enrollment.isDisqualified) return null;
  if (enrollment.disqualificationMemo) return enrollment.disqualificationMemo;
  if (enrollment.disqualificationRuleId) {
    return `DQ (WinMSS rule ${enrollment.disqualificationRuleId})`;
  }
  return 'DQ (imported from WinMSS CAB)';
}

function stageSourceConfig(stage: WinMssCabStage): Record<string, unknown> {
  return {
    source: 'winmss_cab',
    winmss: {
      stage_id: stage.stageId,
      course_id: stage.courseId,
      scoring_id: stage.scoringId,
      vanishing_targets: stage.vanishingTargets,
      penalty_target_field: stage.penaltyTargets,
      start_position: stage.startPosition || null,
      description: stage.description || null,
    },
  };
}

function computeStageMaxPoints(stage: WinMssCabStage, paperTargets: number, steelTargets: number): number {
  if (stage.maxPoints > 0) return stage.maxPoints;
  return paperTargets * 2 * 5 + steelTargets * 5;
}

interface TargetRow {
  target_type: 'paper' | 'steel' | 'no_shoot';
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
}

function distributeHits(
  totalA: number,
  totalC: number,
  totalD: number,
  totalM: number,
  count: number,
  maxPerTarget: number,
): Array<{ alpha: number; charlie: number; delta: number; miss: number }> {
  const targets = Array.from({ length: count }, () => ({ alpha: 0, charlie: 0, delta: 0, miss: 0 }));

  let remaining = totalA;
  for (let i = 0; i < count && remaining > 0; i++) {
    const space = maxPerTarget - targets[i].alpha;
    const fill = Math.min(space, remaining);
    targets[i].alpha = fill;
    remaining -= fill;
  }
  remaining = totalC;
  for (let i = 0; i < count && remaining > 0; i++) {
    const space = maxPerTarget - (targets[i].alpha + targets[i].charlie);
    const fill = Math.min(space, remaining);
    targets[i].charlie = fill;
    remaining -= fill;
  }
  remaining = totalD;
  for (let i = 0; i < count && remaining > 0; i++) {
    const space = maxPerTarget - (targets[i].alpha + targets[i].charlie + targets[i].delta);
    const fill = Math.min(space, remaining);
    targets[i].delta = fill;
    remaining -= fill;
  }
  remaining = totalM;
  for (let i = 0; i < count && remaining > 0; i++) {
    const space = maxPerTarget - (targets[i].alpha + targets[i].charlie + targets[i].delta + targets[i].miss);
    const fill = Math.min(space, remaining);
    targets[i].miss = fill;
    remaining -= fill;
  }
  return targets;
}

function buildTargets(
  alpha: number,
  charlie: number,
  delta: number,
  misses: number,
  noShootHits: number,
  stage: ImportedStage,
  steelHits: number,
): TargetRow[] {
  const hitsPerPaper = stage.hits_per_paper || 2;
  const paperCount = Math.max(stage.paper_targets || 0, 1);
  const steelCount = stage.steel_targets || 0;

  const paperAlpha = Math.max(0, alpha - steelHits);
  const paperTargets = distributeHits(paperAlpha, charlie, delta, misses, paperCount, hitsPerPaper);

  if (stage.no_shoot_targets === 0 && noShootHits > 0) {
    let remaining = noShootHits;
    for (let i = 0; i < paperCount && remaining > 0; i++) {
      const space = hitsPerPaper - (
        paperTargets[i].alpha + paperTargets[i].charlie + paperTargets[i].delta + paperTargets[i].miss
      );
      const fill = Math.min(Math.max(space, 0), remaining);
      paperTargets[i].miss += fill;
      remaining -= fill;
    }
  }

  const targets: TargetRow[] = paperTargets.map((target) => ({
    target_type: 'paper',
    alpha: target.alpha,
    charlie: target.charlie,
    delta: target.delta,
    miss: target.miss,
    no_shoot_hits: 0,
    steel_hit: null,
  }));

  if (stage.no_shoot_targets > 0) {
    const perTarget = Math.floor(noShootHits / stage.no_shoot_targets);
    let remainder = noShootHits % stage.no_shoot_targets;
    for (let i = 0; i < stage.no_shoot_targets; i++) {
      targets.push({
        target_type: 'no_shoot',
        alpha: 0,
        charlie: 0,
        delta: 0,
        miss: 0,
        no_shoot_hits: perTarget + (remainder > 0 ? 1 : 0),
        steel_hit: null,
      });
      if (remainder > 0) remainder--;
    }
  }

  for (let i = 0; i < steelCount; i++) {
    targets.push({
      target_type: 'steel',
      alpha: 0,
      charlie: 0,
      delta: 0,
      miss: 0,
      no_shoot_hits: 0,
      steel_hit: i < steelHits,
    });
  }

  return targets;
}

function shooterFromMember(member: WinMssCabMember, ctx: ConvertContext): ImportedShooter {
  return {
    id: newId(),
    first_name: member.firstName,
    last_name: member.lastName,
    category: resolveCategory(member.defaultCategoryId, ctx),
    division: resolveDivision(member.defaultDivisionId, ctx),
    power_factor: 'minor',
    region: member.region,
    email: member.email || null,
    winmss_member_id: member.memberId,
  };
}

/** Convert a parsed WinMSS CAB archive into a local import payload. */
export function buildWinMssCabPayload(cab: WinMssCabData, fileName: string): ImportMatchPayload {
  const ctx: ConvertContext = {
    warnings: [...cab.warnings],
    unknownDivisions: new Set(),
    unknownCategories: new Set(),
  };

  const matchName = cab.match.name === 'WinMSS Match'
    ? fileName.replace(/\.cab$/i, '')
    : cab.match.name;
  const matchId = newId();

  // ── Shooters (only members enrolled in this match) ─────────────────
  const enrolledMemberIds = new Set(cab.enrollments.map((enrollment) => enrollment.memberId));
  const membersToImport = enrolledMemberIds.size > 0
    ? cab.members.filter((member) => enrolledMemberIds.has(member.memberId))
    : cab.members;

  const knownMemberIds = new Set(cab.members.map((member) => member.memberId));
  for (const memberId of enrolledMemberIds) {
    if (!knownMemberIds.has(memberId)) {
      ctx.warnings.push(`Enrolled member ${memberId} is missing from MEMBER.XML and will be skipped`);
    }
  }

  const shooterByMember = new Map<number, ImportedShooter>();
  for (const member of membersToImport) {
    if (!member.firstName || !member.lastName) {
      ctx.warnings.push(
        `Member ${member.memberId}: missing name (first="${member.firstName}", last="${member.lastName}")`,
      );
      continue;
    }
    shooterByMember.set(member.memberId, shooterFromMember(member, ctx));
  }
  // ── Stages ────────────────────────────────────────────────────────
  const stageBySourceId = new Map<number, ImportedStage>();
  for (const stage of cab.stages) {
    if (stage.removed) {
      ctx.warnings.push(`Stage ${stage.stageId} "${stage.name}" is marked removed in WinMSS; skipped`);
      continue;
    }

    const paperTargets = Math.max(0, stage.paperTargets);
    const steelTargets = Math.max(0, stage.popperTargets + stage.plateTargets);
    const minRounds = stage.minRounds > 0 ? stage.minRounds : paperTargets * 2 + steelTargets;

    stageBySourceId.set(stage.stageId, {
      id: newId(),
      stage_number: stage.stageId,
      name: stage.name,
      scoring_type: inferScoringType({
        paperTargets,
        steelTargets,
        minRounds,
        scoringTypeId: stage.scoringId,
      }),
      paper_targets: paperTargets,
      steel_targets: steelTargets,
      no_shoot_targets: 0,
      npm_targets: 0,
      hits_per_paper: inferHitsPerPaper(),
      min_rounds: minRounds,
      max_points: computeStageMaxPoints(stage, paperTargets, steelTargets),
      par_time: null,
      briefing: stage.description || null,
      config: stageSourceConfig(stage),
    });
  }

  // ── Registrations ─────────────────────────────────────────────────
  const registrationByMember = new Map<number, ImportedRegistration>();
  const powerFactorByMember = new Map<number, 'major' | 'minor'>();

  for (const enrollment of cab.enrollments) {
    const shooter = shooterByMember.get(enrollment.memberId);
    if (!shooter) {
      ctx.warnings.push(`Enrollment for member ${enrollment.memberId} has no shooter record; skipped`);
      continue;
    }

    const powerFactor: 'major' | 'minor' = enrollment.majorPowerFactor ? 'major' : 'minor';
    powerFactorByMember.set(enrollment.memberId, powerFactor);

    if (enrollment.stageDisqualified) {
      ctx.warnings.push(
        `Member ${enrollment.memberId} has a stage-level DQ in WinMSS; only the match-level DQ flag is imported`,
      );
    }

    registrationByMember.set(enrollment.memberId, {
      id: newId(),
      squad: normalizeSquad(enrollment.squadId),
      division_override: resolveDivision(enrollment.divisionId, ctx),
      category_override: resolveCategory(enrollment.categoryId, ctx),
      power_factor_override: powerFactor,
      is_dq: enrollment.isDisqualified,
      dq_reason: registrationDqReason(enrollment),
      shooter,
    });
  }

  // ── Scores ────────────────────────────────────────────────────────
  const stageScores: ImportedStageScore[] = [];
  const targetScores: ImportedTargetScore[] = [];
  let skippedRemoved = 0;
  let missingRegistration = 0;
  let missingStage = 0;

  for (const score of cab.scores) {
    const registration = registrationByMember.get(score.memberId);
    const stage = stageBySourceId.get(score.stageId);

    if (score.removed || score.flagForDelete) {
      skippedRemoved++;
      continue;
    }
    if (!registration) {
      missingRegistration++;
      continue;
    }
    if (!stage) {
      missingStage++;
      continue;
    }

    const powerFactor = powerFactorByMember.get(score.memberId) || 'minor';
    const steelCount = stage.steel_targets || 0;
    // ScoreA includes steel hits, so count the first min(alpha, steel) as steel.
    const steelHits = Math.min(steelCount, score.alpha);
    const isDnf = score.isDisqualified;

    const calcResult = calculateAggregatedScore({
      total_alpha: score.alpha,
      total_charlie: score.charlie,
      total_delta: score.delta,
      total_miss: score.misses,
      total_no_shoot: score.penalties,
      total_steel: steelCount,
      steel_hit_count: steelHits,
      procedural_count: score.proceduralErrors,
      ftsa_count: 0,
      extra_shot_count: score.extraShots,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: score.overtimeShots,
      time: score.time,
      scoring_type: stage.scoring_type,
      power_factor: powerFactor,
    });

    const targets = buildTargets(
      score.alpha, score.charlie, score.delta, score.misses, score.penalties, stage, steelHits,
    );

    const scoreId = newId();
    stageScores.push({
      id: scoreId,
      stage_id: stage.id,
      registration_id: registration.id,
      time: score.time,
      extra_shot_count: score.extraShots,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: score.overtimeShots,
      procedural_count: score.proceduralErrors,
      ftsa_count: 0,
      is_dnf: isDnf,
      raw_points: calcResult.raw_points,
      penalty_points: calcResult.penalty_points,
      net_points: calcResult.net_points,
      hit_factor: calcResult.hit_factor,
      total_time: score.time,
      x_count: 0,
      score_data: {
        source: 'winmss_cab',
        aggregated: {
          alpha: score.alpha,
          bravo: score.bravo,
          charlie: score.charlie,
          delta: score.delta,
          miss: score.misses,
          no_shoot: score.penalties,
          procedural: score.proceduralErrors,
          steel_count: steelCount,
          extra_shot: score.extraShots,
          overtime_shot: score.overtimeShots,
        },
        source_score: {
          final_score: score.finalScore,
          hit_factor: score.hitFactor,
          deduction: score.deduction,
          deduction_percent: score.deductionPercent,
          removed: score.removed,
          flag_for_delete: score.flagForDelete,
          is_disq: score.isDisqualified,
          last_modified: score.lastModified || null,
          no_verify: score.noVerify,
        },
      },
    });

    targets.forEach((target, index) => {
      targetScores.push({
        id: newId(),
        stage_score_id: scoreId,
        target_index: index + 1,
        target_type: target.target_type,
        alpha: target.alpha,
        charlie: target.charlie,
        delta: target.delta,
        miss: target.miss,
        no_shoot_hits: target.no_shoot_hits,
        steel_hit: target.steel_hit,
      });
    });
  }

  if (missingRegistration > 0) {
    ctx.warnings.push(
      `${missingRegistration} score rows skipped — member was not enrolled in this match`,
    );
  }
  if (missingStage > 0) {
    ctx.warnings.push(`${missingStage} score rows skipped — stage was not imported`);
  }
  if (skippedRemoved > 0) {
    ctx.warnings.push(
      `${skippedRemoved} score rows marked Remove/FlagDelete in WinMSS were skipped`,
    );
  }

  return {
    format_version: 1,
    match: {
      id: matchId,
      name: matchName,
      date: cab.match.date,
      organization: 'IPSC',
      firearm_type: mapFirearmType(cab.match.firearmId),
      match_level: cab.match.level,
    },
    stages: [...stageBySourceId.values()],
    registrations: [...registrationByMember.values()],
    stage_scores: stageScores,
    target_scores: targetScores,
    chrono_results: [],
    warnings: ctx.warnings,
    stats: {
      shooters_total: membersToImport.length,
      shooters_skipped: membersToImport.length - shooterByMember.size,
      score_rows_skipped: skippedRemoved + missingRegistration + missingStage,
    },
  };
}

/** Parse a `.cab` (or ZIP-wrapped WinMSS export) into a local import payload. */
export async function parseWinMssCabFile(
  data: Uint8Array,
  fileName: string,
): Promise<ImportMatchPayload> {
  const cab = await parseWinMssCab(data);
  return buildWinMssCabPayload(cab, fileName);
}

/** Rowset summary used by the mobile WinMSS inspector. */
export async function inspectWinMssCab(data: Uint8Array) {
  const cab = await parseWinMssCab(data);
  return {
    format: 'cab' as const,
    files: cab.files,
    warnings: cab.warnings,
    tables: {
      THEMATCH: {
        columns: cab.columns.THEMATCH,
        rowCount: 1,
        sampleRows: [cab.match],
      },
      MEMBER: {
        columns: cab.columns.MEMBER,
        rowCount: cab.members.length,
        sampleRows: cab.members.slice(0, 3),
      },
      ENROLLED: {
        columns: cab.columns.ENROLLED,
        rowCount: cab.enrollments.length,
        sampleRows: cab.enrollments.slice(0, 3),
      },
      STAGE: {
        columns: cab.columns.STAGE,
        rowCount: cab.stages.length,
        sampleRows: cab.stages.slice(0, 3),
      },
      SCORE: {
        columns: cab.columns.SCORE,
        rowCount: cab.scores.length,
        sampleRows: cab.scores.slice(0, 3),
      },
    },
  };
}
