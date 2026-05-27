---
name: starlight-video-agent
description: Use this when producing Starlight Literacy recognition animation videos through an agent workflow: teaching brief, asset plan, multi-frame cutout/sprite manifests, validation scripts, HyperFrames assembly, baked audio, poster/final-frame output, and H5 official-resource gates.
---

# Starlight Video Agent

Use this skill for agent-based Starlight recognition video production. It
extends `starlight-recognition-video` by requiring an upstream production base
before HyperFrames assembly.

## Workflow

1. Read the project agent guide:
   - `tools/recognition-video/AGENTS.md`
   - `tools/recognition-video/README.md`
2. Read the current project constraints:
   - `knowledge-base/03-开发日志/当前任务.md`
   - `knowledge-base/05-技术文档/HyperFrames多帧动画Agent流水线方案.md`
   - `knowledge-base/05-技术文档/Mobile-H5-HyperFrames教学动画优化方案.md`
   - `knowledge-base/06-素材资源/Unit-01素材与生图生产规范.md`
3. Produce or review artifacts in **main + 3 sub-line** order:
   - **Sub-line A · Narration**:
     `narration-specs/<char-id>.narration-spec.json` → run
     `bake-narration.mjs` → review `narration.mp3` + `*.vtt` +
     `*.measured-timings.json`.
   - **Sub-line C · Stroke-Order Tail**:
     `tail-specs/<char-id>.tail-spec.json` (referencing
     `anchors/mizige-anchors.json`) → run
     `render-stroke-order-tail.mjs --capture` → review tail HTML +
     `*.final-frame.png` + `*.dom-probe.json`.
   - **Sub-line B · Sprite**:
     image-generated spritesheet → standardized sprite `manifest.json`, PNG
     frames, and review sheet.
   - **Main line**: `brief.json` (with `narrationSpecRef` + `tailSpecRef` when
     the sub-line specs exist) → `asset-plan.json` → `audio-plan.json`
     (reads sub-line A measured timings) → keyframe/action review and
     `product-review.json` → HyperFrames composition → rendered media and H5
     metadata.
4. Run deterministic checks in sub-line order before render or official wiring:

```bash
# Sub-line A
node tools/recognition-video/scripts/validate-narration-spec.mjs <narration-spec.json>
node tools/recognition-video/scripts/bake-narration.mjs <narration-spec.json>
node tools/recognition-video/scripts/validate-narration-bake.mjs <narration-spec.json>

# Sub-line C
node tools/recognition-video/scripts/validate-tail-spec.mjs <tail-spec.json>
node tools/recognition-video/scripts/render-stroke-order-tail.mjs <tail-spec.json> --capture

# Sub-line B
npm run video:check-sprite-example
npm run video:prepare-spritesheet -- --input <generated-spritesheet.png> --output <sprite-dir> --character-id <char-id> --actor <actor> --action <action> --rows 2 --cols 5 --chroma-key auto --required-motion-parts part-a,part-b
node tools/recognition-video/scripts/validate-sprite-assets.mjs <manifest.json>

# Main line
node tools/recognition-video/scripts/validate-teaching-harness.mjs <brief.json> <asset-plan.json>
node tools/recognition-video/scripts/validate-audio-sync-plan.mjs <brief.json> <asset-plan.json> <audio-plan.json>
node tools/recognition-video/scripts/validate-product-video-gate.mjs <product-review.json>
```

## Hard Rules

- HyperFrames is the final assembly/render layer, not the upstream animation
  asset generator.
- The 星光识字 product video agent owns teaching quality, keyframe review,
  action readability, asset readiness, and official promotion decisions.
- The generic HyperFrames agent owns deterministic assembly and render checks
  only. A render pass is not a product-quality pass.
- Do not let raster images contain Chinese characters, pinyin, UI text, or
  watermarks.
- Do not hand-crop generated spritesheets. Run
  `prepare-spritesheet-sprite.mjs` so alpha cleanup, frame normalization,
  `manifest.json`, `review-sheet.png`, and sprite validation are reproducible.
- Do not use one static cutout moving, scaling, or fading as a substitute for a
  required role/object action.
