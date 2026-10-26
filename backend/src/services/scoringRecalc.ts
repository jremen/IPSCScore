import { sql } from '../db/client.js';
import { stageRankingMode } from '../utils/stageRanking.js';

/**
 * Recalculate stage_percent and stage_points for all shooters on a stage.
 * Uses atomic SQL window functions instead of per-row UPDATEs to prevent
 * race conditions when multiple range officers save simultaneously.
 *
 * Shared by score entry, the scoring recalculation endpoints and WinMSS
 * imports so an imported match ranks exactly like a manually scored one.
 */
export async function recalculateStage(_matchId: string, stageId: string) {
  const [stage] = await sql`SELECT * FROM stages WHERE id = ${stageId}`;
  const scoringType = stage.scoring_type;
  const maxPoints = Number(stage.max_points);
  const mode = stageRankingMode(scoringType);

  // Use a transaction for atomicity — prevents concurrent recalculations from interleaving
  await sql.begin(async (sql) => {

    if (mode === 'hit_factor') {
      // Rank by hit_factor (highest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_hf <= 0 THEN 0
                 ELSE (ss.hit_factor / best.best_hf) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_hf <= 0 THEN 0
                 ELSE (ss.hit_factor / best.best_hf) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.hit_factor) as best_hf
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;

    } else if (mode === 'net_points') {
      // Rank by net_points (highest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.net_points) as best_np
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;

    } else if (mode === 'time') {
      // Rank by total_time (lowest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.lowest_time <= 0 OR ss.total_time <= 0 THEN 0
                 ELSE (best.lowest_time / ss.total_time) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.lowest_time <= 0 OR ss.total_time <= 0 THEN 0
                 ELSE (best.lowest_time / ss.total_time) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MIN(ss2.total_time) as lowest_time
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND ss2.total_time > 0
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;
    }

    // DQ shooters: zero stage_points and stage_percent
    await sql`
      UPDATE stage_scores ss
      SET stage_points = 0, stage_percent = 0
      FROM match_registrations mr
      WHERE ss.registration_id = mr.id AND ss.stage_id = ${stageId} AND mr.is_dq = TRUE
    `;

    // DNF shooters: zero stage_points and stage_percent
    await sql`
      UPDATE stage_scores
      SET stage_points = 0, stage_percent = 0
      WHERE stage_id = ${stageId} AND is_dnf = TRUE
    `;
  });
}
