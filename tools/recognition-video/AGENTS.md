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

## Pipeline Architecture: Main Line + Three Independent Sub-Lines

Recognition-video production is organized as **one main line plus three
independent sub-lines**. The sub-lines are independent because each owns a
clear input → output → success-criteria contract; their schemas, validators,
and product checks live on their own and can be re-run without touching the
others.

- **Main line**: brief → asset-plan → audio-plan → HyperFrames composition →
  product-review → H5 wiring. The main line orchestrates and assembles but no
  longer owns narration text or stroke-order tail rendering.
- **Sub-line A · Narration Production** (`schemas/narration-spec.schema.json`):
  designs the narration text, runs edge-tts bake, measures per-segment cue
  timings. Owns: target-character repetition ≥ 3, concrete-anchor phrase,
  quantifier-vs-numeral separation, child-readable sentence complexity, voice
  rate gating, and apad tail length. Outputs: `narration.mp3` + `*.vtt` +
  `*.measured-timings.json`. The main-line audio-plan ingests measured timings
  instead of guessing cue positions.
- **Sub-line B · Sprite Production**: owns transparent PNG sequences, pose
  contract, motion checks, image-generated spritesheet rejection of identical
  cells. Unchanged from prior pipeline.
- **Sub-line C · Stroke-Order Tail Production**
  (`schemas/tail-spec.schema.json` + `anchors/mizige-anchors.json`): owns the
  last ~2s mizige writing demo. Canonical mizige position, glyph box, child
  hand entry, lighting, and the layer-clearing contract are anchored in the
  system-level `mizige-anchors.json` so swapping characters cannot drift the
  composition. Outputs: standalone tail HTML + final-frame PNG + DOM probe
  JSON.

When the brief carries `narrationSpecRef` and `tailSpecRef`, those sub-line
specs are authoritative; the brief's inline `narration` / `strokeOrderTail`
blocks are treated as caches that must agree.

## Agent Roles

- **Orchestrator Agent**: selects target char, checks dependencies, and enforces
  stage gates, including child-facing pacing for the target product surface.
- **Starlight Product Video Director Agent**: owns whether the clip is worth
  making for 星光识字. It reviews teaching memory, glyph binding, child appeal,
  keyframes, action readability, asset readiness, and whether the result can
  become an official P03 learning asset.
- **Teaching Brief Agent**: creates or reviews `*.brief.json`. Once sub-line A
  and C are wired, the brief references them via `narrationSpecRef` and
  `tailSpecRef` instead of duplicating their content.
- **Narration Production Agent** *(sub-line A)*: creates and reviews
  `narration-specs/<char-id>.narration-spec.json`, runs `bake-narration.mjs`,
  and reports the measured timings JSON the audio-plan consumes. This agent
  enforces the repetition + concrete-anchor + quantifier rules that catch
  poetic narration drifting away from recognition signal. It runs before the
  main-line audio-plan.
- **Stroke-Order Tail Agent** *(sub-line C)*: creates and reviews
  `tail-specs/<char-id>.tail-spec.json`, references
  `anchors/mizige-anchors.json`, and runs `render-stroke-order-tail.mjs
  --capture` to produce the final-frame PNG and DOM probe. This agent is the
  one that guarantees the final frame contains exactly the target character
  with no ghost ink layers from the cinematic body.
- **Asset Planning Agent**: creates or reviews `*.asset-plan.json`.
- **Audio Sync Agent**: creates or reviews `audio-plans/<char-id>.audio-plan.json`.
  Reads `*.measured-timings.json` from sub-line A; never invents cue timings.
  Compares target duration with Hongen-style reference videos and maps every
  spoken cue to a visual window before HyperFrames assembly starts.
- **Sprite Production Agent** *(sub-line B)*: produces or organizes transparent
  PNG sequences and sprite manifests. Required character actions must include a
  pose contract, not just a frame count. If the source is an image-generated
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
review. Sub-line A and C now have their own gates that run before main-line
audio-plan / composition:

1. **Sub-line A · narration-spec**:
   `narration-specs/<char-id>.narration-spec.json` exists and
   `validate-narration-spec.mjs` passes (target-char repetition ≥ 3,
   concrete-anchor phrase, quantifier-vs-numeral, voice rate -15%..0%).
2. **Sub-line A · narration bake**: `bake-narration.mjs` has produced
   `narration.mp3`, `*.vtt`, and `*.measured-timings.json`, and
   `validate-narration-bake.mjs` passes (non-silent audio, duration matches
   `apadToSeconds`, every segment has measured timings, VTT contains all
   segment texts).
