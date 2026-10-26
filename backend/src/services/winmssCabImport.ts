import { sql } from '../db/client.js';
import {
  WINMSS_CATEGORY_MAP,
  WINMSS_DIVISION_MAP,
  inferHitsPerPaper,
  inferScoringType,
  mapFirearmType,
} from '../utils/winmssMapper.js';
import {
  parseWinMssCab,
  type WinMssCabData,
  type WinMssCabEnrollment,
  type WinMssCabStage,
} from '../utils/winmssCabParser.js';
import { calculateAggregatedScore } from '../utils/scoringCalc.js';
import { recalculateStage } from './scoringRecalc.js';

export interface WinMssCabImportResult {
  matches: Array<{ id: string; name: string; date: string; imported: boolean; updated?: boolean }>;
  stages: Array<{ id: string; name: string; stage_number: number; updated?: boolean }>;
  shooters: { created: number; skipped: number; errors: string[] };
  registrations: { created: number; skipped: number };
  scores: { created: number; skipped: number; errors: string[] };
  warnings: string[];
}

interface DbStage {
  id: string;
  stage_number: number;
  name: string;
  scoring_type: string;
  paper_targets: number;
  steel_targets: number;
  no_shoot_targets: number;
  hits_per_paper: number;
  min_rounds: number;
  max_points: number;
}

interface ImportContext {
  matchId: string;
  warnings: string[];
  divisionWarnings: Set<number>;
  categoryWarnings: Set<number>;
}

const DEFAULT_DIVISION = 'production';
const DEFAULT_CATEGORY = 'regular';

function resolveDivision(id: number | null, ctx: ImportContext): string {
  if (id === null || id <= 0) return DEFAULT_DIVISION;
  const mapped = WINMSS_DIVISION_MAP[id];
  if (mapped) return mapped;

  if (!ctx.divisionWarnings.has(id)) {
    ctx.divisionWarnings.add(id);
    ctx.warnings.push(
      `Unknown WinMSS division ID ${id}; imported as "${DEFAULT_DIVISION}". Add it to WINMSS_DIVISION_MAP if it should map elsewhere.`,
    );
  }
  return DEFAULT_DIVISION;
}

