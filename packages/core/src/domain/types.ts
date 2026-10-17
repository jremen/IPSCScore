/**
 * Canonical domain types shared by the frontend, the Android/Capacitor runtime
 * and (progressively) the backend.
 *
 * These are the single source of truth — platform-specific type files simply
 * re-export from here so the wire shape cannot drift between clients.
 */

// ── Shooter ────────────────────────────────────────────────────────────────

export type Category = 'regular' | 'junior' | 'senior' | 'super_senior' | 'lady';

export type Division =
  | 'standard' | 'open' | 'production' | 'production_optics' | 'optics'
  | 'classic' | 'revolver' | 'pcc_optics' | 'pcc_iron'
  | 'pistol_trening' | 'pcc_trening'
  | 'limited' | 'limited_optics' | 'carry_optics' | 'single_stack'
  | 'ssp' | 'esp' | 'cdp' | 'ccp' | 'bug' | 'revolver_idpa'
  | 'tactical' | 'open_3gun' | 'heavy'
  | 'open_prs' | 'production_prs'
  | 'any' | 'irons' | 'open_22'
  | 'conventional' | 'international';

export type PowerFactor = 'minor' | 'major';

export interface Shooter {
  id: string;
  first_name: string;
  last_name: string;
  category: Category;
  tag: string | null;
  division: Division;
  power_factor: PowerFactor;
  region: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateShooterInput {
  first_name: string;
  last_name: string;
  category: Category;
  tag?: string | null;
  division: Division;
  power_factor: PowerFactor;
  region: string;
  email?: string | null;
}

// ── Stage ──────────────────────────────────────────────────────────────────

export type ScoringType =
  | 'comstock' | 'virginia' | 'fixed_time' | 'chrono'
  | 'hit_factor' | 'idpa' | 'action_steel' | 'multi_gun'
  | 'long_range' | 'bullseye' | 'archery' | 'nrl22'
  | 'issf';

export type StageConfig = {
  // Action Steel
  number_of_strings?: number;
  targets_per_string?: number;
  drop_worst?: number;
  // Bullseye
  fire_type?: 'slow' | 'timed' | 'rapid';
  shots_per_string?: number;
  // Long Range
  variant?: 'prs' | 'f_class';
  // NRL22
  point_value?: number;
  // for multi_gun, nrl22, long_range(prs)
  num_targets?: number;
  // Multi-Gun
  has_no_shoot?: boolean;
  // Archery
  arrows_per_end?: number;
  // ISSF
  course_type?: string;
  shots_per_course?: number;
};

export interface Stage {
  id: string;
  match_id: string;
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
  image_path: string | null;
  briefing: string | null;
  config?: StageConfig;
  created_at: string;
  updated_at: string;
}

export interface CreateStageInput {
  name: string;
  scoring_type: ScoringType;
  paper_targets?: number;
  steel_targets?: number;
  no_shoot_targets?: number;
  npm_targets?: number;
  hits_per_paper?: number;
  par_time?: number | null;
  briefing?: string | null;
  config?: StageConfig;
}

// ── Match ──────────────────────────────────────────────────────────────────

export type Organization =
  | 'IPSC' | 'USPSA' | 'IDPA' | '3GUN' | 'NRL22' | 'PRS' | 'NRA' | 'USA_ARCHERY';

export type FirearmType = 'handgun' | 'rifle' | 'pcc' | 'shotgun' | 'combined' | 'bow';

export type MatchLevel = 1 | 2 | 3 | 4 | 5;

export interface Match {
  id: string;
  name: string;
  date: string;
  organization: Organization;
  firearm_type: FirearmType;
  match_level: MatchLevel | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchSummary {
  total_shots: number;
  total_points: number;
  total_paper: number;
  total_steel: number;
  total_no_shoot: number;
}

export interface MatchDetail extends Match {
  stages: Stage[];
  shooter_count: number;
  summary: MatchSummary;
}

export interface CreateMatchInput {
  name: string;
  date: string;
  organization: Organization;
  firearm_type: FirearmType;
  match_level?: MatchLevel | null;
}