3. **Sub-line C · tail-spec**: `tail-specs/<char-id>.tail-spec.json` exists,
   references `anchors/mizige-anchors.json`, and `validate-tail-spec.mjs`
   passes (single-mizige-dual-state, stroke order sequential and within tail
   window, mandatory clear-layer ids declared, finalFrame requires hand pose
   + writing state).
4. **Sub-line C · tail render**: `render-stroke-order-tail.mjs --capture`
   produced a headless final-frame PNG and a DOM probe JSON, and the probe
   passed (cinematic-body layers marked removed; tail root has
   `data-tail-state=writing` at the end).
5. `brief.json` exists; if sub-line A/C specs exist, the brief declares
   `narrationSpecRef` and `tailSpecRef` instead of duplicating their content.
6. `asset-plan.json`.
7. `audio-plans/<char-id>.audio-plan.json`; cue timings must come from the
   sub-line A measured-timings JSON, not invented.
8. `validate-teaching-harness.mjs` passes for the brief and asset plan: meaning
   action precedes glyph closure, glyph binding and phrase bridge exist, mascot
   role stays supportive, writing stays late or omitted, each teaching cue has
   enough hold time for 3-6 year old recognition, the final glyph frame is
   calm and readable, and the brief declares a `teachingContract.strokeOrderTail`
   block (cache of sub-line C) that sits after the phrase/glyph closure, uses
   a single mizige with dual-state policy, stays silent, names a writing
   direction, and holds for at least `minSeconds`.
9. `validate-audio-sync-plan.mjs` passes for brief, asset plan, and audio plan:
   narration text matches sub-line A, voice rate is child-facing, cue spacing
   is not too fast, every spoken cue is covered by a visual window, the final
   cue holds through the end of the spoken body, and duration is justified
   against Hongen-style reference clips instead of chosen by feel. When the
   clip has a stroke-order tail, `paddedTotalDurationSeconds` must match
   `brief.duration` and the spoken `targetDurationSeconds` must end before the
   tail begins; the tail must appear as a `narration: "silent"` cue and the
   baked mp3 must be `ffmpeg apad`-extended to the padded total length, never
   by trimming the video.
10. product keyframe and action review exists as
    `product-reviews/<char-id>.product-review.json`; this is the 星光识字
    product gate, not a HyperFrames render gate.
11. `validate-product-video-gate.mjs` passes; low-scoring pipeline tests may be
    recorded, but they must be marked `rendered-needs-iteration` or `blocked`
    and must not be treated as official candidates. The
    `teachingFunctionalIntegrity` score (≥ 9 for official) is the safety net
    that caps officialReadiness when sub-line A/C constraints were not met
    even if the cinematic body scored ≥ 9.
12. sprite `manifest.json` plus actual frames, pose contract, and motion checks;
    image-generated spritesheets must first pass through
    `prepare-spritesheet-sprite.mjs`.
13. `validate-sprite-assets.mjs` passes alpha, dimension, crop, chroma-key, and
    motion-region checks.
14. Generic HyperFrames lint/inspect/render passes; render must be invoked with
    explicit `-f 24` because HyperFrames defaults to 30fps and the H5 guardrail
    rejects anything else.
15. MP4/WebM metadata, non-silent audio, poster/final frame, product review, and
    H5 guardrails pass.

## Stroke-Order Tail Contract

Every official recognition video ends with a silent stroke-order demo inside a
mizige. The contract is structural, not stylistic — what each character draws
is a content decision, but the following shape is required:

- The brief declares `teachingContract.strokeOrderTail` with the tail shot id,
  start time, minimum hold, container `mizige`, state policy
  `single-mizige-dual-state`, narration policy `silent`, and a writing
  direction (`left-to-right`, `top-to-bottom`, or `stroke-order-table`).
- The same mizige carries both 识字态 (recognition) and 写字态 (writing) via
  CSS-variable interpolation. Do not stage a separate tianzige earlier and then
  cross-fade to a mizige later; one container, two states.
- The tail runs after the phrase/glyph closure shot and inside `brief.duration`.
  No narration cue may land inside the tail window; the tail is for watching,
  not listening.
- The character is written in the correct stroke order (single-stroke characters
  may use `clip-path inset` reveal; multi-stroke characters must reveal one
  stroke at a time in the canonical order).
- The final frame shows the completed glyph inside the mizige in 写字态 and is
  used as the P03 poster.

## H5 Wiring Contract

When the product gate passes and the video is promoted to official, H5 wiring
follows a fixed shape so that `npm run check:h5` cannot regress:

