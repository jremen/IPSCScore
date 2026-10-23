# Database backup

![Settings modal showing the Database panel](/docs/screenshots/settings-modal.png)

The **Database** panel in Settings exports and restores all app data. The backup format depends on where the app runs:

- **Browser and Electron desktop app** — a complete `.sql` database dump.
- **Android and iOS app** — a portable `.json` snapshot of the on-device database.

Both formats contain the full local dataset.

## Manual export / import

- **Export** — downloads a complete backup file. Use it as a snapshot to transfer data between devices or keep as a safety copy.
- **Import** — replaces **all** existing data with the contents of the backup. The confirmation dialog warns that this cannot be undone. The app reloads after the restore.

Both actions are available from **Settings → Database**. On the standalone mobile app, a restore also clears the current admin session because the database behind it has been replaced.

## Automatic backup (Electron desktop app only)

For ongoing protection, set a **backup folder** in **Settings → Database → Automatic Backup**. Automatic backup is not available in the browser or the standalone Android/iOS app — use manual export there.

1. **Pick a folder** — choose any local folder, including one synced to iCloud, Google Drive, OneDrive, Dropbox, a USB drive, or a NAS.
2. **Automatic backup starts when the folder is selected** — use the toggle to pause or resume it.
3. **Full backups** — while enabled, the app writes a full backup every 30 minutes and keeps the three most recent full backups.
4. **Delta updates** — after a score is saved, the app writes a small delta update. Deltas are cleared when the next full backup succeeds.
5. **Monitor status** — the panel shows the last full backup time, number of pending delta updates, and total disk usage.
6. **Backup now** — trigger an immediate full backup.
7. **Restore from folder** — pick a backup folder, review the full backup and delta chain, then confirm. This replaces all data and reloads the app.

The backup folder must remain accessible for the automatic schedule to work. If the drive is disconnected, the app pauses and the panel shows a warning.

## WinMSS and Practiscore import

WinMSS (`.mdb` / `.accdb`) and Practiscore (`.psc`) files are imported from **Matches → Import Match**, not from Settings → Database. These parsers run in the browser/desktop backend and are hidden in the standalone Android/iOS app.

See [Matches](matches.md) for the import workflow.
