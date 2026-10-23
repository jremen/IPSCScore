# Cups

A Cup combines several matches into one season-long standings table. Open the **Cups** tab to create a Cup, add matches, and view combined results.

## Creating a Cup

1. Open the **Cups** tab and click **+ New Cup**.
2. Enter a **Cup name**.
3. Choose the **Scoring** mode:
   - **Hit Factor** — each counted match contributes the shooter's match hit factor. Cup standings are ranked by the sum of the best counted match hit factors.
   - **Points** — each counted match contributes the shooter's match points. Cup standings are ranked by the sum of the best counted match points.
4. Set **Minimum matches** — the number of valid match results a shooter needs before appearing in the Cup. Leave it empty to use the automatic value: more than half of the Cup's matches (for example, 3 of 5).
5. Optionally set **Minimum participants** — a division, category, or tag table is hidden when fewer qualified shooters are in that group.
6. Optionally check **Output categories** — **By Category** views and exports include only the checked categories. Leave all unchecked to include every category.
7. Select the matches to include.
8. Click **Create Cup**.

You can also create a Cup from the **Matches** tab: select two or more matches and choose **Generate Cup** in the bulk action bar.

Hit Factor Cups only accept matches that contain at least one hit-factor stage.

## Managing a Cup

Click a Cup row to open its detail page.

- **Edit** changes the Cup name. The scoring mode is shown for reference and cannot be changed in this dialog.
- **Add matches** adds more matches to the Cup.
- The trash icon next to a match removes that match from the Cup only. The match itself is not deleted.
- **Delete Cup** removes the Cup and its match associations. The matches and their scores remain untouched.

Minimum matches, minimum participants, and output categories can be changed directly on the Cup detail page. Use the **Save** button next to each field.

## Cup standings

The Cup detail page has four result tabs:

- **By Division** — one table per division.
- **Overall** — all qualified shooters in one table.
- **By Category** — category sections, with a table per division.
- **By Tag** — tag sections, with a table per division (useful for clubs or training groups).

Each table shows one numbered column group per match. Hit Factor mode displays **Pts** and **Time** for every match, plus total **Pts**, **Time**, and **HF**. Points mode displays **Pts** for every match and total **Pts**. The **Match %** column compares each shooter with the best score in that table.

A result counts only when the shooter is not disqualified and has at least one scored stage in that match. The shooter's best valid matches up to the required number are counted. A struck-through value is a valid result outside the counted best matches. A blank cell means the shooter has no valid result in that match.

A shooter is not listed until they have enough valid results. If a shooter changes division during the season, each division is evaluated separately.

## Limiting the table

- **Show all shooters** — show every qualified shooter.
- Turn it off and enter a number to display only the top N shooters.

This limit applies to the tables on screen and to print, PDF, CSV, and HTML exports.

## Exporting Cup results

From a Cup detail page, use **Print**, **PDF**, **CSV**, or **HTML**. The export uses the active tab, the current shooter limit, and the output category filter.

## Good to know

Cups are calculated by the server-backed app (browser or Electron desktop). The standalone Android/iOS build currently shows match-level results only.

**To do this in the app:** [Go to Cups](app-tab:cups)
