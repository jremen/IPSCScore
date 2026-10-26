/**
 * Which stage value decides the stage winner.
 *
 * Kept next to the results code so the combined ("all divisions") ranking
 * classifies stages exactly like `recalculateStage` does when it stores the
 * division-relative `stage_points`.
 */
export type StageRankingMode = 'hit_factor' | 'net_points' | 'time' | 'none';

export function stageRankingMode(scoringType: string | null | undefined): StageRankingMode {
  switch (scoringType) {
    case 'comstock':
    case 'virginia':
    case 'hit_factor':
      return 'hit_factor';
    case 'fixed_time':
    case 'bullseye':
    case 'archery':
    case 'issf':
    case 'long_range':
    case 'nrl22':
      return 'net_points';
    case 'idpa':
    case 'action_steel':
    case 'multi_gun':
      return 'time';
    default:
      return 'none';
  }
}
