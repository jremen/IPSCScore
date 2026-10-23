# QR codes & sharing

When the app is running with a reachable network URL, the admin header shows a **LAN URL badge** with links to three QR code screens. These let spectators and scorers access the app from their own devices without typing URLs.

## LAN URL badge

The badge shows the app's network address (e.g. `192.168.1.5:3001`). Click it to copy the URL to your clipboard — paste it into a phone browser on the same Wi-Fi to open the app.

The three buttons next to it generate dedicated QR codes:

## 🏆 Results QR

![Results QR modal](/docs/screenshots/qr-modal.png)

QR code for the **public results** page at `/results`. Anyone who scans it sees a read-only view of the current match's results, accessible from any device on the same network.

Use **Print** or **Download PDF** from the QR modal to create an A4 poster for the range.

## 🎯 Scorer Access QR

QR code for the **scoring** page used by scorers at `/scoring`. Scanning the QR opens the scoring page and uses the current **trust token** for access without a password.

The Scorer Access modal shows:

- **QR code** — the current trust URL that scorers scan
- **URL** — the full link (with `?trustToken=...`) — tap the copy button to share it via messaging
- **Device approval mode** — controls how new devices are admitted:
  - **Silent (auto-approve)** — a device that scans the QR gets access immediately.
  - **Require approval** — each new device waits for the range master. The scorer sees a **Pending approval** message with the first part of the device ID. The device appears in the modal under **Pending approval**; click **Approve** to allow it, or the red X to reject it.
- **Active Sessions** — approved devices with their device name, device ID, and last activity time. Click the red X to revoke one device; it must scan the QR code again.
- **Clean up duplicates** — removes duplicate sessions for the same device when the list contains more than one session.
- **Rotate Token** — generates a new trust token and invalidates every existing scorer session. All scorer devices must scan the new QR code. Use this if a session is compromised or at the end of a match day.

Device approval only controls access to the scoring page. It does not approve or change shooter scores. Scores are saved by the scorer; if a different score already exists for the same shooter and stage, a non-admin save is rejected and the existing host score is kept.

### How scorers log in

1. The range master shows the QR code on their device.
2. The scorer opens their phone camera and scans the QR.
3. Browser opens the link and the token is automatically redeemed — the scorer lands on the scoring page.
4. If **Require approval** is enabled, the scorer waits for the range master to approve the device, then taps **I've already logged in** (or reopens the app).
5. If the scorer is using the PWA (installed to home screen), they tap **Or paste link** and paste the full URL copied from the browser.

## 📋 Squads QR

QR code for the **public squads** page at `/squads`. Shows a read-only list of squad assignments as set by the admin. Useful for posting on the range notice board.
