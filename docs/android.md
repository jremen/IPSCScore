# Android (standalone) build

IPSCScore ships the **same codebase** to three runtimes:

| Runtime  | Shell           | Data layer                          |
| -------- | --------------- | ----------------------------------- |
| Web      | browser         | HTTP → Node/Hono backend → Postgres |
| Desktop  | Electron        | HTTP → Node/Hono backend → Postgres |
| Android  | Capacitor       | **on-device SQLite** (no backend)   |

There is no fork and no second repository. The Android app is the existing React
frontend, wrapped in Capacitor, with the remote data client swapped for a local
one at runtime.

## Layout

```
packages/core/            shared, dependency-free domain layer
  src/types.ts            domain types (shooter, stage, match)
  src/types-scoring.ts    score payloads, aggregations
  src/types-results.ts    result row shapes
  src/scoring/            every scoring formula + ranking helper
  src/scoring/stageParams.ts  min rounds / max points per stage type

frontend/                 the UI, unchanged for all three runtimes
  src/types/*.ts          thin re-exports of @ipscscore/core types
  src/utils/scoring.ts    scoring preview → delegates to @ipscscore/core
  src/services/api.ts     picks the client: local (Android) or HTTP
  src/services/data/
    platform.ts           'web' | 'electron' | 'android' | 'ios'
    sqlite/               the on-device implementation
      schema.ts           SQLite DDL mirroring the Postgres migrations
      db.ts               connection, transactions, query helpers
      mappers.ts          SQLite rows → domain objects
      matches.ts          matches + stages CRUD
      people.ts           shooters + registrations
      scoring.ts          score save (atomic) + stage recalculation
      results.ts          overall / division / stage / category / tag results
      auth.ts             local admin password (PBKDF2) + session token
      client.ts           the api-shaped facade

mobile/                   Capacitor shell
  capacitor.config.ts
  android/                generated native project
```

## Why this shape

Electron cannot target Android — it officially supports macOS, Windows and Linux
only. Capacitor is the supported path: it packages the Vite bundle into a native
webview and exposes native APIs through plugins.

The frontend already spoke to the backend through a single `api` object. Rather
than teach every component about SQLite, `services/api.ts` now resolves that
object once at startup:

```ts
export const api = (isLocalRuntime() ? createLocalClient() : httpApi) as unknown as typeof httpApi;
```

Both implementations expose the same methods, so components are unchanged.

Scoring is the one thing that absolutely must not diverge between runtimes, so
every formula lives in `packages/core`. The frontend's domain types
(`frontend/src/types/*`) and its live scoring preview
(`frontend/src/utils/scoring.ts`) are now thin re-exports/adapters over it — the
phone and the UI run literally the same function.

The backend still has its own copy in `backend/src/utils/scoringCalc.ts` and
`backend/src/routes/stages.ts:calcStageParams`; migrating those is the next step
(see *Remaining work*).

## PostgreSQL → SQLite translation

The on-device schema mirrors `backend/src/db/migrations` with these mappings:

| Postgres      | SQLite                                  |
| ------------- | --------------------------------------- |
| `UUID`        | `TEXT`, generated via `crypto.randomUUID()` |
| `TIMESTAMPTZ` | `TEXT` (ISO-8601, UTC)                  |
| `DATE`        | `TEXT` (`YYYY-MM-DD`)                   |
| `BOOLEAN`     | `INTEGER` (0/1)                         |
| `DECIMAL(p,s)`| `REAL`                                  |
| `JSONB`       | `TEXT` (`JSON.stringify`)               |
| `TEXT[]`      | `TEXT` (JSON array)                     |

Postgres-only constructs were rewritten:

