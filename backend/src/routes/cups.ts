import { Hono } from 'hono';
import { sql } from '../db/client.js';
import { audit } from '../services/audit.js';

export const cupRoutes = new Hono();

const HF_SCORING_TYPES = ['comstock', 'virginia', 'hit_factor'];

const CUP_CATEGORIES = new Set(['regular', 'junior', 'senior', 'super_senior', 'lady']);

type ScoringMode = 'hit_factor' | 'points';

function isScoringMode(v: unknown): v is ScoringMode {
  return v === 'hit_factor' || v === 'points';
}

function num(v: any): number {
  return v == null ? 0 : Number(v);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ─── List cups ───────────────────────────────────────────────────────

cupRoutes.get('/', async (c) => {
  const cups = await sql`
    SELECT c.id, c.name, c.scoring_mode, c.minimum_matches, c.minimum_participants, c.selected_categories,
           c.created_at, c.updated_at,
           (SELECT COUNT(*) FROM cup_matches cm WHERE cm.cup_id = c.id) as match_count
    FROM cups c
    ORDER BY c.created_at DESC
  `;
  return c.json(cups.map((cup: any) => ({
    ...cup,
    match_count: Number(cup.match_count),
    minimum_matches: cup.minimum_matches != null ? Number(cup.minimum_matches) : null,
    minimum_participants: cup.minimum_participants != null ? Number(cup.minimum_participants) : null,
    selected_categories: Array.isArray(cup.selected_categories) ? cup.selected_categories : null,
  })));
});

type CupBodyResult =
  | {
      ok: true;
      name: string;
      scoring_mode: ScoringMode;
      minimum_matches: number | null;
      minimum_participants: number | null;
      selected_categories: string[] | null;
    }
  | { ok: false; error: string };

function parseCategories(value: unknown): { ok: true; value: string[] | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    return { ok: false, error: 'selected_categories must be an array of category names or null' };
  }
  const invalid = value.find((v) => !CUP_CATEGORIES.has(v));
  if (invalid != null) return { ok: false, error: `Unknown category: ${invalid}` };
  const unique = Array.from(new Set(value as string[]));
  return { ok: true, value: unique.length > 0 ? unique : null };
}

function parseCupBody(body: any): CupBodyResult {
  const { name, scoring_mode, minimum_matches, minimum_participants, selected_categories } = body ?? {};
  if (name == null || typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'name is required' };
  }
  if (!isScoringMode(scoring_mode)) {
    return { ok: false, error: 'scoring_mode must be "hit_factor" or "points"' };
  }
  if (minimum_matches != null && (!Number.isInteger(minimum_matches) || Number(minimum_matches) < 1)) {
    return { ok: false, error: 'minimum_matches must be a positive integer or null' };
  }
  if (minimum_participants != null && (!Number.isInteger(minimum_participants) || Number(minimum_participants) < 1)) {
    return { ok: false, error: 'minimum_participants must be a positive integer or null' };
  }
  const categories = parseCategories(selected_categories);
  if (!categories.ok) return categories;
  return {
    ok: true,
    name: name.trim(),
    scoring_mode,
    minimum_matches: minimum_matches != null ? Number(minimum_matches) : null,
    minimum_participants: minimum_participants != null ? Number(minimum_participants) : null,
    selected_categories: categories.value,
  };
}

async function getMatchesOf(cupId: string) {
  return sql`
    SELECT m.id, m.name, m.date, m.organization, m.firearm_type
    FROM cup_matches cm
    JOIN matches m ON m.id = cm.match_id
    WHERE cm.cup_id = ${cupId}
    ORDER BY m.date, m.created_at
  `;
}

async function assertHfCompatible(tx: any, matchIds: string[], scoring_mode: ScoringMode, currentIds: string[] = []): Promise<string | null> {
  if (scoring_mode !== 'hit_factor') return null;
  const ids = Array.from(new Set([...currentIds, ...matchIds]));
  if (ids.length === 0) return null;
  const incompatible = await tx`
    SELECT m.id, m.name
    FROM matches m
    WHERE m.id = ANY(${ids})
      AND NOT EXISTS (
        SELECT 1 FROM stages st
        WHERE st.match_id = m.id
          AND st.scoring_type = ANY(${HF_SCORING_TYPES})
      )
    ORDER BY m.date
  `;
  if (incompatible.length > 0) {
    return `Match "${incompatible[0].name}" has no hit-factor stages and cannot be part of a Hit Factor cup.`;
  }
  return null;
}

