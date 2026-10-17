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

## Building

```bash
npm install                       # links @ipscscore/core, installs Capacitor

npm run build:android:debug       # frontend build → cap sync → gradlew assembleDebug
npm run build:android:release     # signed release needs android/keystore.properties
npm run open:android              # open in Android Studio
npm run sync:android              # web build + native sync only
```

`mobile/capacitor.config.ts` points `webDir` at `../frontend/dist`; `cap sync`
copies that bundle into `android/app/src/main/assets/public`.

Requirements: **JDK 21** (Capacitor 8 compiles with `sourceCompatibility 21`), Android
SDK with platform 36 (Capacitor's `compileSdk`/`targetSdk`), `minSdk` 24, and an
emulator or device. The first Gradle run downloads Gradle 8.14.3 and the Android
Gradle plugin.

## What works today

Fully local, offline, no computer required:

- matches, stages, shooters, registrations, squads, registration groups
- DQ / un-DQ with automatic recalculation
- score entry for every scoring type, DQ/DNF handling
- hit-factor, net-points and time-based stage ranking, per division
- overall / division / stage / category / tag results and shooter scorecards
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