- Asset filenames may not match `/v3|legacy|sample/i`. Use a semantic version
  suffix such as `-v4`, `-v5`, or a date stamp; the build directory may keep
  the version number, but the H5 copy must not.
- The mp4 must be rendered at 24fps and its declared `duration` must match
  `brief.duration` within 0.15s; the baked mp3 must match
  `paddedTotalDurationSeconds` within 0.35s.
- Run `node scripts/bump-h5-version.mjs` to bump `sw.js`, `index.html`,
  `app.js`, and `styles.css?v=` together. Editing only `sw.js` will fail the
  version-marker guardrail.
- Update `sw.js` `IMAGE_SHELL` (poster + final) and `RECOGNITION_SHELL` (mp4 +
  webm + narration.mp3) in the same change as the version bump so the new
  assets are precached on the next install.
- `recognitionVideo.status = "official"` requires baked audio. The brief may
  not declare `voiceCues` on official baked clips — the H5 guardrail rejects
  Web-Speech `voiceCues` overlapping a baked track.

## HyperFrames Runtime Notes

- The `gsap.min.js` shipped inside a HyperFrames build is a `MiniTimeline`
  shim, not real GSAP. Its default `totalDuration` is hardcoded to 7.4s and
  any `seek(time)` above that is silently clamped. For any clip longer than
  7.4s the composition root must carry `data-composition-id` and
  `data-duration="<seconds>"` so the shim factory reads the real duration;
  without this, the timeline never advances past 7.4s and snapshots will look
  identical at every later frame without raising an error.
- When audio is shorter than the rendered video (typical for clips with a
  silent stroke-order tail), pad the narration mp3 with
  `ffmpeg -af "apad=whole_dur=<N>" -t <N>` rather than trimming the video.
  The H5 `ended` event and the poster contract assume audio and video share
  the same length.

## Hard Stops (Sub-line A — Narration)

- Stop if narration text contains the target character fewer than 3 times. A
  one-shot mention is poetic narration, not recognition signal.
- Stop if there is no `concreteAnchorPhrase` binding the target character to a
  tangible noun (e.g. "一根木棒" for "一", "一只小船"). Without a concrete
  anchor the child has nothing to picture.
- Stop if the target character is a number (`targetCharSemantic = "number"`)
  and a quantifier construction like "一道光" is used without a visible count
  of the noun in the composition. Without `boundToVisualCount=true` with a
  `visualReference`, the child learns the measure word, not the number.
- Stop if voice rate is outside -15%..0%; faster than 0% and slower than -15%
  both hurt 3-6 yr old comprehension.
- Stop if audio-plan cue timings were invented instead of read from sub-line
  A's measured-timings JSON.

## Hard Stops (Sub-line C — Stroke-Order Tail)

- Stop if the tail-spec does not reference
  `anchors/mizige-anchors.json/v1`; the system-level anchor table is
  authoritative and per-character drift is forbidden.
- Stop if the tail composition does not run the DOM probe declared in
  `mizige-anchors.domProbe`; ghost-stroke regressions are invisible to
  screenshot review alone.
- Stop if any cinematic-body layer named in `clearingContract.mustClearLayerIds`
  is still rendered when the tail starts. Forgetting to clear the ink-glyph
  layer is the v5 bug we are guarding against.
- Stop if `container.policy` is anything other than `single-mizige-dual-state`.
  Two grids on screen are forbidden in production.
- Stop if `finalFrame.handPosePresent` is false; the P03 poster is brand-locked
  to the child-hand bottom-right entry.

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
  range. P03 spoken bodies should normally stay within 3-8 seconds, the silent
  stroke-order tail should add no more than ~4 seconds, and the total clip
  must not exceed 12 seconds. Multi-cue clips should not squeeze the spoken
  body below about 5.8 seconds.
- Stop if the final spoken cue ends at the exact last frame. Leave quiet time
  for the child to look back at the glyph.
- Stop if the brief has no `teachingContract.strokeOrderTail`, or if the tail
  is not the last shot, sits before the phrase/glyph closure, overlaps a
  spoken narration cue, or holds for less than its declared `minSeconds`.
- Stop if the stroke-order tail uses a separate tianzige+mizige pair instead of
  a single mizige with a CSS-variable-driven 识字态→写字态 transition. One
  container, two states; do not cross-fade between two grids.
- Stop if the stroke-order tail writes the character in an order other than the
  canonical stroke order, or reveals all strokes simultaneously instead of one
  by one (single-stroke characters excepted).
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