// ─── Create cup ──────────────────────────────────────────────────────

cupRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = parseCupBody(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const matchIds: string[] = Array.isArray(body.matchIds) ? body.matchIds.filter((id: any) => typeof id === 'string') : [];

  try {
    const cup = await sql.begin(async (tx) => {
      const incompat = await assertHfCompatible(tx, matchIds, parsed.scoring_mode);
      if (incompat) throw new Error(incompat);

      const [created] = await tx`
        INSERT INTO cups (name, scoring_mode, minimum_matches, minimum_participants, selected_categories)
        VALUES (${parsed.name}, ${parsed.scoring_mode}, ${parsed.minimum_matches}, ${parsed.minimum_participants}, ${parsed.selected_categories})
        RETURNING id, name, scoring_mode, minimum_matches, minimum_participants, selected_categories, created_at, updated_at
      `;
      for (const matchId of matchIds) {
        await tx`
          INSERT INTO cup_matches (cup_id, match_id)
          VALUES (${created.id}, ${matchId})
          ON CONFLICT (cup_id, match_id) DO NOTHING
        `;
      }
      return created;
    });
    await audit(c, 'cup.create', `cups:${cup.id}`, { name: cup.name, match_count: matchIds.length });
    return c.json(cup, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create cup' }, 400);
  }
});

// ─── Get cup + its matches ───────────────────────────────────────────

cupRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [cup] = await sql`SELECT * FROM cups WHERE id = ${id}`;
  if (!cup) return c.json({ error: 'Cup not found' }, 404);
  const matches = await getMatchesOf(id);
  return c.json({
    ...cup,
    minimum_matches: cup.minimum_matches != null ? Number(cup.minimum_matches) : null,
    minimum_participants: cup.minimum_participants != null ? Number(cup.minimum_participants) : null,
    selected_categories: Array.isArray(cup.selected_categories) ? cup.selected_categories : null,
    matches,
  });
});

// ─── Update cup (partial: only provided fields change) ───────────────

cupRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const [existing] = await sql`SELECT * FROM cups WHERE id = ${id}`;
  if (!existing) return c.json({ error: 'Cup not found' }, 404);

  const name = body.name !== undefined
    ? (typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null)
    : existing.name;
  if (name === null) return c.json({ error: 'name is required' }, 400);

  const scoring_mode = body.scoring_mode !== undefined
    ? (isScoringMode(body.scoring_mode) ? body.scoring_mode : null)
    : existing.scoring_mode as ScoringMode;
  if (scoring_mode === null) return c.json({ error: 'scoring_mode must be "hit_factor" or "points"' }, 400);

  let minimum_matches = existing.minimum_matches != null ? Number(existing.minimum_matches) : null;
  if (body.minimum_matches !== undefined) {
    if (body.minimum_matches === null) {
      minimum_matches = null;
    } else if (Number.isInteger(body.minimum_matches) && Number(body.minimum_matches) >= 1) {
      minimum_matches = Number(body.minimum_matches);
    } else {
      return c.json({ error: 'minimum_matches must be a positive integer or null' }, 400);
    }
  }

  let minimum_participants = existing.minimum_participants != null ? Number(existing.minimum_participants) : null;
  if (body.minimum_participants !== undefined) {
    if (body.minimum_participants === null) {
      minimum_participants = null;
    } else if (Number.isInteger(body.minimum_participants) && Number(body.minimum_participants) >= 1) {
      minimum_participants = Number(body.minimum_participants);
    } else {
      return c.json({ error: 'minimum_participants must be a positive integer or null' }, 400);
    }
  }

  let selected_categories: string[] | null =
    Array.isArray(existing.selected_categories) && existing.selected_categories.length > 0
      ? existing.selected_categories
      : null;
  if (body.selected_categories !== undefined) {
    const parsedCategories = parseCategories(body.selected_categories);
    if (!parsedCategories.ok) return c.json({ error: parsedCategories.error }, 400);
    selected_categories = parsedCategories.value;
  }

  try {
    await sql.begin(async (tx) => {
      if (scoring_mode === 'hit_factor') {
        const current = await tx`
          SELECT m.id, m.name
          FROM cup_matches cm JOIN matches m ON m.id = cm.match_id
          WHERE cm.cup_id = ${id}
        `;
        const incompat = await assertHfCompatible(tx, [], 'hit_factor', current.map((m: any) => m.id));
        if (incompat) throw new Error(incompat);
      }
      return tx`
        UPDATE cups
        SET name = ${name},
            scoring_mode = ${scoring_mode},
            minimum_matches = ${minimum_matches},
            minimum_participants = ${minimum_participants},
            selected_categories = ${selected_categories},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, scoring_mode, minimum_matches, minimum_participants, selected_categories, created_at, updated_at
      `;
    });
    const [updated] = await sql`SELECT * FROM cups WHERE id = ${id}`;
    await audit(c, 'cup.update', `cups:${id}`, { name });
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update cup' }, 400);
  }
});

