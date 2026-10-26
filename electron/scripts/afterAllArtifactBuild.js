/**
 * afterAllArtifactBuild hook for electron-builder.
 *
 * electron-builder's artifactName template only exposes `${arch}` — `arm64`
 * and `x64` — which says little to someone picking a download. Rename the
 * finished macOS artifacts (and any sidecar files such as `.blockmap`) to
 * user-facing architecture labels:
 *
 *   IPSCScore-2.7.1_Mac_arm64.dmg -> IPSCScore-2.7.1_Mac_Apple_Silicon.dmg
 *   IPSCScore-2.7.1_Mac_x64.dmg   -> IPSCScore-2.7.1_Mac_Intel.dmg
 *
 * Product name and version are untouched, only the arch token changes.
 *
 * Keep ARCH_LABELS in sync with `archLabels` in scripts/clean-dist.mjs — the
 * cleaner has to recognise the renamed files to remove them on the next build.
 */

const fs = require('fs');
const path = require('path');

const ARCH_LABELS = {
  arm64: 'Apple_Silicon',
  x64: 'Intel',
  universal: 'Universal',
};

// `_Mac_<arch>` followed by the extension chain (`.dmg`, `.dmg.blockmap`, ...).
const MAC_ARTIFACT = /_Mac_(arm64|x64|universal)((?:\.[^.]+)+)$/;

exports.default = async function afterAllArtifactBuild(buildResult) {
  const renamed = [];

  for (const name of fs.readdirSync(buildResult.outDir)) {
    const match = MAC_ARTIFACT.exec(name);
    if (!match) continue;

    const [, arch, extension] = match;
    const label = ARCH_LABELS[arch];
    const target = `${name.slice(0, match.index)}_Mac_${label}${extension}`;
    if (target === name) continue;

    const from = path.join(buildResult.outDir, name);
    if (!fs.statSync(from).isFile()) continue;

    const to = path.join(buildResult.outDir, target);
    fs.renameSync(from, to);
    console.log(`[afterAllArtifactBuild] ${name} -> ${target}`);
    renamed.push(to);
  }

  return renamed;
};
