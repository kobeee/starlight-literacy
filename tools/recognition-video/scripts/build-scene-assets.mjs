#!/usr/bin/env node

// 批量产 iOS SceneAsset「实物场景图」: proxy 生 magenta 图 → PIL 抠透明。
// 路径 = knowledge-base 记的「codex 内置 gpt-image-2」= aicodewith proxy +
// Responses API + image_generation tool（wrapper gpt-5.5），key 走 sk-acw 代理 key,
// 【不需要 openai key】。透明被代理拒，故 magenta chroma 出图再 PIL 抠。
//
// 用法:
//   node build-scene-assets.mjs [--only ren,ri] [--force] [--concurrency 3] [--no-key]
// 产物:
//   scene-assets/raw/<id>.png   (magenta 原图)
//   scene-assets/<id>.png       (透明 RGBA, iOS 取这个)
//   scene-assets/_overview.png  (合成暖卡总览, 验收用)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const OUT = join(repoRoot, "tools/recognition-video/assets/unit-01/scene-assets");
const RAW = join(OUT, "raw");
const keyScript = join(repoRoot, "tools/recognition-video/scripts/chroma-key-to-alpha.py");
const authPath = "/Users/elvis/.codex/auth.json.aicode";
const baseUrl = "https://api.aicodewith.com/chatgpt/v1";
const model = "gpt-5.5";
const size = "1024x1024";
const quality = "high";

// 每字「实物 subject」——画对实物即可(实物图不涉字源准确性红线)。
// 指事字也给 iOS 看图认字提供生活承载物，但必须避免直接画成裸符号、
// 汉字、数字、箭头或 UI 标识。
const SUBJECTS = {
  yi: "one single thick smooth wooden plank lying perfectly horizontal, rounded ends, warm honey-brown wood grain, clearly one object, substantial enough to read on a small mobile card",
  er: "two small smooth wooden planks stacked horizontally with a small calm gap between them, rounded ends, warm honey-brown wood grain, clearly two objects",
  san: "three low rounded garden ridges or earth terraces stacked gently one above another, warm soil with a little soft green grass, clearly three horizontal layers",
  mu: "one single friendly tree with a rounded leafy crown, a sturdy brown trunk and a few visible roots",
  ren: "one friendly little child seen from the side, mid-stride walking with one leg forward and arms gently swinging, simple rounded full body",
  kou: "one open friendly cartoon mouth, lips gently parted in a soft smile showing it is a mouth, warm and not scary",
  shou: "one open child's hand with five fingers spread, palm facing the viewer",
  ri: "one warm round sun with a few short gentle rays, the simple kind a small child would draw",
  yue: "one friendly crescent moon, soft cream-yellow, gently curved",
  shan: "a row of three rounded mountains with the middle peak the tallest, soft and friendly",
  shui: "a little stream of gently flowing water with a few soft ripples and small splashes",
  huo: "one small cozy campfire with warm orange and yellow flames and a couple of little logs at the base",
  "mu-eye": "one single friendly open human eye, gentle and cute with soft lashes, calm and not scary",
  "er-ear": "one single soft human ear shown from the side, friendly, simple and rounded",
  tian: "a small patch of green farmland seen from above, divided by little raised earth paths into neat squares",
  tu: "one small gentle mound of warm brown soil and earth, soft and rounded",
  da: "one happy little child standing facing the viewer with arms and legs stretched wide open in a big star pose",
  xiao: "a tiny cluster of three sesame seeds and one very small green sprout, delicate and child-friendly, with intentionally generous empty space around it to feel small",
  shang: "one warm yellow balloon floating high in the upper part of the frame with a dangling string, clearly rising upward through placement, no arrows, no motion lines, no colored wisps, no symbols",
  xia: "one gentle blue raindrop falling downward with two tiny trailing droplets above it, soft and friendly, no arrows, no symbols",
};

