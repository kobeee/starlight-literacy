#!/usr/bin/env node

// Generate Starlight Literacy assets via the codex-internal pipeline:
// aicodewith proxy -> OpenAI Responses API -> image_generation tool.
//
// The proxy only exposes gpt-5.5 as the wrapping model; the underlying
// image_generation tool produces an opaque PNG (transparent background is
// rejected by the proxy). Sprite-style cutouts must therefore use a
// pure neon green chroma-key backdrop and downstream chroma-key extraction.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const authPath = "/Users/elvis/.codex/auth.json";
const baseUrl = "https://api.aicodewith.com/chatgpt/v1";
const model = "gpt-5.5";
const characterId = "yi-gpt-image-2-production-v3";
const assetRoot = join(repoRoot, "tools/recognition-video/assets/unit-01", characterId);

const jobs = [
  {
    id: "morning-field-plate",
    promptPath: join(assetRoot, "prompts/morning-field-plate.prompt.txt"),
    out: join(assetRoot, "plates/morning-field-plate-gpt-image-2.png"),
    size: "1024x1536",
    quality: "high",
  },
  {
    id: "sun-rise-glow-spritesheet",
    promptPath: join(assetRoot, "prompts/sun-rise-glow-spritesheet.prompt.txt"),
    out: join(assetRoot, "cutouts/sun-rise-glow-spritesheet-gpt-image-2.png"),
    size: "1536x1024",
    quality: "high",
  },
  {
    id: "light-line-unfold-spritesheet",
    promptPath: join(assetRoot, "prompts/light-line-unfold-spritesheet.prompt.txt"),
    out: join(assetRoot, "cutouts/light-line-unfold-spritesheet-gpt-image-2.png"),
    size: "1536x1024",
    quality: "high",
  },
];

const force = process.argv.includes("--force");
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",").filter(Boolean)) : null;
const dryRun = process.argv.includes("--dry-run");
const concurrency = pickConcurrency();

const apiKey = readApiKey();
const selected = jobs.filter((job) => (!only || only.has(job.id)));

await runWithConcurrency(selected, concurrency, async (job) => {
  if (existsSync(job.out) && !force) {
    console.log(`[skip] ${job.id}: ${relative(job.out)} already exists`);
    return;
  }
  const promptBody = readFileSync(job.promptPath, "utf8").trim();
  mkdirSync(dirname(job.out), { recursive: true });
  console.log(`[start] ${job.id} -> ${relative(job.out)} (size=${job.size}, quality=${job.quality})`);

  if (dryRun) {
    console.log(`[dry-run] would call /v1/responses for ${job.id}`);
    return;
  }

  const started = Date.now();
  const png = await generateViaResponses({ prompt: promptBody, size: job.size, quality: job.quality });
  writeFileSync(job.out, png);
  console.log(`[done] ${job.id}: wrote ${relative(job.out)} (${(png.length / 1024).toFixed(1)} KB, ${((Date.now() - started) / 1000).toFixed(1)}s)`);
});

async function generateViaResponses({ prompt, size, quality }) {
  const wrappedInput = [
    "Render exactly the following picture-book asset using the image_generation tool.",
    "Do not add commentary, captions, frames, or text. Output only the requested image.",
    "",
    prompt,
  ].join("\n");

  const body = {
    model,
    input: wrappedInput,
    tools: [
      {
        type: "image_generation",
        background: "opaque",
        size,
        quality,
        output_format: "png",
      },
    ],
    tool_choice: { type: "image_generation" },
    stream: false,
  };

  const maxAttempts = 3;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Responses API ${response.status}: ${text.slice(0, 400)}`);
      }
      const data = JSON.parse(text);
      const block = (data.output || []).find((item) => item && item.type === "image_generation_call" || item.action === "generate");
      const base64 = block && block.result;
      if (!base64 || typeof base64 !== "string") {
        throw new Error(`No image_generation result in response (output length=${(data.output || []).length})`);
      }
      return Buffer.from(base64, "base64");
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const waitMs = 4000 * attempt;
        console.log(`[retry ${attempt}] ${err.message.slice(0, 180)} (retrying in ${waitMs / 1000}s)`);
        await sleep(waitMs);
      }
    }
  }
  throw lastErr;
}

function readApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (!existsSync(authPath)) {
    throw new Error(`OPENAI_API_KEY is not set and auth file is missing: ${authPath}`);
  }
  const parsed = JSON.parse(readFileSync(authPath, "utf8"));
  if (!parsed.OPENAI_API_KEY) {
    throw new Error(`OPENAI_API_KEY missing in ${authPath}`);
  }
  return parsed.OPENAI_API_KEY;
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items];
  const active = new Set();
  const errors = [];
  const runOne = async (item) => {
    try {
      await worker(item);
    } catch (err) {
      console.error(`[fail] ${item.id}: ${err.message}`);
      errors.push({ id: item.id, err });
    }
  };
  while (queue.length || active.size) {
    while (queue.length && active.size < limit) {
      const item = queue.shift();
      const p = runOne(item).finally(() => active.delete(p));
      active.add(p);
    }
    await Promise.race(active);
  }
  if (errors.length) {
    throw new Error(`Generation failed for: ${errors.map((e) => e.id).join(", ")}`);
  }
}

function pickConcurrency() {
  const arg = process.argv.find((a) => a.startsWith("--concurrency="));
  if (arg) {
    const n = Number(arg.slice("--concurrency=".length));
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 3;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function relative(path) {
  const prefix = repoRoot.endsWith("/") ? repoRoot : `${repoRoot}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
