import { closeDb, DB_NAME, getDb } from './db';
import * as Auth from './auth';
import * as Matches from './matches';
import * as People from './people';
import * as Scoring from './scoring';
import * as Results from './results';

/**
 * The standalone (Android) implementation of the frontend's API surface.
 *
 * Every method mirrors `services/api.ts` so components cannot tell which runtime
 * they are on. Features that genuinely need a server — WinMSS import, server-side
 * CSV parsing, folder backups, remote scorer trust — are declared here and fail
 * with an explicit message rather than silently doing nothing.
 */

class LocalFeatureUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} is not available in the offline Android build yet.`);
    this.name = 'LocalFeatureUnavailableError';
  }
}

function unavailable(feature: string): never {
  throw new LocalFeatureUnavailableError(feature);
}

function bearerToken(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match ? match[1] : authHeader;
}

function storedToken(): string | null {
  return localStorage.getItem('admin_token');
}

export function createLocalClient() {
  return {
    // ── Auth ─────────────────────────────────────────────────────────────
    auth: {
      adminLogin: (password: string) => Auth.login(password),
      adminLogout: async (_token: string) => Auth.logout(),
      changeAdminPassword: async (currentPassword: string, newPassword: string, _adminToken: string) =>
        Auth.changePassword(currentPassword, newPassword),
      getAdminPasswordStatus: async () => ({ hasPassword: await Auth.hasPassword() }),
      getMe: async (authHeader?: string) => Auth.getMe(bearerToken(authHeader) ?? storedToken()),
      logout: async (_token: string) => Auth.logout(),

      // Remote scorer trust is meaningless on a single, self-contained device.
      redeemScorerTrust: async () => ({ sessionToken: '', matchId: '', error: 'Not used on this device' }),
      revalidateScorerSession: async () => ({ matchId: '', sessionToken: '', error: 'Not used on this device' }),
      scorerLogout: async () => ({ success: true }),
      scorerAutoLogin: async () => ({ sessionToken: '', matchId: '', error: 'Not used on this device' }),
      getScorerTrustInfo: async () => ({ trustToken: '', rotatedAt: null }),
      rotateScorerTrust: async () => ({ trustToken: '', rotatedAt: new Date().toISOString() }),
      getActiveScorerSessions: async () => [],
      approveScorerSession: async () => ({ success: true }),
      revokeScorerSession: async () => ({ success: true }),
      getScorerDeviceMode: async () => ({ mode: 'silent' }),
      setScorerDeviceMode: async () => ({ success: true }),
      cleanupDuplicateScorerSessions: async () => ({ deleted: 0 }),
    },

    // ── Matches ──────────────────────────────────────────────────────────
    getMatches: () => Matches.listMatches(),
    getMatch: (id: string) => Matches.getMatch(id),
    getCurrentMatch: () => Matches.getCurrentMatch(),
    setCurrentMatch: (id: string) => Matches.setCurrentMatch(id),
    unsetCurrentMatch: () => Matches.unsetCurrentMatch(),
    createMatch: (data: any) => Matches.createMatch(data),
    updateMatch: (id: string, data: any) => Matches.updateMatch(id, data),
    deleteMatch: (id: string) => Matches.deleteMatch(id),
    bulkDeleteMatches: (matchIds: string[]) => Matches.bulkDeleteMatches(matchIds),

    // Match export/import: implemented in a later pass (see docs/android.md).
    exportMatch: async () => unavailable('Match export'),
    exportMatchPsc: async () => unavailable('PSC export'),
    importMatch: async () => unavailable('Match import'),
    importMatchPsc: async () => unavailable('PSC import'),

    // ── Stages ───────────────────────────────────────────────────────────
    getStages: (matchId: string) => Matches.listStages(matchId),
    getStage: (id: string) => Matches.getStage(id),
    createStage: (matchId: string, data: any) => Matches.createStage(matchId, data),
    updateStage: (id: string, data: any) => Matches.updateStage(id, data),
    deleteStage: (id: string) => Matches.deleteStage(id),
    uploadStageImage: async () => unavailable('Stage image upload'),
    deleteStageImage: async () => unavailable('Stage image removal'),

    // ── Shooters ─────────────────────────────────────────────────────────
    getShooters: (params?: any) => People.listShooters(params),
    getShooter: (id: string) => People.getShooter(id),
    getShooterMatches: (id: string) => People.getShooterMatches(id),
    createShooter: (data: any) => People.createShooter(data),
    updateShooter: (id: string, data: any) => People.updateShooter(id, data),
    deleteShooter: (id: string) => People.deleteShooter(id),
    restoreShooter: (id: string) => People.restoreShooter(id),
    bulkUpdateShooters: (shooterIds: string[], updates: any) =>
      People.bulkUpdateShooters(shooterIds, updates),
    bulkDeleteShooters: (shooterIds: string[]) => People.bulkDeleteShooters(shooterIds),
    getTags: () => People.listTags(),

    // ── Registration groups ──────────────────────────────────────────────
    createGroup: (matchId: string, registrationIds: string[]) =>
      People.createGroup(matchId, registrationIds),
    addToGroup: async (matchId: string, groupId: string, registrationIds: string[]) => {
      await People.addToGroup(matchId, groupId, registrationIds);
    },
    ungroupAll: async (matchId: string, groupId: string) => {
      await People.ungroupAll(matchId, groupId);
    },
    ungroupRegistration: async (matchId: string, registrationId: string) => {
      await People.ungroupRegistration(matchId, registrationId);
    },

    // ── Registrations ────────────────────────────────────────────────────
    getRegistrations: (matchId: string) => People.listRegistrations(matchId),
    registerShooters: (matchId: string, data: any) => People.registerShooters(matchId, data),
    createAndAddShooter: (matchId: string, data: any) => People.createAndAddShooter(matchId, data),
    updateRegistration: (matchId: string, id: string, data: any) =>
      People.updateRegistration(matchId, id, data),
    removeRegistration: (matchId: string, id: string) => People.removeRegistration(matchId, id),
    getSquads: (matchId: string) => People.getSquads(matchId),
    dqShooter: (matchId: string, id: string, reason: string) => People.dqShooter(matchId, id, reason),
    undqShooter: (matchId: string, id: string) => People.undqShooter(matchId, id),
    bulkUpdateRegistrations: (matchId: string, registrationIds: string[], updates: any) =>
      People.bulkUpdateRegistrations(matchId, registrationIds, updates),
    bulkRemoveRegistrations: (matchId: string, registrationIds: string[]) =>
      People.bulkRemoveRegistrations(matchId, registrationIds),

    // ── Scoring ──────────────────────────────────────────────────────────
    getScoringProgress: (matchId: string) => Scoring.getScoringProgress(matchId),
    getStageScores: (matchId: string, stageId: string) => Scoring.getStageScores(matchId, stageId),
    getShooterScore: (matchId: string, stageId: string, registrationId: string) =>
      Scoring.getShooterScore(matchId, stageId, registrationId),
    saveScore: (matchId: string, stageId: string, registrationId: string, data: any) =>
      Scoring.saveScore(matchId, stageId, registrationId, data),
    recalculateStage: (matchId: string, stageId: string) => Scoring.recalculateStage(matchId, stageId),
    recalculateMatch: (matchId: string) => Scoring.recalculateMatch(matchId),

    // ── Results ──────────────────────────────────────────────────────────
    getOverallResults: (matchId: string) => Results.overallResults(matchId),
    getDivisionResults: (matchId: string) => Results.divisionResults(matchId),
    getStageResults: (matchId: string) => Results.stageResults(matchId),
    getSingleStageResults: (matchId: string, stageId: string) =>
      Results.singleStageResults(matchId, stageId),
    getCategoryResults: (matchId: string) => Results.categoryResults(matchId),
    getTagResults: (matchId: string) => Results.tagResults(matchId),
    getPublicMatchProgress: (matchId: string) => Results.matchProgress(matchId),
    getShooterStageSummaries: (matchId: string, registrationId: string) =>
      Results.shooterStageSummaries(matchId, registrationId),
    exportRegistrationCSV: async () => unavailable('Registration CSV export'),
    exportShootersCSV: async () => unavailable('Shooter CSV export'),

    // ── Cups ─────────────────────────────────────────────────────────────
    getCups: async () => unavailable('Cups'),
    getCup: async () => unavailable('Cups'),
    createCup: async () => unavailable('Cups'),
    updateCup: async () => unavailable('Cups'),
    deleteCup: async () => unavailable('Cups'),
    addCupMatches: async () => unavailable('Cups'),
    removeCupMatch: async () => unavailable('Cups'),
    getCupResults: async () => unavailable('Cups'),

    // ── CSV / WinMSS import (server-side parsers) ────────────────────────
    importShooters: async () => unavailable('CSV shooter import'),
    importRegistrations: async () => unavailable('CSV registration import'),
    importScores: async () => unavailable('CSV score import'),
    importWinMSS: async () => unavailable('WinMSS import'),
    inspectWinMSS: async () => unavailable('WinMSS inspection'),

    // ── Backup ───────────────────────────────────────────────────────────
    exportBackup: async () => unavailable('Database backup'),
    importBackup: async () => unavailable('Database restore'),
    getLocalBackupStatus: async () => ({
      folder: '',
      enabled: false,
      lastFullBackupAt: null,
      deltasSinceFull: 0,
      diskUsage: 0,
      folderAccessible: false,
    }),
    saveLocalBackupConfig: async () => ({ success: true }),
    triggerLocalBackup: async () => ({ success: false, key: '', size: 0 }),
    previewLocalBackupFolder: async () => unavailable('Local folder backup'),
    restoreLocalBackupFromFolder: async () => unavailable('Local folder restore'),
    exportLocalFullBackup: async () => unavailable('Local full backup'),

    // ── Audit ────────────────────────────────────────────────────────────
    getAuditLog: async () => ({ entries: [], total: 0 }),
  };
}

export type LocalClient = ReturnType<typeof createLocalClient>;

/** Ensure the database exists and the schema has been applied. */
export async function initLocalDatabase(): Promise<void> {
  await getDb();
}

export async function resetLocalDatabase(): Promise<void> {
  await closeDb();
}

export { DB_NAME };