const styleHeader = (subject) =>
  `A warm pastoral children's picture-book illustration for a Chinese literacy app for ages 3-6. ` +
  `Subject: ${subject}. The subject is the only object, centered, occupying most of the frame with generous even padding around it.\n\n` +
  `Style/medium: premium children's picture book, soft gouache and colored-pencil feel, cream-paper texture on the strokes, ` +
  `tactile rounded shapes. The color palette is MUTED and LOW-SATURATION warm earth tones — soft, gentle and cozy, ` +
  `NOT bright, NOT neon, NOT lemon-green, NOT fluorescent. Calm honey-warm daylight. No hard black outlines.\n\n` +
  `Background: a perfectly flat, uniform, solid magenta #ff00ff chroma-key fill behind the subject, edge to edge, for clean background removal. ` +
  `The background must be ONE single uniform color with absolutely no shadows, no gradients, no texture, no vignette, no floor plane and no lighting variation. ` +
  `Do NOT use any magenta, pink or purple anywhere inside the subject. Keep the subject fully separated with crisp, clean, anti-aliased edges.\n\n` +
  `Hard constraints: no Chinese characters, no pinyin, no letters, no numbers, no readable text, no UI, no labels, no arrows, no stickers, no watermark, no logos, no extra objects.`;

const args = process.argv.slice(2);
const force = args.includes("--force");
const noKey = args.includes("--no-key");
const onlyArg = args.find((a) => a.startsWith("--only"));
const only = onlyArg
  ? new Set((onlyArg.includes("=") ? onlyArg.split("=")[1] : args[args.indexOf(onlyArg) + 1]).split(",").filter(Boolean))
  : null;
const concArg = args.find((a) => a.startsWith("--concurrency"));
const concurrency = concArg ? Number(concArg.split("=")[1] || args[args.indexOf(concArg) + 1]) : 3;

mkdirSync(RAW, { recursive: true });
const apiKey = JSON.parse(readFileSync(authPath, "utf8")).OPENAI_API_KEY;
if (!apiKey) throw new Error(`no OPENAI_API_KEY in ${authPath}`);

const ids = Object.keys(SUBJECTS).filter((id) => !only || only.has(id));
console.log(`[plan] ${ids.length} chars: ${ids.join(", ")} (concurrency=${concurrency}, force=${force})`);

await runWithConcurrency(ids, concurrency, async (id) => {
  const rawOut = join(RAW, `${id}.png`);
  const alphaOut = join(OUT, `${id}.png`);
  if (existsSync(alphaOut) && !force) {
    console.log(`[skip] ${id}`);
    return;
  }
  const t0 = Date.now();
  const png = await generate(styleHeader(SUBJECTS[id]));
  writeFileSync(rawOut, png);
  console.log(`[gen ] ${id}: ${(png.length / 1024).toFixed(0)}KB ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (!noKey) {
    const r = spawnSync("python3", [keyScript, rawOut, alphaOut], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`key failed ${id}: ${r.stderr || r.stdout}`);
    process.stdout.write(r.stdout);
  }
});

console.log("[ok] generation done");

async function generate(prompt) {
  const body = {
    model,
    input: [
      "Render exactly the following picture-book asset using the image_generation tool.",
      "Do not add commentary, captions, frames, or text. Output only the requested image.",
      "",
      prompt,
    ].join("\n"),
    tools: [{ type: "image_generation", background: "opaque", size, quality, output_format: "png" }],
    tool_choice: { type: "image_generation" },
    stream: false,
  };
  const maxAttempts = 3;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Responses ${res.status}: ${text.slice(0, 300)}`);
      const data = JSON.parse(text);
      const block = (data.output || []).find((o) => o && (o.type === "image_generation_call" || o.action === "generate"));
      if (!block?.result) throw new Error(`no image result: ${JSON.stringify((data.output || []).map((o) => o.type))}`);
      return Buffer.from(block.result, "base64");
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items];
  const active = new Set();
  const errors = [];
  while (queue.length || active.size) {
    while (queue.length && active.size < limit) {
      const item = queue.shift();
      const p = (async () => {
        try { await worker(item); } catch (e) { console.error(`[fail] ${item}: ${e.message}`); errors.push(item); }
      })().finally(() => active.delete(p));
      active.add(p);
    }
    await Promise.race(active);
  }
  if (errors.length) throw new Error(`failed: ${errors.join(", ")}`);
}
