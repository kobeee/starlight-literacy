import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_APP_URL,
  isServerReachable,
  launchHeadless,
  openPage,
  navigate,
  evaluate,
  click,
  exists,
  resetStorage,
  screenshot,
  wait
} from "./lib/h5-headless.mjs";

const OUT_DIR = process.env.STARLIGHT_H5_RUNTIME_DIR || "/tmp/starlight-mobile-h5-runtime";
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };
const STEP_MAX_MS = 8000;

if (!(await isServerReachable(DEFAULT_APP_URL))) {
  console.error(`Mobile H5 dev server not reachable at ${DEFAULT_APP_URL}.`);
  console.error("Start it first with: npm run dev:h5");
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
const profileBase = join(OUT_DIR, "chrome-profile");
const { chrome, browserWsUrl } = await launchHeadless({ viewport: VIEWPORT, profileBase });

const result = {
  appUrl: DEFAULT_APP_URL,
  steps: [],
  consoleIssues: [],
  failures: []
};

try {
  const { cdp, logs, client } = await openPage({ browserWsUrl, viewport: VIEWPORT });
  await navigate(cdp, DEFAULT_APP_URL, 700);
  await resetStorage(cdp);
  await wait(400);

  await runStep("home-rendered", () => exists(cdp, ".home-action-panel__button"));
  await runStep("home-fab-treasure", () => exists(cdp, ".map-top-btn--treasure"));
  await runStep("home-fab-parent", () => exists(cdp, ".map-top-btn--parent"));

  await runStep("first-guide-shown", async () => {
    if (!(await exists(cdp, ".first-guide"))) throw new Error("first-guide did not show after reset");
    const buf = await screenshot(cdp);
    await writeFile(join(OUT_DIR, "first-guide.png"), buf);
    return true;
  });

  await runStep("first-guide-dismiss", async () => {
    await click(cdp, '[data-action="dismiss-first-guide"]');
    await wait(220);
    if (await exists(cdp, ".first-guide")) throw new Error("first-guide did not dismiss after CTA");
    return true;
  });

  await runStep("open-unit", async () => {
    await click(cdp, ".home-action-panel__button");
    await wait(400);
    return exists(cdp, ".unit-page");
  });

  await runStep("start-learning", async () => {
    await click(cdp, '[data-action="start-learning"]');
    await wait(900);
    return exists(cdp, '[data-action="to-write"]');
  });

  await runStep("speak-current", async () => {
    const hasSpeak = await exists(cdp, '[data-action="speak-current"]');
    if (hasSpeak) await click(cdp, '[data-action="speak-current"]');
    return true;
  });

  await runStep("to-write", async () => {
    await click(cdp, '[data-action="to-write"]');
    await wait(400);
    return exists(cdp, ".writing-pad");
  });

  await runStep("skip-writing", async () => {
    const hasSkip = await exists(cdp, '[data-action="skip-writing"]');
    if (hasSkip) {
      await click(cdp, '[data-action="skip-writing"]');
      await wait(900);
    }
    return exists(cdp, '[data-action="answer-question"]');
  });

  await runStep("wrong-answer-replay", async () => {
    const picked = await evaluate(cdp, `(() => {
      const targetChar = document.querySelector('.quiz-art__glyph')?.textContent?.trim()
        || document.querySelector('.audio-card span')?.textContent?.trim();
      const cards = [...document.querySelectorAll('[data-action="answer-question"]')];
      const wrong = cards.find((c) => {
        const ch = c.querySelector('.answer-card__scene strong')?.textContent?.trim();
        return ch && ch !== targetChar;
      });
      if (!wrong) return false;
      wrong.click();
      return true;
    })()`);
    if (!picked) throw new Error("no wrong-answer card found");
    await wait(260);
    const shown = await exists(cdp, ".replay-card");
    if (!shown) return false;
    const buf = await screenshot(cdp);
    await writeFile(join(OUT_DIR, "wrong-answer-replay.png"), buf);
    return true;
  });

  await runStep("replay-auto-dismiss", async () => {
    await wait(3200);
    const stillThere = await exists(cdp, ".replay-card");
    if (stillThere) throw new Error("replay-card did not auto-dismiss");
    return true;
  });

  await runStep("answer-question", async () => {
    await evaluate(cdp, `
      const btn = document.querySelector('[data-action="answer-question"]');
      if (!btn) throw new Error('no answer button');
      btn.click();
    `);
    await wait(700);
    return true;
  });

  await runStep("practice-correct-into-review", async () => {
    if (await exists(cdp, ".replay-card")) await wait(3300);
    const onPractice = await exists(cdp, ".question-shell--evidence");
    if (!onPractice) return true;
    const picked = await evaluate(cdp, `(() => {
      const targetChar = document.querySelector('.quiz-art__glyph')?.textContent?.trim()
        || document.querySelector('.audio-card span')?.textContent?.trim();
      const cards = [...document.querySelectorAll('[data-action="answer-question"]')];
      const correct = cards.find((c) => {
        const ch = c.querySelector('.answer-card__scene strong')?.textContent?.trim();
        return ch && ch === targetChar;
      });
      if (!correct) return false;
      correct.click();
      return true;
    })()`);
    if (!picked) return true;
    await wait(280);
    if (!(await exists(cdp, '[data-action="practice-next"]'))) return true;
    await click(cdp, '[data-action="practice-next"]');
    await wait(320);
    const shown = await exists(cdp, ".micro-review");
    if (!shown) throw new Error("micro-review did not show after practice-next");
    const buf = await screenshot(cdp);
    await writeFile(join(OUT_DIR, "micro-review.png"), buf);
    await click(cdp, '[data-action="micro-review-next"]');
    await wait(420);
    if (await exists(cdp, ".micro-review")) throw new Error("micro-review did not dismiss after cta");
    return true;
  });

  await runStep("open-parent", async () => {
    await navigate(cdp, DEFAULT_APP_URL, 500);
    await click(cdp, '[data-action="open-verify"]');
    await wait(200);
    await click(cdp, '[data-key="8"]');
    await click(cdp, '[data-action="verify-submit"]');
    await wait(500);
    return exists(cdp, ".parent-page");
  });

  await runStep("open-treasure", async () => {
    await navigate(cdp, DEFAULT_APP_URL, 500);
    await click(cdp, ".map-top-btn--treasure");
    await wait(400);
    return exists(cdp, ".treasure-page");
  });

  result.consoleIssues = logs;
  const errorCount = logs.filter((entry) => entry.type === "error").length;
  if (errorCount > 0) {
    result.failures.push(`Console errors detected: ${errorCount}.`);
  }

  await client.close();
} catch (error) {
  result.failures.push(`Runtime crash: ${error.message}`);
} finally {
  chrome.kill();
}

await writeFile(join(OUT_DIR, "report.json"), `${JSON.stringify(result, null, 2)}\n`);

const ok = result.failures.length === 0 && result.steps.every((step) => step.ok);
console.log(JSON.stringify({
  ok,
  steps: result.steps.length,
  failures: result.failures.length,
  outputDir: OUT_DIR
}, null, 2));

if (!ok) {
  console.error("\nFailures:");
  for (const failure of result.failures) console.error(`  - ${failure}`);
  for (const step of result.steps) {
    if (!step.ok) console.error(`  - step ${step.id}: ${step.reason}`);
  }
  process.exit(1);
}

async function runStep(id, fn) {
  const startedAt = Date.now();
  try {
    const ok = Boolean(await withTimeout(fn(), STEP_MAX_MS, id));
    result.steps.push({ id, ok, ms: Date.now() - startedAt });
    if (!ok) result.failures.push(`Step "${id}" returned false.`);
  } catch (error) {
    result.steps.push({ id, ok: false, reason: error.message, ms: Date.now() - startedAt });
    result.failures.push(`Step "${id}": ${error.message}`);
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`step "${label}" timed out after ${ms}ms`)), ms))
  ]);
}
