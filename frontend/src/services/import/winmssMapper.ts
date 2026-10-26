/**
 * WinMSS ID → IPSCScore value mappings for the mobile importers.
 *
 * Mirrors the relevant parts of `backend/src/utils/winmssMapper.ts`. Keep the
 * two maps in sync when WinMSS adds a division or category.
 */

export const WINMSS_DIVISION_MAP: Record<number, string> = {
  1: 'open',
  2: 'standard',
  3: 'open', // WinMSS Modified → Open
  4: 'production',
  5: 'revolver',
  18: 'classic',
  24: 'production_optics',
  29: 'pcc_optics',
  31: 'pcc_iron',
  50: 'optics',
};

export const WINMSS_CATEGORY_MAP: Record<number, string> = {
  0: 'regular',
  1: 'lady',
  2: 'junior',
  3: 'senior',
  4: 'super_senior',
  5: 'junior', // WinMSS "S. Junior" → junior
};

const WINMSS_FIREARM_MAP: Record<number, string> = {
  1: 'handgun',
  2: 'rifle',
  3: 'shotgun',
  4: 'pcc',
  5: 'handgun',
  6: 'rifle',
  7: 'pcc',
};

export type WinMssScoringType = 'comstock' | 'virginia' | 'fixed_time' | 'chrono';

/** WinMSS firearm type ID → IPSCScore firearm type string. */
export function mapFirearmType(typeFirearmId: number | string | undefined | null): string {
  if (typeFirearmId === undefined || typeFirearmId === null) return 'handgun';
  const id = typeof typeFirearmId === 'string' ? parseInt(typeFirearmId, 10) : typeFirearmId;
  return WINMSS_FIREARM_MAP[id] || 'handgun';
}

/** Determine the scoring type from WinMSS stage data. */
export function inferScoringType(stage: {
  paperTargets?: number;
  steelTargets?: number;
  minRounds?: number;
  parTime?: number | null;
  scoringTypeId?: number | string | null;
}): WinMssScoringType {
  // WinMSS scoring type IDs: 1=Comstock, 2=Virginia Count, 3=Fixed Time, 4=Chrono
  const stId = stage.scoringTypeId;
  if (stId !== undefined && stId !== null) {
    const id = typeof stId === 'string' ? parseInt(stId, 10) : stId;
    if (id === 1) return 'comstock';
    if (id === 2) return 'virginia';
    if (id === 3) return 'fixed_time';
    if (id === 4) return 'chrono';
  }
  if (stage.parTime && stage.parTime > 0) return 'fixed_time';
  return 'comstock';
}

/** Hits per paper target — always 2 for IPSC/USPSA/IDPA paper targets. */
export function inferHitsPerPaper(): number {
  return 2;
}
