import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { unit01 } from "../src/shared/unit-01.js";
import { unit01VisualAssets } from "../src/shared/unit-01-visual-assets.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const h5Root = join(root, "src/clients/mobile-h5");
const appSource = readFileSync(join(h5Root, "app.js"), "utf8");
const errors = [];

if (!unit01VisualAssets.version) {
  errors.push("unit01VisualAssets.version is required.");
}

if (appSource.includes('`--unit-scene:url("${scene.src}")`')) {
  errors.push("groupSceneStyle() must not put double quotes inside an inline style url(); it breaks the style attribute.");
}

if (!appSource.includes("`--unit-scene:url(${scene.src})`")) {
  errors.push("groupSceneStyle() must expose group scene images through --unit-scene:url(${scene.src}).");
}

validateImage(unit01VisualAssets.styleBoard?.src, "styleBoard", { minWidth: 1000, minHeight: 700 });

const expectedGroups = [...new Set(unit01.characters.map((item) => item.group))];
expectedGroups.forEach((group) => {
  const scene = unit01VisualAssets.groupScenes?.[group];
  if (!scene) {
    errors.push(`Missing group scene for group ${group}.`);
    return;
  }
  validateImage(scene.src, `group ${group} scene`, { width: 1280, height: 800 });

  const groupIds = unit01.characters.filter((item) => item.group === group).map((item) => item.id);
  const missing = groupIds.filter((id) => !scene.supports?.includes(id));
  if (missing.length) {
    errors.push(`Group ${group} scene support list misses: ${missing.join(", ")}.`);
  }
});

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Unit-01 visual assets ok: ${expectedGroups.length} group scenes, style board ${unit01VisualAssets.version}.`);

function validateImage(src, label, sizeRule) {
  if (!src) {
    errors.push(`${label} must include src.`);
    return;
  }
  const path = resolveH5Asset(src);
  if (!existsSync(path)) {
    errors.push(`${label} missing file: ${src}`);
    return;
  }

  const probe = spawnSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "json",
    path
  ], { encoding: "utf8" });

  if (probe.status !== 0) {
    errors.push(`${label} is not probeable as an image: ${src}`);
    return;
  }

  const stream = JSON.parse(probe.stdout || "{}").streams?.[0] || {};
  const width = Number(stream.width);
  const height = Number(stream.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    errors.push(`${label} has invalid dimensions: ${src}`);
    return;
  }

  if (sizeRule.width && width !== sizeRule.width) {
    errors.push(`${label} width must be ${sizeRule.width}, got ${width}: ${src}`);
  }
  if (sizeRule.height && height !== sizeRule.height) {
    errors.push(`${label} height must be ${sizeRule.height}, got ${height}: ${src}`);
  }
  if (sizeRule.minWidth && width < sizeRule.minWidth) {
    errors.push(`${label} width must be at least ${sizeRule.minWidth}, got ${width}: ${src}`);
  }
  if (sizeRule.minHeight && height < sizeRule.minHeight) {
    errors.push(`${label} height must be at least ${sizeRule.minHeight}, got ${height}: ${src}`);
  }
}

function resolveH5Asset(assetPath) {
  if (assetPath.startsWith("./")) return normalize(join(h5Root, assetPath.slice(2)));
  return normalize(join(h5Root, assetPath));
}
