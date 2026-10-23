# Output & exports

Results can be exported from the **Results** tab, from a **Cup** detail page, and from the registration and stages screens.

![Export buttons](/docs/screenshots/export-buttons.png)

## CSV

- **Results CSV** — all shooters with their total match percentage, division, and category.
- **Cup CSV** — the active Cup tab, including per-match columns, totals, and excluded results.
- **Registrations CSV** — from the Registration tab, exports the registration list for the current match.
- **Shooters CSV** — from the Shooters tab, exports the global shooter database.

CSV files open in Excel, Numbers, or any spreadsheet app.

## PDF

- **Score sheets** — from the Stages tab, per-stage score sheets ready for printing.
- **Squadding list** — from the squadding modal, the squad assignments for the range.
- **Results** — formatted results PDF, ready to print and post at the range.
- **Cup standings** — from a Cup detail page, the active tab with per-match columns and totals.

## HTML

- **Results** — a standalone HTML page with the current result view.
- **Cup standings** — a standalone HTML page for the active Cup tab.

## Print

Use **Print** on the Results tab or on a Cup detail page. The print layout follows the active tab and any shooter limit you have set.

## JSON

- **Match export** — from the Matches tab, exports the match as an IPSCScore `.match.json` file with stages, registrations, scores, and results. Useful for sharing a match setup with another device.
- **Match import** — the reverse: replace a local match with the contents of a JSON file.
- **Practiscore export** — on the browser/desktop app, a match can also be exported as a `.psc` file.

## WinMSS and Practiscore import

Use **Matches → Import Match** to import an existing WinMSS (`.mdb` / `.accdb`) or Practiscore (`.psc`) file. The match, stages, shooters, registrations, and scores are imported. These formats need the browser/desktop backend and are hidden in the standalone Android/iOS app.

See [Matches](matches.md) for details.

## Database backup

For a full backup of all data, use **Settings → Database**:

- Browser and Electron desktop app: export a `.sql` database dump.
- Android and iOS app: export a portable `.json` snapshot.

The Electron desktop app can also write automatic backups to a folder every 30 minutes, with delta updates after score changes. See [Database & backups](database.md).

**To do this in the app:** [Export results as PDF](app-action:export-results-pdf)
