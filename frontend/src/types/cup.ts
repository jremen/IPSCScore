export type CupScoringMode = 'hit_factor' | 'points';

export interface Cup {
  id: string;
  name: string;
  scoring_mode: CupScoringMode;
  minimum_matches: number | null;
  minimum_participants: number | null;
  selected_categories: string[] | null;
  created_at: string;
  updated_at: string;
  match_count: number;
}

export interface CupMatchRef {
  id: string;
  name: string;
  date: string;
  organization: string;
  firearm_type: string;
}

export interface CupDetail extends Cup {
  matches: CupMatchRef[];
}

export interface CreateCupInput {
  name: string;
  scoring_mode: CupScoringMode;
  minimum_matches?: number | null;
  minimum_participants?: number | null;
  selected_categories?: string[] | null;
  matchIds?: string[];
}

export type CupMatchStatus = 'counted' | 'excluded' | 'none';

export interface CupMatchResult {
  match_id: string;
  status: CupMatchStatus;
  /** Hit Factor mode: net points of the match (counted or excluded). */
  net_points?: number | null;
  /** Hit Factor mode: time of hit-factor stages in the match. */
  time?: number | null;
  /** Points mode: match points (counted or excluded). */
  points?: number | null;
}

export interface CupResultRow {
  position: number;
  shooter_id: string;
  first_name: string;
  last_name: string;
  tag: string | null;
  division: string;
  category: string;
  /** Hit Factor mode: total net points over counted matches; null in points mode. */
  net_points: number | null;
  /** Hit Factor mode: total hit-factor time over counted matches; null in points mode. */
  time: number | null;
  match_percent: number;
  match_points: number | null;
  hit_factor: number | null;
  matches: CupMatchResult[];
}

export interface CupResultsPayload {
  cup: { id: string; name: string };
  scoring_mode: CupScoringMode;
  minimum_matches: number;
  minimum_participants: number | null;
  selected_categories: string[] | null;
  matches: CupMatchRef[];
  results: {
    byDivision: Record<string, CupResultRow[]>;
    overall: CupResultRow[];
    byCategory: Record<string, Record<string, CupResultRow[]>>;
    byTag: Record<string, Record<string, CupResultRow[]>>;
  };
}