#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const xcassets = join(repoRoot, "src/clients/iOS/StarlightLiteracy/Assets.xcassets");
const sceneSource = join(repoRoot, "tools/recognition-video/assets/unit-01/scene-assets");
const oracleSource = join(repoRoot, "tools/ios-assets/oracle-svg");
const h5Icon = join(repoRoot, "src/clients/mobile-h5/icons/icon-512.png");
const tmp = join(repoRoot, "tmp/ios-image-sources/generated");

const unitIds = [
  "yi", "er", "san", "ren", "kou",
  "shou", "ri", "yue", "shan", "shui",
  "huo", "mu", "mu-eye", "er-ear", "tian",
  "da", "xiao", "shang", "xia", "tu",
];

const oracleIds = [
  "ren", "kou", "shou", "ri", "yue", "shan", "shui",
  "huo", "mu", "mu-eye", "er-ear", "tian", "da", "tu",
];

const fallbackOracleSvg = {
  shou: `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <path d="M151 55 C145 100 146 151 152 222" fill="none" stroke="#000" stroke-width="23" stroke-linecap="round"/>
  <path d="M87 105 C121 115 170 112 214 98" fill="none" stroke="#000" stroke-width="20" stroke-linecap="round"/>
  <path d="M73 146 C119 158 176 151 227 133" fill="none" stroke="#000" stroke-width="20" stroke-linecap="round"/>
  <path d="M88 188 C126 196 170 190 211 174" fill="none" stroke="#000" stroke-width="19" stroke-linecap="round"/>
  <path d="M151 222 C121 214 101 198 88 178" fill="none" stroke="#000" stroke-width="18" stroke-linecap="round"/>
</svg>`,
  "er-ear": `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <path d="M185 51 C123 62 86 113 96 177 C106 238 151 264 206 237" fill="none" stroke="#000" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M178 93 C140 105 124 138 133 170 C141 201 166 214 194 198" fill="none" stroke="#000" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M160 133 C180 151 177 175 156 187" fill="none" stroke="#000" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  tian: `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <path d="M78 86 L222 76 L235 214 L70 225 Z" fill="none" stroke="#000" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M151 83 L153 222 M78 151 L229 143" fill="none" stroke="#000" stroke-width="19" stroke-linecap="round"/>
</svg>`,
  tu: `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <path d="M151 68 C134 113 134 149 151 188" fill="none" stroke="#000" stroke-width="22" stroke-linecap="round"/>
  <path d="M91 191 C132 204 178 201 217 186" fill="none" stroke="#000" stroke-width="21" stroke-linecap="round"/>
  <path d="M65 231 C118 237 181 236 237 226" fill="none" stroke="#000" stroke-width="20" stroke-linecap="round"/>
</svg>`,
};

mkdirSync(xcassets, { recursive: true });
mkdirSync(tmp, { recursive: true });

for (const id of unitIds) {
  const src = join(sceneSource, `${id}.png`);
  assertFile(src, `missing scene asset source for ${id}`);
  makeScaledImageset(`scene_${assetSlug(id)}`, src, [256, 512, 768], { transparent: true });
}

for (const id of oracleIds) {
  const src = oracleSvgFor(id);
  makeScaledImageset(`oracle_${assetSlug(id)}`, src, [256, 512, 768], {
    transparent: true,
    template: true,
    resizeRatio: 0.72,
  });
}

makeAppIcon();
makeLaunchBrand();
makeShareCard();
writeRootContents();

console.log(`[ok] generated iOS assets in ${xcassets}`);
console.log(`[ok] scene imagesets=${unitIds.length}, oracle imagesets=${oracleIds.length}, brand=AppIcon/LaunchBrand/ShareCard`);

function makeScaledImageset(name, src, sizes, options = {}) {
  const dir = join(xcassets, `${name}.imageset`);
  resetDir(dir);
  const images = sizes.map((size, index) => {
    const scale = `${index + 1}x`;
    const filename = `${name}@${scale}.png`;
    const out = join(dir, filename);
    const resize = Math.round(size * (options.resizeRatio ?? 1));
    const args = [
      // -background/-density 必须在 input 之前：SVG 的栅格化发生在读取 input 时，
      // 放在后面则 SVG 用默认白底栅格化（曾导致 oracle 模板图带白底、template tint 后整格变色块）。
      // 对 scene 的 PNG 输入这两个选项无副作用（PNG 自带 alpha、density 仅影响矢量栅格化）。
      "-background", "none",
      "-density", "384",
      src,
      "-resize", `${resize}x${resize}`,
      "-gravity", "center",
      "-extent", `${size}x${size}`,
      "-depth", "8",
      out,
    ];
    run("magick", args);
    return { idiom: "universal", filename, scale };
  });
  const contents = {
    images,
    info: { author: "xcode", version: 1 },
  };
  if (options.template) contents.properties = { "template-rendering-intent": "template" };
  writeJson(join(dir, "Contents.json"), contents);
}

function makeAppIcon() {
  const dir = join(xcassets, "AppIcon.appiconset");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "AppIcon-1024.png");
  const house = join(tmp, "house-640.png");
  run("magick", [h5Icon, "-resize", "640x640", house]);
  run("magick", [
    "-size", "1024x1024", "gradient:#FFF9E6-#F4C36C",
    "-fill", "#FFE7A0", "-draw", "circle 762,220 1005,220",
    "-fill", "rgba(255,255,255,0.55)", "-draw", "roundrectangle 170,640 854,902 70,70",
    "-fill", "#F6D985", "-draw", "roundrectangle 210,684 814,868 52,52",
    house, "-geometry", "+192+126", "-composite",
    "-fill", "#6B4A23", "-draw", "roundrectangle 348,748 676,812 34,34",
    "-fill", "#FFFFFF", "-draw", "polygon 760,118 786,180 853,185 802,228 818,294 760,258 702,294 718,228 667,185 734,180",
    "-fill", "#F4B942", "-draw", "polygon 760,140 779,186 829,190 791,222 803,270 760,244 717,270 729,222 691,190 741,186",
    "-alpha", "remove", "-alpha", "off",
    "-depth", "8",
    out,
  ]);
  writeJson(join(dir, "Contents.json"), {
    images: [
      { filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" },
    ],
    info: { author: "xcode", version: 1 },
  });
}

function makeLaunchBrand() {
  const dir = join(xcassets, "LaunchBrand.imageset");
  resetDir(dir);
  const base = join(tmp, "launch-brand-960.png");
  run("magick", [
    "-size", "960x960", "xc:none",
    "-fill", "#FFE7A0", "-draw", "circle 700,190 880,190",
    "(", h5Icon, "-resize", "560x560", ")", "-geometry", "+200+150", "-composite",
    "-fill", "rgba(255,255,255,0.78)", "-draw", "roundrectangle 210,682 750,826 48,48",
    "-fill", "#6B4A23", "-draw", "roundrectangle 320,738 640,792 28,28",
    "-depth", "8",
    base,
  ]);
  makeScaledImagesetFromBase(dir, "LaunchBrand", base, [320, 640, 960]);
}

function makeShareCard() {
  const dir = join(xcassets, "ShareCard.imageset");
  resetDir(dir);
  const base = join(tmp, "share-card-1200.png");
  const scene = join(sceneSource, "ri.png");
  run("magick", [
    "-size", "1200x630", "gradient:#FFF7DF-#F4D7A0",
    "-fill", "#F9C961", "-draw", "circle 1010,115 1210,115",
    "-fill", "rgba(255,255,255,0.72)", "-draw", "roundrectangle 76,86 696,548 44,44",
    "(", scene, "-resize", "360x360", ")", "-geometry", "+198+130", "-composite",
    "-font", "Heiti-SC-Medium", "-fill", "#4E3320", "-pointsize", "86", "-annotate", "+760+218", "星光识字",
    "-font", "Heiti-SC-Medium", "-fill", "#7A5A2A", "-pointsize", "40", "-annotate", "+764+306", "图音字一体认读",
    "-fill", "#A45C25", "-pointsize", "34", "-annotate", "+766+384", "Unit-01 · 免费学 20 字",
    "-fill", "#6B4A23", "-draw", "roundrectangle 762,438 1084,504 32,32",
    "-fill", "#FFF8E9", "-pointsize", "32", "-annotate", "+804+482", "每天 10 分钟",
    "-alpha", "remove", "-alpha", "off",
    "-depth", "8",
    base,
  ]);
  makeScaledImagesetFromBase(dir, "ShareCard", base, [400, 800, 1200], { geometry: ["400x210", "800x420", "1200x630"] });
}

function makeScaledImagesetFromBase(dir, name, base, sizes, options = {}) {
  const images = sizes.map((size, index) => {
    const scale = `${index + 1}x`;
    const filename = `${name}@${scale}.png`;
    const out = join(dir, filename);
    const geometry = options.geometry?.[index] ?? `${size}x${size}`;
    run("magick", [base, "-resize", `${geometry}!`, "-depth", "8", out]);
    return { idiom: "universal", filename, scale };
  });
  writeJson(join(dir, "Contents.json"), {
    images,
    info: { author: "xcode", version: 1 },
  });
}

function oracleSvgFor(id) {
  const src = join(oracleSource, `${id}-oracle.svg`);
  if (existsSync(src)) return src;
  const fallback = fallbackOracleSvg[id];
  if (!fallback) throw new Error(`missing oracle SVG for ${id}`);
  const fallbackPath = join(oracleSource, `${id}-oracle-local-fallback.svg`);
  mkdirSync(dirname(fallbackPath), { recursive: true });
  writeFileSync(fallbackPath, fallback.trim(), "utf8");
  return fallbackPath;
}

function assetSlug(id) {
  return id.replace(/-/g, "_");
}

function writeRootContents() {
  const root = join(xcassets, "Contents.json");
  if (!existsSync(root)) writeJson(root, { info: { author: "xcode", version: 1 } });
}

function resetDir(dir) {
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir)) rmSync(join(dir, entry), { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
}

function writeJson(path, value) {
  writeFileSync(`${path}`, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertFile(path, message) {
  if (!existsSync(path)) throw new Error(`${message}: ${path}`);
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`${cmd} failed: ${res.stderr || res.stdout}`);
  }
}
