/**
 * Division applicability for a match.
 *
 * Mirrors `frontend/src/utils/constants.ts`. Results and registration code use
 * this to ignore divisions for archery and to replace an inherited division
 * that does not belong to the match's organization with a sensible default.
 */

export interface MatchDivisionContext {
  organization?: string | null;
  firearm_type?: string | null;
}

const ORGANIZATION_DIVISIONS: Record<string, string[]> = {
  IPSC: ['standard', 'open', 'production', 'production_optics', 'optics', 'classic', 'revolver', 'pcc_optics', 'pcc_iron', 'pistol_trening', 'pcc_trening'],
  USPSA: ['open', 'limited', 'limited_optics', 'carry_optics', 'production', 'single_stack', 'revolver', 'pcc_optics', 'pcc_iron'],
  IDPA: ['ssp', 'esp', 'cdp', 'ccp', 'bug', 'revolver_idpa'],
  '3GUN': ['tactical', 'open_3gun', 'heavy'],
  PRS: ['open_prs', 'production_prs'],
  NRL22: ['any', 'irons', 'open_22'],
  NRA: ['conventional', 'international'],
  USA_ARCHERY: [],
  ISSF: [],
};

const FIREARM_DIVISIONS: Record<string, string[]> = {
  rifle: ['sa_standard', 'sa_open', 'mac', 'mab'],
  shotgun: ['shotgun_open', 'shotgun_modified', 'shotgun_standard', 'shotgun_standard_manual'],
};

const ALL_DIVISIONS = [
  'standard', 'open', 'production', 'production_optics', 'optics', 'classic', 'revolver', 'pcc_optics', 'pcc_iron',
  'pistol_trening', 'pcc_trening',
  'limited', 'limited_optics', 'carry_optics', 'single_stack',
  'ssp', 'esp', 'cdp', 'ccp', 'bug', 'revolver_idpa',
  'tactical', 'open_3gun', 'heavy',
  'open_prs', 'production_prs',
  'any', 'irons', 'open_22',
  'conventional', 'international',
  'sa_standard', 'sa_open', 'mac', 'mab',
  'shotgun_open', 'shotgun_modified', 'shotgun_standard', 'shotgun_standard_manual',
];

/** Division values that apply to a match. Empty means divisions are ignored. */
export function divisionsForMatch(match: MatchDivisionContext | null | undefined): string[] {
  const firearmType = match?.firearm_type;
  const organization = match?.organization;
  // Sports without divisions ignore both the firearm type and inherited
  // divisions (ISSF rifle still has no IPSC-style divisions).
  if (organization && ORGANIZATION_DIVISIONS[organization]?.length === 0) return [];
  if (firearmType === 'bow') return [];
  // IPSC rifle/shotgun use firearm-specific divisions instead of the
  // handgun/PCC list. Other organizations that define their own divisions
  // (NRL22, PRS, NRA, …) keep them even when the firearm type is rifle.
  if (organization === 'IPSC' && firearmType && FIREARM_DIVISIONS[firearmType]) {
    return FIREARM_DIVISIONS[firearmType];
  }
  if (organization && ORGANIZATION_DIVISIONS[organization]) {
    return ORGANIZATION_DIVISIONS[organization];
  }
  if (firearmType && FIREARM_DIVISIONS[firearmType]) {
    return FIREARM_DIVISIONS[firearmType];
  }
  return ALL_DIVISIONS;
}

export function matchHasDivisions(match: MatchDivisionContext | null | undefined): boolean {
  return divisionsForMatch(match).length > 0;
}

/** Default division when an inherited/submitted division is not applicable. */
export function defaultDivisionForMatch(match: MatchDivisionContext | null | undefined): string | null {
  const divisions = divisionsForMatch(match);
  if (divisions.length === 0) return null;
  if (match?.organization === 'NRL22' && divisions.includes('irons')) return 'irons';
  return divisions[0];
}

/**
 * Resolve the division used for a registration. A valid explicit match
 * override wins; otherwise invalid inherited divisions fall back to the
 * match's default. Returns null when the match has no divisions.
 */
export function resolveDivisionForMatch(
  match: MatchDivisionContext | null | undefined,
  ...candidates: Array<string | null | undefined>
): string | null {
  const divisions = divisionsForMatch(match);
  if (divisions.length === 0) return null;
  for (const candidate of candidates) {
    if (candidate && divisions.includes(candidate)) return candidate;
  }
  return defaultDivisionForMatch(match);
}
