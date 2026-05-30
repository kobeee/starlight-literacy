#!/usr/bin/env node

// 单张静态资产生图（iOS SceneAsset / 字源图用，非视频 spritesheet）。
//
// 背景（"一直没解决"根因）：
//   - knowledge-base 记的主路径「codex 内置 image-generation 工具」在当前
//     codex v0.134.0 环境里【不存在】——config.toml 只启用 browser/documents/
//     spreadsheets/presentations/chrome 插件，没有 image plugin。codex exec 会
//     【静默假装成功】（打印保存路径但不写文件），骗过 EXIT=0 检查。
//   - 两个旧脚本接错线：generate-gpt-image-assets.mjs 拿 sk-acw 代理 key 打
//     api.openai.com（端点不对）；generate-via-responses.mjs 端点对但读 auth.json
//     （里面 OPENAI_API_KEY 是空的）。
//
// 本脚本：直连 aicodewith 代理 Responses API，key 从 auth.json.aicode 取。
//
// 用法：
//   node gen-scene-image.mjs --prompt-file P.txt --out OUT.png \
//        [--size 1024x1024] [--quality high] [--background transparent|opaque|auto] \
//        [--ref REF.png]
//   或 --prompt "literal text"

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const args = parseArgs(process.argv.slice(2));
const authPath = args.auth || "/Users/elvis/.codex/auth.json.aicode";
const baseUrl = args.baseUrl || "https://api.aicodewith.com/chatgpt/v1";
const model = args.model || "gpt-5.5";

const size = args.size || "1024x1024";
const quality = args.quality || "high";
const background = args.background || "transparent"; // 先试透明，代理拒了再降级
const out = args.out;
if (!out) throw new Error("--out required");

const prompt = args.prompt
  ? args.prompt
  : args["prompt-file"]
    ? readFileSync(args["prompt-file"], "utf8").trim()
    : (() => { throw new Error("--prompt or --prompt-file required"); })();

const apiKey = readApiKey(authPath);

const wrappedInput = [
  "Render exactly the following picture-book asset using the image_generation tool.",
  "Do not add commentary, captions, frames, or text. Output only the requested image.",
  "",
  prompt,
].join("\n");

const toolCfg = { type: "image_generation", size, quality, output_format: "png" };
if (background) toolCfg.background = background;

const body = {
  model,
  input: buildInput(wrappedInput, args.ref),
  tools: [toolCfg],
  tool_choice: { type: "image_generation" },
  stream: false,
};

const started = Date.now();
const png = await callResponses(body, apiKey, baseUrl);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`[done] wrote ${out} (${(png.length / 1024).toFixed(1)} KB, ${((Date.now() - started) / 1000).toFixed(1)}s, bg=${background})`);

async function callResponses(body, apiKey, baseUrl) {
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Responses API ${response.status}: ${text.slice(0, 600)}`);
  }
  const data = JSON.parse(text);
  const block = (data.output || []).find(
    (item) => item && (item.type === "image_generation_call" || item.action === "generate"),
  );
  const base64 = block && block.result;
  if (!base64 || typeof base64 !== "string") {
    throw new Error(
      `No image_generation result. output types=${JSON.stringify((data.output || []).map((o) => o.type))}`,
    );
  }
  return Buffer.from(base64, "base64");
}

function buildInput(textInput, refPath) {
  if (!refPath) return textInput;
  const b64 = readFileSync(refPath).toString("base64");
  return [
    {
      role: "user",
      content: [
        { type: "input_text", text: textInput },
        { type: "input_image", image_url: `data:image/png;base64,${b64}` },
      ],
    },
  ];
}

function readApiKey(p) {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (!existsSync(p)) throw new Error(`auth file missing: ${p}`);
  const parsed = JSON.parse(readFileSync(p, "utf8"));
  if (!parsed.OPENAI_API_KEY) throw new Error(`OPENAI_API_KEY missing in ${p}`);
  return parsed.OPENAI_API_KEY;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    }
  }
  return out;
}
