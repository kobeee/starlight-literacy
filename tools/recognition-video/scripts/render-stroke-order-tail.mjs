#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node tools/recognition-video/scripts/render-stroke-order-tail.mjs <tail-spec.json> [--capture]",
  );
  process.exit(2);
}

const captureFlag = args.includes("--capture");
const specPath = args.find((arg) => !arg.startsWith("--"));
const spec = readJson(specPath);
if (!spec) {
  console.error(`Cannot read tail-spec at ${specPath}.`);
  process.exit(1);
}

if (spec.schemaVersion !== "recognition-video-tail-spec/v1") {
  console.error(`Unexpected tail-spec schemaVersion "${spec.schemaVersion}".`);
  process.exit(1);
}

const specDir = dirname(resolve(specPath));
const anchorsPath = resolve(specDir, spec.anchorsRef.path);
const anchors = readJson(anchorsPath);
if (!anchors) {
  console.error(`Cannot read anchors at ${anchorsPath}.`);
  process.exit(1);
}
if (anchors.schemaVersion !== "recognition-video-mizige-anchors/v1") {
  console.error(`Unexpected anchors schemaVersion "${anchors.schemaVersion}".`);
  process.exit(1);
}

const compositionPath = resolve(specDir, spec.outputs.composition);
const finalFramePngPath = resolve(specDir, spec.outputs.finalFramePng);
const domProbePath = resolve(specDir, spec.outputs.domProbeJson);

ensureDir(compositionPath);
ensureDir(finalFramePngPath);
ensureDir(domProbePath);

const html = renderTailHtml({ spec, anchors });
writeFileSync(compositionPath, html, "utf8");
console.log(`[render-tail] composition -> ${relative(process.cwd(), compositionPath)}`);

if (captureFlag) {
  await capture({ spec, anchors, compositionPath, finalFramePngPath, domProbePath });
} else {
  const stubProbe = buildProbeStub({ spec, anchors, status: "not-captured" });
  writeFileSync(domProbePath, `${JSON.stringify(stubProbe, null, 2)}\n`, "utf8");
  console.log(`[render-tail] dom-probe (stub) -> ${relative(process.cwd(), domProbePath)}`);
  console.log("[render-tail] note: re-run with --capture to record the headless final-frame PNG and live DOM probe.");
}

