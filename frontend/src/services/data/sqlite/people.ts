import { all, nowIso, one, run, transaction, uuid } from './db';
import { toRegistration, toShooter } from './mappers';
import { recalculateMatch } from './scoring';
import { getDivisionsForMatch, resolveDivisionForMatch } from '../../../utils/constants';

/** Shooter directory and match-registration management for the local runtime. */

// ── Shooters ─────────────────────────────────────────────────────────────

interface ShooterQuery {
  search?: string;
  limit?: number;
  offset?: number;
  include_deleted?: boolean;
  deleted_only?: boolean;
}

const SHOOTER_COLUMNS = `
  id, first_name, last_name, category, tag, division, power_factor, region, email,
  winmss_member_id, deleted_at, created_at, updated_at`;

export async function listShooters(params: ShooterQuery = {}) {
  const limit = params.limit ?? 0;
  const offset = params.offset ?? 0;

  const where: string[] = [];
  const values: unknown[] = [];

  if (params.deleted_only) {
    where.push('deleted_at IS NOT NULL');
  } else if (!params.include_deleted) {
    where.push('deleted_at IS NULL');
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    where.push('(first_name LIKE ? OR last_name LIKE ? OR COALESCE(email, \'\') LIKE ?)');
    values.push(pattern, pattern, pattern);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await one<{ count: number }>(
    `SELECT COUNT(*) AS count FROM shooters ${whereSql}`,
    values,
  );

  // LIMIT 0 means "no limit" in this codebase's API convention.
  const paging = limit > 0 ? `LIMIT ${limit} OFFSET ${offset}` : '';

  const rows = await all<any>(
    `SELECT ${SHOOTER_COLUMNS} FROM shooters ${whereSql} ORDER BY last_name, first_name ${paging}`,
    values,
  );

  return {
    shooters: rows.map(toShooter),
    total: Number(totalRow?.count ?? 0),
    limit,
    offset,
  };
}

export async function listTags(): Promise<string[]> {
  const rows = await all<{ tag: string }>(
    `SELECT DISTINCT tag FROM shooters WHERE tag IS NOT NULL AND tag != '' ORDER BY tag`,
  );
  return rows.map((row) => row.tag);
}

export async function getShooter(id: string) {
  const row = await one<any>(`SELECT ${SHOOTER_COLUMNS} FROM shooters WHERE id = ?`, [id]);
  if (!row) throw new Error('Shooter not found');

  const history = await all<any>(
    `SELECT m.id, m.name, m.date
     FROM match_registrations mr
     JOIN matches m ON m.id = mr.match_id
     WHERE mr.shooter_id = ?
     ORDER BY m.date DESC`,
    [id],
  );

  return { ...toShooter(row), match_history: history };
}

export async function getShooterMatches(id: string) {
  return all<any>(
    `SELECT m.id, m.name, m.date, m.organization, m.is_current,
            mr.id AS registration_id, mr.squad, mr.is_dq
     FROM match_registrations mr
     JOIN matches m ON m.id = mr.match_id
     WHERE mr.shooter_id = ?
     ORDER BY m.date DESC`,
    [id],
  );
}

interface ShooterInput {
  first_name: string;
  last_name: string;
  category: string;
  tag?: string | null;
  division: string;
  power_factor: string;
  region: string;
  email?: string | null;
}

export async function createShooter(data: ShooterInput) {
  const id = uuid();
  const now = nowIso();
  await run(
    `INSERT INTO shooters (id, first_name, last_name, category, tag, division, power_factor, region, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.first_name, data.last_name, data.category, data.tag ?? null,
      data.division, data.power_factor, data.region, data.email ?? null, now, now,
    ],
  );
  const row = await one<any>(`SELECT ${SHOOTER_COLUMNS} FROM shooters WHERE id = ?`, [id]);
  return toShooter(row!);
}

export async function updateShooter(id: string, data: Partial<ShooterInput>) {
  const existing = await one<any>(`SELECT ${SHOOTER_COLUMNS} FROM shooters WHERE id = ?`, [id]);
  if (!existing) throw new Error('Shooter not found');
  if (existing.deleted_at) throw new Error('Shooter is deleted and cannot be edited');

  await run(
    `UPDATE shooters SET first_name = ?, last_name = ?, category = ?, tag = ?,
       division = ?, power_factor = ?, region = ?, email = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.first_name ?? existing.first_name,
      data.last_name ?? existing.last_name,
      data.category ?? existing.category,
      data.tag !== undefined ? data.tag : existing.tag,
      data.division ?? existing.division,
      data.power_factor ?? existing.power_factor,
      data.region ?? existing.region,
      data.email !== undefined ? data.email : existing.email,
      nowIso(),
      id,
    ],
  );

  const row = await one<any>(`SELECT ${SHOOTER_COLUMNS} FROM shooters WHERE id = ?`, [id]);
  return toShooter(row!);
}