function resolveCategory(id: number | null, ctx: ImportContext): string {
  if (id === null || id <= 0) return DEFAULT_CATEGORY;
  const mapped = WINMSS_CATEGORY_MAP[id];
  if (mapped) return mapped;

  if (!ctx.categoryWarnings.has(id)) {
    ctx.categoryWarnings.add(id);
    ctx.warnings.push(
      `Unknown WinMSS category ID ${id}; imported as "${DEFAULT_CATEGORY}". Add it to WINMSS_CATEGORY_MAP if it should map elsewhere.`,
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
      // TrgtVanish is disappearing-target metadata only. It is deliberately
      // not mapped to npm_targets or counted as non-penalty metal.
      vanishing_targets: stage.vanishingTargets,
      // WinMSS exports TrgtPenlty as a bit field (e.g. 32), not a target count,
      // so it is preserved verbatim instead of becoming no_shoot_targets.
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

/**
 * Import a WinMSS .cab archive (ZIP of ADO XML rowsets) as one match.
 *
 * The .cab format only contains match-scoped rows, so unlike the .mdb importer
 * this creates shooters only for members enrolled in the exported match.
 */
export async function importWinMssCab(buffer: Buffer, fileName: string): Promise<WinMssCabImportResult> {
  const cab: WinMssCabData = await parseWinMssCab(buffer);
  const result: WinMssCabImportResult = {
    matches: [],
    stages: [],
    shooters: { created: 0, skipped: 0, errors: [] },
    registrations: { created: 0, skipped: 0 },
    scores: { created: 0, skipped: 0, errors: [] },
    warnings: [...cab.warnings],
  };
  const ctx: ImportContext = {
    matchId: '',
    warnings: result.warnings,
    divisionWarnings: new Set<number>(),
    categoryWarnings: new Set<number>(),
  };

  // ── 1. Match ────────────────────────────────────────────────────────
  const matchName = cab.match.name === 'WinMSS Match'
    ? fileName.replace(/\.cab$/i, '')
    : cab.match.name;
  const firearmType = mapFirearmType(cab.match.firearmId);

  const existingMatch = await sql`
    SELECT id FROM matches WHERE name = ${matchName} AND date = ${cab.match.date}
  `;

  let matchId: string;
  if (existingMatch.length > 0) {
    matchId = existingMatch[0].id;
    await sql`
      UPDATE matches SET
        firearm_type = ${firearmType},
        match_level = COALESCE(${cab.match.level}, match_level),
        updated_at = NOW()
      WHERE id = ${matchId}
    `;
    result.matches.push({
      id: matchId,
      name: matchName,
      date: cab.match.date,
      imported: true,
      updated: true,
    });
    result.warnings.push(`Match "${matchName}" already exists; imported data was updated`);
  } else {
    const [match] = await sql`
      INSERT INTO matches (name, date, organization, firearm_type, match_level)
      VALUES (${matchName}, ${cab.match.date}, 'IPSC', ${firearmType}, ${cab.match.level})
      RETURNING id
    `;
    matchId = match.id;
    result.matches.push({ id: matchId, name: matchName, date: cab.match.date, imported: true });
  }
  ctx.matchId = matchId;

  // ── 2. Shooters (only members that appear in ENROLLED.XML) ──────────
  const enrolledMemberIds = new Set(cab.enrollments.map((enrollment) => enrollment.memberId));
  const membersToImport = enrolledMemberIds.size > 0
    ? cab.members.filter((member) => enrolledMemberIds.has(member.memberId))
    : cab.members;

  const membersById = new Map(cab.members.map((member) => [member.memberId, member]));
  for (const memberId of enrolledMemberIds) {
    if (!membersById.has(memberId)) {
      result.warnings.push(`Enrolled member ${memberId} is missing from MEMBER.XML and will be skipped`);
    }
  }

  const shooterIdByMember = new Map<number, string>();
  for (const member of membersToImport) {
    try {
      if (!member.firstName || !member.lastName) {
        result.shooters.skipped++;
        result.shooters.errors.push(
          `Member ${member.memberId}: missing name (first="${member.firstName}", last="${member.lastName}")`,
        );
        continue;
      }

      const existing = await sql`
        SELECT id, deleted_at FROM shooters
        WHERE winmss_member_id = ${member.memberId}
        LIMIT 1
      `;

      if (existing.length > 0) {
        if (existing[0].deleted_at) {
          result.shooters.skipped++;
          result.shooters.errors.push(
            `Member ${member.memberId}: a soft-deleted shooter already uses this WinMSS ID; restore or purge it before re-importing`,
          );
          continue;
        }

        const shooterId = existing[0].id;
        shooterIdByMember.set(member.memberId, shooterId);
        await sql`
          UPDATE shooters SET
            first_name = ${member.firstName},
            last_name = ${member.lastName},
            region = CASE WHEN ${member.region} <> '' THEN ${member.region} ELSE region END,
            email = CASE WHEN ${member.email} <> '' THEN ${member.email} ELSE email END,
            updated_at = NOW()
          WHERE id = ${shooterId} AND deleted_at IS NULL
        `;
        result.shooters.skipped++;
      } else {
        const division = resolveDivision(member.defaultDivisionId, ctx);
        const category = resolveCategory(member.defaultCategoryId, ctx);
        const [shooter] = await sql`
          INSERT INTO shooters (
            first_name, last_name, category, division, power_factor, region, email, winmss_member_id
          )
          VALUES (
            ${member.firstName}, ${member.lastName}, ${category}, ${division},
            'minor', ${member.region}, ${member.email || null}, ${member.memberId}
          )
          RETURNING id
        `;
        shooterIdByMember.set(member.memberId, shooter.id);
        result.shooters.created++;
      }
    } catch (err: any) {
      result.shooters.errors.push(`Member ${member.memberId}: ${err.message}`);
    }
  }

  // ── 3. Stages ───────────────────────────────────────────────────────
  const dbStageBySourceId = new Map<number, DbStage>();
  const activeStages = cab.stages.filter((stage) => {
    if (!stage.removed) return true;
    result.warnings.push(`Stage ${stage.stageId} "${stage.name}" is marked removed in WinMSS; skipped`);
    return false;
  });

  for (const stage of activeStages) {
    try {
      const paperTargets = Math.max(0, stage.paperTargets);
      const steelTargets = Math.max(0, stage.popperTargets + stage.plateTargets);
      const noShootTargets = 0;
      const minRounds = stage.minRounds > 0 ? stage.minRounds : paperTargets * 2 + steelTargets;
      const scoringType = inferScoringType({
        paperTargets,
        steelTargets,
        minRounds,
        scoringTypeId: stage.scoringId,
      });
      const hitsPerPaper = inferHitsPerPaper();
      const maxPoints = computeStageMaxPoints(stage, paperTargets, steelTargets);
      const config = stageSourceConfig(stage);
      const briefing = stage.description || null;

      const existing = await sql`
        SELECT id FROM stages WHERE match_id = ${matchId} AND stage_number = ${stage.stageId}
      `;

      let dbStage: DbStage;
      if (existing.length > 0) {
        const [updated] = await sql`
          UPDATE stages SET
            name = ${stage.name},
            scoring_type = ${scoringType},
            paper_targets = ${paperTargets},
            steel_targets = ${steelTargets},
            no_shoot_targets = ${noShootTargets},
            npm_targets = 0,
            hits_per_paper = ${hitsPerPaper},
            min_rounds = ${minRounds},
            max_points = ${maxPoints},
            briefing = ${briefing},
            config = COALESCE(config, '{}'::jsonb) || ${JSON.stringify(config)}::jsonb,
            updated_at = NOW()
          WHERE id = ${existing[0].id}
          RETURNING id, stage_number, name, scoring_type, paper_targets, steel_targets,
            no_shoot_targets, hits_per_paper, min_rounds, max_points
        `;
        dbStage = updated as DbStage;
        result.stages.push({
          id: dbStage.id,
          name: dbStage.name,
          stage_number: dbStage.stage_number,
          updated: true,
        });
      } else {
        const [inserted] = await sql`
          INSERT INTO stages (
            match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
            no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, briefing, config
          )
          VALUES (
            ${matchId}, ${stage.stageId}, ${stage.name}, ${scoringType}, ${paperTargets},
            ${steelTargets}, ${noShootTargets}, 0, ${hitsPerPaper}, ${minRounds}, ${maxPoints},
            ${briefing}, ${JSON.stringify(config)}::jsonb
          )
          RETURNING id, stage_number, name, scoring_type, paper_targets, steel_targets,
            no_shoot_targets, hits_per_paper, min_rounds, max_points
        `;
        dbStage = inserted as DbStage;
        result.stages.push({
          id: dbStage.id,
          name: dbStage.name,
          stage_number: dbStage.stage_number,
        });
      }

      dbStageBySourceId.set(stage.stageId, dbStage);
    } catch (err: any) {
      result.warnings.push(`Failed to import stage ${stage.stageId} "${stage.name}": ${err.message}`);
    }
  }

  // ── 4. Registrations ────────────────────────────────────────────────
  const registrationIdByMember = new Map<number, string>();
  const powerFactorByMember = new Map<number, 'major' | 'minor'>();

  for (const enrollment of cab.enrollments) {
    try {
      const shooterId = shooterIdByMember.get(enrollment.memberId);
      if (!shooterId) {
        result.warnings.push(`Enrollment for member ${enrollment.memberId} has no shooter record; skipped`);
        continue;
      }

      const division = resolveDivision(enrollment.divisionId, ctx);
      const category = resolveCategory(enrollment.categoryId, ctx);
      const powerFactor: 'major' | 'minor' = enrollment.majorPowerFactor ? 'major' : 'minor';
      const squad = normalizeSquad(enrollment.squadId);
      const isDq = enrollment.isDisqualified;
      const dqReason = registrationDqReason(enrollment);

      powerFactorByMember.set(enrollment.memberId, powerFactor);

      if (enrollment.stageDisqualified) {
        result.warnings.push(
          `Member ${enrollment.memberId} has a stage-level DQ in WinMSS; only the match-level DQ flag is imported`,
        );
      }

      const existing = await sql`
        SELECT id FROM match_registrations
        WHERE match_id = ${matchId} AND shooter_id = ${shooterId}
      `;

      if (existing.length > 0) {
        const registrationId = existing[0].id;
        await sql`
          UPDATE match_registrations SET
            squad = ${squad},
            division = ${division},
            category = ${category},
            power_factor = ${powerFactor},
            is_dq = ${isDq},
            dq_reason = ${dqReason}
          WHERE id = ${registrationId}
        `;
        registrationIdByMember.set(enrollment.memberId, registrationId);
        result.registrations.skipped++;
      } else {
        const [registration] = await sql`
          INSERT INTO match_registrations (
            match_id, shooter_id, squad, division, category, power_factor, is_dq, dq_reason
          )
          VALUES (
            ${matchId}, ${shooterId}, ${squad}, ${division}, ${category},
            ${powerFactor}, ${isDq}, ${dqReason}
          )
          RETURNING id
        `;
        registrationIdByMember.set(enrollment.memberId, registration.id);
        result.registrations.created++;
      }
    } catch (err: any) {
      result.warnings.push(`Registration import error for member ${enrollment.memberId}: ${err.message}`);
    }
  }

  // ── 5. Scores ───────────────────────────────────────────────────────
  let missingRegistrationCount = 0;
  let missingStageCount = 0;

  for (const score of cab.scores) {
    const registrationId = registrationIdByMember.get(score.memberId);
    const stage = dbStageBySourceId.get(score.stageId);

    if (score.removed || score.flagForDelete) {
      result.scores.skipped++;
      // Apply WinMSS removal on re-import so stale rows do not survive.
      if (registrationId && stage) {
        await sql`
          DELETE FROM stage_scores
          WHERE stage_id = ${stage.id} AND registration_id = ${registrationId}
        `;
      }
      continue;
    }

    if (!registrationId) {
      missingRegistrationCount++;
      if (missingRegistrationCount <= 5) {
        result.scores.errors.push(
          `Score row member ${score.memberId} stage ${score.stageId}: no registration (member not enrolled?)`,
        );
      }
      continue;
    }
    if (!stage) {
      missingStageCount++;
      if (missingStageCount <= 5) {
        result.scores.errors.push(
          `Score row member ${score.memberId} stage ${score.stageId}: stage was not imported`,
        );
      }
      continue;
    }

    try {
      const powerFactor = powerFactorByMember.get(score.memberId) || 'minor';
      const steelCount = stage.steel_targets || 0;
      // ScoreA includes steel hits, so alpha cannot exceed the steel count
      // unless hits landed on paper. Without a per-target breakdown, count the
      // first min(alpha, steel) as and only as steel hits.
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
        scoring_type: stage.scoring_type as any,
        power_factor: powerFactor,
      });

      const targets = buildTargets(
        score.alpha, score.charlie, score.delta, score.misses, score.penalties, stage, steelHits,
      );

      const scoreData = {
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
      };

      const existing = await sql`
        SELECT id FROM stage_scores
        WHERE stage_id = ${stage.id} AND registration_id = ${registrationId}
      `;

      let stageScoreId: string;
      if (existing.length > 0) {
        stageScoreId = existing[0].id;
        await sql`
          UPDATE stage_scores SET
            time = ${score.time},
            extra_shot_count = ${score.extraShots},
            extra_hit_count = 0,
            stacking_count = 0,
            overtime_shot_count = ${score.overtimeShots},
            procedural_count = ${score.proceduralErrors},
            ftsa_count = 0,
            is_dnf = ${isDnf},
            raw_points = ${calcResult.raw_points},
            penalty_points = ${calcResult.penalty_points},
            net_points = ${calcResult.net_points},
            hit_factor = ${calcResult.hit_factor},
            score_data = ${JSON.stringify(scoreData)}::jsonb,
            updated_at = NOW()
          WHERE id = ${stageScoreId}
        `;
        await sql`DELETE FROM target_scores WHERE stage_score_id = ${stageScoreId}`;
      } else {
        const [inserted] = await sql`
          INSERT INTO stage_scores (
            match_id, stage_id, registration_id, time, extra_shot_count, overtime_shot_count,
            procedural_count, is_dnf, raw_points, penalty_points, net_points, hit_factor, score_data
          )
          VALUES (
            ${matchId}, ${stage.id}, ${registrationId}, ${score.time}, ${score.extraShots},
            ${score.overtimeShots}, ${score.proceduralErrors}, ${isDnf},
            ${calcResult.raw_points}, ${calcResult.penalty_points}, ${calcResult.net_points},
            ${calcResult.hit_factor}, ${JSON.stringify(scoreData)}::jsonb
          )
          RETURNING id
        `;
        stageScoreId = inserted.id;
      }

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        await sql`
          INSERT INTO target_scores (
            stage_score_id, target_index, target_type, alpha, charlie, delta, miss,
            no_shoot_hits, steel_hit
          )
          VALUES (
            ${stageScoreId}, ${i + 1}, ${target.target_type}, ${target.alpha},
            ${target.charlie}, ${target.delta}, ${target.miss}, ${target.no_shoot_hits},
            ${target.steel_hit}
          )
        `;
      }

      result.scores.created++;
    } catch (err: any) {
      result.scores.errors.push(
        `Score import error for member ${score.memberId} stage ${score.stageId}: ${err.message}`,
      );
    }
  }

  if (missingRegistrationCount > 0) {
    result.warnings.push(
      `${missingRegistrationCount} score rows skipped — member was not enrolled in this match`,
    );
  }
  if (missingStageCount > 0) {
    result.warnings.push(`${missingStageCount} score rows skipped — stage was not imported`);
  }
  if (result.scores.skipped > 0) {
    result.warnings.push(
      `${result.scores.skipped} score rows marked Remove/FlagDelete in WinMSS were skipped`,
    );
  }

  // ── 6. Recount stage rankings ───────────────────────────────────────
  for (const stage of dbStageBySourceId.values()) {
    try {
      await recalculateStage(matchId, stage.id);
    } catch (err: any) {
      result.warnings.push(`Failed to recalculate stage ${stage.stage_number}: ${err.message}`);
    }
  }

  // ── 7. Update shooter defaults from this match's registrations ──────
  try {
    await sql`
      UPDATE shooters s
      SET division = latest.division,
          category = latest.category,
          power_factor = latest.power_factor,
          updated_at = NOW()
      FROM (
        SELECT DISTINCT ON (shooter_id)
          shooter_id, division, category, power_factor
        FROM match_registrations
        WHERE match_id = ${matchId} AND division IS NOT NULL
        ORDER BY shooter_id, registered_at DESC
      ) latest
      WHERE s.id = latest.shooter_id AND s.deleted_at IS NULL
    `;
  } catch (err: any) {
    result.warnings.push(`Could not update shooter defaults from registrations: ${err.message}`);
  }

  return result;
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

/**
 * WinMSS stores aggregate zone totals, not a per-target breakdown. Distribute
 * them across the stage's targets so the score sheet has something sensible to
 * display; the authoritative calculation uses the aggregate totals directly.
 */
function buildTargets(
  alpha: number,
  charlie: number,
  delta: number,
  misses: number,
  noShootHits: number,
  stage: DbStage,
  steelHits: number,
): TargetRow[] {
  const hitsPerPaper = stage.hits_per_paper || 2;
  const paperCount = Math.max(stage.paper_targets || 0, 1);
  const steelCount = stage.steel_targets || 0;

  // ScoreA includes steel hits, so subtract them before distributing onto paper.
  const paperAlpha = Math.max(0, alpha - steelHits);
  const paperTargets = distributeHits(paperAlpha, charlie, delta, misses, paperCount, hitsPerPaper);

  // With no explicit no-shoot count in the CAB, fold penalty hits into paper
  // misses for display; the aggregate penalty calculation already uses them.
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
    target_type: 'paper' as const,
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