function renderTailHtml({ spec, anchors }) {
  const totalSeconds = anchors.timing.totalDurationSeconds;
  const transitionSeconds = anchors.timing.recognitionToWritingTransitionSeconds;
  const finalHold = anchors.timing.finalHoldSeconds;
  const writingDuration = anchors.timing.writingDurationSeconds;
  const writingStart = transitionSeconds;
  const writingEnd = writingStart + writingDuration;

  const strokesJson = JSON.stringify(spec.strokeOrder, null, 2);
  const anchorsJson = JSON.stringify(
    {
      mizige: anchors.mizige,
      glyph: anchors.glyph,
      hand: anchors.hand,
      lighting: anchors.lighting,
      supportedStrokeDirections: anchors.supportedStrokeDirections,
      domProbe: anchors.domProbe,
      clearingContract: anchors.clearingContract,
    },
    null,
    2,
  );
  const clearLayerIds = JSON.stringify(spec.transition.clearLayerIds);
  const targetChar = spec.targetCharacter;
  const writingOpacity = spec.container.writingOpacity;
  const recognitionOpacity = spec.container.recognitionOpacity;
  const frameWidth = anchors.frame.widthPx;
  const frameHeight = anchors.frame.heightPx;
  const mizigeSize = anchors.mizige.sizePx;
  const mizigeCenterX = anchors.mizige.centerXPx;
  const mizigeCenterY = anchors.mizige.centerYPx;
  const glyphCenterX = anchors.glyph.boxCenterXPx;
  const glyphCenterY = anchors.glyph.boxCenterYPx;
  const glyphFontSize = Math.round(anchors.glyph.boxSizePx * 0.86);

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>Stroke-Order Tail · ${spec.characterId}</title>
<style>
  :root {
    --mizige-opacity: ${recognitionOpacity};
    --tail-duration: ${totalSeconds}s;
    --transition-duration: ${transitionSeconds}s;
    --writing-duration: ${writingDuration}s;
    --final-hold: ${finalHold}s;
  }
  html, body { margin: 0; padding: 0; background: #000; }
  #stroke-order-tail {
    position: relative;
    width: ${frameWidth}px;
    height: ${frameHeight}px;
    background: ${anchors.background.color};
    overflow: hidden;
    font-family: ${anchors.glyph.fontFamily};
  }
  #mizige {
    position: absolute;
    left: ${mizigeCenterX - mizigeSize / 2}px;
    top: ${mizigeCenterY - mizigeSize / 2}px;
    width: ${mizigeSize}px;
    height: ${mizigeSize}px;
    opacity: var(--mizige-opacity);
    transition: opacity var(--transition-duration) ease;
  }
  #mizige svg { width: 100%; height: 100%; display: block; }
  #glyph-kaiti {
    position: absolute;
    left: ${glyphCenterX}px;
    top: ${glyphCenterY}px;
    transform: translate(-50%, -50%);
    color: ${anchors.glyph.color};
    font-size: ${glyphFontSize}px;
    line-height: 1;
    font-weight: 400;
    user-select: none;
    pointer-events: none;
  }
  #stroke-mask-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .stroke-mask {
    position: absolute;
    left: ${glyphCenterX}px;
    top: ${glyphCenterY}px;
    transform: translate(-50%, -50%);
    width: ${anchors.glyph.boxSizePx}px;
    height: ${anchors.glyph.boxSizePx}px;
    background: ${anchors.background.color};
    opacity: 1;
  }
  .stroke-mask.cleared { opacity: 0; }
  #hand {
    position: absolute;
    right: 60px;
    bottom: 40px;
    width: 320px;
    height: 280px;
    filter: drop-shadow(0 ${anchors.lighting.shadowBlurPx}px ${anchors.lighting.shadowBlurPx}px rgba(40, 28, 12, 0.18));
    opacity: 0;
    transition: opacity 0.6s ease;
  }
  #hand.entered { opacity: 1; }
  #lighting-tint {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 90% 10%, ${anchors.lighting.warmTint}33 0%, transparent 55%);
    pointer-events: none;
  }
  /* Cinematic-body layers that MUST be cleared before the tail enters.
     Rendered as empty placeholders here so the DOM probe can verify their absence. */
  .cinematic-body-layer {
    position: absolute;
    inset: 0;
    display: none;
  }
</style>
</head>
<body>
<div id="stroke-order-tail"
     data-character-id="${spec.characterId}"
     data-target-character="${targetChar}"
     data-tail-state="recognition"
     data-mizige-state="recognition">
  <!-- Cinematic-body layer slots. The tail asserts these have been removed/marked. -->
  <div id="ink-glyph-bleed-layer" class="cinematic-body-layer" data-removed="true"></div>
  <div id="light-band-layer" class="cinematic-body-layer" data-removed="true"></div>
  <div id="phrase-bridge-layer" class="cinematic-body-layer" data-removed="true"></div>

  <div id="mizige">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="0.5" y="0.5" width="99" height="99" fill="none"
            stroke="${anchors.mizige.strokeColor}" stroke-width="${anchors.mizige.strokeWidthPx}" />
      <line x1="0" y1="50" x2="100" y2="50"
            stroke="${anchors.mizige.strokeColor}" stroke-width="${anchors.mizige.strokeWidthPx}"
            stroke-dasharray="2 2" />
      <line x1="50" y1="0" x2="50" y2="100"
            stroke="${anchors.mizige.strokeColor}" stroke-width="${anchors.mizige.strokeWidthPx}"
            stroke-dasharray="2 2" />
      <line x1="0" y1="0" x2="100" y2="100"
            stroke="${anchors.mizige.strokeColor}" stroke-width="${anchors.mizige.strokeWidthPx}"
            stroke-dasharray="2 2" />
      <line x1="100" y1="0" x2="0" y2="100"
            stroke="${anchors.mizige.strokeColor}" stroke-width="${anchors.mizige.strokeWidthPx}"
            stroke-dasharray="2 2" />
    </svg>
  </div>

  <div id="glyph-kaiti">${targetChar}</div>

  <div id="stroke-mask-layer">
    ${spec.strokeOrder
      .map(
        (stroke) => `<div class="stroke-mask" data-stroke-index="${stroke.index}" data-direction="${stroke.directionCode}"></div>`,
      )
      .join("\n    ")}
  </div>

  <div id="lighting-tint"></div>

  <div id="hand" aria-hidden="true">
    <svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 250 C 80 200, 120 150, 180 110 L 220 90 L 240 100 C 250 130, 240 160, 210 180 L 160 220 C 130 240, 90 260, 40 250 Z"
            fill="#f4c79a" stroke="#8a5a35" stroke-width="2" />
    </svg>
  </div>
