# Kiosk mode

Kiosk mode turns the public results page into a full-screen display for a TV, projector, or second monitor. It shows the current match, updates as scores arrive, and needs no login.

## Opening kiosk mode

1. Make sure the match you want to show is set as the **current match**.
2. Find the app's network address in the admin header **LAN URL badge** (for example `192.168.1.5:3001`).
3. In a browser on the display device, open `/results/kiosk` — for example `http://192.168.1.5:3001/results/kiosk`.
4. Put the browser in full-screen mode.

The standard `/results` page and its QR code still open the normal public results page. Kiosk mode has its own URL and does not replace it.

## What it shows

- The current match name and the public match progress bar.
- One division at a time. Short tables stay on screen; long tables scroll slowly from top to bottom before the next division appears.
- A **LIVE** indicator and the time of the last refresh.
- Position, shooter, and the result columns that apply to the match's scoring type.
- Medal colours for the top three positions.
- A DQ section at the bottom of the division when the match has disqualified shooters.

If the match has no divisions, the kiosk shows a single all-shooters table. If no match is set as current, it shows a message instead.

## Live updates

Kiosk mode listens for score updates and also refreshes at least once a minute if the live connection is unavailable. It follows the current match automatically, so changing the current match in the admin app switches the kiosk to the new match.

## Practical tips

- Use a device on the same network as the scoring host.
- Disable sleep or the screen saver on the display device.
- Kiosk mode is public. Do not expose the app directly to the internet if the results should stay private.
- The kiosk is read-only — nobody can enter scores from it.
- Bookmark `/results/kiosk` on the display device so it can be reopened quickly.
