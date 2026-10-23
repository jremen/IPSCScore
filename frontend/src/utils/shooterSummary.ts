import type { ScoreInput } from '../types/scoring';
import type { Stage } from '../types/stage';
import type { ShooterStageSummariesResponse, ShooterSummaryTarget } from '../types/results';

export function mapSummaryStage(stage: ShooterStageSummariesResponse['stages'][0]['stage']): Stage {
  return {
    id: stage.id,
    match_id: '',
    stage_number: stage.stage_number,
    name: stage.name,
    scoring_type: stage.scoring_type as Stage['scoring_type'],
    paper_targets: stage.paper_targets,
    steel_targets: stage.steel_targets,
    no_shoot_targets: stage.no_shoot_targets,
    npm_targets: stage.npm_targets,
    hits_per_paper: stage.hits_per_paper,
    min_rounds: stage.min_rounds,
    max_points: stage.max_points,
    par_time: stage.par_time,
    image_path: null,
    briefing: stage.briefing,
    config: stage.config,
    created_at: '',
    updated_at: '',
  };
}

export function mapSummaryScore(score: ShooterStageSummariesResponse['stages'][0]['score']): ScoreInput {
  return {
    time: score.time,
    targets: score.targets.map((target: ShooterSummaryTarget) => ({
      target_index: target.target_index,
      target_type: (target.target_type as any) || 'paper',
      alpha: target.alpha,
      charlie: target.charlie,
      delta: target.delta,
      miss: target.miss,
      no_shoot_hits: target.no_shoot_hits,
      steel_hit: target.steel_hit,
      target_data: target.target_data,
    })),
    procedural_count: score.procedural_count,
    ftsa_count: 0,
    extra_shot_count: 0,
    extra_hit_count: 0,
    stacking_count: 0,
    overtime_shot_count: 0,
    is_dnf: score.is_dnf,
    score_data: score.score_data,
  };
}

const SUMMARY_SCORING_TYPES = [
  'comstock', 'virginia', 'fixed_time', 'chrono', 'hit_factor', 'idpa',
  'bullseye', 'archery', 'issf', 'long_range', 'nrl22',
];

export function visibleSummaryStages(summary: ShooterStageSummariesResponse | null) {
  return summary?.stages.filter((stage) => SUMMARY_SCORING_TYPES.includes(stage.stage.scoring_type)) ?? [];
}