// ─── Delete cup ──────────────────────────────────────────────────────

cupRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const [existing] = await sql`SELECT name FROM cups WHERE id = ${id}`;
  if (!existing) return c.json({ error: 'Cup not found' }, 404);
  await sql`DELETE FROM cups WHERE id = ${id}`;
  await audit(c, 'cup.delete', `cups:${id}`, { name: existing.name });
  return c.json({ deleted: true });
});

// ─── Add matches to cup ──────────────────────────────────────────────

cupRoutes.post('/:id/matches', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const matchIds: string[] = Array.isArray(body.matchIds) ? body.matchIds.filter((mid: any) => typeof mid === 'string') : [];
  if (matchIds.length === 0) return c.json({ error: 'matchIds is required' }, 400);

  const [cup] = await sql`SELECT * FROM cups WHERE id = ${id}`;
  if (!cup) return c.json({ error: 'Cup not found' }, 404);

  try {
    const result = await sql.begin(async (tx) => {
      const current = await tx`SELECT match_id FROM cup_matches WHERE cup_id = ${id}`;
      const currentIds = current.map((r: any) => r.match_id);
      const incompat = await assertHfCompatible(tx, matchIds, cup.scoring_mode, currentIds);
      if (incompat) throw new Error(incompat);

      for (const matchId of matchIds) {
        await tx`
          INSERT INTO cup_matches (cup_id, match_id)
          VALUES (${id}, ${matchId})
          ON CONFLICT (cup_id, match_id) DO NOTHING
        `;
      }
      return true;
    });
    await audit(c, 'cup.match.add', `cups:${id}`, { match_count: matchIds.length });
    return c.json({ success: result });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to add matches' }, 400);
  }
});

// ─── Remove match from cup ───────────────────────────────────────────

cupRoutes.delete('/:id/matches/:matchId', async (c) => {
  const { id, matchId } = c.req.param();
  await sql`DELETE FROM cup_matches WHERE cup_id = ${id} AND match_id = ${matchId}`;
  await audit(c, 'cup.match.remove', `cups:${id}`, { match_id: matchId });
  return c.json({ removed: true });
});

// ─── Cup standings ───────────────────────────────────────────────────

interface MatchAggRow {
  matchId: string;
  matchIndex: number;
  shooterId: string;
  firstName: string;
  lastName: string;
  tag: string | null;
  division: string;
  category: string;
  valid: boolean;
  metric: number;
  individual?: never;
  matchPoints: number;
  matchHf: number;
  netPoints: number;
  hfTime: number;
}

function compareStandings(a: any, b: any): number {
  if (b.score !== a.score) return b.score - a.score;
  const n = Math.max(a.individual.length, b.individual.length);
  for (let i = 0; i < n; i++) {
    const av = a.individual[i] ?? -1;
    const bv = b.individual[i] ?? -1;
    if (bv !== av) return bv - av;
  }
  const nameCmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
  if (nameCmp !== 0) return nameCmp;
  return a.shooterId.localeCompare(b.shooterId);
}

function rankRows(rows: any[], bestScore: number, mode: ScoringMode): any[] {
  return rows.map((r: any, i: number) => {
    const pub = { ...r };
    delete pub.score;
    delete pub.individual;
    delete pub.shooterId;
    return {
      ...pub,
      position: i + 1,
      match_percent: bestScore > 0 ? round2((r.score / bestScore) * 100) : 0,
      ...(mode === 'hit_factor'
        ? { hit_factor: round4(r.score), match_points: null }
        : { match_points: round2(r.score), hit_factor: null }),
    };
  });
}

/** Rank a group's qualified shooters; drop the group when below the participant threshold. */
function rankGroup(rows: any[], mode: ScoringMode, minParticipants: number | null): any[] | null {
  if (minParticipants != null && rows.length < minParticipants) return null;
  return rankRows(rows.slice(), rows[0].score, mode);
}