</div>

<script>
  const STROKES = ${strokesJson};
  const ANCHORS = ${anchorsJson};
  const CLEAR_LAYER_IDS = ${clearLayerIds};
  const RECOGNITION_OPACITY = ${recognitionOpacity};
  const WRITING_OPACITY = ${writingOpacity};
  const TRANSITION_DURATION = ${transitionSeconds};
  const WRITING_START = ${writingStart};
  const WRITING_END = ${writingEnd};
  const TOTAL_DURATION = ${totalSeconds};

  const root = document.getElementById("stroke-order-tail");

  function setState(state) {
    root.dataset.tailState = state;
    root.dataset.mizigeState = state;
    root.style.setProperty("--mizige-opacity", state === "writing" ? WRITING_OPACITY : RECOGNITION_OPACITY);
  }

  function clearLayer(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.removed = "true";
    el.style.display = "none";
  }

  function clearStrokeMask(stroke) {
    const mask = document.querySelector(\`.stroke-mask[data-stroke-index="\${stroke.index}"]\`);
    if (!mask) return;
    const direction = ANCHORS.supportedStrokeDirections[directionName(stroke.directionCode)];
    const angle = stroke.maskGradientOverrideDeg ?? direction?.maskGradientAngleDeg ?? 90;
    const duration = Math.max(0.2, stroke.phaseEndSeconds - stroke.phaseStartSeconds);
    mask.style.transition = \`mask-position \${duration}s ease, opacity \${duration}s ease\`;
    mask.style.webkitMaskImage = mask.style.maskImage = \`linear-gradient(\${angle}deg, transparent 0%, #000 100%)\`;
    mask.style.webkitMaskSize = mask.style.maskSize = "200% 200%";
    mask.style.webkitMaskPosition = mask.style.maskPosition = "100% 0%";
    requestAnimationFrame(() => {
      mask.style.webkitMaskPosition = mask.style.maskPosition = "0% 0%";
      mask.classList.add("cleared");
    });
  }

  function directionName(code) {
    for (const [name, value] of Object.entries(ANCHORS.supportedStrokeDirections)) {
      if (value.code === code) return name;
    }
    return null;
  }

  function start() {
    setState("recognition");

    CLEAR_LAYER_IDS.forEach(clearLayer);

    setTimeout(() => setState("writing"), TRANSITION_DURATION * 1000);

    STROKES.forEach((stroke) => {
      setTimeout(() => clearStrokeMask(stroke), stroke.phaseStartSeconds * 1000);
    });

    const handEntryAt = WRITING_END - 0.3;
    setTimeout(() => document.getElementById("hand").classList.add("entered"), Math.max(0, handEntryAt * 1000));
  }

  window.__starlightTail = {
    spec: { characterId: ${JSON.stringify(spec.characterId)}, totalDuration: TOTAL_DURATION },
    forwardToFinalFrame() {
      setState("writing");
      CLEAR_LAYER_IDS.forEach(clearLayer);
      STROKES.forEach(clearStrokeMask);
      document.getElementById("hand").classList.add("entered");
    },
    probe() {
      const probe = ANCHORS.domProbe;
      const root = document.querySelector(probe.selector);
      const requiredAttrsOk = Object.entries(probe.requiredAttributes).every(([attr, value]) => {
        return root?.getAttribute(attr) === value;
      });
      const forbiddenHits = probe.forbiddenSelectors
        .map((sel) => ({ sel, present: Boolean(document.querySelector(sel)) }))
        .filter((entry) => entry.present);
      return {
        selector: probe.selector,
        rootFound: Boolean(root),
        requiredAttrsOk,
        attrs: Object.fromEntries(Object.keys(probe.requiredAttributes).map((attr) => [attr, root?.getAttribute(attr) ?? null])),
        forbiddenHits,
        passed: Boolean(root) && requiredAttrsOk && forbiddenHits.length === 0,
      };
    },
  };

  if (!new URLSearchParams(location.search).has("freeze")) {
    start();
  } else {
    window.__starlightTail.forwardToFinalFrame();
  }
</script>
</body>
</html>
`;
}

async function capture({ spec, anchors, compositionPath, finalFramePngPath, domProbePath }) {
  let headless;
  try {
    headless = await import(pathToFileURL(resolve("scripts/lib/h5-headless.mjs")).href);
  } catch (error) {
    console.error(`[render-tail] capture failed to load headless lib: ${error.message}`);
    writeFileSync(
      domProbePath,
      `${JSON.stringify(buildProbeStub({ spec, anchors, status: "capture-failed", reason: error.message }), null, 2)}\n`,
      "utf8",
    );
    process.exit(1);
  }

  const { launchHeadless, openPage, navigate, evaluate, screenshot, wait } = headless;
  const viewport = { width: anchors.frame.widthPx, height: anchors.frame.heightPx, deviceScaleFactor: 1, mobile: false, touch: false };
  const profileBase = resolve(".cache/chrome-profile-stroke-order-tail");
  ensureDir(`${profileBase}/_dummy`);
  const launched = await launchHeadless({ viewport, profileBase });
  try {
    const page = await openPage({ browserWsUrl: launched.browserWsUrl, viewport });
    const url = `${pathToFileURL(compositionPath).href}?freeze=1`;
    await navigate(page.cdp, url, 600);
    await wait(400);
    const probe = await evaluate(page.cdp, "window.__starlightTail.probe()");
    writeFileSync(domProbePath, `${JSON.stringify(buildProbeReport({ spec, anchors, probe }), null, 2)}\n`, "utf8");
    console.log(`[render-tail] dom-probe -> ${relative(process.cwd(), domProbePath)}  passed=${probe.passed}`);

    const png = await screenshot(page.cdp);
    writeFileSync(finalFramePngPath, png);
    console.log(`[render-tail] final-frame -> ${relative(process.cwd(), finalFramePngPath)}  bytes=${png.length}`);

    if (!probe.passed) {
      console.error("[render-tail] DOM probe failed — see domProbeJson for details.");
      process.exit(1);
    }
  } finally {
    try {
      launched.chrome?.kill?.();
    } catch {}
  }
}

function buildProbeStub({ spec, anchors, status, reason }) {
  return {
    schemaVersion: "recognition-video-tail-dom-probe/v1",
    characterId: spec.characterId,
    status,
    reason: reason || null,
    expectedRequiredAttributes: anchors.domProbe.requiredAttributes,
    expectedForbiddenSelectors: anchors.domProbe.forbiddenSelectors,
    expectedClearLayerIds: anchors.clearingContract.mustClearLayerIds,
    note: "Re-run render-stroke-order-tail.mjs with --capture to record live probe results.",
  };
}

function buildProbeReport({ spec, anchors, probe }) {
  return {
    schemaVersion: "recognition-video-tail-dom-probe/v1",
    characterId: spec.characterId,
    status: probe.passed ? "passed" : "failed",
    selector: probe.selector,
    rootFound: probe.rootFound,
    requiredAttrsOk: probe.requiredAttrsOk,
    actualAttrs: probe.attrs,
    forbiddenHits: probe.forbiddenHits,
    expectedClearLayerIds: anchors.clearingContract.mustClearLayerIds,
  };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Cannot parse JSON ${path}: ${error.message}`);
    return null;
  }
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}
