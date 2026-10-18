import type { PowerFactor } from '../domain';

export interface PointValues {
  alpha: number;
  charlie: number;
  delta: number;
  steel: number;
}

const MINOR: PointValues = { alpha: 5, charlie: 3, delta: 1, steel: 5 };
const MAJOR: PointValues = { alpha: 5, charlie: 4, delta: 2, steel: 5 };

/**
 * IPSC/USPSA zone values by power factor.
 * Steel is worth 5 regardless of power factor.
 */
export function getPointValues(pf: PowerFactor | string): PointValues {
  return pf === 'major' ? MAJOR : MINOR;
}

/** PF thresholds (IPSC major is stricter than USPSA). */
export const MINOR_PF_THRESHOLD = 125;
export const MAJOR_PF_THRESHOLD_IPSC = 170;
export const MAJOR_PF_THRESHOLD_USPSA = 165;
