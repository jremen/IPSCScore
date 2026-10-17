import type { ScoringType, StageConfig } from '../domain';

export interface StageParams {
  min_rounds: number;
  max_points: number;
}

/**
 * Derive a stage's minimum round count and maximum achievable points from its
 * target layout and type-specific config.
 *
 * This is the single source of truth for stage sizing: it feeds the match
 * summary, the max-points cap used when converting stage percent into stage
 * points, and the "possible points" shown while scoring.
 */
export function calculateStageParams(
  scoringType: ScoringType | string,
  paperTargets: number,
  steelTargets: number,
  noShootTargets: number,
  npmTargets: number,
  hitsPerPaper: number,
  config?: StageConfig,
): StageParams {
  const targets = config ?? {};

  switch (scoringType) {
    case 'comstock':
    case 'virginia':
    case 'fixed_time':
    case 'hit_factor':
    case 'idpa': {
      const min_rounds = paperTargets * hitsPerPaper + steelTargets;
      const max_points = paperTargets * hitsPerPaper * 5 + steelTargets * 5 + npmTargets * 5;
      return { min_rounds, max_points };
    }

    case 'action_steel': {
      const strings = targets.number_of_strings || 5;
      const perString = targets.targets_per_string || 5;
      return { min_rounds: strings * perString, max_points: strings * perString * 5 };
    }

    case 'multi_gun': {
      const numTargets = targets.num_targets || paperTargets || 0;
      return { min_rounds: numTargets, max_points: numTargets * 5 };
    }

    case 'bullseye': {
      const shots = targets.shots_per_string || 10;
      return { min_rounds: shots, max_points: shots * 10 };
    }

    case 'issf': {
      const shots = targets.shots_per_course || 60;
      return { min_rounds: shots, max_points: shots * 10 };
    }

    case 'archery': {
      const arrows = targets.arrows_per_end || 6;
      return { min_rounds: arrows, max_points: arrows * 10 };
    }

    case 'long_range': {
      if (targets.variant === 'f_class') {
        const shots = targets.shots_per_string || 20;
        return { min_rounds: shots, max_points: shots * 10 };
      }
      const numTargets = targets.num_targets || paperTargets || 10;
      return { min_rounds: numTargets, max_points: numTargets };
    }

    case 'nrl22': {
      const numTargets = targets.num_targets || paperTargets || 10;
      const pointValue = targets.point_value || 10;
      return { min_rounds: numTargets, max_points: numTargets * pointValue };
    }

    default: {
      const min_rounds = paperTargets * hitsPerPaper + steelTargets;
      const max_points = paperTargets * hitsPerPaper * 5 + steelTargets * 5 + npmTargets * 5;
      return { min_rounds, max_points };
    }
  }
}

/** Aggregate the match-level summary shown on the match list and detail screens. */
export function summariseStages(
  stages: Array<{
    min_rounds: number;
    max_points: number;
    paper_targets: number;
    steel_targets: number;
    no_shoot_targets: number;
  }>,
) {
  return stages.reduce(
    (acc, stage) => ({
      total_shots: acc.total_shots + (stage.min_rounds || 0),
      total_points: acc.total_points + Number(stage.max_points || 0),
      total_paper: acc.total_paper + (stage.paper_targets || 0),
      total_steel: acc.total_steel + (stage.steel_targets || 0),
      total_no_shoot: acc.total_no_shoot + (stage.no_shoot_targets || 0),
    }),
    { total_shots: 0, total_points: 0, total_paper: 0, total_steel: 0, total_no_shoot: 0 },
  );
}
