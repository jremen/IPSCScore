# Matches

A match is the top-level container for a competition. It has stages, registrations, squadding, scoring, and results.

## Match list

The Matches tab lists every match on this device. The currently active match is highlighted.

![Matches list](/docs/screenshots/matches-list.png)

### From the list

- Set or unset a match as the current one
- Open the match detail view
- Export a match as IPSCScore JSON or Practiscore `.psc`
- Import a match from JSON, WinMSS, or Practiscore
- Select several matches and create a Cup from them
- Delete matches

**To do this in the app:** [Go to Matches](app-tab:matches)

## Importing and exporting matches

Use **Import Match** at the top of the Matches tab to import:

- IPSCScore `.match.json`
- WinMSS `.mdb` / `.accdb`
- Practiscore `.psc`

WinMSS and Practiscore import need the browser/desktop backend. The standalone Android/iOS app shows only the IPSCScore JSON option.

Use the export button on a match row to choose IPSCScore `.match.json` or, in the browser/desktop app, Practiscore `.psc`.

To create a Cup from several matches, select them with the checkboxes and choose **Generate Cup** in the bulk action bar. See [Cups](cups.md).

## Creating a match

Open the **Matches** tab and click **+ New Match**.

![Create new match form](/docs/screenshots/create-match-modal.png)

### Fill in

- **Name** — The match name shown in the header and on printouts.
- **Date** — When the match is held.
- **Organization** — IPSC, USPSA, IDPA, 3GUN, NRL22, PRS, NRA, USA Archery, or ISSF. This determines which divisions are available.
- **Firearm type** — Handgun, rifle, PCC, shotgun, combined, or bow.
- **Match level** — 1 (local) through 5 (world). Cosmetic field used for branding.

After saving, the new match is automatically set as the **current match** (the one shown in the header).

**To do this in the app:** [Create a new match](app-action:new-match)

## Match detail

Click any match row to see its detail view with stage count, registration count, and result links.

![Match detail](/docs/screenshots/match-detail.png)
