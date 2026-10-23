# Registration & shooters

A shooter is a person in the global database. A registration is the link between a shooter and a specific match, with optional division/category/power-factor overrides.

## Global shooter database

The **Shooters** tab is the global pool. You can:

- Add a shooter manually
- Bulk-import a CSV
- Edit, soft-delete, or restore any shooter
- Search by name, division, region, or tag

![Shooters database](/docs/screenshots/registration-list.png)

**To do this in the app:** [Add a new shooter](app-action:new-shooter)

## Registering shooters in a match

Open the **Registration** tab for the current match.

- **Add existing shooter** — search the global database, click to add.
- **Create + register inline** — create a new shooter and add them in one step.
- **Edit registration** — override division, category, or power factor for this match only.
- **Bulk edit / remove** — select rows with checkboxes, then act on them.
- **Group / pair shooters** — select two or more rows and choose **Group selected**, or drag one row onto another. Useful so friends get squadded together.

![Edit registration](/docs/screenshots/edit-registration-modal.png)

**To do this in the app:** [Go to Registration](app-tab:registration)

## Grouping registered shooters

A group is a pairing request — a "car pool" of shooters who want to be in the same squad. A group does **not** assign a squad number by itself.

- To create a group, select two or more registered shooters and click **Group selected**, or drag one shooter row onto another.
- A coloured bar on the right edge of the row shows group membership.
- To remove a shooter from a group, click the coloured bar on their row. To remove several, select the grouped rows and click **Ungroup selected**.
- Two existing groups cannot be merged. Ungroup one of them first.
- When you assign any member of a group in the Squadding modal, the whole group moves to the same squad.

See [Squadding & groups](squadding.md) for assigning groups to squads.

## Divisions and categories

- **Division** is a class of firearm (e.g. Production, Standard, Open for IPSC). Divisions are scoped by match organization and firearm type.
- **Category** is a person class (Regular, Junior, Senior, Super Senior, Lady).
- **Power factor** is Minor or Major — affects how hits score (IPSC).

Each registration inherits the shooter's defaults; you can override per-match via the Edit Registration modal.

**To do this in the app:** [Add a registration](app-action:add-registration)
