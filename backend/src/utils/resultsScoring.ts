/**
 * Result presentation profiles for the HTTP backend.
 *
 * Mirrors `frontend/src/utils/resultsProfile.ts`. The backend only needs the
 * profile and ring-value set; the frontend decides which columns to render.
 */

export type ResultsProfile = 'zone' | 'ring' | 'hit_count';

export interface StageScoringRow {
  scoring_type: string;
  config?: any;
}

function configOf(config: any): any {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
  return config;
}

/** Ring values used by a ring-scored stage. 0 is the miss entry. */
export function ringValuesForStage(scoringType: string, config?: any): number[] {
  switch (scoringType) {
    case 'archery':
      return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    case 'issf':
      return [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    case 'long_range':
      return configOf(config)?.variant === 'f_class'
        ? [11, 10, 9, 8, 7, 6, 5, 0]
        : [];
    case 'bullseye':
      return [11, 10, 9, 8, 7, 6, 5, 0];
    default:
      return [];
  }
}

export function stageScoringProfile(scoringType: string, config?: any): ResultsProfile {
  switch (scoringType) {
    case 'bullseye':
    case 'archery':
    case 'issf':
      return 'ring';
    case 'long_range':
      return configOf(config)?.variant === 'f_class' ? 'ring' : 'hit_count';
    case 'nrl22':
      return 'hit_count';
    default:
      return 'zone';
  }
}

export interface MatchScoringMeta {
  profile: ResultsProfile;
  ring_values: number[];
}

/** One profile for the whole match. Mixed profiles fall back to zones. */
export function buildScoringMeta(stages: StageScoringRow[]): MatchScoringMeta {
  const relevant = stages.filter((stage) => stage?.scoring_type && stage.scoring_type !== 'chrono');
  const profiles = relevant.map((stage) => stageScoringProfile(stage.scoring_type, stage.config));
  const profile: ResultsProfile = profiles.length > 0 && profiles.every((value) => value === profiles[0])
    ? profiles[0]
    : 'zone';

  if (profile !== 'ring') return { profile, ring_values: [] };

  const values = new Set<number>();
  for (const stage of relevant) {
    for (const value of ringValuesForStage(stage.scoring_type, stage.config)) {
      values.add(value);
    }
  }
  return { profile, ring_values: [...values].sort((a, b) => b - a) };
}

export function parseJsonValue(value: any): any {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}
