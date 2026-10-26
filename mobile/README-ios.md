# IPSCScore for iOS — build & install without the App Store

This is the iOS shell for IPSCScore. It wraps the same `frontend/` web app in a
[Capacitor](https://capacitorjs.com) `WKWebView` and stores all data on the device in SQLite.
No backend, no computer, and no network are required at runtime.

The app is **not** distributed through the App Store. You build it on a Mac and install it
straight onto an iPhone or iPad from Xcode — either with a free Apple Account (Personal Team)
or with a paid Apple Developer account for wider Ad Hoc distribution.

- Architecture and design notes: [`../docs/android.md`](../docs/android.md) — the data layer
  is shared with Android; the iOS-specific differences are listed [below](#11-ios-specific-notes).
- Android equivalent: [`README.md`](README.md)
- How desktop/Android releases are published: [`../docs/releasing.md`](../docs/releasing.md)

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [One-time setup](#2-one-time-setup)
3. [Run in the Simulator](#3-run-in-the-simulator)
4. [Run on a real iPhone or iPad (free Apple Account)](#4-run-on-a-real-iphone-or-ipad-free-apple-account)
5. [Install without the App Store](#5-install-without-the-app-store)
6. [Ad Hoc distribution (paid Apple Developer account)](#6-ad-hoc-distribution-paid-apple-developer-account)
7. [Iterating on the app](#7-iterating-on-the-app)
8. [Versioning and app icon](#8-versioning-and-app-icon)
9. [Xcode versions](#9-xcode-versions)
10. [Troubleshooting](#10-troubleshooting)
11. [iOS-specific notes](#11-ios-specific-notes)
12. [Feature coverage](#12-feature-coverage)

---

## 1. Prerequisites

iOS apps can only be built on macOS. There is no Windows or Linux path.

| Requirement | Version | Notes |
|---|---|---|
| macOS | 14 Sonoma or newer | Whatever the installed Xcode requires |
| **Xcode** | **26.0 or newer** | Capacitor 8 requires Xcode 26+; Xcode 27 is current |
| iOS device | iOS 15.0 or newer | Capacitor's minimum deployment target |
| Node.js | 18 or newer | npm workspace root |
| Apple Account | free | A paid Developer Program membership is only needed for Ad Hoc / TestFlight |
| Network | — | The first Xcode build resolves Swift Package Manager dependencies from GitHub |

Install Xcode from the App Store, then accept the licence and install the platform support:

```bash
sudo xcodebuild -license accept
xcodebuild -version          # should report 26.x or 27.x
xcodebuild -runFirstLaunch
```

If `xcode-select` points at the Command Line Tools instead of Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Capacitor 8 uses **Swift Package Manager**; CocoaPods is not needed and there is no `Podfile`
to install.

---

## 2. One-time setup

From the repository root:

```bash
npm install
```

This installs the workspace (including `@ipscscore/core`, shared with the desktop and Android
builds) and resolves `@capacitor/ios` plus the native plugins. The iOS project is already
committed at `mobile/ios/`; you only need to add it yourself if it is ever deleted:

```bash
npm run add:ios                    # cd mobile && cap add ios
```

The generated Xcode project uses these plugins:

| Plugin | Used for |
|---|---|
| `@capacitor-community/sqlite` | the on-device match database |
| `@capacitor/filesystem` | writing PDF/CSV/HTML exports |
| `@capacitor/share` | sharing a file when Documents is not writable |

The Swift package paths point at the repository-root `node_modules`. If npm ever stops
hoisting Capacitor to the root, run `npm install` inside `mobile/` and then `npm run sync:ios`
again so `Package.swift` picks up the new paths.

---

## 3. Run in the Simulator

The Simulator needs no Apple Account, no signing, and no device.

### 3.1 Build the web bundle and sync it

```bash
npm run build:ios:simulator
```

That command:

1. builds the React frontend with Vite (`frontend/dist`),
2. copies the bundle into `mobile/ios/App/App/public` and updates the Swift package
   (`cap sync ios`),
3. compiles a Debug build for the iOS Simulator with code signing disabled.

The compiled app lands at:

```
mobile/ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app
```

The first run takes a few minutes because Swift Package Manager downloads
`capacitor-swift-pm`. Later builds are much faster.

### 3.2 Run it

Easiest — open Xcode and press **Run**:

```bash
npm run open:ios
```

Pick an iPhone simulator in the toolbar and press ▶. Xcode builds, installs, and launches the
app, with the debugger and console attached.

Or stay on the command line:

```bash
xcrun simctl list devices available          # find a booted or available iPhone
open -a Simulator                            # Xcode 26 and older
open -a DeviceHub                            # Xcode 27 renamed Simulator to Device Hub
xcrun simctl install booted mobile/ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted com.ipscscore.app
```

To see the app's console output:

```bash
xcrun simctl spawn booted log stream --level debug \
  --predicate 'process == "App"'
```

The Simulator keeps its own copy of the SQLite database. It is deleted when you erase the
simulator (**Device → Erase All Content and Settings**) or uninstall the app.

> **Do not edit `mobile/ios/App/App/public`.**
> It is generated and gitignored; `cap sync` recreates it from `frontend/dist` on every sync.

### 3.3 Live reload (UI work)

```bash
cd mobile
npx cap run ios --livereload --external
```

The device or simulator loads the app from the Vite dev server on your Mac. The iOS **Local
Network** permission prompt must be allowed the first time. This is development-only — the
installed app never needs a network connection.

---

## 4. Run on a real iPhone or iPad (free Apple Account)

A free Apple Account is enough to install and use the app on your own device. There is no
App Store review, no TestFlight, and no paid membership involved.

### 4.1 Prepare the device

1. Connect the iPhone/iPad to the Mac with a cable. Tap **Trust** on the device and enter its
   passcode.
2. On the device: **Settings → Privacy & Security → Developer Mode → On**, then restart.
   (The switch only appears after the device has been connected to Xcode once. On iOS 15 it
   does not exist.)
3. In Xcode: **Window → Devices and Simulators** — the device should be listed without a
   warning. If it says *“Preparing device for development”*, wait for it to finish.

Wireless debugging is optional: in Finder select the device and enable **“Show this iPhone
when on Wi-Fi”**, then pick it in Xcode's run destinations.

### 4.2 Add your Apple Account to Xcode

1. **Xcode → Settings → Accounts** (⌘,).
2. Click **+**, choose **Apple ID**, sign in.
3. The account appears with a team named **`<Your Name> (Personal Team)`**.

No certificates or provisioning profiles need to be created by hand — Xcode does it.

### 4.3 Configure signing

1. Open the project: `npm run open:ios`.
2. In the Project navigator select the **App** project → target **App** →
   **Signing & Capabilities**.
3. Tick **Automatically manage signing**.
4. **Team**: choose your *Personal Team*.
5. **Bundle Identifier**: `com.ipscscore.app` may already be taken by another Apple Account.
   If Xcode reports *“Failed to register bundle identifier”*, change it to something unique,
   e.g. `com.yourname.ipscscore`.

> Changing the bundle identifier creates a **different app** on the device with a fresh,
> empty database. Export any data you need first.

Xcode registers the device and creates a development provisioning profile automatically.

### 4.4 Build and install

1. Select the physical device as the run destination in the toolbar.
2. Press ▶ (**Product → Run**).
3. The first install may ask for the device passcode and show *“Developer Mode required”* if
   step 4.1.2 was skipped.

The app icon appears on the home screen. It starts fully offline: sign in with the default
admin password **`admin`** and change it in Settings afterwards.

If iOS refuses to launch it with *“Untrusted Developer”*:

- **Settings → General → VPN & Device Management → Developer App → Trust “<your Apple ID>”**.

### 4.5 Limitations of a free Apple Account

| Limit | Consequence |
|---|---|
| Provisioning profile expires after ~7 days | The app stops launching with *“Unable to Verify App”*. Reconnect to the Mac and run it from Xcode again to re-sign. The on-device database is **kept** when you reinstall over the old app. |
| Apple caps free App IDs / devices | If Xcode refuses to register another app or device, wait for the window to reset or use a different bundle identifier. |
| No Ad Hoc, TestFlight, or App Store | Only devices you build to directly from Xcode can run the app. |
| No push, iCloud, or most capabilities | Not used by IPSCScore. |

For a device that must keep working for months without a Mac, use a paid account and Ad Hoc
distribution (next section), or re-sign from Xcode before each match.

---

## 5. Install without the App Store

There are three supported ways to get the app onto a device, none of which involve the App
Store:

| Method | Account | Lifetime | Use when |
|---|---|---|---|
| **Run from Xcode** | free or paid | ~7 days (free), 1 year (paid) | development, testing, a single scorer device |
| **Ad Hoc `.ipa`** | paid | 1 year | several club devices, no Mac at the range |
| **Apple Configurator** | paid (Ad Hoc) | 1 year | installing the `.ipa` on a device without Xcode |

A development-signed `.app` can also be installed over USB without opening Xcode, using
Xcode's device tooling:

```bash
xcrun devicectl list devices
xcrun devicectl device install app --device <UDID> \
  mobile/ios/DerivedData/Build/Products/Debug-iphoneos/App.app
```

The app must already have been built for the device (`-sdk iphoneos`) with a valid signing
team, otherwise iOS rejects it at launch.

---

## 6. Ad Hoc distribution (paid Apple Developer account)

Ad Hoc builds install on registered devices without App Store review and stay valid for a
year. This is the closest equivalent to the Android APK workflow.

### 6.1 Register the devices

1. Sign in to [developer.apple.com/account](https://developer.apple.com/account) →
   **Certificates, Identifiers & Profiles → Devices**.
2. Add each iPhone/iPad's UDID (Xcode → Window → Devices and Simulators shows it; the
   device's Finder summary also reveals it with a click on the serial number).

Ad Hoc profiles only install on devices listed there. Apple allows 100 devices per device
family per membership year.

### 6.2 Archive and export

In Xcode:

1. Select **Any iOS Device (arm64)** as the destination.
2. **Product → Archive**.
3. In the Organizer press **Distribute App**.
4. Choose **Release Testing** (called **Ad Hoc** in older Xcode versions) → **Export**.
5. Keep **Automatically manage signing**, pick your team, and export the `.ipa`.

Or from the command line:

```bash
cd mobile

# 1. Archive (Release, signed with your team)
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath ios/build/IPSCScore.xcarchive \
  DEVELOPMENT_TEAM=<TEAM_ID> CODE_SIGN_STYLE=Automatic archive

# 2. Export an Ad Hoc .ipa
cat > ios/build/ExportOptions.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>release-testing</string>
  <key>teamID</key>
  <string>TEAM_ID</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>destination</key>
  <string>export</string>
</dict>
PLIST

xcodebuild -exportArchive \
  -archivePath ios/build/IPSCScore.xcarchive \
  -exportPath ios/build/export \
  -exportOptionsPlist ios/build/ExportOptions.plist
```

On Xcode 25 and older, use `<string>ad-hoc</string>` instead of `release-testing`.

Your team ID is shown in the Apple Developer portal under **Membership details**, and in
Xcode under **Settings → Accounts**.

### 6.3 Install the `.ipa`

- **Apple Configurator** (free on the Mac App Store): connect the device, drag the `.ipa`
  onto it, or use **Add → Apps**.
- Or extract the `.app` from the `.ipa` (it is a zip) and use
  `xcrun devicectl device install app --device <UDID> <payload/App.app>`.

Because the build is signed with a distribution profile, the device does not need Developer
Mode and does not need to be re-signed weekly. It does need to be one of the registered
devices.

### 6.4 Renaming the exported app

`CFBundleDisplayName` is `IPSCScore` (set in `mobile/ios/App/App/Info.plist`). The exported
file name is derived from the target and can be renamed freely before sharing.

---

## 7. Iterating on the app

The Xcode project does **not** run Vite. After any change under `frontend/` or
`packages/core/`, rebuild and sync before running:

```bash
npm run build:web          # frontend/dist
npm run sync:ios           # version sync + copy into the iOS project
```

Then press ▶ in Xcode, or:

```bash
npm run run:ios            # build:web + sync:ios + cap run ios
```

`npm run sync:ios` alone only copies the **already built** bundle; it does not run Vite.

If a frontend change seems to have no effect, the app is probably showing a cached bundle.
Delete the app from the device/simulator and reinstall, or bump the service-worker cache
version in the frontend build. (The Android shell has the same behaviour.)

### Cleaning

```bash
cd mobile/ios
xcodebuild -project App/App.xcodeproj -scheme App clean
rm -rf DerivedData build
```

To reset Swift Package Manager's caches: **File → Packages → Reset Package Caches** in Xcode.

---

## 8. Versioning and app icon

The repository requires every workspace manifest to share one version (see
[`../AGENTS.md`](../AGENTS.md)). iOS keeps its version in `project.pbxproj`, so
`mobile/package.json` is mirrored into it automatically:

```bash
node scripts/sync-ios-version.mjs            # MARKETING_VERSION + CURRENT_PROJECT_VERSION
node scripts/sync-ios-version.mjs --check    # exit 1 when out of step
```

- `MARKETING_VERSION` ← `version` (e.g. `2.6.0`)
- `CURRENT_PROJECT_VERSION` ← `major * 10000 + minor * 100 + patch` (e.g. `20600`), the same
  `versionCode` scheme the Android build uses

Both `sync:ios` and `open:ios` run this script first, so a normal `npm run version:minor`
followed by a rebuild is enough. `npm run version:bump` does not edit `project.pbxproj`.

The iOS icon is generated from the same artwork as the Android and PWA icons:

```bash
bash scripts/generate-ios-icons.sh     # needs cairosvg + ImageMagick 7
```

It writes `mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
(1024×1024, opaque RGB — App Store Connect and Xcode reject icons with an alpha channel).
Xcode derives every smaller size from that single file.

---

## 9. Xcode versions

| Xcode | Works? | Notes |
|---|---|---|
| **27.x** | yes | current release; shown in this guide |
| **26.x** | yes | Capacitor 8's documented minimum |
| 16.x and older | **no** | Capacitor 8 uses APIs and SPM features that require Xcode 26+ |

There is no “Xcode 18”: Apple moved to year-based version numbers, so Xcode 26 followed
Xcode 16. If “18” referred to **iOS 18**, that is the operating system, not Xcode — the app
runs on it (deployment target is iOS 15).

If you have several Xcodes installed, select the right one for the shell before building:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `xcodebuild: error: invalid option '-runFirstLaunch'` | Xcode is not selected; run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`. |
| *“Capacitor requires Xcode 26.0 or newer”* or Swift compile errors in `capacitor-swift-pm` | Old Xcode. Update to Xcode 26/27. |
| *“Failed to register bundle identifier”* | `com.ipscscore.app` is already taken by another account. Set a unique **Bundle Identifier** in **Signing & Capabilities**. |
| *“Signing for App requires a development team”* | Pick a Team under **Signing & Capabilities → Team**. The simulator build can otherwise use `CODE_SIGNING_ALLOWED=NO`. |
| *“Untrusted Developer”* on launch | Device: **Settings → General → VPN & Device Management → Developer App → Trust**. |
| Device not listed in Xcode | Unlock it, tap **Trust**, re-plug. Check **Window → Devices and Simulators**. iOS 16+ needs **Developer Mode** enabled. |
| *“Unable to Verify App”* after about a week | Free Personal Team profile expired. Run the app from Xcode again — the database is preserved. |
| *“Could not launch … device is locked”* | Unlock the device and keep it awake during the first install. |
| Package resolution fails (`Capacitor` / `CapacitorCommunitySqlite` not found) | Run `npm install` at the repository root, then **File → Packages → Reset Package Caches** and build again. Check network access to GitHub. |
| `Package.swift` paths point at a missing `node_modules` | Capacitor packages were not hoisted. Run `npm install` inside `mobile/` and then `npm run sync:ios`. |
| White/blank screen in the app | The web bundle is stale or was never copied. Run `npm run build:web && npm run sync:ios`, then reinstall. |
| SQLite errors on first launch | The plugin needs to write to `Library/CapacitorDatabase`. A clean reinstall recreates it; deleting the app deletes the database, so export first. |
| Exports “succeed” but the file is not in Files | Files app → **On My iPhone → IPSCScore**. If Documents is unavailable, the app falls back to the Share sheet. |
| Build works in the simulator but not on the device | Signing/team problem, or the device is not registered. Check the team and the provisioning profile in Xcode. |

Logs from a real device: **Window → Devices and Simulators → select device → Open Console**,
or filter in Console.app by the process name `App`.

---

## 11. iOS-specific notes

- **Data location** — SQLite lives in `Library/CapacitorDatabase/ipscscore` (set via
  `iosDatabaseLocation` in `mobile/capacitor.config.ts`). It is invisible to iTunes/Finder
  file sharing and is included in iCloud/iTunes device backups. Deleting the app deletes it.
- **Exports** — PDF/CSV/HTML results, `.match.json` files and full JSON backups are written to
  `Documents/IPSCScore/`. `Info.plist` sets `UIFileSharingEnabled` and
  `LSSupportsOpeningDocumentsInPlace`, so that folder is visible in the Files app under
  **On My iPhone → IPSCScore**. Re-exporting under the same name replaces the previous file.
- **Import/restore** — both accept a file from the Files app or iCloud Drive. Restoring a
  backup replaces every local table atomically and signs you out; the admin password stored in
  the backup still applies afterwards.
- **No storage permission prompt** — unlike Android 10 and older, iOS has no
  `WRITE_EXTERNAL_STORAGE` equivalent; writes stay inside the app sandbox.
- **Admin password** — same local PBKDF2 credential store as Android; default `admin`.
- **Scoring parity** — every formula comes from `packages/core`, so an iPhone computes exactly
  the same results as the desktop, web, and Android builds.
- **No backend** — Capacitor cannot run the Node/Hono server in-process. Multi-device scoring
  still needs the Electron/LAN host; iOS is a standalone scorer/results device.

---

## 12. Feature coverage

Identical to the Android build:

Fully local, offline, no computer required:

- matches, stages, shooters, registrations, squads, registration groups
- DQ / un-DQ with automatic recalculation
- score entry for every scoring type, DQ/DNF handling
- hit-factor, net-points and time-based stage ranking, per division
- overall / division / stage / category / tag results and shooter scorecards
- PDF / CSV / HTML export to `Documents/IPSCScore/` (Files app)
- `.match.json` match import/export — the same format as the desktop/web app
- WinMSS `.cab` import (export the match to `.cab` in WinMSS first) and
  PractiScore `.psc` import, both parsed on-device
- full JSON backup/restore of the device database (**Settings → Database**)
- admin password + login

Not implemented on the mobile builds (iOS included); the controls are hidden:

- WinMSS `.mdb/.accdb` import, CSV import/export, Practiscore `.psc` export
- cups aggregation
- stage images

Details and the remaining work are tracked in [`../docs/android.md`](../docs/android.md).

---

## Uninstall / reinstall

Deleting the app from the home screen (long-press → **Remove App** → **Delete App**) also
deletes the local SQLite database. Export a full backup first
(**Settings → Database → Export Backup (.json)**) and restore it the same way on the new
install. Reinstalling from Xcode over an existing app keeps the database.
