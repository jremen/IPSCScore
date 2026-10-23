import type { ScoringType } from '../types/stage';
import type { StageForm } from '../components/stage/types';

export function emptyStageForm(): StageForm {
  return {
    name: '',
    scoring_type: 'comstock',
    paper_targets: 0,
    steel_targets: 0,
    no_shoot_targets: 0,
    npm_targets: 0,
    hits_per_paper: 2,
    par_time: null,
    config: {},
    password: '',
    briefing: '',
  };
}

export function getVisibleStageFields(type: ScoringType) {
  const ipsc = ['comstock', 'virginia', 'fixed_time', 'hit_factor', 'chrono', 'idpa'];
  if (ipsc.includes(type)) {
    return {
      paperTargets: true,
      steelTargets: true,
      noShootTargets: true,
      npmTargets: true,
      hitsPerPaper: true,
      parTime: type === 'fixed_time',
      config: false,
    };
  }
  switch (type) {
    case 'action_steel':
    case 'multi_gun':
    case 'long_range':
    case 'bullseye':
    case 'archery':
    case 'nrl22':
    case 'issf':
      return {
        paperTargets: false,
        steelTargets: false,
        noShootTargets: false,
        npmTargets: false,
        hitsPerPaper: false,
        parTime: false,
        config: true,
      };
    default:
      return {
        paperTargets: true,
        steelTargets: true,
        noShootTargets: true,
        npmTargets: true,
        hitsPerPaper: true,
        parTime: false,
        config: false,
      };
  }
}
