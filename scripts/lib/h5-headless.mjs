import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const DEFAULT_CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Users/elvis/.cache/puppeteer/chrome-headless-shell/mac-131.0.6778.204/chrome-headless-shell-mac-x64/chrome-headless-shell",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);

export const DEFAULT_APP_URL =
  process.env.STARLIGHT_H5_URL || "http://127.0.0.1:4173/src/clients/mobile-h5/";
export const STORAGE_KEY = "starlight-literacy-mobile-h5-v1";

export function resolveChromeBinaries(extraCandidates = []) {
  const all = [...DEFAULT_CHROME_CANDIDATES, ...extraCandidates];
  const found = all.filter((candidate) => candidate && existsSync(candidate));
  if (found.length === 0) {
    throw new Error("No Chrome binary found. Set CHROME_BIN to a headless-capable Chrome executable.");
  }
  return found;
}

export async function launchHeadless({ viewport, profileBase }) {
  const binaries = resolveChromeBinaries();
  const failures = [];
  for (const chromeBin of binaries) {
    const result = await tryLaunchChrome({ chromeBin, viewport, profileBase });
    if (result.browserWsUrl) return { ...result, chromeBin };
    failures.push(result.failure);
  }
  throw new Error(`Could not start a Chrome DevTools endpoint.\n\n${failures.join("\n\n")}`);
}

function tryLaunchChrome({ chromeBin, viewport, profileBase }) {
  const profileDir = `${profileBase}-${sanitizeName(chromeBin)}`;
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
    `--window-size=${viewport.width},${viewport.height}`,
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
      if (match) finish({ chrome, browserWsUrl: match[1] });
    };
    chrome.stderr.on("data", (chunk) => { stderr += chunk.toString(); readEndpoint(); });
    chrome.stdout.on("data", (chunk) => { stdout += chunk.toString(); readEndpoint(); });
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

export function createCdpClient(url) {
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
            }, 15000);
          });
        },
        onMessage(listener) { listeners.add(listener); },
        close() { ws.close(); }
      });
    });
    ws.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools.")));
  });
}

export async function openPage({ browserWsUrl, viewport }) {
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
        logs.push({ type: level, text: message.params.entry.text });
      }
    }
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      logs.push({
        type: "error",
        text: details.exception?.description || details.text || "uncaught exception"
      });
    }
  });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Log.enable");
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    mobile: viewport.mobile !== false
  });
  await cdp("Emulation.setTouchEmulationEnabled", { enabled: viewport.touch !== false });

  return { cdp, logs, client };
}

export async function navigate(cdp, url, settleMs = 700) {
  await cdp("Page.navigate", { url });
  await wait(settleMs);
}

export async function evaluate(cdp, expression) {
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

export async function click(cdp, selector) {
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

export async function exists(cdp, selector) {
  return evaluate(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
}

export async function screenshot(cdp) {
  const result = await cdp("Page.captureScreenshot", { format: "png", fromSurface: true });
  return Buffer.from(result.data, "base64");
}

export async function resetStorage(cdp) {
  await evaluate(cdp, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); location.reload();`);
  await wait(800);
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isServerReachable(url, timeoutMs = 2000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok || response.status === 200 || response.status === 302;
  } catch {
    return false;
  }
}
