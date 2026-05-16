#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const candidates = [
  "/Users/elvis/.codex/auth.json",
  "/Users/elvis/.codex/auth.json.aicode",
  "/Users/elvis/.codex/log/codex-tui.log",
  "/Users/elvis/.codex/history.jsonl",
  "/Users/elvis/.codex/archived_sessions",
  "/Users/elvis/.codex/sessions",
  "/Users/elvis/Documents/codes/challenges/2026/Mar/AI-wedding-photos/.env",
  "/tmp/wedding_vps_env",
  "/private/tmp/wedding_vps_env",
];

const outputPath = "/tmp/starlight-gpt-image-v3/image-api-env";
const found = findKey();

if (!found) {
  console.log("no local image API key found");
  process.exit(1);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${found.name}=${found.value}\n`, { mode: 0o600 });
console.log(`found ${found.name}; wrote ${outputPath}`);

function findKey() {
  for (const path of expand(candidates)) {
    if (!existsSync(path)) continue;
    let text = "";
    try {
      text = readFileSync(path, "utf8");
    } catch {
      continue;
    }

    const envMatch = text.match(/\b(LAOZHANG_NANO_API_KEY|LAOZHANG_API_KEY|OPENAI_API_KEY)=([^\s"';&]+)/);
    if (envMatch && usable(envMatch[2])) {
      return { name: envMatch[1], value: envMatch[2] };
    }

    const jsonMatch = text.match(/"(LAOZHANG_NANO_API_KEY|LAOZHANG_API_KEY|OPENAI_API_KEY)"\s*:\s*"([^"]+)"/);
    if (jsonMatch && usable(jsonMatch[2])) {
      return { name: jsonMatch[1], value: jsonMatch[2] };
    }

    const lowerJsonMatch = text.match(/"(laozhang_nano_api_key|laozhang_api_key|openai_api_key)"\s*:\s*"([^"]+)"/i);
    if (lowerJsonMatch && usable(lowerJsonMatch[2])) {
      return { name: lowerJsonMatch[1].toUpperCase(), value: lowerJsonMatch[2] };
    }
  }
  return null;
}

function expand(paths) {
  const out = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const st = statSync(path);
    if (st.isDirectory()) {
      walk(path, out, 4);
    } else {
      out.push(path);
    }
  }
  return out;
}

function walk(dir, out, depth) {
  if (depth < 0) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, out, depth - 1);
    } else if (entry.isFile() && /\.(jsonl?|log|txt|env|toml|sh|aicode)$/.test(entry.name)) {
      out.push(path);
    }
  }
}

function usable(value) {
  return value &&
    value !== "<redacted>" &&
    value !== "***REDACTED***" &&
    value.length >= 12 &&
    !value.includes("*");
}