- `ILIKE` → `LIKE` (SQLite's `LIKE` is case-insensitive for ASCII)
- `unaccent(...)` → **not available**; diacritic-insensitive search is a known gap
- `ANY(uuid[])`, `::casts`, `FILTER`, `FOR UPDATE` → removed
- `RETURNING *` → a follow-up `SELECT`
- `CROSS JOIN LATERAL` window-ranking → computed in TypeScript from the shared
  core ranking helpers, rounding identically (`ROUND(..., 4)` percent,
  `ROUND(..., 2)` points)
- "at most one current match" → `CREATE UNIQUE INDEX ... ON matches(is_current)
  WHERE is_current = 1`

Foreign keys are enforced (`PRAGMA foreign_keys = ON`), so deleting a match
cascades to stages, registrations, scores and targets as it does in Postgres.

## Atomicity

`saveScore` runs in one transaction that writes `stage_scores`, replaces
`target_scores`, upserts `chrono_results` (including power-factor reclassification)
and recalculates the stage ranking. Nested calls join the outer transaction, so
recalculation can run inside the save without a second `BEGIN`.

## Authentication

There is no server, so the local client implements the admin password itself:

- PBKDF2-SHA256, 150 000 iterations, random 16-byte salt, stored in `app_settings`
- default password is `admin` until changed
- login issues an opaque token kept in `localStorage` and mirrored in `app_settings`

Scorer-trust / stage-link flows are intentionally inert — they exist to
authenticate *remote* devices against one authority, which does not apply when the
device **is** the authority.

## Exporting files

Every PDF/CSV/HTML export funnels through `frontend/src/utils/exportUtils.ts`:

| Runtime | Save path |
|---|---|
| web / electron | File System Access API when available, otherwise `<a download>` |
| android / ios | `@capacitor/filesystem` → `Documents/IPSCScore/<name>` |

An `<a download>` click is silently dropped by the Android WebView (there is no
download handler and no `DownloadListener`), so `saveBlobToDevice()` converts the
Blob to base64 and writes it through the Capacitor plugin instead. The
"Save As" dialog stays in play on device because `nativeSaveAs()` only drives the
desktop picker.

`Directory.Documents` resolves to a plain external-storage path, so Android 10 and
older need the runtime permission declared in `AndroidManifest.xml`
(`WRITE_EXTERNAL_STORAGE`, plus `requestLegacyExternalStorage`); Android 11+ writes
through scoped storage. If the write is refused the blob is shared from the app
cache through the Share sheet rather than reporting a success that never happened.

File names typed in the dialog are sanitised (`\/:*?"<>|` → `_`) and re-exporting
under the same name replaces the previous file.

## App icon

The phone shows the same target logo as the web/PWA and desktop builds:

| Source | Contents |
| --- | --- |
| `electron/resources/icon.svg` | the complete logo — light-grey plate + target (vector master) |
| `electron/resources/icon.png` | only the target, transparent background |

The launcher icon is generated from the **SVG**, because an Android icon needs the
plate; `icon.png` alone would leave the launcher with a floating target. The result
matches `frontend/public/icons/apple-touch-icon.png`.

```bash
bash scripts/generate-android-icons.sh   # needs cairosvg + ImageMagick 7
```

It writes three files per `mipmap-<density>/`:

| File | Used for |
| --- | --- |
| `ic_launcher.png` | the whole logo — devices below API 26 |
| `ic_launcher_round.png` | the same logo clipped to a circle |
| `ic_launcher_foreground.png` | the plate inside the 72dp safe zone of the 108dp adaptive canvas |

`values/ic_launcher_background.xml` supplies the matching `#EFEFEF` plate behind the
adaptive foreground, so the target always sits well inside the launcher's mask shape.
The densities are mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144 and xxxhdpi 192, with
adaptive canvases of 108, 162, 216, 324 and 432. Downscaling uses `-filter Box`: the
artwork's fine concentric rings alias badly under a sharpening filter.

## Building

```bash
npm install                       # links @ipscscore/core, installs Capacitor

npm run build:android:debug       # frontend build → cap sync → gradlew assembleDebug
npm run build:android:release     # signed release needs android/keystore.properties
npm run open:android              # open in Android Studio
npm run sync:android              # cap sync only (copy assets + plugin config)
```

`mobile/capacitor.config.ts` points `webDir` at `../frontend/dist`; `cap sync`
copies that bundle into `android/app/src/main/assets/public`.

Requirements: **JDK 21** (Capacitor 8 compiles with `sourceCompatibility 21`), Android
SDK with platform 36 (Capacitor's `compileSdk`/`targetSdk`), `minSdk` 24, and an
emulator or device. The first Gradle run downloads Gradle 8.14.3 and the Android
Gradle plugin.

For the full step-by-step guide — setting up `local.properties`, installing over USB
or Wi-Fi (`adb`), live reload, and producing a signed release APK — see
[`../mobile/README.md`](../mobile/README.md).

Published versions are built for you: pushing a version tag makes
[`../.github/workflows/release.yml`](../.github/workflows/release.yml) build, sign
and attach `IPSCScore.apk` to a GitHub Release. See
[`releasing.md`](releasing.md).

## What works today

Fully local, offline, no computer required:

- matches, stages, shooters, registrations, squads, registration groups
- DQ / un-DQ with automatic recalculation
- score entry for every scoring type, DQ/DNF handling
- hit-factor, net-points and time-based stage ranking, per division
- overall / division / stage / category / tag results and shooter scorecards
- PDF / CSV / HTML export straight to `Documents/IPSCScore/`
- admin password + login

## Remaining work

Declared in `client.ts` and currently throwing
`LocalFeatureUnavailableError`:

- **Import/export**: match JSON + PSC export, WinMSS import, CSV import/export.
  These need the server-side parsers (`csv-parse`, the WinMSS reader) moved into
  a shared package. The neutral JSON format already exists in
  `backend/src/services/localBackup.ts` and is the intended backup format.
- **Backup/restore**: a full JSON export/import inside one SQLite transaction,
  using `@capacitor/filesystem` + `@capacitor/share`.
- **Cups**: aggregation across matches; pure read logic, straightforward to port
  onto `results.ts`.
- **Stage images**: needs `@capacitor/filesystem` instead of the multer upload.
- **Backend unification**: point `backend/src/utils/scoringCalc.ts` and
  `backend/src/routes/stages.ts:calcStageParams` at `@ipscscore/core`. The
  backend compiles with `rootDir: src`, so importing a workspace package that
  resolves to TypeScript source fails to emit. Fix by either adding a project
  reference / `paths` mapping, or switching the backend to the esbuild-only
  bundle path that Electron already uses.
- **LAN hosting from the device** (multi-device scoring without a laptop) is out
  of scope for this phase; Capacitor cannot run the Node backend in-process, so
  it would need a native service or an embedded HTTP server plugin.
