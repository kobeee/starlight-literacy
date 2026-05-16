import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const APP_URL = process.env.STARLIGHT_H5_URL || "http://127.0.0.1:4173/src/clients/mobile-h5/";
const OUT_DIR = process.env.STARLIGHT_H5_AUDIT_DIR || "/tmp/starlight-mobile-h5-audit";
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1 };
const STORAGE_KEY = "starlight-literacy-mobile-h5-v1";

const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Users/elvis/.cache/puppeteer/chrome-headless-shell/mac-131.0.6778.204/chrome-headless-shell-mac-x64/chrome-headless-shell",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);

const availableChromeCandidates = chromeCandidates.filter((candidate) => existsSync(candidate));
if (availableChromeCandidates.length === 0) {
  throw new Error("No Chrome binary found. Set CHROME_BIN to a headless-capable Chrome executable.");
}

await mkdir(OUT_DIR, { recursive: true });
await mkdir(join(OUT_DIR, "chrome-profile"), { recursive: true });

const launched = await launchChrome();
const { chrome, browserWsUrl } = launched;

try {
  const client = await createCdpClient(browserWsUrl);
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  const cdp = (method, params = {}) => client.send(method, params, sessionId);
  const logs = [];

  client.onMessage((message) => {
    if (message.sessionId !== sessionId) return;
    if (message.method === "Runtime.consoleAPICalled") {
      const type = message.params.type;
      if (type === "error" || type === "warning") {
        logs.push({
          type,
          text: message.params.args.map((arg) => arg.value || arg.description || "").join(" ")
        });
      }
    }
    if (message.method === "Log.entryAdded") {
      const level = message.params.entry.level;
      if (level === "error" || level === "warning") {
        logs.push({
          type: level,
          text: message.params.entry.text
        });
      }
    }
  });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Log.enable");
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    mobile: true
  });
  await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });

  await navigate(cdp, APP_URL);
  await evaluate(cdp, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); location.reload();`);
  await wait(700);
  await screenshot(cdp, "01-home.png");

  await click(cdp, ".home-action-panel__button");
  await wait(300);
  await screenshot(cdp, "02-unit.png");

  await click(cdp, '[data-action="start-learning"]');
  await wait(1200);
  await screenshot(cdp, "03-recognize-yi.png");

  await click(cdp, '[data-action="to-write"]');
  await wait(300);
  await screenshot(cdp, "04-write-yi.png");

  await click(cdp, '[data-action="skip-writing"]');
  await wait(1200);
  await screenshot(cdp, "05-practice-yi.png");

  await seedProgress(cdp, ["yi", "er", "san"], 8);
  await wait(700);
  await click(cdp, '[data-action="open-verify"]');
  await wait(180);
  await click(cdp, '[data-key="8"]');
  await click(cdp, '[data-action="verify-submit"]');
  await wait(300);
  await screenshot(cdp, "06-parent-proof.png");

  const report = {
    appUrl: APP_URL,
    outputDir: OUT_DIR,
    viewport: VIEWPORT,
    consoleIssues: logs
  };
  await writeFile(join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await client.close();
} finally {
  chrome.kill();
}

async function launchChrome() {
  const failures = [];
  for (const chromeBin of availableChromeCandidates) {
    const result = await tryLaunchChrome(chromeBin);
    if (result.browserWsUrl) return result;
    failures.push(result.failure);
  }
  throw new Error(`Could not start a Chrome DevTools endpoint.\n\n${failures.join("\n\n")}`);
}

function tryLaunchChrome(chromeBin) {
  const profileDir = join(OUT_DIR, `chrome-profile-${sanitizeName(chromeBin)}`);
  const chrome = spawn(chromeBin, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileDir}`,
    "--remote-debugging-port=0",
    "--remote-debugging-address=127.0.0.1",
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let stderr = "";
  let stdout = "";
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const fail = (message) => {
      finish({
        chrome,
        failure: `${message}\nChrome: ${chromeBin}\nstdout:\n${stdout || "(empty)"}\nstderr:\n${stderr || "(empty)"}`
      });
    };
    const timer = setTimeout(() => fail("Timed out waiting for Chrome DevTools endpoint."), 20000);
    const readEndpoint = () => {
      const match = `${stderr}\n${stdout}`.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        finish({ chrome, browserWsUrl: match[1] });
      }
    };
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      readEndpoint();
    });
    chrome.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      readEndpoint();
    });
    chrome.on("error", (error) => fail(`Chrome failed to start: ${error.message}`));
    chrome.on("exit", (code, signal) => {
      if (settled || stderr.includes("DevTools listening")) return;
      fail(`Chrome exited before DevTools endpoint. code=${code ?? "null"} signal=${signal ?? "null"}`);
    });
  });
}

function sanitizeName(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(-72);
}

async function navigate(cdp, url) {
  await cdp("Page.navigate", { url });
  await wait(700);
}

async function click(cdp, selector) {
  const expression = `
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) throw new Error(${JSON.stringify(`Missing selector: ${selector}`)});
      node.click();
      return true;
    })()
  `;
  await evaluate(cdp, expression);
}

async function seedProgress(cdp, learnedIds, minutesAgo) {
  const characters = Object.fromEntries(learnedIds.map((id, index) => {
    const at = Date.now() - (minutesAgo * 60000) + (index * 1000);
    return [id, {
      seenAt: at,
      tracedAt: at + 300,
      recognizedAt: at + 600
    }];
  }));
  const progress = {
    schemaVersion: 3,
    characters,
    learnedIds,
    correctAnswers: learnedIds.length,
    totalAnswers: learnedIds.length,
    bestScore: 0,
    bestStars: 0,
    paidIntent: false,
    startedAt: Date.now() - minutesAgo * 60000,
    dayKey: localDayKey(),
    lastActiveDayKey: localDayKey(),
    shareSaved: false
  };
  await evaluate(cdp, `
    localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(progress))});
    location.reload();
  `);
}

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function evaluate(cdp, expression) {
  const result = await cdp("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "Runtime.evaluate failed");
  }
  return result.result.value;
}

async function screenshot(cdp, name) {
  const result = await cdp("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(join(OUT_DIR, name), Buffer.from(result.data, "base64"));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createCdpClient(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
      return;
    }
    listeners.forEach((listener) => listener(message));
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}, sessionId) {
          const id = nextId++;
          const message = { id, method, params };
          if (sessionId) message.sessionId = sessionId;
          ws.send(JSON.stringify(message));
          return new Promise((sendResolve, sendReject) => {
            pending.set(id, { resolve: sendResolve, reject: sendReject });
            setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                sendReject(new Error(`CDP command timed out: ${method}`));
              }
            }, 10000);
          });
        },
        onMessage(listener) {
          listeners.add(listener);
        },
        close() {
          ws.close();
        }
      });
    });
    ws.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools.")));
  });
}
