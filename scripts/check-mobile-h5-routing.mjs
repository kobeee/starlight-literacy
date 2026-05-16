import { readFile } from "node:fs/promises";

const APP_PATH = "src/clients/mobile-h5/app.js";
const USER_FLOW_PATH = "knowledge-base/01-产品设计/USER_FLOW.md";

const EXPECTED_ROUTES = new Set([
  "home",
  "unit",
  "recognize",
  "write",
  "practice",
  "groupQuiz",
  "unitTest",
  "result",
  "celebrate",
  "treasure",
  "parent",
  "payment"
]);

const EXPECTED_ACTIONS = new Set([
  "open-unit",
  "open-treasure",
  "open-verify",
  "go-payment",
  "locked",
  "go",
  "start-learning",
  "to-write",
  "skip-writing",
  "practice-next",
  "review-current",
  "retry-test",
  "verify-key",
  "verify-submit",
  "close-verify",
  "choose-pay",
  "confirm-pay",
  "save-share",
  "copy-link",
  "jump-char",
  "speak-current",
  "replay-recognition",
  "touch-world",
  "speak-question",
  "answer-question",
  "writing-pad",
  "reset-writing",
  "micro-review-next",
  "dismiss-recovery-banner",
  "dismiss-first-guide"
]);

const failures = [];

const source = await readFile(APP_PATH, "utf8");
const routeBlockMatch = source.match(/function routeMarkup\(\)\s*{[\s\S]*?const routes\s*=\s*{([\s\S]*?)};/);
if (!routeBlockMatch) {
  failures.push("Could not locate routes block in app.js.");
} else {
  const routesBlock = routeBlockMatch[1];
  const declared = new Set();
  for (const match of routesBlock.matchAll(/^\s*([a-zA-Z][\w]*)\s*:\s*[a-zA-Z]/gm)) {
    declared.add(match[1]);
  }
  for (const route of EXPECTED_ROUTES) {
    if (!declared.has(route)) failures.push(`Missing route in routes table: ${route}`);
  }
  for (const route of declared) {
    if (!EXPECTED_ROUTES.has(route)) {
      failures.push(`Unknown route declared (add to whitelist or remove): ${route}`);
    }
  }
}

const actionsSeen = new Set();
for (const match of source.matchAll(/data-action="([^"]+)"/g)) {
  const raw = match[1];
  if (raw.includes("${")) {
    for (const literal of raw.matchAll(/"([a-z][\w-]*)"/gi)) actionsSeen.add(literal[1]);
    continue;
  }
  actionsSeen.add(raw);
}

for (const action of actionsSeen) {
  if (!EXPECTED_ACTIONS.has(action)) {
    failures.push(`data-action not in whitelist: ${action}`);
  }
}

const userFlowSource = await readFile(USER_FLOW_PATH, "utf8");
for (const route of EXPECTED_ROUTES) {
  if (route === "groupQuiz" || route === "unitTest" || route === "celebrate") continue;
  const docMention = userFlowSource.includes(`P0${routeToPage(route)}`) || userFlowSource.includes(`P1${routeToPage(route)}`);
  if (!docMention) {
    failures.push(`Route "${route}" maps to a page not mentioned in USER_FLOW.md`);
  }
}

if (failures.length) {
  console.error("Mobile H5 routing check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `Mobile H5 routing ok: ${EXPECTED_ROUTES.size} routes, ${actionsSeen.size} data-actions, all aligned with USER_FLOW.md.`
);

function routeToPage(route) {
  const map = {
    home: "1",
    unit: "2",
    recognize: "3",
    write: "4",
    practice: "5",
    result: "8",
    treasure: "0",
    parent: "1",
    payment: "9"
  };
  return map[route] || "";
}
