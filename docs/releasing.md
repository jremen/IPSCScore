# Releasing

Every version is published by a single workflow: [`.github/workflows/release.yml`](../.github/workflows/release.yml).
Push a version tag and GitHub builds the desktop installers and the signed Android
APK, generates a changelog, and creates a **Release** on the repository's
[Releases page](../../releases) with everything attached.

Nothing is uploaded to a store — the Release page *is* the distribution channel.

---

## 1. Cut a release

```bash
npm run version:minor          # or version:patch / version:major
git commit -am "chore: release 2.6.0"
git tag v2.6.0
git push origin main --tags
```

That is the whole procedure. `scripts/version-bump.mjs` writes the new version into
every workspace `package.json`, and the workflow refuses to run unless the tag
version matches all of them.

| Tag | Version | Notes |
|---|---|---|
| `v2.6.0` | 2.6.0 | One tag per release, always `v` + the exact `package.json` version. |

Version rules (what counts as patch/minor/major, and the 9-cap) are in
[`AGENTS.md`](../AGENTS.md#versioning-policy). The bump script does **not** commit
or tag — do that yourself, as above.

> A tag push is a release. Tags are built once; delete and re-push the tag
> (`git push origin :v2.6.0` first) if you need to redo a broken one.

### Re-running without a new tag

**Actions → Release → Run workflow** takes an existing tag and rebuilds and
republishes it. Re-running an existing Release updates its title, notes and assets
in place (`gh release upload --clobber`), so it is safe to repeat.

---

## 2. What the release contains

| Asset | Built by | Runner |
|---|---|---|
| `IPSCScore-<version>-arm64.dmg` | `npm run build:mac` | `macos-latest` |
| `IPSCScore Setup <version>-x64.exe` | `npm run build:win` | `windows-latest` |
| `IPSCScore Setup <version>-arm64.exe` | `npm run build:win-arm64` | `windows-latest` |
| `IPSCScore-<version>-x64.AppImage` | `npm run build:linux` | `ubuntu-latest` |
| `IPSCScore.apk` | `npm run build:android:release` | `ubuntu-latest` |
| `CHANGELOG-<version>.md` | `scripts/generate-changelog.mjs` | `ubuntu-latest` |

These are exactly the scripts you would run locally, so a CI build and a local
build differ only in the machine. The names come from `artifactName` in
[`electron/electron-builder.yml`](../electron/electron-builder.yml), which includes
`${arch}` — without it the x64 and arm64 Windows installers would collide on one
filename and one would silently overwrite the other.

The Android job installs the same toolchain the mobile guide asks for: **JDK 21**,
platform 36 and build-tools 36.0.0. The APK is verified with `apksigner` before it
is uploaded, so an unsigned build fails the run instead of reaching the Release page.

### Changelog

`scripts/generate-changelog.mjs` groups the commits since the previous tag by their
Conventional Commits type (features, fixes, performance, refactoring, docs, tests,
build/CI) and links each one. Preview it at any time:

```bash
node scripts/generate-changelog.mjs --version 2.6.0 --from v2.5.3 --repo jremen/IPSCStore
```

Omit `--from` (or point it at a tag that does not exist) to list the whole history,
which is what the first release does. Adding `--output CHANGELOG-2.6.0.md` writes a
file instead of printing. The repository's commit messages are mixed —
plain sentences end up under *Other Changes* — but `feat:`/`fix:` style messages
sort themselves into the right sections.

---

## 3. Android signing secrets

The workflow cannot sign the APK without the release keystore, which is
deliberately **not** in the repository (see
[`mobile/README.md` §9](../mobile/README.md#9-release-builds) for creating it).
Storing it as an encrypted secret is what makes a CI-built APK installable over
your existing installs — a different key means
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

Add these under **Settings → Secrets and variables → Actions → New repository
secret**:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the keystore file, base64-encoded (see below) |
| `ANDROID_KEYSTORE_PASSWORD` | the store password |
| `ANDROID_KEY_ALIAS` | `ipscscore` |
| `ANDROID_KEY_PASSWORD` | the key password (same as the store password for PKCS12) |

```bash
# macOS
base64 -i ~/ipscscore-release.keystore | pbcopy

# Linux
base64 -w0 ~/ipscscore-release.keystore
```

The job decodes it to a temporary path, writes a throwaway
`mobile/android/keystore.properties` (gitignored) and deletes everything with the
runner. Secrets are masked in logs; the keystore itself is never printed.

`GITHUB_TOKEN` needs no setup — the publish job gets `contents: write` for the
length of the run only.

> **Keep the keystore and its passwords forever.** Losing them means you can no
> longer publish an update that installs over existing installs. Back up
> `~/ipscscore-release.keystore` and the passwords somewhere offline.

---

## 4. Local macOS builds

`npm run build:mac` and the macOS half of `build:all` build **unsigned**, exactly
like CI: they set `CSC_IDENTITY_AUTO_DISCOVERY=false`. This is intentional — an
unsigned local build needs no certificate and cannot block on keychain access.

To sign a local build with the certificate already in your login keychain:

```bash
cd electron
npm run build:mac:signed
```

That uses [`electron-builder.local-sign.yml`](../electron/electron-builder.local-sign.yml):
development signing mode, no Apple timestamp, no hardened runtime. It is suitable
for running the app on your own Mac, not for distribution.

> Xcode's *Signing & Capabilities* settings do not apply here. Electron apps are
> signed by electron-builder through the macOS keychain (`codesign`), not by the
> Xcode project.

### Why signing used to take forever

`@electron/osx-sign` walks the whole app bundle and runs `codesign` on every file
it detects as binary. The bundled PostgreSQL `share/` tree contains about 1,500
timezone data files, each costing a `codesign` call (plus a timestamp round-trip).
`mac.signIgnore` excludes that directory; PostgreSQL's `bin/` and `lib/` binaries
are still signed because they must run on arm64.

A distributable, notarized build needs a **Developer ID Application** certificate,
`mac.type: distribution`, timestamping enabled, `hardenedRuntime: true`, and
`APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` (or `CSC_LINK` /
`CSC_KEY_PASSWORD`) in the environment.

---

## 5. Known limitations

- **macOS builds are unsigned** (`CSC_IDENTITY_AUTO_DISCOVERY: 'false'`), so
  Gatekeeper warns on first launch and the app is not notarized.
  `npm run build:mac:signed` signs locally for development, but a release still
  needs an Apple Developer ID certificate; add `CSC_LINK` / `CSC_KEY_PASSWORD`
  (and `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` for
  notarization) as secrets and set the distribution signing options.
- **Windows installers are unsigned**, so SmartScreen warns. That needs a code
  signing certificate (and, for the arm64 build, one that supports it).
- **Linux ships as an AppImage only** — no `.deb`/`.rpm`. Add extra targets under
  `linux.target` in `electron-builder.yml` if you want them.
- **Android is an APK, not an AAB** — it installs by sideloading, it is not a Play
  Store upload. `versionCode` is derived from the version
  (`major * 10000 + minor * 100 + patch`) so it stays monotonic; a Play Store
  release would need an AAB and a Play service account.
- **iOS is not built in CI.** It is not distributed through the App Store, so there
  is nothing to publish from GitHub Actions: builds are made and signed locally in
  Xcode. See [`../mobile/README-ios.md`](../mobile/README-ios.md). The same version
  scheme is written into the Xcode project by `scripts/sync-ios-version.mjs`.
- Blockmap files are **not** attached; there is no auto-updater to consume them.
- The workflow builds **only** what the plan covers: no Linux arm64 AppImage, no
  macOS x64, no Windows ARM64 native PostgreSQL (Windows arm64 uses the x64
  binaries under emulation, as elsewhere).

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Tag 'x' is not of the form v<major>.<minor>.<patch>` | The tag is malformed. Re-tag with `v2.6.0` and push again. |
| `Tag 'x' does not exist` | `workflow_dispatch` was given a tag that was never pushed. Create and push it first. |
| `Version check failed` | The tag and the `package.json` versions disagree. Run `npm run version:patch\|minor\|major`, commit, then re-tag. |
| `npm ci can only install packages when your package.json and package-lock.json are in sync` | The lock file is stale. Run `npm install` locally, commit `package-lock.json`, then re-run the workflow. |
| Desktop job fails in `npm run build:*` | Usually a missing PostgreSQL download or a packaging error; open the job log — each `npm run` step is the local script verbatim. |
| Local `build:mac` looks stuck at `signing file=…IPSCScore.app` | electron-builder found a certificate and is signing the bundle one file at a time. Default `build:mac` is unsigned now; if you re-enabled discovery, use `build:mac:signed` or check `mac.signIgnore` in `electron-builder.yml`. |
| `Secret ANDROID_KEYSTORE_BASE64 is not set` | Secrets are missing on the repository (or only set for an environment). See §3. |
| `Keystore was tampered with, or password was incorrect` | Wrong `ANDROID_KEYSTORE_PASSWORD`, or the base64 was truncated. Re-copy it with `base64 -i` (no line wrapping). |
| `APK is not signed` / `apksigner` fails | The keystore secret is not the one that produced previous releases. Check the DN printed by the *Verify the APK* step. |
| Release page shows fewer assets than expected | A build job failed; `gh release view` only ran after the others succeeded. Re-run the failed job, then run the workflow again to upload. |
| `release already exists` | The workflow updates instead of failing, but a manually created release with a mismatched title/notes can look stale — delete it, then re-run. |

Useful locally, before pushing a tag:

```bash
node scripts/version-bump.mjs --check=2.6.0     # what the workflow checks first
node scripts/generate-changelog.mjs --version 2.6.0 --from v2.5.3 --repo jremen/IPSCStore
```
