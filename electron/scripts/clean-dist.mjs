#!/usr/bin/env node
/**
 * Targeted cleanup of electron-builder output.
 *
 * Builds used to start with `rm -rf ../dist-electron`, so building one platform
 * deleted the installers and unpacked bundles of every other platform that had
 * already been built (and left nothing behind if the build then failed). This
 * script removes only what a given platform/arch build is about to overwrite.
 *
 * Usage:
 *   node scripts/clean-dist.mjs mac                 # whole macOS platform (arm64 + x64)
 *   node scripts/clean-dist.mjs mac:arm64           # only mac-arm64/ and *_Mac_arm64.*
 *   node scripts/clean-dist.mjs win:x64 linux:arm64 # several targets at once
 *   node scripts/clean-dist.mjs all                 # every platform/arch in electron-builder.yml
 *   node scripts/clean-dist.mjs everything          # wipe the whole dist-electron directory
 *
 * Directories and artifacts are derived from `directories.output` and
 * `mac|win|linux.artifactName` in electron-builder.yml. Arch-specific cleans
 * tell installers apart by the `${arch}` placeholder (Windows/Linux) or by the
 * user-facing labels macOS artifacts get from scripts/afterAllArtifactBuild.js
 * — update `archLabels` below if either changes.
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist-electron')

const PLATFORMS = {
  mac: {
    arches: ['arm64', 'x64', 'universal'],
    // electron-builder names the default x64 bundle `mac`, not `mac-x64`.
    unpacked: { arm64: 'mac-arm64', x64: 'mac', universal: 'mac-universal' },
    artifacts: ['.dmg', '.pkg', '.zip'],
    // Artifacts are renamed after packaging by scripts/afterAllArtifactBuild.js,
    // so an arch's installer shows up under either its raw electron-builder name
    // or its user-facing label (…_Mac_Apple_Silicon.dmg).
    archLabels: { arm64: ['arm64', 'apple_silicon'], x64: ['x64', 'intel'] },
  },
  win: {
    arches: ['x64', 'arm64', 'ia32'],
    unpacked: { x64: 'win-unpacked', arm64: 'win-arm64-unpacked', ia32: 'win-ia32-unpacked' },
    artifacts: ['.exe', '.msi'],
  },
  linux: {
    arches: ['x64', 'arm64', 'armv7l'],
    unpacked: { x64: 'linux-unpacked', arm64: 'linux-arm64-unpacked', armv7l: 'linux-armv7l-unpacked' },
    artifacts: ['.AppImage', '.deb', '.rpm', '.snap', '.tar.gz'],
  },
}

const USAGE = `Usage: node scripts/clean-dist.mjs <target> [target...]

  <platform>[:<arch>]  mac, win or linux, optionally limited to one arch
  all                  every platform/arch electron-builder.yml targets
  everything           wipe the whole dist-electron directory

Examples:
  node scripts/clean-dist.mjs mac
  node scripts/clean-dist.mjs mac:arm64
  node scripts/clean-dist.mjs win:x64 linux:arm64`

/** Remove a file or directory, reporting what went. */
function remove(path, label = path) {
  if (!existsSync(path)) return false
  rmSync(path, { recursive: true, force: true })
  console.log(`cleaned ${label}`)
  return true
}

/** True when `name` is an installer/archive (or its .blockmap) of `platform`. */
function isArtifactOf(name, platform) {
  const lower = name.toLowerCase()
  return PLATFORMS[platform].artifacts.some((ext) => {
    const wanted = ext.toLowerCase()
    return lower.endsWith(wanted) || lower.endsWith(`${wanted}.blockmap`)
  })
}

/**
 * `arch` is null for a whole-platform clean. Then every artifact of that
 * platform goes — including leftovers from before artifactName carried
 * ${arch} — but other platforms are never touched.
 */
function shouldRemoveArtifact(name, platform, arch) {
  if (!isArtifactOf(name, platform)) return false
  if (arch === null) return true

  const labels = PLATFORMS[platform].archLabels?.[arch] ?? [arch]
  return labels.some((label) => name.toLowerCase().includes(label))
}

/** @returns {Map<string, Set<string>|null>} platform -> arches (null = all) */
function parseTargets(args) {
  const targets = new Map()
  const add = (platform, arch) => {
    if (arch === null) {
      targets.set(platform, null)
      return
    }
    const current = targets.get(platform)
    if (current === null) return
    if (!current) targets.set(platform, new Set([arch]))
    else current.add(arch)
  }

  for (const arg of args) {
    if (arg === 'all') {
      for (const platform of Object.keys(PLATFORMS)) add(platform, null)
      continue
    }

    const [platform, arch, ...rest] = arg.split(':')
    const config = PLATFORMS[platform]
    if (!config || rest.length > 0) {
      throw new Error(`Unknown target "${arg}".\n\n${USAGE}`)
    }
    if (arch && !config.arches.includes(arch)) {
      throw new Error(
        `Unknown ${platform} arch "${arch}". Known: ${config.arches.join(', ')}.\n\n${USAGE}`,
      )
    }
    add(platform, arch || null)
  }
  return targets
}

function main(args) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    process.exit(args.length === 0 ? 1 : 0)
  }

  if (args.includes('everything')) {
    if (args.length > 1) {
      throw new Error(`"everything" cannot be combined with other targets.\n\n${USAGE}`)
    }
    remove(OUTPUT_DIR, OUTPUT_DIR)
    return
  }

  const targets = parseTargets(args)
  if (!existsSync(OUTPUT_DIR)) {
    console.log(`${OUTPUT_DIR} does not exist — nothing to clean`)
    return
  }

  for (const [platform, arches] of targets) {
    const config = PLATFORMS[platform]
    for (const arch of arches ?? config.arches) {
      remove(join(OUTPUT_DIR, config.unpacked[arch]))
    }
  }

  // Artifacts (installers, archives, .blockmap sidecars) live next to the
  // unpacked directories. Directories are left alone here; the per-arch loop
  // above owns them.
  for (const entry of readdirSync(OUTPUT_DIR)) {
    const path = join(OUTPUT_DIR, entry)
    if (!statSync(path).isFile()) continue
    if (entry === 'builder-effective-config.yaml' || entry === 'builder-debug.yml') continue

    for (const [platform, arches] of targets) {
      const matches =
        arches === null
          ? shouldRemoveArtifact(entry, platform, null)
          : [...arches].some((arch) => shouldRemoveArtifact(entry, platform, arch))
      if (matches) {
        remove(path)
        break
      }
    }
  }
}

try {
  main(process.argv.slice(2))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
