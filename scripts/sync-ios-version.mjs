#!/usr/bin/env node
/**
 * Keep the iOS target's version in step with mobile/package.json.
 *
 * Xcode reads CFBundleShortVersionString from MARKETING_VERSION and
 * CFBundleVersion from CURRENT_PROJECT_VERSION, both stored in project.pbxproj —
 * not from package.json. Android derives the same values in build.gradle, so
 * without this step a version bump would ship an iOS app that still reports the
 * old version.
 *
 * CURRENT_PROJECT_VERSION mirrors Android's versionCode:
 *   major * 10000 + minor * 100 + patch     (2.6.0 → 20600)
 *
 * Usage:
 *   node scripts/sync-ios-version.mjs            # rewrite in place
 *   node scripts/sync-ios-version.mjs --check    # exit 1 if out of step
 *
 * Invoked automatically by the mobile `sync:ios` and `open:ios` scripts.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const MANIFEST = resolve(ROOT, 'mobile/package.json');
const PROJECT = resolve(ROOT, 'mobile/ios/App/App.xcodeproj/project.pbxproj');
const CHECK = process.argv.includes('--check');

if (!existsSync(PROJECT)) {
  console.error(`error: ${PROJECT} does not exist — run \`npm run add:ios\` first`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!match) {
  console.error(`error: ${MANIFEST} has an unsupported version "${version}"`);
  process.exit(1);
}

const [, major, minor, patch] = match.map(Number);
const build = major * 10000 + minor * 100 + patch;

const pbxproj = readFileSync(PROJECT, 'utf-8');
const marketing = /MARKETING_VERSION = ([^;]+);/g;
const bundle = /CURRENT_PROJECT_VERSION = ([^;]+);/g;

const currentMarketing = [...pbxproj.matchAll(marketing)].map((m) => m[1]);
const currentBundle = [...pbxproj.matchAll(bundle)].map((m) => m[1]);
const inStep =
  currentMarketing.length > 0 &&
  currentBundle.length > 0 &&
  currentMarketing.every((v) => v === version) &&
  currentBundle.every((v) => v === String(build));

if (CHECK) {
  if (inStep) {
    console.log(`iOS version is in step: ${version} (${build})`);
    process.exit(0);
  }
  console.error(
    `error: iOS project is at ${[...new Set(currentMarketing)].join('/')} ` +
      `(${[...new Set(currentBundle)].join('/')}), expected ${version} (${build})`,
  );
  process.exit(1);
}

if (inStep) {
  console.log(`iOS version already ${version} (${build})`);
  process.exit(0);
}

const updated = pbxproj
  .replace(marketing, `MARKETING_VERSION = ${version};`)
  .replace(bundle, `CURRENT_PROJECT_VERSION = ${build};`);

writeFileSync(PROJECT, updated);
console.log(`iOS version → ${version} (build ${build})`);
