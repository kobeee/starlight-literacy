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
  screenshot,
  resetStorage,
  wait
} from "./lib/h5-headless.mjs";

const OUT_DIR = process.env.STARLIGHT_H5_VIEWPORT_DIR || "/tmp/starlight-mobile-h5-viewport";

const VIEWPORTS = [
  { id: "iphone-se", width: 375, height: 667, deviceScaleFactor: 1, mobile: true },
  { id: "iphone-12", width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
  { id: "iphone-max", width: 414, height: 896, deviceScaleFactor: 1, mobile: true },
  { id: "ipad-portrait", width: 768, height: 1024, deviceScaleFactor: 1, mobile: true }
];

const FLOW = [
  {
    id: "01-home",
    label: "P01 学习地图",
    enter: async (cdp) => {
      await resetStorage(cdp);
      await wait(400);
    },
    requireSelectors: [".home", ".home-action-panel__button"]
  },
  {
    id: "02-unit",
    label: "P02 单元入口",
    enter: async (cdp) => {
      await click(cdp, ".home-action-panel__button");
      await wait(400);
    },
    requireSelectors: [".unit-page", '[data-action="start-learning"]']
  },
  {
    id: "03-recognize",
    label: "P03 认字页",
    enter: async (cdp) => {
      await click(cdp, '[data-action="start-learning"]');
      await wait(900);
    },
    requireSelectors: ['[data-action="to-write"]']
  },
  {
    id: "04-write",
    label: "P04 写字页",
    enter: async (cdp) => {
      await click(cdp, '[data-action="to-write"]');
      await wait(400);
    },
    requireSelectors: [".writing-pad"]
  },
  {
    id: "05-practice",
    label: "P05 单字速练",
    enter: async (cdp) => {
      const hasSkip = await exists(cdp, '[data-action="skip-writing"]');
      if (hasSkip) await click(cdp, '[data-action="skip-writing"]');
      await wait(900);
    },
    requireSelectors: ['[data-action="answer-question"]']
  },
  {
    id: "06-parent",
    label: "P11 家长中心",
    enter: async (cdp) => {
      await navigate(cdp, DEFAULT_APP_URL, 500);
      await click(cdp, '[data-action="open-verify"]');
      await wait(200);
      await click(cdp, '[data-key="8"]');
      await click(cdp, '[data-action="verify-submit"]');
      await wait(500);
    },
    requireSelectors: [".parent-page", ".evidence-timeline"]
  }
];

if (!(await isServerReachable(DEFAULT_APP_URL))) {
  console.error(`Mobile H5 dev server not reachable at ${DEFAULT_APP_URL}.`);
  console.error("Start it first with: npm run dev:h5");
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const report = {
  appUrl: DEFAULT_APP_URL,
  outputDir: OUT_DIR,
  viewports: [],
  failures: []
};

for (const viewport of VIEWPORTS) {
  const viewportDir = join(OUT_DIR, viewport.id);
  await mkdir(viewportDir, { recursive: true });
  const profileBase = join(OUT_DIR, `chrome-profile-${viewport.id}`);
  const { chrome, browserWsUrl } = await launchHeadless({ viewport, profileBase });
  const summary = { id: viewport.id, width: viewport.width, height: viewport.height, steps: [], consoleIssues: [] };

  try {
    const { cdp, logs, client } = await openPage({ browserWsUrl, viewport });
    await navigate(cdp, DEFAULT_APP_URL, 800);

    for (const step of FLOW) {
      try {
        await step.enter(cdp);
        await wait(200);
        for (const selector of step.requireSelectors) {
          const present = await exists(cdp, selector);
          if (!present) {
            const message = `${viewport.id} / ${step.id}: required selector missing: ${selector}`;
            summary.steps.push({ id: step.id, ok: false, reason: message });
            report.failures.push(message);
            continue;
          }
        }
        const png = await screenshot(cdp);
        await writeFile(join(viewportDir, `${step.id}.png`), png);
        summary.steps.push({ id: step.id, ok: true });
      } catch (error) {
        const message = `${viewport.id} / ${step.id}: ${error.message}`;
        summary.steps.push({ id: step.id, ok: false, reason: message });
        report.failures.push(message);
      }
    }

    summary.consoleIssues = logs;
    if (logs.some((entry) => entry.type === "error")) {
      report.failures.push(`${viewport.id}: console errors detected (${logs.filter((l) => l.type === "error").length}).`);
    }
    await client.close();
  } finally {
    chrome.kill();
  }

  report.viewports.push(summary);
}

await writeFile(join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
const passed = report.failures.length === 0;
console.log(JSON.stringify({ ok: passed, viewports: report.viewports.length, failures: report.failures.length, outputDir: OUT_DIR }, null, 2));

if (!passed) {
  console.error("\nFailures:");
  for (const failure of report.failures) console.error(`  - ${failure}`);
  process.exit(1);
}
