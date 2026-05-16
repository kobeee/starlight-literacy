#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const exec = promisify(execFile);

const OUT_DIR = resolve("tools/baked-audio/audition/yi");

const VOICES = [
  { id: "xiaoyi", voice: "zh-CN-XiaoyiNeural", note: "晓伊·女·活泼·卡通" },
  { id: "yunxia", voice: "zh-CN-YunxiaNeural", note: "云夏·男·可爱·卡通" },
  { id: "xiaoxiao", voice: "zh-CN-XiaoxiaoNeural", note: "晓晓·女·温暖·老师感" }
];

const SEGMENTS = [
  { id: "01-char", text: "一", rate: "-12%", pitch: "+2Hz" },
  { id: "02-phrase", text: "一个的一", rate: "-8%", pitch: "+0Hz" },
  { id: "03-soundcue", text: "一个、一条、一根，都有一个平平的一。", rate: "-10%", pitch: "+0Hz" },
  { id: "04-video-cues", text: "一个苹果。一条小路。一根木棒。都是一。", rate: "-10%", pitch: "+0Hz" }
];

async function generate({ id, voice, note }) {
  for (const seg of SEGMENTS) {
    const out = `${OUT_DIR}/${id}-${seg.id}.mp3`;
    process.stdout.write(`[${id}] ${seg.id} ${seg.text}\n`);
    await exec("edge-tts", [
      "--voice", voice,
      `--rate=${seg.rate}`,
      `--pitch=${seg.pitch}`,
      "--text", seg.text,
      "--write-media", out
    ]);
  }
  process.stdout.write(`[${id}] ${note} done\n`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const v of VOICES) {
  await generate(v);
}
process.stdout.write(`\n输出目录: ${OUT_DIR}\n`);
