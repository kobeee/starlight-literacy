#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const characterId = "yi-gpt-image-2-production-v3";
const assetRoot = join(repoRoot, "tools/recognition-video/assets/unit-01", characterId);
const tmpRoot = "/tmp/starlight-gpt-image-v3";

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

const mode = process.argv[2] || "payloads";

if (mode === "payloads") {
  mkdirSync(tmpRoot, { recursive: true });
  const manifest = jobs.map((job) => {
    const payload = {
      model: "gpt-image-2",
      prompt: readFileSync(job.promptPath, "utf8").trim(),
      n: 1,
      size: job.size,
      quality: job.quality,
      output_format: "png",
    };
    const payloadPath = join(tmpRoot, `${job.id}.payload.json`);
    const responsePath = join(tmpRoot, `${job.id}.response.json`);
    writeFileSync(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
    return {
      id: job.id,
      payload: payloadPath,
      response: responsePath,
      out: job.out,
    };
  });
  writeFileSync(join(tmpRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote payload manifest: ${join(tmpRoot, "manifest.json")}`);
} else if (mode === "decode") {
  const manifestPath = join(tmpRoot, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing payload manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const job of manifest) {
    if (!existsSync(job.response)) {
      throw new Error(`Missing response for ${job.id}: ${job.response}`);
    }
    const response = JSON.parse(readFileSync(job.response, "utf8"));
    if (response.error) {
      throw new Error(`${job.id} API error: ${response.error.message || JSON.stringify(response.error)}`);
    }
    const image = response?.data?.[0]?.b64_json;
    if (!image) {
      throw new Error(`${job.id} response has no data[0].b64_json`);
    }
    mkdirSync(dirname(job.out), { recursive: true });
    writeFileSync(job.out, Buffer.from(image, "base64"));
    console.log(`wrote ${relative(job.out)}`);
  }
} else if (mode === "cleanup") {
  const files = [
    join(tmpRoot, "curl.conf"),
    ...jobs.flatMap((job) => [
      join(tmpRoot, `${job.id}.payload.json`),
      join(tmpRoot, `${job.id}.response.json`),
    ]),
    join(tmpRoot, "manifest.json"),
  ];
  for (const file of files) {
    try {
      if (existsSync(file)) {
        writeFileSync(file, "");
      }
    } catch {
      // best-effort cleanup only
    }
  }
  console.log(`cleared ${basename(tmpRoot)} temporary files`);
} else {
  throw new Error("Usage: prepare-gpt-image-curl-payloads.mjs [payloads|decode|cleanup]");
}

function relative(path) {
  const prefix = repoRoot.endsWith("/") ? repoRoot : `${repoRoot}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
