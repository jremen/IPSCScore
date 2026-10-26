/**
 * WinMSS .cab parser for the browser/WebView runtime.
 *
 * A WinMSS .cab export is a ZIP archive containing Microsoft ADO/XML rowset
 * files. Every data row is a `<z:row ... />` element whose attributes are the
 * WinMSS column values. The archive uses short uppercase filenames:
 *
 *   THEMATCH.XML  → tblMatch
 *   MEMBER.XML    → tblMember
 *   ENROLLED.XML  → tblMatchCompetitor
 *   STAGE.XML     → tblMatchStage
 *   SCORE.XML     → tblMatchStageScore
 *
 * Mirrors `backend/src/utils/winmssCabParser.ts` so desktop and mobile imports
 * produce identical matches. Rows are parsed directly (the ADO rowset shape is
 * extremely regular) to keep the mobile bundle small.
 */

import { unzipSync } from 'fflate';
import { extractCabEntries, isMicrosoftCab, isZipArchive } from './cabArchive';

export interface WinMssCabMatch {
  matchId: number;
  name: string;
  date: string;
  level: number | null;
  firearmId: number;
}

export interface WinMssCabMember {
  memberId: number;
  lastName: string;
  firstName: string;
  region: string;
  email: string;
  female: boolean;
  defaultDivisionId: number | null;
  defaultCategoryId: number | null;
}

export interface WinMssCabEnrollment {
  matchId: number;
  memberId: number;
  competitorId: number | null;
  divisionId: number | null;
  categoryId: number | null;
  squadId: number | null;
  tagId: number | null;
  majorPowerFactor: boolean;
  isDisqualified: boolean;
  stageDisqualified: boolean;
  disqualificationRuleId: number | null;
  disqualificationMemo: string;
}

export interface WinMssCabStage {
  matchId: number;
  stageId: number;
  name: string;
  firearmId: number;
  courseId: number | null;
  scoringId: number | null;
  removed: boolean;
  paperTargets: number;
  popperTargets: number;
  plateTargets: number;
  vanishingTargets: number;
  penaltyTargets: number;
  minRounds: number;
  maxPoints: number;
  startPosition: string;
  description: string;
}

export interface WinMssCabScore {
  matchId: number;
  stageId: number;
  memberId: number;
  alpha: number;
  bravo: number;
  charlie: number;
  delta: number;
  misses: number;
  penalties: number;
  proceduralErrors: number;
  time: number;
  removed: boolean;
  deduction: boolean;
  flagForDelete: boolean;
  isDisqualified: boolean;
  deductionPercent: number;
  extraShots: number;
  overtimeShots: number;
  hitFactor: number | null;
  finalScore: number | null;
  lastModified: string;
  noVerify: boolean;
}

export interface WinMssCabData {
  format: 'cab';
  match: WinMssCabMatch;
  members: WinMssCabMember[];
  enrollments: WinMssCabEnrollment[];
  stages: WinMssCabStage[];
  scores: WinMssCabScore[];
  /** Data-row filenames present in the archive (uppercase basenames). */
  files: string[];
  /** Parsed column names per rowset file, for the debug inspector. */
  columns: Record<string, string[]>;
  warnings: string[];
}

export class WinMssCabParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WinMssCabParseError';
  }
}

const REQUIRED_FILES = ['THEMATCH.XML', 'MEMBER.XML', 'ENROLLED.XML', 'STAGE.XML', 'SCORE.XML'] as const;

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code.startsWith('#')) {
      const hex = code[1]?.toLowerCase() === 'x';
      const parsed = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match;
    }
    return ENTITY_MAP[code] ?? match;
  });
}

/** Parse every `<z:row>` element in an ADO rowset document. */
export function parseWinMssCabRows(xml: string): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  const tagPattern = /<z:row\b/gi;
  const attrPattern = /([A-Za-z_][\w.:-]*)\s*=\s*(['"])([\s\S]*?)\2/g;

  while (tagPattern.exec(xml) !== null) {
    // Find the closing '>' without being confused by attribute values that
    // contain '>' (valid XML and common in stage descriptions).
    let cursor = tagPattern.lastIndex;
    let quote: string | null = null;
    while (cursor < xml.length) {
      const char = xml[cursor];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === "'" || char === '"') {
        quote = char;
      } else if (char === '>') {
        break;
      }
      cursor++;
    }
    if (cursor >= xml.length) break;

    const attributes = xml.slice(tagPattern.lastIndex, cursor);
    const row: Record<string, string> = {};
    attrPattern.lastIndex = 0;
    for (const attrMatch of attributes.matchAll(attrPattern)) {
      row[attrMatch[1]] = decodeXmlEntities(attrMatch[3]);
    }
    rows.push(row);

    tagPattern.lastIndex = cursor + 1;
  }

  return rows;
}

