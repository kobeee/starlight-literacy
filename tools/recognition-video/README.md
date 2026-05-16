# Recognition Video Agent Workflow

This folder is the agent-ready production base for Starlight recognition videos.

HyperFrames is only the assembly and render layer. Agents should use the files
here to produce deterministic intermediate artifacts before a composition is
rendered or wired into H5.

## Two-Layer Agent Model

There are two different agents in this folder, and they must not be collapsed
into one job:

- **Starlight product video agent** decides whether the idea, keyframes,
  actions, assets, narration, and final memory moment can teach a 3-6 year old
  child the target character inside the P03 recognition surface.
- **Generic HyperFrames assembly agent** takes approved inputs and renders them.
  It owns deterministic HTML/CSS/GSAP assembly, lint, inspect, render, poster,
  final frame, metadata, and media checks.

Passing HyperFrames lint/render proves that a video file can be made. It does
not prove that the video is a good 星光识字 recognition lesson.

## Agent Pipeline

1. **Orchestrator**
   Reads course data and coordinates stage gates. It does not hand-write the
   final video in one pass.
2. **Teaching Brief**
   Writes `brief.json`: teaching hook, shot plan, narration, and animation
   requirements. Required sprite actions must include a frame-by-frame pose
   contract for the moving body parts. It must also declare child-facing
   pacing for the product surface, not just a render duration. It must include
   a `teachingContract` so meaning, glyph binding, phrase bridge, recognition
   pauses, mascot role, and writing position can be validated by harness.
3. **Asset Planner**
   Writes `asset-plan.json`: plates, cutouts, sprite needs, audio, poster, and
   final-frame requirements.
4. **Audio Sync Planner**
   Writes `audio-plans/<char-id>.audio-plan.json`: narration provider, voice,
   rate, subtitle/cue timings, target duration, Hongen-style duration
   benchmark, and the visual coverage window for every spoken cue. This is the
   timing contract shared by audio generation and HyperFrames assembly.
5. **Sprite Producer**
   Creates or organizes transparent PNG sequences and writes sprite manifests.
   When source art comes from image generation, prefer one multi-row,
   multi-column spritesheet per action, then run
   `prepare-spritesheet-sprite.mjs` to slice, detect alpha (or fall back to
   chroma-key), normalize, review, write `manifest.json`, and validate the
   result before HyperFrames assembly. Default `--mode auto`: real alpha first,
   chroma-key only when alpha is absent. The agent must call the generator
   directly for the whole sheet — pasting single-frame outputs together with a
   script is rejected, since it destroys style consistency.
6. **Asset Validator**
   Runs deterministic checks for alpha, dimensions, frame count, crop risk,
   chroma-key residue, pose-contract coverage, declared motion regions, and
   the teaching harness.
7. **Audio Sync Validator**
   Runs `validate-audio-sync-plan.mjs` before assembly. The check blocks clips
   whose voice rate is too fast, whose visual windows do not cover the spoken
   cues, whose final glyph has no quiet review time, or whose duration is not
   justified against reference material.
8. **Starlight Product Review**
   Writes `product-reviews/<char-id>.product-review.json`: keyframe evidence,
   action readability, product/assembly boundary, asset readiness, scores,
   decision, blockers, and next actions. This gate can honestly record a low
   score, but it must block official promotion when quality is not ready.
9. **HyperFrames Assembler**
   Uses manifests and templates to build the composition. It should not invent
   upstream animation assets or move cues without updating the audio plan.
10. **Release QA**
   Runs HyperFrames lint/inspect/render, ffprobe checks, poster/final-frame
   checks, product gate checks, and H5 resource gate checks before any official
   wiring.

## Canonical Layout

```text
tools/recognition-video/
  briefs/<char-id>.brief.json
  asset-plans/<char-id>.asset-plan.json
  audio-plans/<char-id>.audio-plan.json
  product-reviews/<char-id>.product-review.json
  assets/unit-01/<char-id>/
    plates/
    cutouts/
    sprites/<actor>/<action>/
      source-spritesheet.png
      review-sheet.png
      manifest.json
      frame-000.png
      frame-001.png
  schemas/
  scripts/
  templates/
```

Current examples live under `examples/` so the pipeline can be validated without
claiming a production asset exists.

## Rules

