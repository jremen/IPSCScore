#!/usr/bin/env node
/**
 * Generate a Markdown changelog for a release from the git history.
 *
 * Usage:
 *   node scripts/generate-changelog.mjs --version 2.5.4 \
 *     [--from v2.5.3] [--to v2.5.4] [--repo owner/name] [--output CHANGELOG-2.5.4.md]
 *
 * Commits are grouped by their Conventional Commits type (`feat:`, `fix(scope):`,
 * `feat!:`…). `--from` is exclusive; when it is omitted — or the tag does not
 * resolve — the whole history is used, which is what a first release wants.
 *
 * Nothing is written unless `--output` is given, so it is safe to run locally to
 * preview. Used by .github/workflows/release.yml; see docs/releasing.md.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const USAGE = `Usage: node scripts/generate-changelog.mjs --version <x.y.z> [options]

Options:
  --version <x.y.z>   Version being released (required)
  --from <tag>        Previous release tag (exclusive; omit for a first release)
  --to <ref>          Ref to end at (default: HEAD)
  --repo <owner/name> Add commit and compare links to github.com/<owner>/<name>
  --output <file>     Write the changelog to <file> instead of stdout
  -h, --help          Show this help
`;

// Order matters: first match wins.
const GROUPS = [
  { title: '✨ Features', types: ['feat', 'feature'] },
  { title: '🐛 Bug Fixes', types: ['fix'] },
  { title: '⚡ Performance', types: ['perf'] },
  { title: '♻️ Refactoring', types: ['refactor'] },
  { title: '📝 Documentation', types: ['docs'] },
  { title: '✅ Tests', types: ['test', 'tests'] },
  { title: '📦 Build, CI & Chores', types: ['build', 'ci', 'chore', 'style', 'revert', 'deps'] },
];
const OTHER_TITLE = '🔧 Other Changes';

const CONVENTIONAL = /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^()]*)\))?(?<breaking>!)?:\s*(?<subject>.+)$/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;

function parseArgs(argv) {
  const args = { from: null, to: 'HEAD', repo: null, output: null, version: null };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      process.stdout.write(USAGE);
      process.exit(0);
    }
    const eq = arg.indexOf('=');
    const key = eq === -1 ? arg : arg.slice(0, eq);
    const inlineValue = eq === -1 ? null : arg.slice(eq + 1);
    const name = { '--version': 'version', '--from': 'from', '--to': 'to', '--repo': 'repo', '--output': 'output' }[key];

    if (!name) {
      console.error(`Unknown argument: ${arg}\n\n${USAGE}`);
      process.exit(2);
    }
    // Support both `--key value` and `--key=value`; an empty value means "unset"
    // so that `--from ""` from a shell script behaves like an omitted flag.
    const value = inlineValue !== null ? inlineValue : (argv[++i] ?? '');
    args[name] = value === '' ? null : value;
  }

  if (!args.version) {
    console.error(`--version is required.\n\n${USAGE}`);
    process.exit(2);
  }
  return args;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function resolveRef(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function collectCommits(range) {
  // \x1f separates fields, \x1e separates records (commit bodies are multi-line).
  const raw = git(['log', '--no-merges', '--pretty=format:%H%x1f%s%x1f%b%x1e', ...(range ? [range] : [])]);
  return raw
    .split('\x1e')
    .map((record) => record.replace(/^\n+/, ''))
    .filter((record) => record.trim() !== '')
    .map((record) => {
      const [hash, subject, body = ''] = record.split('\x1f');
      return { hash: hash.trim(), subject: subject.trim(), body };
    });
}

function categorise(commit) {
  const match = commit.subject.match(CONVENTIONAL);
  if (!match) {
    return { group: OTHER_TITLE, text: commit.subject, breaking: BREAKING_FOOTER.test(commit.body) };
  }

  const { type, scope, breaking, subject } = match.groups;
  const group = GROUPS.find((g) => g.types.includes(type.toLowerCase()));
  return {
    group: group ? group.title : OTHER_TITLE,
    text: scope ? `**${scope}:** ${subject}` : subject,
    breaking: Boolean(breaking) || BREAKING_FOOTER.test(commit.body),
  };
}

function render(args, commits) {
  const { version, from, repo } = args;
  const date = new Date().toISOString().slice(0, 10);
  const link = (commit) => {
    const short = commit.hash.slice(0, 7);
    return repo ? `[\`${short}\`](https://github.com/${repo}/commit/${commit.hash})` : `\`${short}\``;
  };

  const entries = commits.map((commit) => ({ ...categorise(commit), commit }));
  const lines = [`# IPSCScore ${version}`, ''];

  const since = from ? (repo ? `[\`${from}\`](https://github.com/${repo}/releases/tag/${from})` : `\`${from}\``) : null;
  lines.push(since ? `_Released ${date} — changes since ${since}._` : `_Released ${date} — first release._`);
  lines.push('');

  if (entries.length === 0) {
    lines.push('No commits between the previous release and this one.', '');
    return lines.join('\n');
  }

  const breaking = entries.filter((entry) => entry.breaking);
  if (breaking.length > 0) {
    lines.push('## ⚠️ Breaking Changes', '');
    for (const entry of breaking) lines.push(`- ${entry.text} (${link(entry.commit)})`);
    lines.push('');
  }

  for (const { title } of GROUPS) {
    const groupEntries = entries.filter((entry) => entry.group === title);
    if (groupEntries.length === 0) continue;
    lines.push(`## ${title}`, '');
    for (const entry of groupEntries) lines.push(`- ${entry.text} (${link(entry.commit)})`);
    lines.push('');
  }

  const otherEntries = entries.filter((entry) => entry.group === OTHER_TITLE);
  if (otherEntries.length > 0) {
    lines.push(`## ${OTHER_TITLE}`, '');
    for (const entry of otherEntries) lines.push(`- ${entry.text} (${link(entry.commit)})`);
    lines.push('');
  }

  lines.push(
    `**${entries.length}** commit${entries.length === 1 ? '' : 's'} in this release.`
  );

  if (from && repo) {
    lines.push('', `**Full changelog**: https://github.com/${repo}/compare/${from}...v${version}`);
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let range = null;
  if (args.from) {
    if (!resolveRef(args.from)) {
      console.warn(`Warning: previous tag "${args.from}" not found — using the full history.`);
      args.from = null;
    } else {
      range = `${args.from}..${args.to}`;
    }
  }

  let commits;
  try {
    commits = collectCommits(range);
  } catch (err) {
    const detail = (err.stderr || err.message || '').toString().trim();
    console.error(`git log failed for range "${range ?? args.to}":\n${detail}`);
    process.exit(1);
  }

  const changelog = render(args, commits);

  if (args.output) {
    writeFileSync(args.output, changelog);
    console.log(`Wrote ${args.output} (${commits.length} commit${commits.length === 1 ? '' : 's'}).`);
  } else {
    process.stdout.write(changelog);
  }
}

main();
