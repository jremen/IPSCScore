import { SCORING_TYPES, translateItem } from './constants';

export function getScoringTypeLabel(type: string, t: (key: string) => string): string {
  const found = SCORING_TYPES.find((scoringType) => scoringType.value === type);
  if (!found) return type;
  return translateItem(t, found);
}
