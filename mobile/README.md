# IPSCScore for Android — build & install

This is the Android shell for IPSCScore. It wraps the same `frontend/` web app in a
[Capacitor](https://capacitorjs.com) WebView and stores all data on the device in SQLite.
No backend, no computer, and no network are required at runtime.

- Architecture and design notes: [`../docs/android.md`](../docs/android.md)
- What works and what is not implemented yet on Android: [Feature coverage](#feature-coverage)
- How releases are published (CI, signing secrets): [`../docs/releasing.md`](../docs/releasing.md)
- iOS build & device-install guide: [`README-ios.md`](README-ios.md)

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [One-time setup](#2-one-time-setup)
3. [Build the debug APK](#3-build-the-debug-apk)
4. [Prepare the device](#4-prepare-the-device)
5. [Install and run](#5-install-and-run)
6. [Android Studio (optional)](#6-android-studio-optional)
7. [Installing over Wi-Fi](#7-installing-over-wi-fi)
8. [Iterating on the app](#8-iterating-on-the-app)
9. [Release builds](#9-release-builds)
10. [Troubleshooting](#10-troubleshooting)
11. [Feature coverage](#feature-coverage)

---

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 or newer | npm workspace root |
| **JDK 21** | 21 | Capacitor 8 compiles with Java 21. JDK 8/11/17 will fail. |
| Android SDK | platform **36**, build-tools, platform-tools | `compileSdk`/`targetSdk` are 36 |
| Android device | Android 7.0 (API 24) or newer | `minSdk` is 24 |

Gradle itself is **not** a prerequisite — the Gradle wrapper (`mobile/android/gradlew`)
downloads Gradle 8.14.3 on first use.

The easiest way to get the SDK and a matching JDK is to install
[Android Studio](https://developer.android.com/studio); it bundles both. If you prefer the
command line, the `cmdline-tools` SDK plus a separately installed JDK 21 works too.

Check your JDK:

```bash
java -version        # must report 21.x
```

On macOS, list installed JDKs and select 21 for the current shell:

```bash
/usr/libexec/java_home -V
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

---

## 2. One-time setup

From the repository root:

```bash
npm install
```

or

```bash
yarn install
```

This installs the workspace (including `@ipscscore/core`, which the Android build shares with
the desktop and web builds) and resolves the Capacitor packages. The Capacitor CLI is hoisted
to the root `node_modules/.bin`, so always run the npm scripts below from the repository root
unless stated otherwise.

### Point Gradle at the Android SDK

Create `mobile/android/local.properties` (it is gitignored):

```properties
sdk.dir=/Users/<you>/Library/Android/sdk
```

Replace the path with your real SDK location:

- macOS (Android Studio): `~/Library/Android/sdk`
- Linux: `~/Android/Sdk`
- Windows: `%LOCALAPPDATA%\Android\Sdk`

Alternatively, export `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) instead of creating the file.
Android Studio writes `local.properties` automatically the first time it opens the project.

### Make sure `adb` is on your PATH

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
```

(`adb` ships in the SDK's `platform-tools` package.)

---

## 3. Build the debug APK

From the repository root:

```bash
npm run build:android:debug
```

That single command does three things:

1. builds the frontend with Vite (`frontend/dist`),
2. copies the web assets and native plugin config into the Android project (`cap sync android`),
3. compiles the debug APK with Gradle (`assembleDebug`).

The result is written to:

```
mobile/android/app/build/outputs/apk/debug/IPSCScore-debug.apk
```

The **first** build takes several minutes because Gradle, the Android Gradle Plugin, and the
dependencies are downloaded. Later builds are much faster.

> **Do not edit `mobile/android/app/src/main/assets/public`.**
> It is generated and gitignored; `cap sync` recreates it from `frontend/dist` on every build.

---

## 4. Prepare the device

1. **Enable Developer options** — Settings → About phone → tap *Build number* seven times.
2. **Enable USB debugging** — Settings → System → Developer options → *USB debugging*.
3. **Connect the device** by USB. Accept the *“Allow USB debugging?”* prompt on the phone
   (tick “Always allow from this computer”).

Verify the connection:

```bash
adb devices
```

The device must be listed as `device`. If it shows `unauthorized`, accept the prompt on the
phone and run the command again.

---

## 5. Install and run

### Option A — Gradle (builds and installs in one step)

```bash
cd mobile/android
./gradlew installDebug
```

### Option B — install an APK you already built

```bash
adb install -r mobile/android/app/build/outputs/apk/debug/IPSCScore-debug.apk
```

`-r` replaces an existing installation **and keeps the local database**.

### Launch

Tap the **IPSCScore** icon on the device, or from the command line:

```bash
adb shell am start -n com.ipscscore.app/.MainActivity
```

The app starts fully offline. Sign in with the default admin password `admin` and change it in
the app's settings afterwards.

---

## 6. Android Studio (optional)

If you prefer a GUI (logcat, debugger, layout inspector, device manager):

```bash
npm run open:android
```

Then pick your device in the toolbar and press **Run**. Remember to run
`npm run sync:android` after changing web code, because Android Studio builds the *native*
project and does not re-run Vite for you.

---

## 7. Installing over Wi-Fi

Android 11 and newer support wireless debugging, so you do not need a cable.

1. On the device: Settings → System → Developer options → **Wireless debugging** → On.
2. Tap **Pair device with pairing code**. Note the `IP:port` and the 6-digit code.
3. Pair once:

   ```bash
   adb pair 192.168.1.50:37123      # enter the pairing code when prompted
   ```

4. Connect using the port shown on the *Wireless debugging* screen (a different port than the
   pairing one):

   ```bash
   adb connect 192.168.1.50:41234
   adb devices                      # confirm the device is listed
   ```

5. Install as in [step 5](#5-install-and-run).

This is `adb` over Wi-Fi **for development only** — the installed app itself never needs a
network connection.

---

## 8. Iterating on the app

After any change under `frontend/` or `packages/core/`, rebuild the web assets and reinstall:

```bash
npm run build:android:debug
cd mobile/android && ./gradlew installDebug
```

Or, if you only want to push the new web bundle to a device that already has the app:

```bash
npm run sync:android
cd mobile/android && ./gradlew installDebug
```

### Live reload (UI work)

For fast iteration while editing the frontend:

```bash
cd mobile
npx cap run android --livereload --external
```

The device loads the app from the Vite dev server on your machine over Wi-Fi (it must be on the
same network). This is a development-only mode.

### Cleaning

```bash
cd mobile/android && ./gradlew clean
```

---

## 9. Release builds

Debug APKs are for testing. A distributable APK must be signed with a release keystore.

### 9.1 Generate a keystore (once)

```bash
keytool -genkeypair -v \
  -keystore ~/ipscscore-release.keystore \
  -alias ipscscore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12 \
  -dname "CN=IPSCScore, OU=Mobile, O=IPSCScore, L=Bratislava, C=SK"
```

`keytool` prompts for the store and key password (use the same one for both — PKCS12 requires
it). Keep this file and its password safe and **out of version control** — you cannot publish an
update signed with a different key. (`*.keystore`, `*.jks`,
`mobile/android/keystore.properties`, and `mobile/android/local.properties` are already
gitignored.)

### 9.2 Store the credentials

Create `mobile/android/keystore.properties` (gitignored):

```properties
storeFile=/Users/<you>/ipscscore-release.keystore
storePassword=<your store password>
keyAlias=ipscscore
keyPassword=<your key password>
```

Use an **absolute** `storeFile` path so the build is not sensitive to the working directory.

### 9.3 Gradle wiring (already in the project)

Nothing to add — `mobile/android/app/build.gradle` already loads `keystore.properties` and
applies it via `signingConfigs.release`. Two behaviours are worth knowing:

- With `keystore.properties` present, `release` builds are signed and land in
  `IPSCScore.apk`.
- Without it, any `*Release` task **fails immediately** with a message pointing here. That is
  deliberate: an unsigned release APK builds fine but Android refuses to install it.
- Both build types are named after the app instead of the Gradle module:
  `IPSCScore.apk` for release, `IPSCScore-debug.apk` for debug.

### 9.4 Build

```bash
npm run build:android:release
adb install -r mobile/android/app/build/outputs/apk/release/IPSCScore.apk
```

Verify the signature before shipping:

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs \
  mobile/android/app/build/outputs/apk/release/IPSCScore.apk
```

You can also use Android Studio: **Build → Generate Signed App Bundle / APK**.

> `versionCode` and `versionName` are read from `mobile/package.json`, so a version bump
> (`npm run version:patch|minor|major`) updates the APK metadata too — `2.5.2` becomes
> `versionName 2.5.2` / `versionCode 20502`. Make sure `versionCode` increases for every
> published update, because the Play Store rejects a re-used one (going from `2.9.x` to
> `3.0.0` keeps it monotonic).

> Installing a release APK over a debug install fails with
> `INSTALL_FAILED_UPDATE_INCOMPATIBLE` — different signing keys. Run
> `adb uninstall com.ipscscore.app` first, which deletes the on-device database. To move
> existing data across, back it up from the old install before uninstalling.

### 9.5 Automated releases (GitHub Actions)

You do not have to build the release APK by hand. Pushing a version tag makes
[`.github/workflows/release.yml`](../.github/workflows/release.yml) build and sign it
on CI and attach it to a GitHub Release alongside the desktop installers:

```bash
npm run version:minor
git commit -am "chore: release 2.6.0"
git tag v2.6.0
git push origin main --tags
```

The keystore lives in repository secrets (`ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) — the same
key you generated in [§9.1](#91-generate-a-keystore-once), so a CI-built APK installs
over your local installs. The asset is named `IPSCScore.apk`, identical to a local
`npm run build:android:release` apart from the machine that produced it.

Full guide, including the secret setup: [`../docs/releasing.md`](../docs/releasing.md).

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Unsupported class file major version` or Gradle Java errors | Wrong JDK. Capacitor 8 needs **JDK 21**. Set `JAVA_HOME` (see [§1](#1-prerequisites)), or pin it permanently in `mobile/android/gradle.properties`:<br>`org.gradle.java.home=/path/to/jdk-21` |
| `SDK location not found` | Create `mobile/android/local.properties` with `sdk.dir=…`, or export `ANDROID_HOME`. |
| `adb: command not found` | Add `$ANDROID_HOME/platform-tools` to `PATH`. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | The installed copy was signed with a different key.<br>`adb uninstall com.ipscscore.app`, then install again. This also deletes the on-device database. |
| `INSTALL_PARSE_FAILED_NO_CERTIFICATES` | The APK is unsigned — you installed a `*-unsigned.apk` or built before signing was configured. Create `mobile/android/keystore.properties` (see [§9](#9-release-builds)) and rebuild; the release build now refuses to run without it. |
| `Release signing is not configured` during `*Release` | `mobile/android/keystore.properties` is missing. See [§9](#9-release-builds). |
| Blank / white screen after launch | The web bundle was not synced. Run `npm run build:android:debug` (or `npm run sync:android`), reinstall, and inspect `adb logcat \| grep -i capacitor`. |
| `cap: command not found` | Run `npm install` at the repository root; the CLI is hoisted there. |
| `./gradlew: Permission denied` | `chmod +x mobile/android/gradlew` |
| First build hangs for minutes | It is downloading Gradle 8.14.3 and the Android Gradle Plugin. Subsequent builds are fast. |
| Device shows `unauthorized` in `adb devices` | Accept the RSA prompt on the phone, then re-run `adb devices`. |
| Native code changed but nothing happens on device | Android Studio rewrites the native project: run `npm run open:android` or `npm run sync:android` afterwards. |

Useful diagnostics:

```bash
adb logcat | grep -i -E "capacitor|chromium|ipscscore"
adb shell pm list packages | grep ipscscore
adb shell dumpsys package com.ipscscore.app | grep versionName
```

---

## Feature coverage

Everything runs on-device with a local SQLite database. The following capabilities are
**not yet implemented** on Android and raise `LocalFeatureUnavailableError` when used:

- match export, PSC export/import, match import
- WinMSS / CSV import and export
- backup / restore and local-folder backup
- cups, stage image upload/removal, audit log

Also note that diacritic-insensitive shooter search is unavailable locally (SQLite has no
`unaccent`); SQLite `LIKE` is ASCII case-insensitive only.

See [`../docs/android.md`](../docs/android.md) for the full architecture and the
PostgreSQL → SQLite mapping.

---

## Script reference

Run from the repository root:

| Command | What it does |
|---|---|
| `npm run build:android:debug` | Build frontend → `cap sync` → `assembleDebug` |
| `npm run build:android:release` | Build frontend → `cap sync` → `assembleRelease` |
| `npm run sync:android` | `cap sync android` (copy web assets + plugin config only) |
| `npm run open:android` | Open the native project in Android Studio |
| `bash scripts/generate-android-icons.sh` | Regenerate the launcher icons from `electron/resources/icon.svg` |

Inside `mobile/android/`:

| Command | What it does |
|---|---|
| `./gradlew installDebug` | Build and install the debug APK on the connected device |
| `./gradlew clean` | Delete Gradle build outputs |