cupRoutes.get('/:id/results', async (c) => {
  const id = c.req.param('id');
  const [cup] = await sql`SELECT * FROM cups WHERE id = ${id}`;
  if (!cup) return c.json({ error: 'Cup not found' }, 404);
  const mode = cup.scoring_mode as ScoringMode;

  const matches = await sql`
    SELECT m.id, m.name, m.date, m.organization, m.firearm_type
    FROM cup_matches cm
    JOIN matches m ON m.id = cm.match_id
    WHERE cm.cup_id = ${id}
    ORDER BY m.date, m.created_at
  `;
  const minParticipants = cup.minimum_participants != null ? Number(cup.minimum_participants) : null;
  const selectedCategories: string[] | null =
    Array.isArray(cup.selected_categories) && cup.selected_categories.length > 0 ? cup.selected_categories : null;

  const emptyPayload = {
    cup: { id: cup.id, name: cup.name },
    scoring_mode: mode,
    minimum_matches: cup.minimum_matches != null ? Number(cup.minimum_matches) : null,
    minimum_participants: minParticipants,
    selected_categories: selectedCategories,
    matches: [],
    results: { byDivision: {}, overall: [], byCategory: {}, byTag: {} },
  };
  if (matches.length === 0) return c.json(emptyPayload);

  const required = cup.minimum_matches != null ? Number(cup.minimum_matches) : Math.floor(matches.length / 2) + 1;
  const matchIds = matches.map((m: any) => m.id);
  const matchIndex = new Map(matchIds.map((mid: string, i: number) => [mid, i]));

  const rows = await sql`
    WITH stage_totals AS (
      SELECT ss.registration_id, ss.match_id,
        SUM(ss.stage_points) as match_points,
        SUM(CASE WHEN st.scoring_type IN ('comstock','virginia','hit_factor') THEN ss.net_points ELSE 0 END) as hf_net_points,
        SUM(CASE WHEN st.scoring_type IN ('comstock','virginia','hit_factor') THEN ss.time ELSE 0 END) as hf_time,
        COUNT(ss.id) FILTER (WHERE ss.is_dnf = FALSE) as scored_stages
      FROM stage_scores ss
      JOIN stages st ON st.id = ss.stage_id
      WHERE ss.match_id = ANY(${matchIds})
      GROUP BY ss.registration_id, ss.match_id
    )
    SELECT
      mr.match_id, mr.shooter_id,
      s.first_name, s.last_name, s.tag,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      mr.is_dq,
      COALESCE(st.match_points, 0) as match_points,
      CASE WHEN COALESCE(st.hf_time, 0) > 0 THEN ROUND(st.hf_net_points / st.hf_time, 4) ELSE NULL END as match_hf,
      COALESCE(st.hf_net_points, 0) as hf_net_points,
      COALESCE(st.hf_time, 0) as hf_time,
      COALESCE(st.scored_stages, 0) as scored_stages
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    JOIN cup_matches cm ON cm.match_id = mr.match_id
    LEFT JOIN stage_totals st ON st.registration_id = mr.id AND st.match_id = mr.match_id
    WHERE cm.cup_id = ${id}
  `;

  const aggs: MatchAggRow[] = rows.map((r: any) => ({
    matchId: r.match_id,
    matchIndex: matchIndex.get(r.match_id) ?? 0,
    shooterId: r.shooter_id,
    firstName: r.first_name,
    lastName: r.last_name,
    tag: r.tag || null,
    division: r.division || 'unknown',
    category: r.category || 'regular',
    valid: !r.is_dq && num(r.scored_stages) > 0,
    metric: mode === 'hit_factor' ? (r.match_hf != null ? num(r.match_hf) : 0) : num(r.match_points),
    matchPoints: num(r.match_points),
    matchHf: num(r.match_hf),
    netPoints: num(r.hf_net_points),
    hfTime: num(r.hf_time),
  }));

  const shooters = new Map<string, { rows: MatchAggRow[] }>();
  for (const agg of aggs) {
    if (!shooters.has(agg.shooterId)) shooters.set(agg.shooterId, { rows: [] });
    shooters.get(agg.shooterId)!.rows.push(agg);
  }

  const qualified: any[] = [];

  for (const [shooterId, { rows: shooterRows }] of shooters) {
    const firstRow = shooterRows[0];
    const name = { shooterId, first_name: firstRow.firstName, last_name: firstRow.lastName };
    const tag = shooterRows.find((r) => r.tag)?.tag ?? null;
    // Season-start category: earliest chronological match registration
    const earliest = shooterRows.reduce((a, b) => (a.matchIndex <= b.matchIndex ? a : b));
    const category = earliest.category;

    const byDivision = new Map<string, MatchAggRow[]>();
    for (const r of shooterRows) {
      if (!byDivision.has(r.division)) byDivision.set(r.division, []);
      byDivision.get(r.division)!.push(r);
    }

    for (const [division, divRows] of byDivision) {
      const validRows = divRows.filter((r) => r.valid).sort((a, b) => b.metric - a.metric || a.matchIndex - b.matchIndex);

      const base = { ...name, tag, division, category };
      if (validRows.length >= required) {
        const counted = validRows.slice(0, required);
        const score = counted.reduce((sum, r) => sum + r.metric, 0);
        const individual = counted.slice().sort((a, b) => b.metric - a.metric).map((r) => r.metric);
        const countedIds = new Set(counted.map((r) => r.matchId));
        const rowByMatch = new Map(divRows.map((r) => [r.matchId, r]));

        const matchResults = matches.map((m: any) => {
          const matchRow = rowByMatch.get(m.id);
          if (!matchRow || !matchRow.valid) return { match_id: m.id, status: 'none' as const };
          const status = countedIds.has(m.id) ? ('counted' as const) : ('excluded' as const);
          return mode === 'hit_factor'
            ? { match_id: m.id, status, net_points: round2(matchRow.netPoints), time: round2(matchRow.hfTime) }
            : { match_id: m.id, status, points: round2(matchRow.matchPoints) };
        });

        qualified.push({
          ...base,
          shooter_id: shooterId,
          matches: matchResults,
          net_points: mode === 'hit_factor' ? round2(counted.reduce((s, r) => s + r.netPoints, 0)) : null,
          time: mode === 'hit_factor' ? round2(counted.reduce((s, r) => s + r.hfTime, 0)) : null,
          score,
          individual,
        });
      }
    }
  }

  qualified.sort(compareStandings);

  const byDivision: Record<string, any[]> = {};
  for (const row of qualified) {
    if (!byDivision[row.division]) byDivision[row.division] = [];
    byDivision[row.division].push(row);
  }
  const byDivisionOut: Record<string, any[]> = {};
  for (const [division, rowsOfDiv] of Object.entries(byDivision)) {
    const ranked = rankGroup(rowsOfDiv, mode, minParticipants);
    if (ranked) byDivisionOut[division] = ranked;
  }

  const overallBest = qualified.length > 0 ? qualified[0].score : 0;
  const overall = rankRows(qualified.slice(), overallBest, mode);

  const byCategory: Record<string, Record<string, any[]>> = {};
  for (const row of qualified) {
    if (!byCategory[row.category]) byCategory[row.category] = {};
    if (!byCategory[row.category][row.division]) byCategory[row.category][row.division] = [];
    byCategory[row.category][row.division].push(row);
  }
  const byCategoryOut: Record<string, Record<string, any[]>> = {};
  for (const [cat, divisions] of Object.entries(byCategory)) {
    if (selectedCategories && !selectedCategories.includes(cat)) continue;
    for (const [division, rowsOfDiv] of Object.entries(divisions)) {
      const ranked = rankGroup(rowsOfDiv, mode, minParticipants);
      if (!ranked) continue;
      if (!byCategoryOut[cat]) byCategoryOut[cat] = {};
      byCategoryOut[cat][division] = ranked;
    }
  }

  const byTag: Record<string, Record<string, any[]>> = {};
  for (const row of qualified) {
    if (!row.tag) continue;
    if (!byTag[row.tag]) byTag[row.tag] = {};
    if (!byTag[row.tag][row.division]) byTag[row.tag][row.division] = [];
    byTag[row.tag][row.division].push(row);
  }
  const byTagOut: Record<string, Record<string, any[]>> = {};
  for (const [tag, divisions] of Object.entries(byTag)) {
    for (const [division, rowsOfDiv] of Object.entries(divisions)) {
      const ranked = rankGroup(rowsOfDiv, mode, minParticipants);
      if (!ranked) continue;
      if (!byTagOut[tag]) byTagOut[tag] = {};
      byTagOut[tag][division] = ranked;
    }
  }

  return c.json({
    cup: { id: cup.id, name: cup.name },
    scoring_mode: mode,
    minimum_matches: required,
    minimum_participants: minParticipants,
    selected_categories: selectedCategories,
    matches,
    results: { byDivision: byDivisionOut, overall, byCategory: byCategoryOut, byTag: byTagOut },
  });
});