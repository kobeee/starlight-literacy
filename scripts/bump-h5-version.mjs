import { readFile, writeFile } from "node:fs/promises";

const TARGETS = [
  { path: "src/clients/mobile-h5/index.html", pattern: /(styles\.css\?v=)(\d+)/g },
  { path: "src/clients/mobile-h5/index.html", pattern: /(app\.js\?v=)(\d+)/g },
  { path: "src/clients/mobile-h5/app.js", pattern: /(unit-01\.js\?v=)(\d+)/g },
  { path: "src/clients/mobile-h5/app.js", pattern: /(unit-01-baked-audio\.js\?v=)(\d+)/g },
  { path: "src/clients/mobile-h5/app.js", pattern: /(unit-01-visual-assets\.js\?v=)(\d+)/g },
  { path: "src/clients/mobile-h5/sw.js", pattern: /(const VERSION\s*=\s*"v)(\d+)(")/g }
];

const args = process.argv.slice(2);
const argMap = parseArgs(args);

const currentVersion = await readCurrentVersion();
const targetVersion = argMap.to
  ? Number(argMap.to)
  : argMap.check
    ? currentVersion
    : currentVersion + 1;

if (!Number.isFinite(targetVersion) || targetVersion < 1) {
  console.error(`Invalid target version: ${argMap.to}`);
  process.exit(1);
}

if (argMap.check) {
  const mismatches = await collectMismatches(currentVersion);
  if (mismatches.length) {
    console.error("Version markers are out of sync:");
    for (const issue of mismatches) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log(`Mobile H5 version ok: all markers at v${currentVersion}.`);
  process.exit(0);
}

if (targetVersion === currentVersion && !argMap.force) {
  console.log(`Mobile H5 version already at v${currentVersion}. Use --to <n> or --force to override.`);
  process.exit(0);
}

const filesChanged = new Map();
for (const target of TARGETS) {
  const content = filesChanged.get(target.path) || (await readFile(target.path, "utf8"));
  const updated = content.replace(target.pattern, (_match, prefix, _digits, suffix) => {
    const tail = typeof suffix === "string" ? suffix : "";
    return `${prefix}${targetVersion}${tail}`;
  });
  filesChanged.set(target.path, updated);
}

for (const [path, content] of filesChanged) {
  await writeFile(path, content);
}

console.log(`Mobile H5 version bumped: v${currentVersion} -> v${targetVersion} (${filesChanged.size} files).`);

async function readCurrentVersion() {
  const html = await readFile("src/clients/mobile-h5/index.html", "utf8");
  const match = html.match(/styles\.css\?v=(\d+)/);
  if (!match) throw new Error("Could not read current version from index.html");
  return Number(match[1]);
}

async function collectMismatches(expected) {
  const issues = [];
  const fileCache = new Map();
  for (const target of TARGETS) {
    const content = fileCache.get(target.path) || (await readFile(target.path, "utf8"));
    fileCache.set(target.path, content);
    const pattern = new RegExp(target.pattern.source, target.pattern.flags);
    for (const match of content.matchAll(pattern)) {
      const found = Number(match[2]);
      if (found !== expected) {
        issues.push(`${target.path}: ${match[0]} (expected v${expected})`);
      }
    }
  }
  return issues;
}

function parseArgs(list) {
  const map = {};
  for (let i = 0; i < list.length; i += 1) {
    const arg = list[i];
    if (arg === "--check") map.check = true;
    else if (arg === "--force") map.force = true;
    else if (arg === "--to") {
      map.to = list[i + 1];
      i += 1;
    } else if (arg.startsWith("--to=")) {
      map.to = arg.slice("--to=".length);
    }
  }
  return map;
}
