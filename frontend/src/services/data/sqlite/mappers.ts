import type {
  ChronoData,
  Match,
  RegistrationWithShooter,
  ScoreData,
  Shooter,
  Stage,
  StageConfig,
  StageScoreWithTargets,
  TargetScore,
} from '@ipscscore/core';

/** SQLite stores booleans as 0/1 and objects as JSON text. */
export function toBool(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    const parsed = JSON.parse(String(value));
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type Row = Record<string, any>;

export function toMatch(row: Row): Match {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    organization: row.organization,
    firearm_type: row.firearm_type,
    match_level: toOptionalNumber(row.match_level) as Match['match_level'],
    is_current: toBool(row.is_current),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toStage(row: Row): Stage {
  return {
    id: row.id,
    match_id: row.match_id,
    stage_number: row.stage_number,
    name: row.name,
    scoring_type: row.scoring_type,
    paper_targets: row.paper_targets,
    steel_targets: row.steel_targets,
    no_shoot_targets: row.no_shoot_targets,
    npm_targets: row.npm_targets ?? 0,
    hits_per_paper: row.hits_per_paper,
    min_rounds: row.min_rounds,
    max_points: row.max_points,
    par_time: toOptionalNumber(row.par_time),
    image_path: row.image_path ?? null,
    briefing: row.briefing ?? null,
    config: parseJson<StageConfig>(row.config, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toShooter(row: Row): Shooter {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    category: row.category,
    tag: row.tag ?? null,
    division: row.division,
    power_factor: row.power_factor,
    region: row.region ?? '',
    email: row.email ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
  };
}

/**
 * A registration joined with its shooter and with the effective (overridable)
 * division/category/power factor resolved — the shape scoring screens expect.
 */
export function toRegistration(row: Row): RegistrationWithShooter {
  const division = row.reg_division ?? row.division;
  const category = row.reg_category ?? row.category;
  const power_factor = row.reg_power_factor ?? row.power_factor;

  return {
    id: row.id,
    shooter_id: row.shooter_id,
    first_name: row.first_name,
    last_name: row.last_name,
    category: row.category,
    tag: row.tag ?? null,
    division: row.division,
    power_factor: row.power_factor,
    region: row.region ?? '',
    email: row.email ?? null,
    squad: toOptionalNumber(row.squad),
    group_id: row.group_id ?? null,
    reg_division: row.reg_division ?? null,
    reg_category: row.reg_category ?? null,
    reg_power_factor: row.reg_power_factor ?? null,
    is_dq: toBool(row.is_dq),
    dq_reason: row.dq_reason ?? null,
    effective_division: division,
    effective_category: category,
    effective_power_factor: power_factor,
  };
}

export function toTargetScore(row: Row): TargetScore {
  return {
    target_index: row.target_index,
    target_type: row.target_type,
    alpha: row.alpha ?? 0,
    charlie: row.charlie ?? 0,
    delta: row.delta ?? 0,
    miss: row.miss ?? 0,
    no_shoot_hits: row.no_shoot_hits ?? 0,
    steel_hit: row.steel_hit === null || row.steel_hit === undefined ? null : toBool(row.steel_hit),
    target_data: parseJson<TargetScore['target_data']>(row.target_data, {}),
  };
}

export function toChrono(row: Row | null): ChronoData | null {
  if (!row) return null;
  return {
    bullet_weight: row.bullet_weight,
    velocity_1: toOptionalNumber(row.velocity_1),
    velocity_2: toOptionalNumber(row.velocity_2),
    velocity_3: toOptionalNumber(row.velocity_3),
    avg_velocity: row.avg_velocity ?? 0,
    calculated_pf: row.calculated_pf ?? 0,
    pf_passed: toBool(row.pf_passed),
  };
}

export function toStageScore(
  row: Row,
  targets: TargetScore[],
  chrono: ChronoData | null,
): StageScoreWithTargets {
  return {
    id: row.id,
    match_id: row.match_id,
    stage_id: row.stage_id,
    registration_id: row.registration_id,
    time: toOptionalNumber(row.time),
    extra_shot_count: row.extra_shot_count ?? 0,
    extra_hit_count: row.extra_hit_count ?? 0,
    stacking_count: row.stacking_count ?? 0,
    overtime_shot_count: row.overtime_shot_count ?? 0,
    procedural_count: row.procedural_count ?? 0,
    ftsa_count: row.ftsa_count ?? 0,
    is_dnf: toBool(row.is_dnf),
    raw_points: row.raw_points ?? 0,
    penalty_points: row.penalty_points ?? 0,
    net_points: row.net_points ?? 0,
    hit_factor: row.hit_factor ?? 0,
    stage_percent: row.stage_percent ?? 0,
    stage_points: row.stage_points ?? 0,
    total_time: toOptionalNumber(row.total_time),
    x_count: row.x_count ?? 0,
    score_data: parseJson<ScoreData>(row.score_data, {}),
    targets,
    chrono,
  };
}