- Do not generate Chinese characters, pinyin, or UI text into raster images.
- Do not use single-image transform motion as a substitute for required sprite
  animation.
- Do not hand-crop image-generated spritesheets for production. Use
  `prepare-spritesheet-sprite.mjs` so frame size, alpha detection, padding,
  manifest fields, pose contract, review sheet, and sprite validation stay
  reproducible.
- Do not assemble a spritesheet by pasting single-frame generations with a
  helper script. The whole sheet must come from one image-generation call so
  style stays consistent across cells. The validator rejects pixel-identical
  adjacent cells.
- Do not retry the same prompt repeatedly when a generation fails. Switch
  path once (transparent ↔ chroma-key) or rewrite the prompt. Retries burn
  tokens without changing the result.
- Do not batch multiple characters or multiple actions into one
  image-generation call. One call = one `(character, actor, action)` sheet.
- Do not accept "multi-frame" sprites unless the named parts in the pose
  contract visibly change inside the frames. Example: a rabbit hop must show
  rear-foot push, front-foot lift, air pose, landing contact, and recovery.
- Do not cut recognition videos like fast demos. P03 teaching clips should give
  children time to see the object, hear the cue, repeat it, and then see the
  glyph summary.
- Do not generate video first and bolt audio on afterward. First create an
  audio sync plan, then generate scratch/final audio, then fit the visual
  timeline to measured cue timings, and only then render with baked audio.
- Do not pick total duration by intuition. Record a Hongen-style reference
  duration range in `durationBenchmark`, then state the P03 target duration.
  For page-embedded clips, keep the normal range at 3-8 seconds; multi-cue
  clips should usually land around 6-8 seconds with a quiet final hold.
- Do not rely on prompts alone for teaching structure. `brief.json` plus
  `asset-plan.json` must pass `validate-teaching-harness.mjs` before
  HyperFrames assembly.
- Do not rely on HyperFrames success alone for product quality. A
  `product-review.json` must separate 星光识字 product judgment from generic
  assembly judgment.
- Do not promote programmatic placeholder art to official. Script-drawn plates,
  CSS shapes, and simple geometry sprites are smoke-test materials unless a
  product review explicitly clears them.
- Do not proceed to official wiring unless `validate-product-video-gate.mjs
  --official` passes.
- Keep characters, animals, and scenery supportive. The glyph remains the
  anchor.
- New official video assets must pass validation scripts and the existing H5
  guardrails before `recognitionVideo.status = "official"` is set.

## Commands

```bash
node tools/recognition-video/scripts/validate-teaching-harness.mjs \
  tools/recognition-video/briefs/yi-agent-pipeline-test.brief.json \
  tools/recognition-video/asset-plans/yi-agent-pipeline-test.asset-plan.json

node tools/recognition-video/scripts/validate-audio-sync-plan.mjs \
  tools/recognition-video/briefs/yi-fresh-horizon-sync-v4.brief.json \
  tools/recognition-video/asset-plans/yi-fresh-horizon-sync-v4.asset-plan.json \
  tools/recognition-video/audio-plans/yi-fresh-horizon-sync-v4.audio-plan.json

node tools/recognition-video/scripts/prepare-spritesheet-sprite.mjs \
  --input <generated-spritesheet.png> \
  --output tools/recognition-video/assets/unit-01/<char-id>/sprites/<actor>/<action> \
  --character-id <char-id> \
  --actor <actor> \
  --action <action> \
  --rows 2 \
  --cols 5 \
  --mode auto \
  --required-motion-parts part-a,part-b

node tools/recognition-video/scripts/validate-sprite-assets.mjs \
  tools/recognition-video/examples/sprites/yi/rabbit-hop/manifest.json

node tools/recognition-video/scripts/validate-product-video-gate.mjs \
  tools/recognition-video/product-reviews/yi-hongen-agent-v2.product-review.json
```

Add production manifests to the same script call before a render is considered
ready for HyperFrames assembly.

For an official candidate, use the stricter mode:

```bash
node tools/recognition-video/scripts/validate-product-video-gate.mjs --official \
  tools/recognition-video/product-reviews/<char-id>.product-review.json
```

Manifests can declare `motionChecks` regions. The validator compares adjacent
frames inside those regions, so actions like "rabbit hop" fail when only the
whole sprite moves while feet, ears, or other required parts stay effectively
static.
