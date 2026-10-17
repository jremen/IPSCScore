import type { Organization, PowerFactor } from '../domain';
import { MAJOR_PF_THRESHOLD_IPSC, MAJOR_PF_THRESHOLD_USPSA, MINOR_PF_THRESHOLD } from './pointValues';

/** Power factor = (bullet weight × average velocity) / 1000. */
export function calculateChronoPf(
  bulletWeight: number,
  v1: number | null,
  v2: number | null,
  v3: number | null,
): { avgVelocity: number; calculatedPf: number } {
  const velocities = [v1, v2, v3].filter((v): v is number => v !== null && v > 0);
  if (velocities.length === 0) return { avgVelocity: 0, calculatedPf: 0 };

  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const calculatedPf = (bulletWeight * avgVelocity) / 1000;

  return {
    avgVelocity: Math.round(avgVelocity * 10) / 10,
    calculatedPf: Math.round(calculatedPf * 100) / 100,
  };
}

/**
 * Decide whether a chrono result meets the declared power factor, and whether the
 * shooter should be reclassified down to minor.
 */
export function checkPfPassed(
  calculatedPf: number,
  declaredPf: PowerFactor,
  organization: Organization,
): { passed: boolean; reclassifyTo: PowerFactor | null } {
  const majorThreshold = organization === 'IPSC'
    ? MAJOR_PF_THRESHOLD_IPSC
    : MAJOR_PF_THRESHOLD_USPSA;

  if (declaredPf === 'major') {
    if (calculatedPf >= majorThreshold) return { passed: true, reclassifyTo: null };
    if (calculatedPf >= MINOR_PF_THRESHOLD) return { passed: false, reclassifyTo: 'minor' };
    return { passed: false, reclassifyTo: null }; // below minor → potential DQ
  }

  if (calculatedPf >= MINOR_PF_THRESHOLD) return { passed: true, reclassifyTo: null };
  return { passed: false, reclassifyTo: null };
}
