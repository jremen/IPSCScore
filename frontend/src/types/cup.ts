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

export interface CupResultRow {
  position: number;
  shooter_id: string;
  first_name: string;
  last_name: string;
  tag: string | null;
  division: string;
  category: string;
  matches_count: number;
  matches_required: number;
  time: number | null;
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot: number;
  procedurals: number;
  match_percent: number;
  match_points: number | null;
  hit_factor: number | null;
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