- Do not promote script-drawn placeholder art to official product art.
- Every official recognition video must end with a silent stroke-order demo
  inside a mizige. The brief must declare `teachingContract.strokeOrderTail`
  with shot id, start time, `minSeconds`, container `mizige`, state policy
  `single-mizige-dual-state`, narration policy `silent`, and a writing
  direction. The tail must come after the phrase/glyph closure shot and must
  not overlap any spoken narration cue.
- Use one mizige with two states (识字态↔写字态) driven by CSS variables. Do
  not stage a separate tianzige earlier and cross-fade to a mizige later for
  the writing demo.
- The character must be written in the canonical stroke order during the tail.
  Single-stroke characters may use a single `clip-path inset` reveal;
  multi-stroke characters must reveal one stroke at a time in the correct
  order.
- Sub-line A (narration) is mandatory before main-line audio-plan. The
  narration text must repeat the target character at least 3 times and must
  contain at least one `concreteAnchorPhrase` binding the character to a
  tangible noun. Poetic single-mention narration is rejected.
- Sub-line C (stroke-order tail) is mandatory before main-line composition.
  The tail-spec must reference `anchors/mizige-anchors.json`; layer-clearing
  contract and DOM probe are not negotiable — they catch ghost-stroke bugs
  invisible to screenshot review.
- Render at 24fps explicitly (`hyperframes render -f 24`). HyperFrames defaults
  to 30fps and the H5 guardrail rejects anything else.
- When the rendered video is longer than the spoken narration (typical for
  clips with a stroke-order tail), pad the mp3 with
  `ffmpeg -af "apad=whole_dur=<N>" -t <N>` to match `paddedTotalDurationSeconds`.
  Do not shorten the video to match the audio.
- The HyperFrames build's `gsap.min.js` is a `MiniTimeline` shim with a
  hardcoded 7.4s `totalDuration`. For any clip longer than 7.4s the composition
  root must carry `data-composition-id` and `data-duration="<seconds>"` so the
  shim factory reads the real duration; otherwise frames after 7.4s silently
  freeze.
- Do not set `recognitionVideo.status = "official"` until sprite validation,
  product video gate, HyperFrames lint/inspect/render, baked audio/media
  checks, poster/final-frame checks, and H5 guardrails pass.
- Do not name H5-side official assets with `/v3|legacy|sample/i`. Use a
  semantic version suffix (`-v4`, `-v5`) or a date stamp; the build directory
  may keep the version number, but the H5 copy must not. Run
  `node scripts/bump-h5-version.mjs` so `sw.js`, `index.html`, `app.js`, and
  `styles.css?v=` move together; editing only `sw.js` will fail the
  version-marker guardrail.
- Do not declare `voiceCues` on an official baked recognitionVideo. Baked
  audio and Web-Speech cues are mutually exclusive at the H5 layer.

## Useful Files

- `tools/recognition-video/schemas/brief.schema.json`
- `tools/recognition-video/schemas/asset-plan.schema.json`
- `tools/recognition-video/schemas/audio-plan.schema.json`
- `tools/recognition-video/schemas/product-review.schema.json`
- `tools/recognition-video/schemas/sprite-manifest.schema.json`
- **Sub-line A**: `tools/recognition-video/schemas/narration-spec.schema.json`
- **Sub-line C**: `tools/recognition-video/schemas/tail-spec.schema.json`
- **Sub-line C anchors**: `tools/recognition-video/anchors/mizige-anchors.json`
- `tools/recognition-video/templates/prompts/cutout-sequence-prompt.md`
- `tools/recognition-video/templates/hyperframes/sprite-stage.html`
- `tools/recognition-video/scripts/validate-narration-spec.mjs`
- `tools/recognition-video/scripts/bake-narration.mjs`
- `tools/recognition-video/scripts/validate-narration-bake.mjs`
- `tools/recognition-video/scripts/validate-tail-spec.mjs`
- `tools/recognition-video/scripts/render-stroke-order-tail.mjs`
- `tools/recognition-video/scripts/prepare-spritesheet-sprite.mjs`
- `tools/recognition-video/scripts/validate-product-video-gate.mjs`
- `tools/recognition-video/scripts/validate-sprite-assets.mjs`

## Reporting

Report stage-gate status with concrete file paths and commands. If a stage is
blocked, explain which artifact or validation failed and stop before generating
downstream official assets.
