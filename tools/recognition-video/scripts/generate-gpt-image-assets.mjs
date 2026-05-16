#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const authPath = "/Users/elvis/.codex/auth.json.aicode";
const characterId = "yi-gpt-image-2-production-v3";
const assetRoot = join(repoRoot, "tools/recognition-video/assets/unit-01", characterId);

const jobs = [
  {
    id: "morning-field-plate",
    promptPath: join(assetRoot, "prompts/morning-field-plate.prompt.txt"),
    out: join(assetRoot, "plates/morning-field-plate-gpt-image-2.png"),
    size: "1088x1920",
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

const apiKey = readApiKey();

for (const job of jobs) {
  if (only && !only.has(job.id)) continue;
  if (existsSync(job.out) && !force) {
    console.log(`skip ${job.id}: ${relative(job.out)} already exists`);
    continue;
  }

  const prompt = readFileSync(job.promptPath, "utf8").trim();
  mkdirSync(dirname(job.out), { recursive: true });
  console.log(`generating ${job.id} with gpt-image-2 -> ${relative(job.out)}`);

  const payload = {
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: job.size,
    quality: job.quality,
    output_format: "png",
  };

  const data = await callImageApi(payload);
  const image = data?.data?.[0]?.b64_json;
  if (!image) {
    throw new Error(`Image API returned no b64_json for ${job.id}`);
  }
  writeFileSync(job.out, Buffer.from(image, "base64"));
  console.log(`wrote ${relative(job.out)}`);
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

async function callImageApi(payload) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.error?.message || text || response.statusText;
    throw new Error(`Image API ${response.status}: ${message}`);
  }
  return data;
}

function relative(path) {
  const prefix = repoRoot.endsWith("/") ? repoRoot : `${repoRoot}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