/** Soft delete — keeps scores and results intact. */
export async function deleteShooter(id: string) {
  const existing = await one<any>(`SELECT deleted_at FROM shooters WHERE id = ?`, [id]);
  if (!existing) throw new Error('Shooter not found');
  if (existing.deleted_at) throw new Error('Shooter already deleted');

  await run(`UPDATE shooters SET deleted_at = ?, updated_at = ? WHERE id = ?`, [nowIso(), nowIso(), id]);
  return { deleted: true };
}

export async function restoreShooter(id: string) {
  const existing = await one<any>(`SELECT deleted_at FROM shooters WHERE id = ?`, [id]);
  if (!existing) throw new Error('Shooter not found');
  if (!existing.deleted_at) throw new Error('Shooter is not deleted');

  await run(`UPDATE shooters SET deleted_at = NULL, updated_at = ? WHERE id = ?`, [nowIso(), id]);
  const row = await one<any>(`SELECT ${SHOOTER_COLUMNS} FROM shooters WHERE id = ?`, [id]);
  return toShooter(row!);
}

export async function bulkUpdateShooters(
  shooterIds: string[],
  updates: { division?: string; category?: string; power_factor?: string; tag?: string | null },
) {
  let updated = 0;
  const failed: Array<{ id: string; reason: string }> = [];

  for (const id of shooterIds) {
    try {
      const existing = await one<any>(`SELECT * FROM shooters WHERE id = ?`, [id]);
      if (!existing) {
        failed.push({ id, reason: 'Shooter not found' });
        continue;
      }

      await run(
        `UPDATE shooters SET division = ?, category = ?, power_factor = ?, tag = ?, updated_at = ? WHERE id = ?`,
        [
          updates.division ?? existing.division,
          updates.category ?? existing.category,
          updates.power_factor ?? existing.power_factor,
          updates.tag !== undefined ? updates.tag : existing.tag,
          nowIso(),
          id,
        ],
      );
      updated++;
    } catch (error) {
      failed.push({ id, reason: (error as Error).message });
    }
  }

  return { updated, failed };
}

export async function bulkDeleteShooters(shooterIds: string[]) {
  let deleted = 0;
  const failed: Array<{ id: string; name: string; reason: string }> = [];

  for (const id of shooterIds) {
    try {
      const existing = await one<any>(`SELECT first_name, last_name FROM shooters WHERE id = ?`, [id]);
      if (!existing) {
        failed.push({ id, name: id, reason: 'Shooter not found' });
        continue;
      }
      await run(`UPDATE shooters SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        nowIso(), nowIso(), id,
      ]);
      deleted++;
    } catch (error) {
      failed.push({ id, name: id, reason: (error as Error).message });
    }
  }

  return { deleted, failed };
}

// ── Registrations ────────────────────────────────────────────────────────

const REGISTRATION_SELECT = `
  SELECT mr.id, mr.shooter_id, mr.squad, mr.group_id,
         mr.division AS reg_division, mr.category AS reg_category,
         mr.power_factor AS reg_power_factor, mr.is_dq, mr.dq_reason,
         s.first_name, s.last_name, s.category, s.tag,
         s.division, s.power_factor, s.region, s.email
  FROM match_registrations mr
  JOIN shooters s ON s.id = mr.shooter_id`;

export async function listRegistrations(matchId: string) {
  const [rows, match] = await Promise.all([
    all<any>(
      `${REGISTRATION_SELECT}
       WHERE mr.match_id = ?
       ORDER BY mr.squad IS NULL, mr.squad, s.last_name, s.first_name`,
      [matchId],
    ),
    one<{ organization: string; firearm_type: string }>(
      `SELECT organization, firearm_type FROM matches WHERE id = ?`,
      [matchId],
    ),
  ]);
  const divisionApplies = getDivisionsForMatch(match).length > 0;
  return rows.map((row) => {
    const registration = toRegistration(row);
    return {
      ...registration,
      // Mirror the results query: an explicit registration override wins even
      // when invalid (resolved to the match default); otherwise inherit.
      effective_division: resolveDivisionForMatch(match, registration.reg_division ?? registration.division) ?? '',
      division_applies: divisionApplies,
    };
  });
}

export async function registerShooters(matchId: string, data: { shooterId?: string; shooterIds?: string[]; squad?: number | null }) {
  const shooterIds = data.shooterIds ?? (data.shooterId ? [data.shooterId] : []);
  if (shooterIds.length === 0) throw new Error('shooterId or shooterIds required');

  const results: any[] = [];
  const match = await one<{ organization: string; firearm_type: string }>(
    `SELECT organization, firearm_type FROM matches WHERE id = ?`,
    [matchId],
  );

  await transaction(async () => {
    for (const shooterId of shooterIds) {
      const existing = await one<{ id: string }>(
        `SELECT id FROM match_registrations WHERE match_id = ? AND shooter_id = ?`,
        [matchId, shooterId],
      );
      if (existing) {
        results.push({ shooter_id: shooterId, skipped: true });
        continue;
      }

      const shooter = await one<{ division: string }>(
        `SELECT division FROM shooters WHERE id = ?`,
        [shooterId],
      );
      const division = resolveDivisionForMatch(match, shooter?.division);

      const id = uuid();
      await run(
        `INSERT INTO match_registrations (id, match_id, shooter_id, squad, division, is_dq, registered_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [id, matchId, shooterId, data.squad ?? null, division, nowIso()],
      );
      results.push({ id, match_id: matchId, shooter_id: shooterId, squad: data.squad ?? null, division });
    }
  });

  return results;
}