/** Read the declared column names from the ADO schema block. */
export function extractWinMssCabColumns(xml: string): string[] {
  const columns: string[] = [];
  const pattern = /<s:AttributeType\b[^>]*\bname\s*=\s*(['"])(.*?)\1/gi;
  for (const match of xml.matchAll(pattern)) {
    if (!columns.includes(match[2])) columns.push(match[2]);
  }
  return columns;
}

function text(row: Record<string, string>, key: string): string {
  return (row[key] ?? '').trim();
}

function integer(row: Record<string, string>, key: string): number {
  const value = Number(text(row, key));
  return Number.isFinite(value) ? value : 0;
}

function optionalInteger(row: Record<string, string>, key: string): number | null {
  const raw = text(row, key);
  if (raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function decimal(row: Record<string, string>, key: string): number {
  const value = Number(text(row, key));
  return Number.isFinite(value) ? value : 0;
}

function optionalDecimal(row: Record<string, string>, key: string): number | null {
  const raw = text(row, key);
  if (raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** WinMSS/ADO booleans are True/False, 1/0, or Access -1/0. */
function bool(row: Record<string, string>, key: string): boolean {
  const value = text(row, key).toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'y' || value === '-1';
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
  );
}

/**
 * WinMSS stores dates either as ISO (`2026-10-24T00:00:00`, CAB exports) or
 * localized access strings (`23.05.2010, 00:00:00`, table exports).
 */
export function parseWinMssCabDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (validCalendarDate(year, month, day)) {
      return localIsoDate(new Date(year, month - 1, day));
    }
    return null;
  }

  const european = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (european) {
    const day = Number(european[1]);
    const month = Number(european[2]);
    const year = Number(european[3]);
    if (validCalendarDate(year, month, day)) {
      return localIsoDate(new Date(year, month - 1, day));
    }
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : localIsoDate(parsed);
}

function normalizeLevel(raw: string): number | null {
  const level = Number(raw);
  if (!Number.isFinite(level) || level < 1 || level > 5) return null;
  return Math.trunc(level);
}

function memberName(member: WinMssCabMember): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

function decodeXmlBytes(data: Uint8Array): string {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(data.subarray(2)).replace(/^\uFEFF/, '');
  }
  if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
    const swapped = data.slice(2);
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const first = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = first;
    }
    return new TextDecoder('utf-16le').decode(swapped).replace(/^\uFEFF/, '');
  }
  return new TextDecoder('utf-8').decode(data).replace(/^\uFEFF/, '');
}

/**
 * Parse a WinMSS .cab archive into normalized match data.
 *
 * WinMSS writes real Microsoft Cabinet (`MSCF`) files, but ZIP-wrapped
 * exports are accepted too. Throws `WinMssCabParseError` when the archive is
 * unreadable or required rowsets are missing; recoverable data issues are
 * reported in `warnings`.
 */
export async function parseWinMssCab(buffer: Uint8Array): Promise<WinMssCabData> {
  let files: string[];
  let readXml: (name: string) => string;

  if (isMicrosoftCab(buffer)) {
    let entries;
    try {
      entries = await extractCabEntries(buffer);
    } catch (err: any) {
      throw new WinMssCabParseError(`Could not read WinMSS .cab archive: ${err.message}`);
    }

    const byName = new Map<string, Uint8Array>();
    for (const entry of entries) {
      const base = entry.name.split('/').pop()?.toUpperCase();
      if (base && !byName.has(base)) byName.set(base, entry.data);
    }
    files = [...byName.keys()].sort();
    readXml = (name: string): string => {
      const data = byName.get(name);
      if (!data) throw new WinMssCabParseError(`CAB archive is missing ${name}`);
      return decodeXmlBytes(data);
    };
  } else if (isZipArchive(buffer)) {
    let zip: Record<string, Uint8Array>;
    try {
      zip = unzipSync(buffer);
    } catch (err: any) {
      throw new WinMssCabParseError(`File is not a valid WinMSS archive: ${err.message}`);
    }

    const byName = new Map<string, Uint8Array>();
    for (const [name, data] of Object.entries(zip)) {
      const base = name.split('/').pop()?.toUpperCase();
      if (base && !byName.has(base)) byName.set(base, data);
    }
    files = [...byName.keys()].sort();
    readXml = (name: string): string => {
      const data = byName.get(name);
      if (!data) throw new WinMssCabParseError(`CAB archive is missing ${name}`);
      return decodeXmlBytes(data);
    };
  } else {
    throw new WinMssCabParseError(
      'File is not a WinMSS .cab archive (expected a Microsoft Cabinet or ZIP file)',
    );
  }

  const availableDataFiles = files.filter((name) => name.endsWith('.XML'));
  const missing = REQUIRED_FILES.filter((name) => !files.includes(name));
  if (missing.length > 0) {
    throw new WinMssCabParseError(
      `CAB archive is missing required WinMSS exports: ${missing.join(', ')}. Found: ${availableDataFiles.join(', ') || 'none'}`,
    );
  }

  const xml = {
    match: readXml('THEMATCH.XML'),
    member: readXml('MEMBER.XML'),
    enrolled: readXml('ENROLLED.XML'),
    stage: readXml('STAGE.XML'),
    score: readXml('SCORE.XML'),
  };

  const columns: Record<string, string[]> = {
    THEMATCH: extractWinMssCabColumns(xml.match),
    MEMBER: extractWinMssCabColumns(xml.member),
    ENROLLED: extractWinMssCabColumns(xml.enrolled),
    STAGE: extractWinMssCabColumns(xml.stage),
    SCORE: extractWinMssCabColumns(xml.score),
  };

  const warnings: string[] = [];
  const matchRows = parseWinMssCabRows(xml.match);
  if (matchRows.length === 0) {
    throw new WinMssCabParseError('THEMATCH.XML contains no match row');
  }
  if (matchRows.length > 1) {
    warnings.push(
      `CAB archive contains ${matchRows.length} match rows; importing only the first (MatchId=${integer(matchRows[0], 'MatchId')})`,
    );
  }

  const firstMatch = matchRows[0];
  const matchId = integer(firstMatch, 'MatchId');
  const rawDate = text(firstMatch, 'MatchDt');
  const date = parseWinMssCabDate(rawDate);
  if (!date) {
    warnings.push(`Match "${text(firstMatch, 'MatchName')}" has invalid or missing date; using current date`);
  }

  const match: WinMssCabMatch = {
    matchId,
    name: text(firstMatch, 'MatchName') || 'WinMSS Match',
    date: date || localIsoDate(new Date()),
    level: normalizeLevel(text(firstMatch, 'MatchLevel')),
    firearmId: integer(firstMatch, 'FirearmId'),
  };

  const memberRows = parseWinMssCabRows(xml.member)
    .map((row) => ({
      memberId: integer(row, 'MemberId'),
      lastName: text(row, 'Lastname'),
      firstName: text(row, 'Firstname'),
      region: text(row, 'RegionId'),
      email: text(row, 'Email'),
      female: bool(row, 'Female'),
      defaultDivisionId: optionalInteger(row, 'DfltDivId'),
      defaultCategoryId: optionalInteger(row, 'DfltCatId'),
    }))
    .filter((member) => member.memberId > 0)
    .filter((member) => {
      if (member.firstName || member.lastName) return true;
      warnings.push(`Skipping member ${member.memberId}: first and last name are empty`);
      return false;
    });

  const membersById = new Map<number, WinMssCabMember>();
  for (const member of memberRows) {
    if (membersById.has(member.memberId)) {
      warnings.push(`Duplicate MEMBER.XML row for MemberId ${member.memberId}; using the last row`);
    }
    membersById.set(member.memberId, member);
  }
  const members = [...membersById.values()];

  const enrollmentRows = parseWinMssCabRows(xml.enrolled).filter(
    (row) => matchId <= 0 || integer(row, 'MatchId') === matchId,
  );
  const enrollments: WinMssCabEnrollment[] = enrollmentRows.map((row) => ({
    matchId: integer(row, 'MatchId'),
    memberId: integer(row, 'MemberId'),
    competitorId: optionalInteger(row, 'CompId'),
    divisionId: optionalInteger(row, 'DivId'),
    categoryId: optionalInteger(row, 'CatId'),
    squadId: optionalInteger(row, 'SquadId'),
    tagId: optionalInteger(row, 'TagId'),
    majorPowerFactor: bool(row, 'MajorPF'),
    isDisqualified: bool(row, 'IsDisq'),
    stageDisqualified: bool(row, 'StageDisq'),
    disqualificationRuleId: optionalInteger(row, 'DisqRuleId'),
    disqualificationMemo: text(row, 'DisqMemo'),
  }));

  const stageRows = parseWinMssCabRows(xml.stage).filter(
    (row) => matchId <= 0 || integer(row, 'MatchId') === matchId,
  );
  const stages: WinMssCabStage[] = stageRows.map((row) => ({
    matchId: integer(row, 'MatchId'),
    stageId: integer(row, 'StageId'),
    name: text(row, 'StageName') || `Stage ${integer(row, 'StageId')}`,
    firearmId: integer(row, 'FirearmId'),
    courseId: optionalInteger(row, 'CourseId'),
    scoringId: optionalInteger(row, 'ScoringId'),
    removed: bool(row, 'Remove'),
    paperTargets: integer(row, 'TrgtPaper'),
    popperTargets: integer(row, 'TrgtPopper'),
    plateTargets: integer(row, 'TrgtPlates'),
    vanishingTargets: integer(row, 'TrgtVanish'),
    penaltyTargets: integer(row, 'TrgtPenlty'),
    minRounds: integer(row, 'MinRounds'),
    maxPoints: integer(row, 'MaxPoints'),
    startPosition: text(row, 'StartPos'),
    description: text(row, 'Descriptn'),
  }));

  const scoreRows = parseWinMssCabRows(xml.score).filter(
    (row) => matchId <= 0 || integer(row, 'MatchId') === matchId,
  );
  const scores: WinMssCabScore[] = scoreRows.map((row) => ({
    matchId: integer(row, 'MatchId'),
    stageId: integer(row, 'StageId'),
    memberId: integer(row, 'MemberId'),
    alpha: integer(row, 'ScoreA'),
    bravo: integer(row, 'ScoreB'),
    charlie: integer(row, 'ScoreC'),
    delta: integer(row, 'ScoreD'),
    misses: integer(row, 'Misses'),
    penalties: integer(row, 'Penalties'),
    proceduralErrors: integer(row, 'ProcError'),
    time: decimal(row, 'ShootTime'),
    removed: bool(row, 'Remove'),
    deduction: bool(row, 'Deduction'),
    flagForDelete: bool(row, 'FlagDelete'),
    isDisqualified: bool(row, 'IsDisq'),
    deductionPercent: decimal(row, 'DedPctg'),
    extraShots: integer(row, 'ExtraShot'),
    overtimeShots: integer(row, 'OverTime'),
    hitFactor: optionalDecimal(row, 'HitFactor'),
    finalScore: optionalDecimal(row, 'FinalScore'),
    lastModified: text(row, 'LastModify'),
    noVerify: bool(row, 'NoVerify'),
  }));

  const enrolledMemberIds = new Set(enrollments.map((enrollment) => enrollment.memberId));
  if (enrollments.length === 0) {
    warnings.push('ENROLLED.XML contains no enrollment rows for this match');
  }
  if (stages.length === 0) {
    warnings.push('STAGE.XML contains no stage rows for this match');
  }
  if (scores.length === 0) {
    warnings.push('SCORE.XML contains no score rows for this match');
  }

  const enrolledMemberNames = new Set(
    members.filter((member) => enrolledMemberIds.has(member.memberId)).map(memberName),
  );
  if (enrolledMemberNames.size === 0 && enrollments.length > 0) {
    warnings.push('No enrolled members could be resolved against MEMBER.XML');
  }

  return {
    format: 'cab',
    match,
    members,
    enrollments,
    stages,
    scores,
    files,
    columns,
    warnings,
  };
}
