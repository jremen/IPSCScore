import type { PowerFactor, ScoringType } from '@ipscscore/core';

/**
 * Normalized match payload shared by the offline `.cab` and `.psc` importers.
 *
 * The shape intentionally matches the IPSCScore `.match.json` export, so the
 * SQLite runtime can persist an imported match through the same code path as a
 * file imported from a desktop install.
 */

export interface ImportedShooter {
  id: string;
  first_name: string;
  last_name: string;
  category: string;
  division: string;
  power_factor: PowerFactor;
  region: string;
  email: string | null;
  winmss_member_id?: number | string | null;
}

export interface ImportedRegistration {
  id: string;
  squad: number | null;
  division_override: string | null;
  category_override: string | null;
  power_factor_override: PowerFactor | null;
  is_dq: boolean;
  dq_reason: string | null;
  shooter: ImportedShooter;
}

export interface ImportedStage {
  id: string;
  stage_number: number;
  name: string;
  scoring_type: ScoringType;
  paper_targets: number;
  steel_targets: number;
  no_shoot_targets: number;
  npm_targets: number;
  hits_per_paper: number;
  min_rounds: number;
  max_points: number;
  par_time: number | null;
  briefing: string | null;
  config: Record<string, unknown>;
}

export interface ImportedStageScore {
  id: string;
  stage_id: string;
  registration_id: string;
  time: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  procedural_count: number;
  ftsa_count: number;
  is_dnf: boolean;
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
  total_time: number;
  x_count: number;
  score_data: Record<string, unknown>;
}

export interface ImportedTargetScore {
  id: string;
  stage_score_id: string;
  target_index: number;
  target_type: 'paper' | 'steel' | 'no_shoot';
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
}

export interface ImportedMatch {
  id: string;
  name: string;
  date: string;
  organization: string;
  firearm_type: string;
  match_level: number | null;
}

export interface ImportMatchPayload {
  format_version: 1;
  match: ImportedMatch;
  stages: ImportedStage[];
  registrations: ImportedRegistration[];
  stage_scores: ImportedStageScore[];
  target_scores: ImportedTargetScore[];
  chrono_results: [];
  warnings: string[];
  /** Source row counts, used to report skipped entries in the import summary. */
  stats?: ImportSourceStats;
}

/** Row counts the source file carried but could not be imported. */
export interface ImportSourceStats {
  shooters_total?: number;
  shooters_skipped?: number;
  score_rows_skipped?: number;
}

export interface ImportCounts {
  stages: number;
  registrations: number;
  scores: number;
  targets: number;
  chrono: number;
}

export interface LocalImportResult {
  success: true;
  match_id: string;
  match_name: string;
  counts: ImportCounts;
  synced_shooters?: boolean;
  warnings: string[];
}
