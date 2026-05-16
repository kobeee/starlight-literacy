# Cutout Sequence Prompt Template

Use this for sprite or PNG sequence generation. Replace bracketed values before
calling an image generator.

Primary path is **transparent PNG with a real alpha channel**. Modern image
models (gpt-image-2 and later) deliver clean RGBA when prompted explicitly, so
prefer this over chroma-key. Chroma-key is only a fallback for models or
sessions where transparency fails.

## Primary prompt — transparent PNG (RGBA)

```text
Warm pastoral children's picture-book illustration for a Chinese literacy app,
ages 3-6. Cream paper texture, honey sunlight, low-saturation warm colors,
soft gouache and colored-pencil feel. Tactile rounded shapes, calm and joyful,
premium children's book taste.

Output one clean animation spritesheet of [ACTOR] doing [ACTION], arranged as
[ROWS] rows by [COLS] columns. Each cell is one consecutive pose. The motion
must read clearly from frame to frame: [MOTION_NOTES]. Keep the same character
design, body proportions, colors, camera angle, and lighting in every cell.

Save the result as a transparent PNG with an alpha channel (RGBA). The
background of every cell must be fully transparent (alpha = 0), with no
backdrop, no floor plane, no cast shadow, no contact shadow, no halo, no
gradient, no checker, and no watermark. Keep the subject fully isolated with
crisp anti-aliased edges and generous padding inside each cell.

No grid lines, no labels, no numbers, no Chinese characters, no pinyin, no
readable text, no UI chrome, no sticker collage, no glossy 3D, no neon, no
dark fantasy, no purple-blue gradient.
```

When attaching a style reference image, add a sentence such as:

```text
Match the line weight, paper texture, color temperature, and brush feel of the
reference image. Keep that exact illustration style across every cell.
```

## Fallback prompt — solid chroma-key background

Use only when transparent PNG output fails on the chosen model. Do not retry
the transparent prompt multiple times — switch once, then move on.

```text
[same style header as above]

Output one clean animation spritesheet of [ACTOR] doing [ACTION], arranged as
[ROWS] rows by [COLS] columns. Each cell shows only the subject on a perfectly
flat solid #00ff00 chroma-key background for background removal. The
background must be one uniform color with no shadows, gradients, texture,
reflections, floor plane, or lighting variation. Keep the subject fully
separated from the background with crisp edges and generous padding. Do not
use #00ff00 anywhere in the subject. No grid lines, no labels, no numbers, no
cast shadow, no contact shadow, no reflection, no watermark, and no text.

No Chinese characters, no pinyin, no readable text, no UI chrome, no sticker
collage, no glossy 3D, no neon, no dark fantasy, no purple-blue gradient.
```

## Generation discipline

- Generate one spritesheet per `(character, actor, action)` call. Do not batch
  multiple chars or actions in one request — batches drift on style.
- Do not assemble a spritesheet by pasting single-frame generations with a
  script. Each cell in the sheet must come from the same image-generation pass
  so that style, scale, and lighting stay consistent. `prepare-spritesheet`
  will reject sheets whose adjacent cells are pixel-identical.
- If transparent output fails, switch to the chroma-key prompt once. Do not
  loop on either prompt — burning tokens on retries is a process smell. Stop,
  reread the prompt template, then try a different style reference.

## Production note

Save the generated source image, then run `prepare-spritesheet-sprite.mjs` to
slice cells, detect alpha (or remove chroma-key as fallback), normalize
frames, write `manifest.json`, produce `review-sheet.png`, and run
`validate-sprite-assets.mjs` before HyperFrames assembly.

Mode flags on the script:

- `--mode auto` (default): use real alpha when present, fall back to chroma-key
  otherwise.
- `--mode transparent`: require alpha, fail fast if not present.
- `--mode chroma-key`: force the legacy path.
