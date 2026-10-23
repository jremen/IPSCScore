import type { PaperTotalField } from '../types';

export interface PaperZoneField {
  field: PaperTotalField;
  label: string;
  color: string;
}

const ZONE_CONFIG: PaperZoneField[] = [
  { field: 'alpha', label: 'A', color: 'border-green-500 focus:ring-green-400' },
  { field: 'charlie', label: 'C', color: 'border-yellow-500 focus:ring-yellow-400' },
  { field: 'delta', label: 'D', color: 'border-orange-500 focus:ring-orange-400' },
  { field: 'miss', label: 'M', color: 'border-red-500 focus:ring-red-400' },
];

export function getPaperZoneFields(hasNoShootTargets: boolean): PaperZoneField[] {
  return hasNoShootTargets
    ? [...ZONE_CONFIG, { field: 'no_shoot_hits', label: 'PT', color: 'border-red-500 focus:ring-red-400' }]
    : ZONE_CONFIG;
}
