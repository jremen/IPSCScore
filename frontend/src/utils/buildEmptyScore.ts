import type { Stage } from '../types/stage';
import type { ScoreInput, TargetScore, ScoreData } from '../types/scoring';

/**
 * Build an empty ScoreInput for a given stage and scoring type.
 * Used by ScoringNav when no existing score is found.
 */
export function buildEmptyScore(stage: Stage): ScoreInput {
  const config = stage.config || {};
  const scoringType = stage.scoring_type;
  const targets: TargetScore[] = [];
  let scoreData: ScoreData | undefined = undefined;

  switch (scoringType) {
    case 'action_steel': {
      const numStrings = config.number_of_strings || 5;
      const platesPerString = config.targets_per_string || 5;
      scoreData = {
        string_times: new Array(numStrings).fill(0),
        string_plate_hits: new Array(numStrings).fill(null).map(() => new Array(platesPerString).fill(false)),
      };
      return { time: null, targets: [], procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: scoreData };
    }

    case 'multi_gun': {
      const numTargets = config.num_targets || stage.paper_targets || 0;
      for (let i = 1; i <= numTargets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null, target_data: { neutralized: false } });
      }
      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: { penalty_ftn_sec: 0, penalty_miss_sec: 0, penalty_no_shoot_sec: 0, penalty_procedural_sec: 0 } };
    }

    case 'bullseye':
    case 'archery':
    case 'issf': {
      const shots = config.shots_per_course || config.shots_per_string || config.arrows_per_end || 10;
      scoreData = { ring_values: new Array(shots).fill(0) };
      return { time: null, targets: [], procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: scoreData };
    }

    case 'long_range': {
      if (config.variant === 'f_class') {
        const shots = config.shots_per_string || 20;
        scoreData = { ring_values: new Array(shots).fill(0) };
        return { time: null, targets: [], procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: scoreData };
      }
      const numTargets = config.num_targets || stage.paper_targets || 10;
      for (let i = 1; i <= numTargets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null, target_data: { hit: false } });
      }
      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false };
    }

    case 'nrl22': {
      const numTargets = config.num_targets || stage.paper_targets || 10;
      for (let i = 1; i <= numTargets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null, target_data: { hit: false } });
      }
      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false };
    }

    case 'idpa':
    default: {
      for (let i = 1; i <= stage.paper_targets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null });
      }
      const steelStart = stage.paper_targets;
      for (let i = 1; i <= stage.steel_targets; i++) {
        targets.push({ target_index: steelStart + i, target_type: 'steel', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: true });
      }
      // No-shoot: create exactly 1 row when the stage has no-shoot targets (boolean yes/no)
      const nsStart = steelStart + stage.steel_targets;
      if (stage.no_shoot_targets > 0) {
        targets.push({ target_index: nsStart + 1, target_type: 'no_shoot', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null });
      }
      const npmStart = nsStart + (stage.no_shoot_targets > 0 ? 1 : 0);
      for (let i = 1; i <= stage.npm_targets; i++) {
        targets.push({ target_index: npmStart + i, target_type: 'npm', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null });
      }

      if (scoringType === 'idpa') {
        return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: { penalty_pe: 0, penalty_hnt: 0, penalty_ftn: 0, penalty_fp: 0, penalty_ftdr: 0 } };
      }

      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false };
    }
  }
}

/**
 * Overlay a persisted or cached score on the target skeleton implied by the
 * stage's *current* configuration.
 *
 * Target counts live on the stage, not on the score, so a score that was saved
 * before the stage gained targets — or one read back from a cache that was
 * populated while the stage still had none — would render a scoring sheet with
 * no target fields at all. Existing values always win; this only fills the gaps.
 */
export function hydrateScore(stage: Stage, score: ScoreInput): ScoreInput {
  const skeleton = buildEmptyScore(stage);

  const existingKeys = new Set(score.targets.map((t) => `${t.target_type}:${t.target_index}`));
  const missingTargets = skeleton.targets.filter(
    (t) => !existingKeys.has(`${t.target_type}:${t.target_index}`),
  );

  // Ring / string sheets read score_data; fill in keys the saved score predates.
  const score_data = skeleton.score_data
    ? { ...skeleton.score_data, ...score.score_data }
    : score.score_data;

  if (missingTargets.length === 0 && score_data === score.score_data) return score;

  return {
    ...score,
    targets: missingTargets.length > 0 ? [...score.targets, ...missingTargets] : score.targets,
    score_data,
  };
}