export async function createAndAddShooter(matchId: string, data: ShooterInput & { squad?: number | null }) {
  let shooter: any;
  let registration: any;

  const match = await one<{ organization: string; firearm_type: string }>(
    `SELECT organization, firearm_type FROM matches WHERE id = ?`,
    [matchId],
  );

  await transaction(async () => {
    shooter = await createShooter(data);
    const division = resolveDivisionForMatch(match, data.division);
    const id = uuid();
    await run(
      `INSERT INTO match_registrations (id, match_id, shooter_id, squad, division, is_dq, registered_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, matchId, shooter.id, data.squad ?? null, division, nowIso()],
    );
    registration = { id, match_id: matchId, shooter_id: shooter.id, squad: data.squad ?? null, division };
  });

  return { shooter, registration };
}

export async function updateRegistration(matchId: string, id: string, data: Record<string, unknown>) {
  const existing = await one<any>(
    `SELECT * FROM match_registrations WHERE id = ? AND match_id = ?`,
    [id, matchId],
  );
  if (!existing) throw new Error('Registration not found');

  await run(
    `UPDATE match_registrations SET squad = ?, division = ?, category = ?, power_factor = ?
     WHERE id = ?`,
    [
      data.squad !== undefined ? data.squad : existing.squad,
      data.division !== undefined ? data.division : existing.division,
      data.category !== undefined ? data.category : existing.category,
      data.power_factor !== undefined ? data.power_factor : existing.power_factor,
      id,
    ],
  );

  return one<any>(`${REGISTRATION_SELECT} WHERE mr.id = ?`, [id]);
}

export async function removeRegistration(matchId: string, id: string) {
  const existing = await one<{ id: string }>(
    `SELECT id FROM match_registrations WHERE id = ? AND match_id = ?`,
    [id, matchId],
  );
  if (!existing) throw new Error('Registration not found');

  await transaction(async () => {
    await run(`DELETE FROM match_registrations WHERE id = ?`, [id]);
    await recalculateMatch(matchId);
  });

  return { deleted: true };
}

export async function bulkUpdateRegistrations(
  matchId: string,
  registrationIds: string[],
  updates: { division?: string; category?: string; power_factor?: string; tag?: string | null; squad?: number | null },
) {
  let updated = 0;
  const failed: Array<{ id: string; name: string; reason: string }> = [];

  await transaction(async () => {
    for (const regId of registrationIds) {
      const reg = await one<any>(
        `SELECT mr.id, mr.shooter_id, mr.division, mr.category, mr.power_factor, mr.group_id,
                s.first_name, s.last_name
         FROM match_registrations mr
         JOIN shooters s ON s.id = mr.shooter_id
         WHERE mr.id = ? AND mr.match_id = ?`,
        [regId, matchId],
      );

      if (!reg) {
        failed.push({ id: regId, name: regId, reason: 'Not found in this match' });
        continue;
      }

      // Changing a squad moves the whole group so grouped shooters stay together.
      let squadTargetIds = [regId];
      if (updates.squad !== undefined && reg.group_id) {
        const siblings = await all<{ id: string }>(
          `SELECT id FROM match_registrations WHERE match_id = ? AND group_id = ? AND id != ?`,
          [matchId, reg.group_id, regId],
        );
        squadTargetIds = [regId, ...siblings.map((s) => s.id)];
      }

      const setSquad = updates.squad !== undefined ? updates.squad : reg.squad;
      for (const targetId of squadTargetIds) {
        await run(
          `UPDATE match_registrations SET squad = ?,
             division = COALESCE(?, division), category = COALESCE(?, category),
             power_factor = COALESCE(?, power_factor)
           WHERE id = ?`,
          [setSquad, updates.division ?? null, updates.category ?? null,
           updates.power_factor ?? null, targetId],
        );
      }

      // Only backfill the shooter's own defaults when the registration had none —
      // an override is a match-specific choice, not a directory update.
      const shooterSets: string[] = [];
      const shooterValues: unknown[] = [];

      if (updates.division && reg.division === null) {
        shooterSets.push('division = ?');
        shooterValues.push(updates.division);
      }
      if (updates.category && reg.category === null) {
        shooterSets.push('category = ?');
        shooterValues.push(updates.category);
      }
      if (updates.power_factor && reg.power_factor === null) {
        shooterSets.push('power_factor = ?');
        shooterValues.push(updates.power_factor);
      }
      if (updates.tag !== undefined) {
        shooterSets.push('tag = ?');
        shooterValues.push(updates.tag);
      }

      if (shooterSets.length > 0) {
        shooterValues.push(nowIso(), reg.shooter_id);
        await run(`UPDATE shooters SET ${shooterSets.join(', ')}, updated_at = ? WHERE id = ?`, shooterValues);
      }

      updated++;
    }
  });

  return { updated, failed };
}

export async function bulkRemoveRegistrations(matchId: string, registrationIds: string[]) {
  let removed = 0;
  const failed: Array<{ id: string; name: string; reason: string }> = [];

  await transaction(async () => {
    for (const regId of registrationIds) {
      try {
        const result = await run(`DELETE FROM match_registrations WHERE id = ? AND match_id = ?`, [
          regId, matchId,
        ]);
        if (result === 0) {
          failed.push({ id: regId, name: regId, reason: 'Not found in this match' });
          continue;
        }
        removed++;
      } catch (error) {
        failed.push({ id: regId, name: regId, reason: (error as Error).message });
      }
    }

    await recalculateMatch(matchId);
  });

  return { removed, failed };
}

export async function getSquads(matchId: string) {
  const rows = await all<{ squad: number; shooter_count: number }>(
    `SELECT mr.squad, COUNT(*) AS shooter_count
     FROM match_registrations mr
     WHERE mr.match_id = ? AND mr.squad IS NOT NULL
     GROUP BY mr.squad
     ORDER BY mr.squad`,
    [matchId],
  );
  return { squads: rows.map((row) => ({ squad: row.squad, shooter_count: Number(row.shooter_count) })) };
}

async function recalcAllStages(matchId: string) {
  await recalculateMatch(matchId);
}

export async function dqShooter(matchId: string, id: string, reason: string) {
  await run(`UPDATE match_registrations SET is_dq = 1, dq_reason = ? WHERE id = ? AND match_id = ?`, [
    reason || null, id, matchId,
  ]);
  await recalcAllStages(matchId);
  return { success: true };
}

export async function undqShooter(matchId: string, id: string) {
  await run(`UPDATE match_registrations SET is_dq = 0, dq_reason = NULL WHERE id = ? AND match_id = ?`, [
    id, matchId,
  ]);
  await recalcAllStages(matchId);
  return { success: true };
}

// ── Registration groups ──────────────────────────────────────────────────

export async function createGroup(matchId: string, registrationIds: string[]) {
  if (registrationIds.length < 2) throw new Error('At least 2 registrations are required');
  const groupId = uuid();
  for (const regId of registrationIds) {
    await run(`UPDATE match_registrations SET group_id = ? WHERE id = ? AND match_id = ?`, [
      groupId, regId, matchId,
    ]);
  }
  return { group_id: groupId };
}

export async function addToGroup(matchId: string, groupId: string, registrationIds: string[]) {
  for (const regId of registrationIds) {
    await run(`UPDATE match_registrations SET group_id = ? WHERE id = ? AND match_id = ?`, [
      groupId, regId, matchId,
    ]);
  }
}

export async function ungroupAll(matchId: string, groupId: string) {
  await run(`UPDATE match_registrations SET group_id = NULL WHERE match_id = ? AND group_id = ?`, [
    matchId, groupId,
  ]);
}

export async function ungroupRegistration(matchId: string, registrationId: string) {
  await run(`UPDATE match_registrations SET group_id = NULL WHERE id = ? AND match_id = ?`, [
    registrationId, matchId,
  ]);
}
