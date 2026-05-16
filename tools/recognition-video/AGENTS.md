# Recognition Video Agents

Use this workflow when producing Starlight Literacy recognition animation
videos, especially when the request mentions HyperFrames production base,
sprite/cutout assets, multi-frame animation, or agent-based video production.

## Required Context

Before production work, read:

- `knowledge-base/03-开发日志/当前任务.md`
- `knowledge-base/05-技术文档/HyperFrames多帧动画Agent流水线方案.md`
- `knowledge-base/05-技术文档/Mobile-H5-HyperFrames教学动画优化方案.md`
- `knowledge-base/06-素材资源/Unit-01素材与生图生产规范.md`

## Agent Roles

- **Orchestrator Agent**: selects target char, checks dependencies, and enforces
  stage gates, including child-facing pacing for the target product surface.
- **Starlight Product Video Director Agent**: owns whether the clip is worth
  making for 星光识字. It reviews teaching memory, glyph binding, child appeal,
  keyframes, action readability, asset readiness, and whether the result can
  become an official P03 learning asset.
- **Teaching Brief Agent**: creates or reviews `*.brief.json`.
- **Asset Planning Agent**: creates or reviews `*.asset-plan.json`.
- **Audio Sync Agent**: creates or reviews `audio-plans/<char-id>.audio-plan.json`.
  It chooses narration provider/voice/rate, records subtitle or cue timings,
  compares target duration with Hongen-style reference videos, and maps every
  spoken cue to a visual window before HyperFrames assembly starts.
- **Sprite Production Agent**: produces or organizes transparent PNG sequences
  and sprite manifests. Required character actions must include a pose
  contract, not just a frame count. If the source is an image-generated
  spritesheet, run `prepare-spritesheet-sprite.mjs` first instead of manually
  slicing frames. The agent must call the image generator directly for the
  whole spritesheet — pasting single-frame outputs together with a script is
  forbidden, since it destroys style consistency and produces identical cells
  that the validator will reject.
- **Validation Agent**: runs scripts in `scripts/` and reports blocking issues.
- **Generic HyperFrames Assembly Agent**: creates composition files from
  already-approved manifests, keyframes, audio, and templates. It owns assembly,
  lint, inspect, render, poster/final-frame output, metadata, and media checks;
  it does not decide whether the teaching idea is good.
- **Release QA Agent**: runs HyperFrames, media, and H5 guardrail checks.

## Stage Gates

Do not continue to the next stage unless the current artifact exists and passes
review:

1. `brief.json`
2. `asset-plan.json`
3. `audio-plans/<char-id>.audio-plan.json`
4. `validate-teaching-harness.mjs` passes for the brief and asset plan: meaning
   action precedes glyph closure, glyph binding and phrase bridge exist, mascot
   role stays supportive, writing stays late or omitted, each teaching cue has
   enough hold time for 3-6 year old recognition, and the final glyph frame is
   calm and readable
5. `validate-audio-sync-plan.mjs` passes for brief, asset plan, and audio plan:
   narration text matches, voice rate is child-facing, cue spacing is not too
   fast, every spoken cue is covered by a visual window, the final cue holds
   through the end, and duration is justified against Hongen-style reference
   clips instead of chosen by feel
6. product keyframe and action review exists as
   `product-reviews/<char-id>.product-review.json`; this is the 星光识字 product
   gate, not a HyperFrames render gate
7. `validate-product-video-gate.mjs` passes; low-scoring pipeline tests may be
   recorded, but they must be marked `rendered-needs-iteration` or `blocked`
   and must not be treated as official candidates
8. sprite `manifest.json` plus actual frames, pose contract, and motion checks;
   image-generated spritesheets must first pass through
   `prepare-spritesheet-sprite.mjs`
9. `validate-sprite-assets.mjs` passes alpha, dimension, crop, chroma-key, and
   motion-region checks
10. Generic HyperFrames lint/inspect/render passes
11. MP4/WebM metadata, non-silent audio, poster/final frame, product review, and
   H5 guardrails pass

## Hard Stops

- Stop if the work treats a generic HyperFrames render pass as proof that the
  StarLight teaching product is good.
- Stop if there is no `product-review.json` separating product-director duties
  from generic assembly/render duties.
- Stop if programmatic placeholder art is being promoted to official product
  art. Script-drawn plates and sprites are allowed for smoke tests only.
- Stop if keyframes read as a sequence of cards rather than one teachable
  memory action for the target character.
- Stop if a required character action is represented only by one static image
  moving, scaling, or fading.
- Stop if a required limb or part named in the pose contract stays visually
  static across the sprite, even when the whole cutout moves.
- Stop if pacing is tuned for a demo reel instead of the P03 recognition page:
  children need enough time to see the object, hear the cue, and look back to
  the glyph.
- Stop if there is no audio sync plan before HyperFrames assembly. Video and
  audio can be generated by separate tools, but they must share one timing
  contract first.
- Stop if the narration is created only after the video timeline is locked,
  unless the timeline is immediately re-fit to measured subtitle/cue timings.
- Stop if total duration is not justified against a Hongen-style reference
  range. P03 clips should normally stay within 3-8 seconds, and multi-cue
  clips should not be squeezed below about 5.8 seconds.
- Stop if the final spoken cue ends at the exact last frame. Leave quiet time
  for the child to look back at the glyph.
- Stop if the brief has no explicit `teachingContract`; Hongen-style structure
  must be machine-checkable, not only implied in the prompt.
- Stop if generated artwork contains readable Chinese, pinyin, UI labels, or
  watermark text.
- Stop if frames have inconsistent dimensions, missing alpha, crop risk, or
  visible chroma-key residue.
- Stop if a generated spritesheet was hand-cropped or pasted into a HyperFrames
  build without `source-spritesheet.png`, `review-sheet.png`, generated
  `manifest.json`, and `validate-sprite-assets.mjs` output.
- Stop if a spritesheet was assembled by a helper script that pastes
  single-frame image generations into a grid. The spritesheet must come from
  one image-generation pass so that style, scale, and lighting stay consistent.
  `prepare-spritesheet-sprite.mjs` rejects sheets with pixel-identical
  adjacent cells.
- Stop if the agent retries the same image-generation prompt repeatedly to
  fight a single failure. Switch path once (transparent ↔ chroma-key) or
  rewrite the prompt; do not burn tokens on identical retries.
- Stop if one image-generation call is asked to produce multiple characters,
  multiple actors, or multiple actions in one batch. Batches drift on style.
  One call = one `(character, actor, action)` spritesheet.
- Stop before wiring official H5 resources unless baked audio and real media
  streams are verified and `validate-product-video-gate.mjs --official` passes.

## Output Style

Report stage status with file paths, command results, and remaining blockers.
Do not claim a production video is official until all gates pass.
