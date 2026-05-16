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
3. Produce or review artifacts in order:
   - `brief.json`
   - `asset-plan.json`
   - keyframe/action review and `product-review.json`
   - image-generated spritesheet, then standardized sprite `manifest.json`,
     PNG frames, and review sheet
   - validation output
   - HyperFrames composition
   - rendered media and H5 metadata
4. Run deterministic checks before render or official wiring:

```bash
npm run video:check-sprite-example
npm run video:prepare-spritesheet -- --input <generated-spritesheet.png> --output <sprite-dir> --character-id <char-id> --actor <actor> --action <action> --rows 2 --cols 5 --chroma-key auto --required-motion-parts part-a,part-b
node tools/recognition-video/scripts/validate-product-video-gate.mjs <product-review.json>
node tools/recognition-video/scripts/validate-sprite-assets.mjs <manifest.json>
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
- Do not set `recognitionVideo.status = "official"` until sprite validation,
  product video gate, HyperFrames lint/inspect/render, baked audio/media
  checks, poster/final-frame checks, and H5 guardrails pass.

## Useful Files

- `tools/recognition-video/schemas/brief.schema.json`
- `tools/recognition-video/schemas/asset-plan.schema.json`
- `tools/recognition-video/schemas/product-review.schema.json`
- `tools/recognition-video/schemas/sprite-manifest.schema.json`
- `tools/recognition-video/templates/prompts/cutout-sequence-prompt.md`
- `tools/recognition-video/templates/hyperframes/sprite-stage.html`
- `tools/recognition-video/scripts/prepare-spritesheet-sprite.mjs`
- `tools/recognition-video/scripts/validate-product-video-gate.mjs`
- `tools/recognition-video/scripts/validate-sprite-assets.mjs`

## Reporting

Report stage-gate status with concrete file paths and commands. If a stage is
blocked, explain which artifact or validation failed and stop before generating
downstream official assets.
