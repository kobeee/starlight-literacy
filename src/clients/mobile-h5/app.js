import { teaserUnit, unit01 } from "../../shared/unit-01.js?v=39";
import { unit01BakedAudio } from "../../shared/unit-01-baked-audio.js?v=39";
import { unit01VisualAssets } from "../../shared/unit-01-visual-assets.js?v=39";

const GLOBAL_TOAST_COOLDOWN_MS = 5000;
let lastGlobalToastAt = 0;
function showGlobalErrorToast(title, detail) {
  const now = Date.now();
  if (now - lastGlobalToastAt < GLOBAL_TOAST_COOLDOWN_MS) return;
  lastGlobalToastAt = now;
  document.querySelectorAll(".global-toast").forEach((node) => node.remove());
  const root = document.createElement("div");
  root.className = "global-toast";
  root.setAttribute("role", "alert");
  root.setAttribute("aria-live", "assertive");
  const safeDetail = detail ? String(detail).slice(0, 280) : "";
  root.innerHTML = `
    <span class="global-toast__icon" aria-hidden="true">⚠️</span>
    <div class="global-toast__body">
      <div class="global-toast__title">${title}</div>
      <div class="global-toast__detail">${safeDetail}</div>
    </div>
    <button type="button" class="global-toast__close" aria-label="关闭">×</button>
  `;
  root.querySelector(".global-toast__close").addEventListener("click", () => root.remove());
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 6000);
}
window.addEventListener("error", (event) => {
  const message = event?.error?.message || event?.message || "未知错误";
  showGlobalErrorToast("出了点小问题，稍后重试", message);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason?.message || (typeof event?.reason === "string" ? event.reason : "未知错误");
  showGlobalErrorToast("一个动作没完成，请稍后重试", reason);
});

const app = document.querySelector("#app");
const STORAGE_KEY = "starlight-literacy-mobile-h5-v1";
const PROGRESS_SCHEMA_VERSION = 3;
const MAP_DESIGN_WIDTH = 390;
const MAP_DESIGN_HEIGHT = 1800;
const HOME_START_FOCUS_Y = 1628;
const HOME_GROUP_FOCUS_Y = {
  1: 1555,
  2: 1348,
  3: 1124,
  4: 846,
  next: 560
};

const groups = Array.from(new Set(unit01.characters.map((item) => item.group)));
const groupImages = {
  1: "../../../images/p01-start-house-large-ui-20260426.png",
  2: "../../../images/p01-start-home-entrance-ui-20260426.png",
  3: "../../../images/generated-daytime-fire-lesson.png",
  4: "../../../images/generated-daytime-result-celebration-clean.png"
};
const SPEECH_STYLE_PRESETS = {
  lesson: { rate: 0.82, pitch: 1.03, pauseScale: 1.12 },
  cue: { rate: 0.84, pitch: 1, pauseScale: 1 },
  discovery: { rate: 0.86, pitch: 1.05, pauseScale: 0.9 },
  feedback: { rate: 0.88, pitch: 1.06, pauseScale: 0.88 }
};
const SPEECH_PAUSE_MS = {
  "、": 220,
  "，": 260,
  ",": 260,
  "；": 340,
  ";": 340,
  "。": 430,
  ".": 430,
  "！": 460,
  "!": 460,
  "？": 460,
  "?": 460
};
const PREFERRED_CHINESE_VOICE_MATCHES = [
  /xiaoxiao/i,
  /xiaoyi/i,
  /yunxi/i,
  /yunyang/i,
  /yunjian/i,
  /ting[-\s]?ting/i,
  /mei[-\s]?jia/i,
  /yu[-\s]?shu/i,
  /li[-\s]?mu/i,
  /sin[-\s]?ji/i,
  /google.*(mandarin|chinese|\u666e\u901a\u8bdd)/i
];

function createDefaultProgress() {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    characters: {},
    learnedIds: [],
    correctAnswers: 0,
    totalAnswers: 0,
    bestScore: 0,
    bestStars: 0,
    paidIntent: false,
    startedAt: Date.now(),
    dayKey: todayKey(),
    shareSaved: false,
    recoveryBannerDismissedAt: 0,
    firstGuideSeen: false
  };
}

let state = {
  route: "home",
  currentIndex: 0,
  strokeDone: 0,
  question: null,
  quiz: null,
  result: null,
  feedback: "",
  selectedAnswer: "",
  showCelebration: false,
  verifyOpen: false,
  verifyInput: "",
  payChoice: "trial",
  toast: "",
  replay: null,
  microReview: null,
  progress: loadProgress()
};

let replayTimer = null;
let microReviewTimer = null;
const REPLAY_DURATION_MS = 3000;
const MICRO_REVIEW_DURATION_MS = 60000;
let lastIsUnitComplete = null;

let strokePointer = null;
let homeMapY = null;
let homeMapFocusKey = "";
let homeMapDrag = null;
let suppressHomeClickUntil = 0;
let toastTimer = null;
let transientTimer = null;
let recognitionCueTimers = [];
let speechQueueTimers = [];
let speechSequenceId = 0;
let cachedChineseVoice = null;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedChineseVoice = null;
  });
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return migrateProgress(saved);
  } catch {
    return createDefaultProgress();
  }
}

function migrateProgress(saved) {
  const defaults = createDefaultProgress();
  if (!saved || typeof saved !== "object") return defaults;

  const characters = { ...(saved.characters || {}) };
  const learnedIds = Array.isArray(saved.learnedIds) ? saved.learnedIds : [];
  learnedIds.forEach((id) => {
    characters[id] = {
      ...(characters[id] || {}),
      seenAt: characters[id]?.seenAt || saved.startedAt || Date.now(),
      tracedAt: characters[id]?.tracedAt || saved.startedAt || Date.now(),
      recognizedAt: characters[id]?.recognizedAt || saved.startedAt || Date.now()
    };
  });

  const migrated = {
    ...defaults,
    ...saved,
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    characters,
    dayKey: localDayKey(),
    lastActiveDayKey: saved.lastActiveDayKey || saved.dayKey || localDayKey(),
    startedAt: Number.isFinite(saved.startedAt) ? saved.startedAt : Date.now()
  };

  migrated.learnedIds = recognizedIdsFor(characters);
  return migrated;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function setState(patch) {
  state = { ...state, ...patch };
  render();
}

function updateProgress(patch) {
  state.progress = { ...state.progress, ...patch };
  state.progress.learnedIds = recognizedIdsFor(state.progress.characters);
  state.progress.dayKey = localDayKey();
  state.progress.lastActiveDayKey = localDayKey();
  saveProgress();
}

function currentChar() {
  return unit01.characters[state.currentIndex] || unit01.characters[0];
}

function learnedCount() {
  return recognizedItems().length;
}

function isUnitComplete() {
  return learnedCount() >= unit01.characters.length && evidenceCounts().review === 0;
}

function isUnitMastered() {
  return unit01.characters.every((item) => isMastered(item.id)) && evidenceCounts().review === 0;
}

function characterEvidence(id) {
  return state.progress.characters?.[id] || {};
}

function hasEvidence(id, key) {
  return Boolean(characterEvidence(id)[key]);
}

function isSeen(id) {
  return hasEvidence(id, "seenAt");
}

function isTraced(id) {
  return hasEvidence(id, "tracedAt");
}

function isRecognized(id) {
  return hasEvidence(id, "recognizedAt");
}

function needsReview(id) {
  return Boolean(characterEvidence(id).needsReview);
}

function isMastered(id) {
  return hasEvidence(id, "masteredAt");
}

function recognizedIdsFor(characters = {}) {
  return unit01.characters
    .filter((item) => characters[item.id]?.recognizedAt)
    .map((item) => item.id);
}

function updateCharacterEvidence(id, patch) {
  const current = state.progress.characters?.[id] || {};
  const nextCharacters = {
    ...state.progress.characters,
    [id]: { ...current, ...patch }
  };
  state.progress = {
    ...state.progress,
    characters: nextCharacters,
    learnedIds: recognizedIdsFor(nextCharacters),
    dayKey: localDayKey(),
    lastActiveDayKey: localDayKey()
  };
  saveProgress();
}

function batchUpdateCharacterEvidence(updates) {
  const nextCharacters = { ...state.progress.characters };
  updates.forEach(({ id, patch }) => {
    nextCharacters[id] = { ...(nextCharacters[id] || {}), ...patch };
  });
  updateProgress({
    characters: nextCharacters
  });
}

function markSeen(id) {
  if (isSeen(id)) return;
  updateCharacterEvidence(id, { seenAt: Date.now() });
}

function markTraced(id) {
  updateCharacterEvidence(id, {
    seenAt: characterEvidence(id).seenAt || Date.now(),
    tracedAt: Date.now()
  });
}

function markRecognized(id) {
  updateCharacterEvidence(id, {
    seenAt: characterEvidence(id).seenAt || Date.now(),
    recognizedAt: Date.now(),
    needsReview: false
  });
}

function markNeedsReview(id) {
  updateCharacterEvidence(id, {
    seenAt: characterEvidence(id).seenAt || Date.now(),
    masteredAt: null,
    needsReview: true,
    lastMissAt: Date.now()
  });
}

function markMastered(id) {
  updateCharacterEvidence(id, {
    seenAt: characterEvidence(id).seenAt || Date.now(),
    recognizedAt: characterEvidence(id).recognizedAt || Date.now(),
    masteredAt: Date.now(),
    needsReview: false
  });
}

function markMasteredFromQuiz(quiz) {
  const masteredTargetIds = [...new Set((quiz.answers || [])
    .filter((answer) => answer.correct)
    .map((answer) => answer.targetId))];
  if (!masteredTargetIds.length) return;

  batchUpdateCharacterEvidence(masteredTargetIds.map((id) => ({
    id,
    patch: {
      seenAt: characterEvidence(id).seenAt || Date.now(),
      recognizedAt: characterEvidence(id).recognizedAt || Date.now(),
      masteredAt: Date.now(),
      needsReview: false
    }
  })));
}

function evidenceCounts() {
  const ids = unit01.characters.map((item) => item.id);
  return {
    seen: ids.filter(isSeen).length,
    traced: ids.filter(isTraced).length,
    recognized: ids.filter(isRecognized).length,
    mastered: ids.filter(isMastered).length,
    review: ids.filter(needsReview).length
  };
}

function learningAccuracy() {
  if (!state.progress.totalAnswers) return 0;
  return Math.round((state.progress.correctAnswers / state.progress.totalAnswers) * 100);
}

function elapsedMinutes() {
  return Math.min(45, Math.max(1, Math.round((Date.now() - state.progress.startedAt) / 60000)));
}

function todayKey() {
  return localDayKey();
}

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  state.toast = message;
  render();
  toastTimer = setTimeout(() => {
    state.toast = "";
    render();
  }, 1800);
}

function schedule(fn, delay = 850) {
  clearTimeout(transientTimer);
  transientTimer = setTimeout(fn, delay);
}

function icon(name) {
  const icons = {
    back: "←",
    parent: "☼",
    treasure: "★",
    sound: "♪",
    book: "▤",
    pen: "✎",
    play: "▷",
    lock: "⌁",
    home: "⌂",
    close: "×",
    check: "✓",
    share: "↗"
  };
  return icons[name] || "";
}

function imageFor(item) {
  if (item.image) return item.image;
  if (item.id === "huo") return "../../../images/generated-daytime-fire-lesson.png";
  return groupImages[item.group] || "../../../images/generated-daytime-fire-lesson.png";
}

function recognitionVideoFor(item) {
  const video = item.recognitionVideo || item.legacyRecognitionVideo || null;
  if (!video || video.status === "legacy-sample") return null;
  return video;
}

function hasRecognitionVoiceCues(item) {
  const cues = recognitionVideoFor(item)?.voiceCues;
  return Array.isArray(cues) && cues.length > 0;
}

function hasBakedRecognitionAudio(item) {
  return recognitionVideoFor(item)?.audioTrack?.status === "baked";
}

function scheduleIntroSpeech(delay = 180) {
  if (hasRecognitionVoiceCues(currentChar()) || hasBakedRecognitionAudio(currentChar())) return;
  schedule(() => speakCurrent(), delay);
}

function render() {
  clearRecognitionVoiceCues();
  app.innerHTML = `<div class="phone"><div class="screen">${routeMarkup()}${verifyMarkup()}${celebrationMarkup()}${microReviewMarkup()}${replayMarkup()}${toastMarkup()}</div></div>`;
  if (state.route === "home") hydrateHomeMap();
  if (state.route === "recognize") {
    markSeen(currentChar().id);
    hydrateRecognitionMedia();
  }
  if (state.route === "result" || state.route === "celebrate") hydrateCountUps();
  if (state.route === "home") maybePlayFirstGuideVoice();
}

let firstGuideVoicePlayedAt = 0;
function maybePlayFirstGuideVoice() {
  if (state.progress?.firstGuideSeen) return;
  if (!app.querySelector(".first-guide")) return;
  if (Date.now() - firstGuideVoicePlayedAt < 4000) return;
  firstGuideVoicePlayedAt = Date.now();
  const item = nextLearningItem();
  speakText(`欢迎来到星光识字。今天我们从「${item.char}」开始，点一下下面的开始按钮吧。`, { preset: "lesson" });
}

function hydrateCountUps() {
  const nodes = app.querySelectorAll("[data-count-up]");
  nodes.forEach((node) => {
    const target = Number(node.dataset.countUp);
    if (!Number.isFinite(target) || target <= 0) return;
    const total = node.dataset.countTotal ? Number(node.dataset.countTotal) : null;
    const labelTemplate = node.dataset.countLabel || null;
    const duration = 760;
    const startedAt = performance.now();
    const baseText = node.textContent;
    const tick = (now) => {
      const elapsed = now - startedAt;
      const ratio = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const value = Math.round(target * eased);
      if (labelTemplate) {
        node.textContent = labelTemplate.replace("{n}", value);
      } else if (Number.isFinite(total)) {
        node.textContent = `${value}/${total}`;
      } else {
        node.textContent = `${value}`;
      }
      if (ratio < 1) {
        requestAnimationFrame(tick);
      } else {
        if (!labelTemplate) node.textContent = Number.isFinite(total) ? `${target}/${total}` : `${target}`;
        else node.textContent = baseText;
      }
    };
    requestAnimationFrame(tick);
  });
}

function routeMarkup() {
  const routes = {
    home: renderHome,
    unit: renderUnit,
    recognize: renderRecognize,
    write: renderWrite,
    practice: renderPractice,
    groupQuiz: renderQuiz,
    unitTest: renderQuiz,
    result: renderResult,
    celebrate: renderUnitCelebration,
    treasure: renderTreasure,
    parent: renderParent,
    payment: renderPayment
  };
  return (routes[state.route] || renderHome)();
}

function groupTitle(group) {
  return `第 ${group} 组`;
}

function groupCharacters(group) {
  return groupPool(group).map((item) => item.char).join(" ");
}

function nextLearningItem() {
  return unit01.characters[nextStudyIndex()] || unit01.characters[0];
}

function storyWorldFor(item) {
  const lesson = item.nativeLesson || {};
  return {
    place: lesson.place || "认字小舞台",
    title: lesson.title || `认识「${item.char}」`,
    teacher: lesson.cue || item.glyphHook || item.scene,
    findPrompt: lesson.action || "找一找",
    writePrompt: item.strokeGoal || `画「${item.char}」`,
    practiceTitle: `哪个是${item.char}？`,
    success: `找到了，「${item.char}」亮起来了。`,
    retry: item.practiceChecks?.visual || `再看一眼「${item.char}」的样子。`,
    parentProof: item.parentProof,
    objects: (lesson.props || item.words || []).slice(0, 3).map((label) => ({
      label,
      say: `${label}。`,
      correct: true
    }))
  };
}

function isStoryWorldChar(item) {
  return Boolean(item.nativeLesson);
}

function firstStoryWorldItems() {
  return unit01.characters.slice(0, 3);
}

function storyWorldProgress() {
  const items = firstStoryWorldItems();
  const learned = items.filter((item) => isRecognized(item.id));
  return { items, learned };
}

function nativeTeachingCue(item) {
  return item.nativeLesson?.cue || item.soundCue || item.scene;
}

function strokePreviewMarkup(item, className = "recognition-stroke-preview") {
  return `
    <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
      ${item.strokes.map((stroke, index) => `
        <line
          x1="${stroke.x1}"
          y1="${stroke.y1}"
          x2="${stroke.x2}"
          y2="${stroke.y2}"
          style="--stroke-index:${index}"
        ></line>
      `).join("")}
    </svg>
  `;
}

function quizVisualMarkup(item) {
  return `
    <div class="quiz-art quiz-art--native" style="--char-color:${item.color}">
      <span class="quiz-art__sun" aria-hidden="true"></span>
      <span class="quiz-art__ground" aria-hidden="true"></span>
      ${strokePreviewMarkup(item, "quiz-stroke-preview")}
      <span class="quiz-art__glyph">${item.char}</span>
      <span class="quiz-art__cue">${nativeTeachingCue(item)}</span>
    </div>
  `;
}

function learnedItems() {
  return recognizedItems();
}

function recognizedItems() {
  return unit01.characters.filter((item) => isRecognized(item.id));
}

function charRibbonMarkup(items, emptyText = "还没点亮") {
  if (!items.length) return `<div class="char-ribbon char-ribbon--empty">${emptyText}</div>`;
  return `
    <div class="char-ribbon">
      ${items.map((item) => `<span style="--char-color:${item.color}"><strong>${item.char}</strong><small>${item.pinyin}</small></span>`).join("")}
    </div>
  `;
}

function groupLearnedCount(group) {
  return groupPool(group).filter((item) => isRecognized(item.id) && !needsReview(item.id)).length;
}

function isGroupComplete(group) {
  const items = groupPool(group);
  return items.length > 0 && items.every((item) => isRecognized(item.id) && !needsReview(item.id));
}

function activeHomeGroup() {
  const review = unit01.characters.find((item) => needsReview(item.id));
  if (review) return review.group;
  const next = unit01.characters.find((item) => !isRecognized(item.id));
  return next ? next.group : groups[groups.length - 1];
}

function homeGroupStatus(group) {
  if (isGroupComplete(group)) return "done";
  if (group === activeHomeGroup()) return "active";
  return "locked";
}

function homeGroupAria(group, status) {
  if (status === "done") return `${groupTitle(group)}已点亮`;
  if (status === "active") return groupLearnedCount(group) ? `继续${groupTitle(group)}` : `开始${groupTitle(group)}`;
  return `${groupTitle(group)}待解锁`;
}

function renderHomeGroupNode(group, position) {
  const status = homeGroupStatus(group);
  const learned = groupLearnedCount(group);
  const total = groupPool(group).length;
  const action = status === "locked" ? "locked" : "open-unit";
  const label = status === "done"
    ? "已点亮"
    : status === "active"
      ? (learned ? `${learned} / ${total} 已学` : "从这里开始")
      : "前面完成后开启";
  const nodeContent = status === "locked"
    ? `<span>${icon("lock")}</span>`
    : `
      <span class="journey-node__orb"><span>${status === "done" ? icon("check") : icon("play")}</span></span>
      <span class="journey-node__badge">${status === "done" ? "★" : icon("play")}</span>
    `;

  return `
    <button class="journey-node journey-node--${status} journey-node--${position}" data-action="${action}" aria-label="${homeGroupAria(group, status)}">
      ${nodeContent}
    </button>
    <button class="journey-label journey-label--actionable journey-label--${position}" data-action="${action}" aria-label="${homeGroupAria(group, status)}">
      <strong>${groupTitle(group)} · ${label}</strong>
      <span>${groupCharacters(group)}</span>
    </button>
  `;
}

function renderHomeCurrentGroup() {
  const group = groups[groups.length - 1];
  const status = homeGroupStatus(group);
  const learned = groupLearnedCount(group);
  const total = groupPool(group).length;

  if (status === "locked") {
    return `
      <button class="journey-node journey-node--locked journey-node--u4" data-action="locked" aria-label="${homeGroupAria(group, status)}">
        <span>${icon("lock")}</span>
      </button>
      <button class="journey-label journey-label--actionable journey-label--u4" data-action="locked" aria-label="${homeGroupAria(group, status)}">
        <strong>${groupTitle(group)}</strong>
        <span>前面完成后开启</span>
      </button>
    `;
  }

  return `
    <button class="journey-current journey-current--${status}" data-action="open-unit" aria-label="${status === "done" ? "第一单元已完成" : "继续学习第一单元"}">
      <span class="journey-current__ring"></span>
      <span class="journey-current__shadow"></span>
      <span class="journey-current__orb">
        <span class="journey-current__shine"></span>
        <span class="journey-current__icon">${status === "done" ? icon("check") : icon("play")}</span>
      </span>
      <span class="journey-current__badge">${status === "done" ? "★" : icon("play")}</span>
    </button>
    <div class="journey-sign">
      <strong>${groupTitle(group)}</strong>
      <span>${status === "done" ? "第一单元完成" : "继续学习"}</span>
    </div>
    <div class="journey-progress-pill">${learned} / ${total} · ${groupCharacters(group)}</div>
  `;
}

const RECOVERY_BANNER_SUPPRESS_MS = 24 * 60 * 60 * 1000;

function shouldShowRecoveryBanner(hasProgress, canOpenNextUnit) {
  if (!hasProgress || canOpenNextUnit) return false;
  const dismissedAt = Number(state.progress?.recoveryBannerDismissedAt || 0);
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return true;
  return Date.now() - dismissedAt >= RECOVERY_BANNER_SUPPRESS_MS;
}

function shouldShowFirstGuide(hasProgress) {
  if (hasProgress) return false;
  return !state.progress?.firstGuideSeen;
}

function renderHome() {
  const canOpenNextUnit = isUnitComplete();
  const mistShouldDisperse = lastIsUnitComplete === false && canOpenNextUnit === true;
  lastIsUnitComplete = canOpenNextUnit;
  let mistClass = "home-map__mist";
  if (canOpenNextUnit) mistClass += " home-map__mist--cleared";
  if (mistShouldDisperse) mistClass += " home-map__mist--dispersing";
  const nextItem = nextLearningItem();
  const activeGroup = activeHomeGroup();
  const activeGroupTotal = groupPool(activeGroup).length;
  const activeGroupLearned = groupLearnedCount(activeGroup);
  const counts = evidenceCounts();
  const hasProgress = counts.recognized > 0 || counts.traced > 0 || counts.seen > 0;
  const panelAction = canOpenNextUnit ? "go-payment" : "open-unit";
  const panelHeadline = canOpenNextUnit
    ? "新的旅程在前面"
    : hasProgress
      ? `继续学「${nextItem.char}」`
      : `今天从「${nextItem.char}」开始`;
  const panelHint = canOpenNextUnit
    ? "第一单元完成"
    : hasProgress
      ? `第 ${activeGroup} 组 · ${activeGroupLearned} / ${activeGroupTotal} 已点亮`
      : "第 1 字 · 从这里出发";
  const panelButtonLabel = canOpenNextUnit ? "继续第二单元" : hasProgress ? "继续" : "开始";
  const showRecoveryBanner = shouldShowRecoveryBanner(hasProgress, canOpenNextUnit);
  const showFirstGuide = shouldShowFirstGuide(hasProgress);
  const bannerMarkup = showRecoveryBanner
    ? `
        <div class="recovery-banner" data-screen-banner>
          <div class="recovery-banner__chip" aria-hidden="true">${nextItem.char}</div>
          <div class="recovery-banner__copy">
            <span>上次学到</span>
            <strong>「${nextItem.char}」${nextItem.pinyin}</strong>
          </div>
          <button class="recovery-banner__cta" data-action="open-unit">继续</button>
          <button class="recovery-banner__close" data-action="dismiss-recovery-banner" aria-label="今天不再提醒">×</button>
        </div>
      `
    : "";
  const firstGuideMarkup = showFirstGuide
    ? `
        <div class="first-guide" data-action="dismiss-first-guide" role="button" aria-label="开始学习">
          <div class="first-guide__bubble">
            <strong>欢迎来到星光识字</strong>
            <p>今天我们从「${nextItem.char}」开始，<br/>点一下下面的「开始」按钮吧。</p>
            <span class="first-guide__cta">好的</span>
          </div>
          <div class="first-guide__finger" aria-hidden="true">👆</div>
          <div class="first-guide__spotlight" aria-hidden="true"></div>
        </div>
      `
    : "";
  return `
    <section class="home${showFirstGuide ? " home--guide" : ""}" data-screen="home">
      ${bannerMarkup}
      ${firstGuideMarkup}
      <div class="home-map" data-home-map>
        <div class="home-map__canvas" data-home-canvas>
          <img class="home-map__base" src="../../../images/p01-bg-redraw-road-centered-20260426.png" alt="" draggable="false" />
          <div class="home-map__warm-filter" aria-hidden="true"></div>
          <img class="home-map__overlay home-map__overlay--pastoral" src="../../../images/p01-pastoral-overlay-20260426.png" alt="" draggable="false" />
          <img class="home-map__overlay home-map__overlay--animals" src="../../../images/p01-animal-edge-overlay-20260426.png" alt="" draggable="false" />

          <div class="map-home-start" aria-hidden="true">
            <span>${icon("home")}</span>
            <strong>我的家</strong>
          </div>

          ${renderHomeGroupNode(groups[0], "u1")}
          ${renderHomeGroupNode(groups[1], "u2")}
          ${renderHomeGroupNode(groups[2], "u3")}

          <button class="journey-node journey-node--locked journey-node--u6" data-action="locked" aria-label="第六站待解锁">
            <span>${icon("lock")}</span>
          </button>
          <div class="journey-label journey-label--u6">
            <strong>第六站</strong>
            <span>还在雾里</span>
          </div>
          <button class="journey-node journey-node--locked journey-node--u7" data-action="locked" aria-label="第七站待解锁">
            <span>${icon("lock")}</span>
          </button>
          <div class="journey-label journey-label--u7">
            <strong>第七站</strong>
          </div>
          <button class="journey-node journey-node--locked journey-node--u8" data-action="locked" aria-label="第八站待解锁">
            <span>${icon("lock")}</span>
          </button>
          <div class="journey-label journey-label--u8">
            <strong>第八站</strong>
          </div>

          <div class="${mistClass}" aria-hidden="true">
            <span class="home-map__mist-puff home-map__mist-puff--a" aria-hidden="true"></span>
            <span class="home-map__mist-puff home-map__mist-puff--b" aria-hidden="true"></span>
            <span class="home-map__mist-puff home-map__mist-puff--c" aria-hidden="true"></span>
          </div>

          <button class="map-future" data-action="${canOpenNextUnit ? "go-payment" : "locked"}" aria-label="更多旅程">
            <strong>更多旅程</strong>
            <span>${canOpenNextUnit ? "第二单元 · 可以解锁" : "云雾后面 · 即将开启"}</span>
          </button>

          <button class="journey-node journey-node--next ${canOpenNextUnit ? "journey-node--next-ready" : ""} journey-node--u5" data-action="${canOpenNextUnit ? "go-payment" : "locked"}" aria-label="${canOpenNextUnit ? "解锁第二单元" : "第二单元待解锁"}">
            <span>★</span>
          </button>
          <div class="journey-label journey-label--u5">
            <strong>第二单元</strong>
            <span>${canOpenNextUnit ? "可以继续往前走" : "完成第一单元后开启"}</span>
          </div>

          ${renderHomeCurrentGroup()}

          <span class="map-breeze map-breeze--one" aria-hidden="true"></span>
          <span class="map-breeze map-breeze--two" aria-hidden="true"></span>
          <span class="map-breeze map-breeze--three" aria-hidden="true"></span>
          <span class="map-twinkle map-twinkle--left" aria-hidden="true">✦</span>
          <span class="map-twinkle map-twinkle--right" aria-hidden="true">✦</span>
        </div>
        <div class="home-map__top-fade" aria-hidden="true"></div>
        <div class="map-brand" aria-hidden="true">
          <span>★</span>
          <strong>星光识字</strong>
        </div>
        <button class="map-top-btn map-top-btn--treasure" data-action="open-treasure" aria-label="小星宝库">★</button>
        <button class="map-top-btn map-top-btn--parent" data-action="open-verify" aria-label="家长中心">${icon("parent")}</button>
        <div class="home-action-panel">
          <div class="home-action-panel__mark" aria-hidden="true">${canOpenNextUnit ? "★" : nextItem.char}</div>
          <div class="home-action-panel__copy">
            <span>${panelHint}</span>
            <strong>${panelHeadline}</strong>
          </div>
          <button class="home-action-panel__button" data-action="${panelAction}">
            ${panelButtonLabel}
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderUnit() {
  const counts = evidenceCounts();
  const progressValue = Math.round((counts.recognized / unit01.characters.length) * 100);
  const nextItem = nextLearningItem();
  const isReviewNext = needsReview(nextItem.id);
  const hasProgress = counts.recognized > 0 || counts.traced > 0 || counts.seen > 0;
  const heroTitle = isReviewNext
    ? `先回到「${nextItem.char}」`
    : hasProgress
      ? `继续学「${nextItem.char}」`
      : `今天从「${nextItem.char}」开始`;
  const ctaLabel = hasProgress ? "继续下一节" : `${icon("play")} 开始第一节`;
  return `
    <section class="screen--scroll page-pad has-docked-cta unit-page unit-page--complete">
      ${topbar("第一单元", "20 字完整路线", "home")}
      <div class="unit-route-hero" style="${groupSceneStyle(nextItem.group)}">
        <div class="unit-route-hero__copy">
          <span>${isReviewNext ? "需要复习" : groupTitle(nextItem.group)} · ${groupLearningFocus(nextItem.group)}</span>
          <h2>${heroTitle}</h2>
          <p>${nextItem.glyphHook}</p>
        </div>
        <button class="unit-route-hero__mark" data-action="start-learning" aria-label="开始 ${nextItem.char}">
          <strong>${nextItem.char}</strong>
          <span>${nextItem.pinyin}</span>
        </button>
      </div>
      <div class="evidence-strip">
        ${evidenceMetricMarkup("看过", counts.seen)}
        ${evidenceMetricMarkup("画过", counts.traced)}
        ${evidenceMetricMarkup("答对", counts.recognized)}
        ${evidenceMetricMarkup("复习", counts.review)}
      </div>
      <div class="progress-line progress-line--unit">
        <span>证据进度</span>
        <div class="progress-bar" aria-hidden="true"><i style="--value:${progressValue}%"></i></div>
        <span>${progressValue}%</span>
      </div>
      <div class="unit-group-list">
        ${groups.map((group) => renderUnitGroup(group, nextItem)).join("")}
      </div>
    </section>
    <div class="docked-cta" data-docked-cta="unit">
      <div class="docked-cta__inner">
        <button class="cta cta--gold" data-action="start-learning">${ctaLabel}</button>
      </div>
    </div>
  `;
}

function renderUnitGroup(group, nextItem) {
  const items = groupPool(group);
  const learned = groupLearnedCount(group);
  const current = nextItem.group === group && !isUnitComplete();
  return `
    <section class="unit-group-card ${current ? "unit-group-card--current" : ""}" style="${groupSceneStyle(group)}">
      <div class="unit-group-card__head">
        <div>
          <span>${groupTitle(group)}</span>
          <strong>${groupLearningFocus(group)}</strong>
        </div>
        <small>${learned}/${items.length}</small>
      </div>
      <div class="unit-char-row">
        ${items.map((item) => renderLessonTile(item, item.id === nextItem.id)).join("")}
      </div>
    </section>
  `;
}

function renderLessonTile(item, current = false) {
  const status = needsReview(item.id)
    ? "review"
    : isMastered(item.id)
      ? "mastered"
      : isRecognized(item.id)
        ? "recognized"
        : isTraced(item.id)
          ? "traced"
          : isSeen(item.id)
            ? "seen"
            : "fresh";
  return `
    <button class="lesson-tile lesson-tile--${status} ${current ? "lesson-tile--current" : ""}" data-action="jump-char" data-index="${unit01.characters.indexOf(item)}" style="--char-color:${item.color}" aria-label="${item.char} ${status}">
      <strong>${item.char}</strong>
      <span>${item.nativeLesson.action}</span>
      <small>${statusLabel(status)}</small>
    </button>
  `;
}

function evidenceMetricMarkup(label, value) {
  return `<span><strong>${value}</strong><small>${label}</small></span>`;
}

function statusLabel(status) {
  return {
    mastered: "会认",
    recognized: "答对",
    review: "复习",
    traced: "画过",
    seen: "看过",
    fresh: "待学"
  }[status] || "待学";
}

function groupLearningFocus(group) {
  return {
    1: "数量、线条、大小",
    2: "位置、身体、动作",
    3: "日月水火山",
    4: "自然、器官、易混"
  }[group] || "识字小课";
}

function groupSceneAsset(group) {
  return unit01VisualAssets.groupScenes?.[group] || null;
}

function groupSceneStyle(group) {
  const scene = groupSceneAsset(group);
  return scene ? `--unit-scene:url(${scene.src})` : "";
}

function topbar(title, subtitle = "", backRoute = "home", right = "") {
  return `
    <div class="topbar">
      <button class="icon-btn" data-action="go" data-route="${backRoute}" aria-label="返回">${icon("back")}</button>
      <h1 class="topbar__title">${title}${subtitle ? `<span class="topbar__sub">${subtitle}</span>` : ""}</h1>
      ${right || "<span></span>"}
    </div>
  `;
}

function renderLessonTabs(active) {
  return `
    <div class="lesson-top">
      <button class="icon-btn" data-action="go" data-route="unit" aria-label="返回">${icon("back")}</button>
      <button class="icon-btn" data-action="speak-current" aria-label="播放语音">${icon("sound")}</button>
      <div class="mode-tabs" aria-hidden="true">
        <span class="mode-tab ${active === "recognize" ? "mode-tab--active" : ""}">${icon("book")} 认</span>
        <span class="mode-tab ${active === "write" ? "mode-tab--active" : ""}">${icon("pen")} 写</span>
        <span class="mode-tab ${active === "practice" ? "mode-tab--active" : ""}">玩</span>
      </div>
    </div>
  `;
}

function renderRecognize() {
  const item = currentChar();
  const video = recognitionVideoFor(item);
  return `
    <section class="recognize-cinema recognize-cinema--${item.id}" style="--char-color:${item.color}">
      ${renderRecognitionMedia(item)}

      <div class="recognize-cinema__topbar" aria-label="认字页操作">
        <button class="icon-btn recognize-cinema__nav" data-action="go" data-route="unit" aria-label="返回">${icon("back")}</button>
        <button class="icon-btn recognize-cinema__nav" data-action="speak-current" aria-label="播放声音">${icon("sound")}</button>
      </div>

      <div class="bottom-action recognize-cinema__action">
        <button class="cta cta--gold" data-action="to-write">画一画</button>
      </div>
    </section>
  `;
}

function renderRecognitionMedia(item) {
  const video = recognitionVideoFor(item);
  const world = storyWorldFor(item);
  if (video) {
    return `
      <div class="recognize-cinema__stage recognize-cinema__stage--video" aria-label="${item.char} 的认字动画" style="--char-color:${item.color};--recognition-poster:url(${video.poster})">
        <img class="recognize-cinema__poster" src="${video.poster}" alt="" aria-hidden="true" />
        <video
          class="recognize-cinema__video"
          data-recognition-video
          poster="${video.poster}"
          ${video.audioTrack?.status === "baked" ? "" : "muted"}
          autoplay
          playsinline
          preload="auto"
          aria-hidden="true"
        >
          ${(video.sources || [{ src: video.src, type: "video/mp4" }]).map((source) => `<source src="${source.src}" type="${source.type}" />`).join("")}
        </video>
        <button class="recognize-cinema__replay" data-action="replay-recognition" aria-label="重播动画">${icon("play")}</button>
      </div>
    `;
  }

  return `
    <div class="recognize-cinema__stage recognize-cinema__stage--native" aria-label="${item.char} 的认字动画" style="--char-color:${item.color}">
      <span class="recognize-cinema__sky" aria-hidden="true"></span>
      <span class="recognize-cinema__sun" aria-hidden="true"></span>
      <span class="recognize-cinema__ground" aria-hidden="true"></span>
      ${lessonSceneMarkup(item)}
      ${strokePreviewMarkup(item, "recognize-cinema__strokes")}
      <span class="recognize-cinema__native-glyph">${item.char}</span>
      <button class="recognize-cinema__replay" data-action="speak-current" aria-label="播放声音">${icon("sound")}</button>
    </div>
  `;
}

function lessonSceneMarkup(item) {
  const props = item.nativeLesson.props || [];
  return `
    <span class="lesson-props lesson-props--${item.id}" aria-hidden="true">
      ${props.slice(0, 3).map((_, index) => `<span class="lesson-prop lesson-prop--${index + 1}"></span>`).join("")}
    </span>
  `;
}

function renderWrite() {
  const item = currentChar();
  const total = item.strokes.length;
  const activeStroke = item.strokes[Math.min(state.strokeDone, total - 1)];
  const fingerStyle = activeStroke
    ? `--start-x:${activeStroke.x1}%;--start-y:${activeStroke.y1}%;--end-x:${activeStroke.x2}%;--end-y:${activeStroke.y2}%`
    : "";
  return `
    <section class="page-pad write-layout write-layout--evidence" style="--char-color:${item.color}">
      ${renderLessonTabs("write")}
      <div>
        <div class="write-copy">
          <span>${item.structureFocus}</span>
          <h1>${item.strokeGoal}</h1>
        </div>
        <div class="writing-card writing-card--lesson">
          <div class="writing-pad" data-action="writing-pad" aria-label="书写 ${item.char}">
            <div class="writing-pad__char">${item.char}</div>
            <svg class="stroke-svg" viewBox="0 0 100 100" aria-hidden="true">
              ${item.strokes.map((stroke, index) => `
                <line class="${index < state.strokeDone ? "done" : ""}" x1="${stroke.x1}" y1="${stroke.y1}" x2="${stroke.x2}" y2="${stroke.y2}"></line>
              `).join("")}
            </svg>
            ${state.strokeDone < total ? `<span class="finger" style="${fingerStyle}">指</span>` : ""}
          </div>
          <div class="write-progress">
            ${item.strokes.map((_, index) => `<span class="write-dot ${index < state.strokeDone ? "done" : ""}"></span>`).join("")}
          </div>
          <div class="write-actions">
            <button class="secondary-btn" data-action="reset-writing">再试一次</button>
            <button class="secondary-btn" data-action="skip-writing">我画好了</button>
          </div>
        </div>
        ${state.feedback ? `<div class="write-feedback">${state.feedback}</div>` : ""}
      </div>
      ${state.strokeDone === 0 ? `<div class="guide-bubble"><span class="guide-hand">指</span><span>跟着线条慢慢画</span></div>` : ""}
    </section>
  `;
}

function renderPractice() {
  const question = state.question || makeQuestion("image", currentChar(), groupPool(currentChar().group));
  if (!state.question) state.question = question;
  const correctSelected = state.selectedAnswer === question.answerId;
  return `
    <section class="page-pad question-shell question-shell--evidence" style="--char-color:${question.target.color}">
      ${renderLessonTabs("practice")}
      ${questionMarkup(question, "单字证据")}
      <div class="bottom-action">
        ${state.feedback
          ? correctSelected
            ? `<button class="cta cta--gold" data-action="practice-next">收进宝库</button>`
            : `<button class="cta cta--gold" data-action="review-current">再看一眼</button>`
          : ""}
      </div>
    </section>
  `;
}

function renderQuiz() {
  const quiz = state.quiz || startQuiz(state.route === "unitTest" ? "unitTest" : "groupQuiz");
  if (!state.quiz) state.quiz = quiz;
  const question = quiz.questions[quiz.index];
  const label = state.route === "unitTest" ? "单元复认" : `${groupTitle(currentChar().group)}复认`;
  return `
    <section class="page-pad question-shell question-shell--evidence">
      ${topbar(label, `${quiz.index + 1} / ${quiz.questions.length}`, "unit")}
      ${questionMarkup(question, label, quiz)}
    </section>
  `;
}

function questionMarkup(question, label, quiz = null) {
  const isAudio = question.type === "audio";
  return `
    <div class="quiz-progress">
      <span>${label}</span>
      <div class="progress-bar" style="flex:1"><i style="--value:${quiz ? ((quiz.index + 1) / quiz.questions.length) * 100 : 100}%"></i></div>
    </div>
    ${isAudio ? `
      <div class="audio-card audio-card--lesson">
        <button class="audio-card__button" data-action="speak-question">${icon("sound")}</button>
        <span>${question.target.soundCue}</span>
      </div>
    ` : quizVisualMarkup(question.target)}
    <h2 class="question-title">${question.title}</h2>
    <div class="answer-grid answer-grid--lesson">
      ${question.options.map((item) => renderAnswerCard(item, question)).join("")}
    </div>
    ${state.feedback ? `<div class="feedback-bar">${state.feedback}</div>` : ""}
  `;
}

function renderAnswerCard(item, question) {
  const selected = state.selectedAnswer === item.id;
  const answered = Boolean(state.selectedAnswer);
  const resultClass = answered
    ? item.id === question.answerId
      ? "correct"
      : selected
        ? "wrong"
        : "muted"
    : "";
  return `
    <button class="answer-card answer-card--lesson ${resultClass}" data-action="answer-question" data-answer="${item.id}" aria-label="${item.char} ${item.pinyin}" style="--char-color:${item.color}">
      <span class="answer-card__scene">
        ${strokePreviewMarkup(item, "answer-card__strokes")}
        <strong>${item.char}</strong>
      </span>
      <span class="answer-card__copy">
        <small>${item.nativeLesson.action}</small>
        <span>${item.pinyin}</span>
      </span>
    </button>
  `;
}

function renderResult() {
  const result = state.result || { score: 0, total: 8, stars: 0, passed: false };
  const counts = evidenceCounts();
  const canAdvance = result.passed && isUnitComplete();
  const title = canAdvance ? "证据链点亮了" : counts.review ? "先回小路复习" : "再复认一次";
  const resultCopy = canAdvance
    ? "看过、画过、答对和复认都会留下记录。"
    : counts.review
      ? `还有 ${counts.review} 个字需要再看一眼，清掉复习后再往前走。`
      : "不用急，再试一次，把复认记录补稳。";
  return `
    <section class="screen--scroll page-pad result-page">
      ${topbar("测验结果", "", "unit")}
      <div class="result-hero result-hero--evidence">
        <div class="result-hero__sparkles" aria-hidden="true">
          ${Array.from({ length: 12 }, (_, i) => `<span style="--i:${i}"></span>`).join("")}
        </div>
        <div class="stars stars--celebrate" aria-label="${result.stars} 星">
          ${[1, 2, 3].map((star) => `<span class="${star <= result.stars ? "active" : ""}" style="--star-i:${star - 1}">★</span>`).join("")}
        </div>
        <div class="result-score">
          <div>
            <strong data-count-up="${result.score}" data-count-total="${result.total}">0/${result.total}</strong>
            <span>答对</span>
          </div>
        </div>
        <h1 class="result-title">${title}</h1>
        <p class="caption result-copy">${resultCopy}</p>
        <div class="evidence-strip evidence-strip--result">
          ${evidenceMetricMarkup("看过", counts.seen)}
          ${evidenceMetricMarkup("画过", counts.traced)}
          ${evidenceMetricMarkup("答对", counts.recognized)}
          ${evidenceMetricMarkup("会认", counts.mastered)}
        </div>
      </div>
      <div class="stack result-actions">
        ${canAdvance ? `
          <button class="cta cta--gold" data-action="open-treasure">去宝库</button>
          <button class="secondary-btn" data-action="go-payment">继续第二单元</button>
        ` : counts.review ? `
          <button class="cta cta--gold" data-action="start-learning">复习错字</button>
          <button class="secondary-btn" data-action="retry-test">再试一次</button>
        ` : `
          <button class="cta cta--gold" data-action="retry-test">再试一次</button>
          <button class="secondary-btn" data-action="go" data-route="home">回首页</button>
        `}
      </div>
    </section>
  `;
}

function renderUnitCelebration() {
  const counts = evidenceCounts();
  return `
    <section class="screen--scroll page-pad unit-celebration-page">
      ${topbar("第一单元完成", "20 颗小星星", "home")}
      <div class="unit-celebration-hero">
        <div class="result-hero__sparkles unit-celebration-hero__sparkles" aria-hidden="true">
          ${Array.from({ length: 18 }, (_, i) => `<span style="--i:${i}"></span>`).join("")}
        </div>
        <div class="unit-celebration-hero__sky stars--celebrate">
          <span style="--star-i:0">★</span>
          <span style="--star-i:1">★</span>
          <span style="--star-i:2">★</span>
        </div>
        <h1>你认识了 Unit-01 全部 20 个字</h1>
        <p data-count-up="${counts.recognized}" data-count-label="收集到 {n} 颗小星星，全部点亮了。">收集到 ${counts.recognized} 颗小星星，全部点亮了。</p>
      </div>
      <div class="evidence-strip evidence-strip--celebration">
        ${evidenceMetricMarkup("看过", counts.seen)}
        ${evidenceMetricMarkup("画过", counts.traced)}
        ${evidenceMetricMarkup("答对", counts.recognized)}
        ${evidenceMetricMarkup("会认", counts.mastered)}
      </div>
      <div class="unit-celebration-ribbon">
        ${charRibbonMarkup(unit01.characters, "还没有点亮的字")}
      </div>
      <div class="stack result-actions">
        <button class="cta cta--gold" data-action="open-verify">去家长中心看看</button>
        <button class="secondary-btn" data-action="go" data-route="home">回学习地图</button>
      </div>
    </section>
  `;
}

function renderTreasure() {
  const learned = learnedItems();
  const nextItem = nextLearningItem();
  return `
    <section class="screen--scroll page-pad treasure-page">
      ${topbar("小星宝库", `${learnedCount()} 个字已答对`, "home")}
      <div class="treasure-card treasure-card--atlas">
        <h2 class="section-title">第一单元字星</h2>
        <div class="treasure-grid">
          ${unit01.characters.map((item) => {
            const status = needsReview(item.id) ? "review" : isMastered(item.id) ? "mastered" : isRecognized(item.id) ? "learned" : "dim";
            return `
              <span class="treasure-badge treasure-badge--${status}" style="--char-color:${item.color}">
                <strong>${isRecognized(item.id) || isMastered(item.id) ? item.char : "·"}</strong>
                <small>${statusLabel(status === "learned" ? "recognized" : status)}</small>
              </span>
            `;
          }).join("")}
        </div>
      </div>
      <div class="treasure-card treasure-card--next">
        <span class="caption">${isUnitComplete() ? "下一段旅程" : "下一颗星星"}</span>
        <strong>${isUnitComplete() ? "第二单元可以预览" : `继续认识「${nextItem.char}」`}</strong>
        <p>${isUnitComplete() ? teaserUnit.previewChars.join("、") : nativeTeachingCue(nextItem)}</p>
      </div>
      <div class="share-card" id="share-card">
        <div class="share-card__inner">
          <span class="caption">星光识字 · 第一单元</span>
          <h2>我已经答对 ${learnedCount()} 个汉字</h2>
          <p class="caption">今天正确率 ${learningAccuracy()}%，继续收集下一颗小星星。</p>
        </div>
      </div>
      <div class="stack" style="margin-top:16px;padding-bottom:28px">
        <button class="cta cta--gold" data-action="save-share">保存海报</button>
        <button class="secondary-btn" data-action="copy-link">复制链接</button>
      </div>
    </section>
  `;
}

function parentAdviceItems() {
  const counts = evidenceCounts();
  const reviewItems = unit01.characters.filter((item) => needsReview(item.id));
  const nextItem = nextLearningItem();
  const minutes = elapsedMinutes();
  const accuracy = learningAccuracy();
  const totalAnswers = state.progress.totalAnswers || 0;
  const tips = [];

  if (reviewItems.length > 0) {
    const reviewChars = reviewItems.slice(0, 3).map((item) => `「${item.char}」`).join("");
    tips.push(`今天先和孩子一起回看 ${reviewChars}，再继续新字，复盘比赶进度更重要。`);
  }
  if (totalAnswers >= 5 && accuracy < 60) {
    tips.push(`正确率 ${accuracy}%，可以放慢节奏，让孩子先听一遍范读、再亲手画一遍，最后再做题。`);
  }
  if (minutes >= 15) {
    tips.push(`今天已陪伴 ${minutes} 分钟，建议先合上屏幕活动一下，再分一次时段继续。`);
  } else {
    tips.push("单次建议 10–15 分钟分两次完成，孩子的专注度和记忆效果都更好。");
  }
  if (!isUnitComplete() && counts.recognized > 0) {
    tips.push(`下一站是「${nextItem.char}」（${groupTitle(nextItem.group)}），生活里见到相关画面时可以顺口问一句「这是什么字？」`);
  }
  if (isUnitComplete()) {
    tips.push("第一单元已完成，可以让孩子翻一翻小星宝库，把会认的字再认一遍，再决定要不要开启第二单元。");
  }
  if (!tips.length) {
    tips.push("先和孩子一起打开「我的家」地图，让他自己挑一站开始，参与感比难度更关键。");
  }
  return tips.slice(0, 4);
}

function renderParent() {
  const counts = evidenceCounts();
  const nextItem = nextLearningItem();
  const minutes = elapsedMinutes();
  const reviewItems = unit01.characters.filter((item) => needsReview(item.id));
  const recent = unit01.characters.filter((item) => isSeen(item.id) || isTraced(item.id) || isRecognized(item.id)).slice(-8);
  const nextCopy = isUnitComplete()
    ? "下次可以先复习最近 3 个字，再预览第二单元。"
    : `下次建议从「${nextItem.char}」开始，先找生活里的形状，再用手画一遍。`;
  const adviceMarkup = parentAdviceItems().map((tip) => `<li>${tip}</li>`).join("");
  return `
    <section class="screen--scroll page-pad parent-page">
      ${topbar("家长中心", "给您看的学习证据", "home")}
      <div class="parent-hero">
        <span>今日证据链</span>
        <h2>${counts.recognized} 个字有答对记录</h2>
        <p>${nextCopy}</p>
      </div>
      <div class="evidence-timeline">
        ${evidenceStepMarkup("看过", counts.seen, "seen")}
        ${evidenceStepMarkup("画过", counts.traced, "traced")}
        ${evidenceStepMarkup("答对", counts.recognized, "recognized")}
        ${evidenceStepMarkup("会认", counts.mastered, "mastered")}
      </div>
      <div class="stack">
        <div class="parent-card">
          <h2 class="section-title">今日学习</h2>
          <div class="metric-grid" style="margin-top:14px">
            <div class="metric"><div><strong>${counts.recognized}</strong><span>答对字</span></div></div>
            <div class="metric"><div><strong>${learningAccuracy()}%</strong><span>正确率</span></div></div>
            <div class="metric"><div><strong>${minutes}</strong><span>分钟</span></div></div>
          </div>
        </div>
        <div class="parent-card">
          <h2 class="section-title">今日建议</h2>
          <ul class="parent-advice" style="margin-top:12px">${adviceMarkup}</ul>
        </div>
        <div class="parent-card parent-card--warm">
          <h2 class="section-title">识字回放</h2>
          ${charRibbonMarkup(recent, "今天还没有新字")}
        </div>
        <div class="parent-card parent-card--proof">
          <h2 class="section-title">可解释证据</h2>
          <p>${recent[recent.length - 1]?.parentProof || "孩子先看生活画面，再观察字形，最后用手复现。"}</p>
          <div class="proof-steps">
            <span>生活里发现</span>
            <span>字形里确认</span>
            <span>练习里答对</span>
          </div>
        </div>
        <div class="parent-card">
          <h2 class="section-title">需要复习</h2>
          ${charRibbonMarkup(reviewItems, "暂时没有需要复习的字")}
        </div>
        <div class="parent-card">
          <h2 class="section-title">护眼节奏</h2>
          <p class="caption">${minutes > 15 ? `今天已用 ${minutes} 分钟，建议先休息一会儿。` : `单次建议 15 分钟，今天已用 ${minutes} 分钟。`}</p>
          <div class="progress-bar"><i style="--value:${Math.min(100, (minutes / 15) * 100)}%"></i></div>
        </div>
      </div>
    </section>
  `;
}

function evidenceStepMarkup(label, value, key) {
  return `<span class="evidence-step evidence-step--${key}"><strong>${value}</strong><small>${label}</small></span>`;
}

function renderPayment() {
  if (!isUnitComplete()) {
    const counts = evidenceCounts();
    return `
      <section class="screen--scroll page-pad payment-page payment-page--locked">
        ${topbar("下一课还在前面", "先完成第一单元", "home")}
        <div class="payment-hero">
          <h2>还差一点点</h2>
          <p>${counts.review ? `还有 ${counts.review} 个字需要复习。` : `已答对 ${learnedCount()} / ${unit01.characters.length} 个字。`} 完成后再打开第二单元。</p>
        </div>
        <div class="next-preview">
          <span class="caption">下一课预览</span>
          <div class="next-preview__chars">
            ${teaserUnit.previewChars.map((char) => `<span>${char}</span>`).join("")}
          </div>
        </div>
        <div class="stack payment-actions">
          <button class="cta cta--gold" data-action="start-learning">${counts.review ? "先复习" : "继续第一单元"}</button>
          <button class="secondary-btn" data-action="go" data-route="home">回首页</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="screen--scroll page-pad">
      ${topbar("解锁下一课", teaserUnit.subtitle, "home")}
      <div class="payment-hero">
        <h2>${teaserUnit.title}</h2>
        <p>孩子已经答对 ${learnedCount()} 个字，可以继续往前走。</p>
      </div>
      <div class="next-preview">
        <span class="caption">下一课预览</span>
        <div class="next-preview__chars">
          ${teaserUnit.previewChars.map((char) => `<span>${char}</span>`).join("")}
        </div>
      </div>
      <div class="stack" style="margin-top:18px">
        <button class="pay-card ${state.payChoice === "trial" ? "selected" : ""}" data-action="choose-pay" data-choice="trial">
          <span class="price-mark">¥9.9</span>
          <span><strong>第二单元</strong><br><span class="caption">方向、身体和自然字</span></span>
          <span>${state.payChoice === "trial" ? icon("check") : ""}</span>
        </button>
        <button class="pay-card ${state.payChoice === "lifetime" ? "selected" : ""}" data-action="choose-pay" data-choice="lifetime">
          <span class="price-mark">¥299</span>
          <span><strong>完整旅程</strong><br><span class="caption">分阶段开放，保留今日进度</span></span>
          <span>${state.payChoice === "lifetime" ? icon("check") : ""}</span>
        </button>
      </div>
      <div class="payment-trust">
        <span>家长可随时查看学习记录和护眼节奏。</span>
        <span>每课保留认、写、练、测四步，避免刷题式推进。</span>
      </div>
      <div class="stack payment-actions">
        <button class="cta cta--gold" data-action="confirm-pay">记录意向</button>
        <button class="secondary-btn" data-action="go" data-route="home">稍后再说</button>
      </div>
    </section>
  `;
}

function verifyMarkup() {
  if (!state.verifyOpen) return "";
  return `
    <div class="verify-backdrop">
      <div class="verify-panel">
        <h2>家长验证</h2>
        <span class="caption">请完成 3 + 5</span>
        <div class="verify-display">
          <span>3 + 5 =</span>
          <span>${state.verifyInput || "?"}</span>
        </div>
        <div class="keypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => `<button data-action="verify-key" data-key="${num}">${num}</button>`).join("")}
          <button data-action="close-verify">${icon("close")}</button>
          <button data-action="verify-key" data-key="0">0</button>
          <button data-action="verify-submit">${icon("check")}</button>
        </div>
      </div>
    </div>
  `;
}

function celebrationMarkup() {
  if (!state.showCelebration) return "";
  return `
    <div class="celebration">
      <div class="celebration__card">
        <div>
          <div class="celebration__star">★</div>
          <h2>太棒啦</h2>
          <p>小星星又亮了一颗</p>
        </div>
      </div>
    </div>
  `;
}

function toastMarkup() {
  return state.toast ? `<div class="toast">${state.toast}</div>` : "";
}

function homeMapBounds() {
  const viewportHeight = app.querySelector(".home-map")?.clientHeight || window.innerHeight;
  const contentHeight = MAP_DESIGN_HEIGHT * homeMapScale();
  return {
    min: Math.min(0, viewportHeight - contentHeight),
    max: 0
  };
}

function homeMapScale() {
  const viewportWidth = app.querySelector(".home-map")?.clientWidth || window.innerWidth;
  return viewportWidth / MAP_DESIGN_WIDTH;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyHomeMapY() {
  const canvas = app.querySelector("[data-home-canvas]");
  if (!canvas || homeMapY === null) return;
  canvas.style.transform = `translate3d(-50%, ${homeMapY}px, 0) scale(${homeMapScale()})`;
}

function defaultHomeMapY() {
  const viewportHeight = app.querySelector(".home-map")?.clientHeight || window.innerHeight;
  const { min, max } = homeMapBounds();
  return clamp((viewportHeight / 2) - (homeMapFocusY() * homeMapScale()), min, max);
}

function hydrateHomeMap() {
  const focusKey = currentHomeMapFocusKey();
  if (homeMapY === null || homeMapFocusKey !== focusKey) {
    homeMapY = defaultHomeMapY();
    homeMapFocusKey = focusKey;
  }
  const { min, max } = homeMapBounds();
  homeMapY = clamp(homeMapY, min, max);
  applyHomeMapY();
}

function hydrateRecognitionMedia() {
  const video = app.querySelector("[data-recognition-video]");
  if (!video) return;
  const item = currentChar();
  const recognition = recognitionVideoFor(item);
  const voiceCues = recognition?.voiceCues || [];
  const hasBakedAudio = recognition?.audioTrack?.status === "baked";
  const stage = video.closest(".recognition-stage, .story-world, .lesson-stage, .recognize-cinema__stage");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reducedMotion) {
    stage?.classList.add("is-reduced");
    return;
  }

  // 2026-05-16 v37: P03 auto-plays with sound by default for baked-audio
  // videos. Previously this function hard-set `video.muted = true` which
  // forced the user to tap the replay button to hear the narration — that
  // broke the teaching beat (kids landed on P03 in silence). Now we attempt
  // audible autoplay first; if the browser blocks it (no prior user
  // gesture on this page load) we fall back to muted-autoplay and register
  // a one-shot "first interaction unmutes + restarts" handler so audio
  // kicks in the moment the user touches the page.
  const markReady = () => stage?.classList.add("is-ready");
  video.addEventListener("loadeddata", markReady, { once: true });
  video.addEventListener("canplay", markReady, { once: true });
  video.addEventListener("ended", () => {
    clearRecognitionVoiceCues();
    stage?.classList.add("is-ended");
  });
  video.addEventListener("pause", clearRecognitionVoiceCues);
  video.addEventListener("play", () => scheduleRecognitionVoiceCues(video, voiceCues));
  video.addEventListener("seeked", () => {
    if (!video.paused) scheduleRecognitionVoiceCues(video, voiceCues);
  });

  if (hasBakedAudio) {
    video.muted = false;
    const audibleAttempt = video.play();
    if (audibleAttempt?.catch) {
      audibleAttempt.catch(() => {
        // Browser blocked audible autoplay — retry muted so at least the
        // animation plays, and arm a one-shot unmute on first user touch.
        video.muted = true;
        stage?.classList.add("is-muted-autoplay");
        const mutedAttempt = video.play();
        mutedAttempt?.catch?.(() => {
          clearRecognitionVoiceCues();
          stage?.classList.add("is-fallback");
        });
        const unmuteOnce = () => {
          stage?.classList.remove("is-muted-autoplay");
          try {
            video.muted = false;
            video.currentTime = 0;
            video.play()?.catch?.(() => {});
          } catch {}
        };
        document.addEventListener("pointerdown", unmuteOnce, { once: true, capture: true });
        document.addEventListener("touchstart", unmuteOnce, { once: true, capture: true, passive: true });
      });
    }
    return;
  }

  // No baked audio — keep the legacy muted-autoplay path.
  video.muted = true;
  const playAttempt = video.play();
  if (playAttempt?.catch) {
    playAttempt.catch(() => {
      clearRecognitionVoiceCues();
      stage?.classList.add("is-fallback");
    });
  }
}

function restartRecognitionVideo({ audible = false } = {}) {
  const video = app.querySelector("[data-recognition-video]");
  if (!video) return;
  const stage = video.closest(".recognition-stage, .story-world, .lesson-stage, .recognize-cinema__stage");
  if (stage?.classList.contains("is-reduced")) return;
  try {
    video.currentTime = 0;
    video.muted = !audible;
  } catch {
    return;
  }
  stage?.classList.remove("is-ended", "is-fallback");
  const playAttempt = video.play();
  if (playAttempt?.then) {
    playAttempt
      .then(() => stage?.classList.add("is-ready"))
      .catch(() => {
        clearRecognitionVoiceCues();
        stage?.classList.add("is-fallback");
        if (audible) speakCurrent();
      });
  }
}

function clearRecognitionVoiceCues() {
  recognitionCueTimers.forEach((timer) => clearTimeout(timer));
  recognitionCueTimers = [];
}

function scheduleRecognitionVoiceCues(video, cues) {
  clearRecognitionVoiceCues();
  if (!Array.isArray(cues) || cues.length === 0) return;
  const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  cues
    .filter((cue) => Number.isFinite(cue.at) && cue.text && cue.at >= currentTime)
    .forEach((cue) => {
      const delay = Math.max(0, (cue.at - currentTime) * 1000);
      recognitionCueTimers.push(
        setTimeout(() => {
          speakText(cue.text, {
            rate: Number.isFinite(cue.rate) ? cue.rate : 0.9,
            pitch: Number.isFinite(cue.pitch) ? cue.pitch : 1,
            interrupt: false,
            preset: "cue",
            pauseScale: 0.85
          });
        }, delay)
      );
    });
}

function currentHomeMapFocusKey() {
  if (learnedCount() === 0) return "start";
  return isUnitComplete() ? "next" : `group-${activeHomeGroup()}`;
}

function homeMapFocusY() {
  if (learnedCount() === 0) return HOME_START_FOCUS_Y;
  if (isUnitComplete()) return HOME_GROUP_FOCUS_Y.next;
  return HOME_GROUP_FOCUS_Y[activeHomeGroup()] || HOME_GROUP_FOCUS_Y[1];
}

function groupPool(group) {
  return unit01.characters.filter((item) => item.group === group);
}

function makeQuestion(type, target, pool) {
  const distractors = pool.filter((item) => item.id !== target.id).slice(0, 2);
  const options = shuffle([target, ...distractors]);
  const titles = {
    image: "看图，选出正确的字",
    audio: "听一听，选出正确的字"
  };
  return {
    type,
    target,
    title: titles[type],
    answerId: target.id,
    options
  };
}

function startQuiz(kind) {
  const pool = kind === "unitTest" ? unit01.characters : groupPool(currentChar().group);
  const targets = kind === "unitTest"
    ? [
        unit01.characters[0],
        unit01.characters[3],
        unit01.characters[5],
        unit01.characters[8],
        unit01.characters[10],
        unit01.characters[13],
        unit01.characters[15],
        unit01.characters[19]
      ]
    : pool;
  return {
    kind,
    index: 0,
    score: 0,
    answers: [],
    questions: targets.map((target, index) => makeQuestion(index % 3 === 1 ? "audio" : "image", target, pool))
  };
}

function nextPendingStudyIndex() {
  const review = unit01.characters.findIndex((item) => needsReview(item.id));
  if (review !== -1) return review;
  return unit01.characters.findIndex((item) => !isRecognized(item.id));
}

function groupHasPendingStudy(group) {
  return groupPool(group).some((item) => needsReview(item.id) || !isRecognized(item.id));
}

function groupNeedsQuiz(group) {
  return groupPool(group).some((item) => isRecognized(item.id) && !needsReview(item.id) && !isMastered(item.id));
}

function shuffle(items) {
  return [...items].sort((a, b) => {
    const seedA = a.id.charCodeAt(0) + a.char.charCodeAt(0);
    const seedB = b.id.charCodeAt(0) + b.char.charCodeAt(0);
    return (seedA % 7) - (seedB % 7);
  });
}

function answerQuestion(answerId) {
  const question = state.route === "practice" ? state.question : state.quiz?.questions[state.quiz.index];
  if (!question || state.selectedAnswer) return;
  const correct = answerId === question.answerId;
  const world = storyWorldFor(question.target);
  state.progress = {
    ...state.progress,
    totalAnswers: state.progress.totalAnswers + 1,
    correctAnswers: state.progress.correctAnswers + (correct ? 1 : 0),
    dayKey: localDayKey(),
    lastActiveDayKey: localDayKey()
  };
  saveProgress();
  state.selectedAnswer = answerId;
  if (correct) {
    markRecognized(question.target.id);
  } else {
    markNeedsReview(question.target.id);
  }
  state.feedback = world
    ? (correct ? world.success : world.retry)
    : correct
      ? `答对啦，「${question.target.char}」的星星亮起来了。`
      : `这次先认识「${question.target.char}」，再看一眼就更熟。`;

  if (state.route === "practice") {
    state.showCelebration = false;
    if (!correct) {
      startReplayCue(question.target, "practice");
      return;
    }
    render();
    return;
  }

  state.quiz.answers[state.quiz.index] = {
    targetId: question.target.id,
    answerId,
    correct,
    answeredAt: Date.now()
  };
  if (correct) state.quiz.score += 1;
  if (!correct) {
    startReplayCue(question.target, "quiz");
    return;
  }
  render();
  schedule(nextQuizQuestion, 760);
}

function startReplayCue(target, kind) {
  clearTimeout(replayTimer);
  const world = storyWorldFor(target);
  const teach = (world && world.retry) || `再看一眼「${target.char}」的样子。`;
  state.replay = {
    targetId: target.id,
    char: target.char,
    pinyin: target.pinyin,
    color: target.color,
    teach,
    kind,
    startedAt: Date.now()
  };
  render();
  try { speak(target); } catch {}
  replayTimer = setTimeout(dismissReplayCue, REPLAY_DURATION_MS);
}

function dismissReplayCue() {
  clearTimeout(replayTimer);
  replayTimer = null;
  const kind = state.replay?.kind;
  state.replay = null;
  try { cancelSpeech(); } catch {}
  try { cancelBakedAudio(); } catch {}
  if (kind === "practice") {
    state.feedback = "";
    state.selectedAnswer = "";
    render();
    return;
  }
  if (kind === "quiz") {
    nextQuizQuestion();
  }
}

function cancelReplayCue() {
  if (!state.replay && !replayTimer) return;
  clearTimeout(replayTimer);
  replayTimer = null;
  state.replay = null;
  try { cancelSpeech(); } catch {}
  try { cancelBakedAudio(); } catch {}
}

function openMicroReview(item) {
  if (!item) return;
  clearTimeout(microReviewTimer);
  state.microReview = {
    targetId: item.id,
    char: item.char,
    pinyin: item.pinyin,
    color: item.color,
    phrase: item.phrase || "",
    words: (item.words || []).slice(0, 3),
    glyphHook: item.glyphHook || "",
    lifeMapping: item.lifeMapping || item.scene || "",
    startedAt: Date.now()
  };
  render();
  try { speak(item); } catch {}
  microReviewTimer = setTimeout(dismissMicroReview, MICRO_REVIEW_DURATION_MS);
}

function dismissMicroReview() {
  clearTimeout(microReviewTimer);
  microReviewTimer = null;
  state.microReview = null;
  try { cancelSpeech(); } catch {}
  try { cancelBakedAudio(); } catch {}
  nextAfterPractice();
}

function cancelMicroReview() {
  if (!state.microReview && !microReviewTimer) return;
  clearTimeout(microReviewTimer);
  microReviewTimer = null;
  state.microReview = null;
  try { cancelSpeech(); } catch {}
  try { cancelBakedAudio(); } catch {}
}

function microReviewMarkup() {
  const m = state.microReview;
  if (!m) return "";
  const words = m.words.length
    ? m.words.map((w) => `<span>${w}</span>`).join("")
    : "";
  return `
    <div class="micro-review" role="dialog" aria-live="polite" aria-label="再看一眼${m.char}">
      <div class="micro-review__panel" style="--char-color:${m.color || '#5d4a36'}">
        <span class="micro-review__head">再看一眼</span>
        <strong class="micro-review__char">${m.char}</strong>
        <span class="micro-review__pinyin">${m.pinyin || ""}</span>
        ${m.glyphHook ? `<p class="micro-review__glyph">${m.glyphHook}</p>` : ""}
        ${m.lifeMapping ? `<p class="micro-review__life">${m.lifeMapping}</p>` : ""}
        ${words ? `<div class="micro-review__words">${words}</div>` : ""}
        <div class="micro-review__bar" aria-hidden="true"><i></i></div>
        <button class="cta cta--gold micro-review__cta" data-action="micro-review-next">去下一个 →</button>
      </div>
    </div>
  `;
}

function replayMarkup() {
  const r = state.replay;
  if (!r) return "";
  return `
    <div class="replay-card" role="dialog" aria-live="polite" aria-label="再看一眼${r.char}">
      <div class="replay-card__panel" style="--char-color:${r.color || '#5d4a36'}">
        <span class="replay-card__head">再看一眼</span>
        <strong class="replay-card__char">${r.char}</strong>
        <span class="replay-card__pinyin">${r.pinyin || ""}</span>
        <p class="replay-card__teach">${r.teach}</p>
        <svg class="replay-card__ring" viewBox="0 0 44 44" aria-hidden="true">
          <circle class="replay-card__ring-track" cx="22" cy="22" r="20"></circle>
          <circle class="replay-card__ring-progress" cx="22" cy="22" r="20"></circle>
        </svg>
      </div>
    </div>
  `;
}

function nextAfterPractice() {
  const completedGroup = currentChar().group;
  state.showCelebration = false;
  state.feedback = "";
  state.selectedAnswer = "";
  state.question = null;

  if (!groupHasPendingStudy(completedGroup) && groupNeedsQuiz(completedGroup)) {
    state.quiz = null;
    state.route = "groupQuiz";
    render();
    return;
  }

  const nextIndex = nextPendingStudyIndex();
  if (nextIndex === -1) {
    state.quiz = null;
    state.route = "unitTest";
    render();
    return;
  }

  state.currentIndex = nextIndex;
  state.strokeDone = 0;
  state.route = "recognize";
  scheduleIntroSpeech(180);
  render();
}

function nextQuizQuestion() {
  state.feedback = "";
  state.selectedAnswer = "";
  if (!state.quiz) return;
  if (state.quiz.index < state.quiz.questions.length - 1) {
    state.quiz.index += 1;
    render();
    return;
  }

  const completedQuiz = state.quiz;
  markMasteredFromQuiz(completedQuiz);

  if (completedQuiz.kind === "unitTest") {
    const score = completedQuiz.score;
    const stars = score >= 8 ? 3 : score >= 7 ? 2 : score >= unit01.passScore ? 1 : 0;
    const passed = score >= unit01.passScore;
    updateProgress({
      bestScore: Math.max(state.progress.bestScore, score),
      bestStars: Math.max(state.progress.bestStars, stars)
    });
    state.result = { score, total: completedQuiz.questions.length, stars, passed };
    state.quiz = null;
    state.route = "result";
    render();
    return;
  }

  const nextIndex = nextPendingStudyIndex();
  state.quiz = null;
  if (isUnitMastered()) {
    state.route = "celebrate";
    render();
    return;
  }
  if (nextIndex === -1) {
    state.route = "unitTest";
  } else {
    state.currentIndex = nextIndex;
    state.strokeDone = 0;
    state.route = "recognize";
    scheduleIntroSpeech(180);
  }
  render();
}

function completeStroke() {
  const total = currentChar().strokes.length;
  if (state.strokeDone >= total) return;
  state.strokeDone += 1;
  render();
  if (state.strokeDone >= total) {
    finishWriting();
  }
}

function finishWriting() {
  state.strokeDone = currentChar().strokes.length;
  const world = storyWorldFor(currentChar());
  markTraced(currentChar().id);
  state.showCelebration = false;
  state.feedback = world ? "画好啦。" : "写好啦。";
  render();
  schedule(() => {
    state.showCelebration = false;
    state.question = makeQuestion(state.currentIndex % 2 === 0 ? "image" : "audio", currentChar(), groupPool(currentChar().group));
    state.feedback = "";
    state.selectedAnswer = "";
    state.route = "practice";
    render();
    if (state.question.type === "audio") schedule(() => speakQuestion(), 200);
  }, 900);
}

function speakCurrent() {
  speak(currentChar());
}

function speakQuestion() {
  const question = state.route === "practice" ? state.question : state.quiz?.questions[state.quiz.index];
  if (question) speak(question.target);
}

function speak(item) {
  if (speakBaked(item)) return;
  const phrase = item.phrase || item.words?.[0] || item.char;
  const teachingSegments = splitSpeechText(item.soundCue || nativeTeachingCue(item))
    .map((segment) => ({
      ...segment,
      rateOffset: -0.03,
      pitchOffset: -0.01
    }));
  speakSegments([
    { text: item.char, pauseAfter: 520, rateOffset: -0.06, pitchOffset: 0.04 },
    { text: phrase, pauseAfter: 440 },
    ...teachingSegments
  ], { preset: "lesson" });
}

let activeBakedAudio = null;
let bakedSequenceId = 0;
const BAKED_SEGMENT_GAP_MS = { char: 380, phrase: 320, soundCue: 0 };
const BAKED_AUDIO_BASE = "./assets/audio/unit-01/";

function bakedAudioFor(item) {
  return unit01BakedAudio?.characters?.[item?.id] || null;
}

function hasBakedSpeak(item) {
  const m = bakedAudioFor(item);
  return Boolean(m?.char?.src && m?.phrase?.src && m?.soundCue?.src);
}

function cancelBakedAudio() {
  bakedSequenceId += 1;
  if (activeBakedAudio) {
    try { activeBakedAudio.pause(); } catch {}
    try { activeBakedAudio.removeAttribute("src"); activeBakedAudio.load?.(); } catch {}
    activeBakedAudio = null;
  }
}

function speakBaked(item) {
  if (!hasBakedSpeak(item)) return false;
  const manifest = bakedAudioFor(item);
  const order = ["char", "phrase", "soundCue"];
  const queue = order.map((id) => ({ id, src: manifest[id].src }));
  cancelBakedAudio();
  clearSpeechQueue({ cancel: true });
  const seq = ++bakedSequenceId;
  const playAt = (i) => {
    if (seq !== bakedSequenceId || i >= queue.length) {
      if (seq === bakedSequenceId) activeBakedAudio = null;
      return;
    }
    const audio = new Audio(queue[i].src);
    activeBakedAudio = audio;
    audio.preload = "auto";
    const advance = () => {
      const gap = BAKED_SEGMENT_GAP_MS[queue[i].id] ?? 280;
      setTimeout(() => playAt(i + 1), gap);
    };
    audio.addEventListener("ended", advance, { once: true });
    audio.addEventListener("error", advance, { once: true });
    audio.play().catch(() => advance());
  };
  playAt(0);
  return true;
}

function preferredChineseVoice() {
  if (!("speechSynthesis" in window)) return null;
  if (cachedChineseVoice) return cachedChineseVoice;
  const voices = window.speechSynthesis.getVoices?.() || [];
  const chineseVoices = voices.filter((voice) => /^zh[-_]/i.test(voice.lang || ""));
  if (chineseVoices.length === 0) return null;
  cachedChineseVoice = chineseVoices.find((voice) => PREFERRED_CHINESE_VOICE_MATCHES.some((pattern) => pattern.test(voice.name)))
    || chineseVoices.find((voice) => /zh[-_]cn/i.test(voice.lang || ""))
    || chineseVoices[0];
  return cachedChineseVoice;
}

function clearSpeechQueue({ cancel = true } = {}) {
  speechQueueTimers.forEach((timer) => clearTimeout(timer));
  speechQueueTimers = [];
  speechSequenceId += 1;
  if (cancel) window.speechSynthesis?.cancel?.();
}

function normalizeSpeechText(text) {
  return `${text || ""}`.replace(/\s+/g, " ").trim();
}

function speechPauseAfter(text, scale = 1) {
  const trimmed = normalizeSpeechText(text);
  if (!trimmed) return 0;
  const mark = trimmed[trimmed.length - 1];
  return Math.round((SPEECH_PAUSE_MS[mark] ?? 170) * scale);
}

function stripSpeechEnding(text) {
  return normalizeSpeechText(text).replace(/[，,。.!！？?；;、]+$/u, "");
}

function splitSpeechText(text) {
  const normalized = normalizeSpeechText(text);
  if (!normalized) return [];
  const parts = normalized.match(/[^，,。.!！？?；;、]+[，,。.!！？?；;、]?/gu) || [normalized];
  return parts
    .map((part) => {
      const clean = stripSpeechEnding(part);
      return clean ? { text: clean, pauseAfter: speechPauseAfter(part) } : null;
    })
    .filter(Boolean);
}

function speakSegments(segments, { preset = "cue", interrupt = true, rate, pitch, pauseScale } = {}) {
  if (!("speechSynthesis" in window)) {
    showToast(segments.map((segment) => segment.text).join(" "));
    return;
  }
  const style = SPEECH_STYLE_PRESETS[preset] || SPEECH_STYLE_PRESETS.cue;
  if (interrupt) {
    clearSpeechQueue();
  } else {
    speechQueueTimers.forEach((timer) => clearTimeout(timer));
    speechQueueTimers = [];
  }
  const sequenceId = speechSequenceId;
  const baseRate = rate ?? style.rate;
  const basePitch = pitch ?? style.pitch;
  const activePauseScale = pauseScale ?? style.pauseScale ?? 1;
  const voice = preferredChineseVoice();
  const queue = segments
    .map((segment) => ({
      ...segment,
      text: normalizeSpeechText(segment.text)
    }))
    .filter((segment) => segment.text);

  const speakAt = (index) => {
    if (sequenceId !== speechSequenceId || index >= queue.length) return;
    const segment = queue[index];
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = "zh-CN";
    if (voice) utterance.voice = voice;
    utterance.rate = clamp(baseRate + (segment.rateOffset || 0), 0.62, 1.08);
    utterance.pitch = clamp(basePitch + (segment.pitchOffset || 0), 0.82, 1.24);
    utterance.onend = () => {
      if (sequenceId !== speechSequenceId) return;
      const baseDelay = segment.pauseAfter ?? speechPauseAfter(segment.text);
      const delay = Math.max(0, Math.round(baseDelay * activePauseScale));
      const timer = setTimeout(() => speakAt(index + 1), delay);
      speechQueueTimers.push(timer);
    };
    utterance.onerror = () => {
      if (sequenceId !== speechSequenceId) return;
      const timer = setTimeout(() => speakAt(index + 1), 120);
      speechQueueTimers.push(timer);
    };
    window.speechSynthesis.speak(utterance);
  };

  speakAt(0);
}

function speakText(text, { rate, pitch, interrupt = true, preset = "cue", pauseScale } = {}) {
  const segments = splitSpeechText(text);
  if (segments.length === 0) return;
  speakSegments(segments, { preset, interrupt, rate, pitch, pauseScale });
}

function cancelSpeech() {
  cancelBakedAudio();
  clearSpeechQueue();
}

function saveShareCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1400;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FAF6F0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFF4C7";
  roundRect(ctx, 70, 80, 760, 1040, 54);
  ctx.fill();
  ctx.fillStyle = "#FFC947";
  ctx.beginPath();
  ctx.arc(450, 285, 116, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4A3827";
  ctx.textAlign = "center";
  ctx.font = "900 82px PingFang SC, sans-serif";
  ctx.fillText("星光识字", 450, 505);
  ctx.font = "800 62px PingFang SC, sans-serif";
  ctx.fillText(`已答对 ${learnedCount()} 个汉字`, 450, 610);
  ctx.font = "700 38px PingFang SC, sans-serif";
  ctx.fillStyle = "#7A6A55";
  ctx.fillText(`正确率 ${learningAccuracy()}% · 第一单元`, 450, 690);
  const learnedChars = unit01.characters
    .filter((item) => isRecognized(item.id))
    .slice(0, 12)
    .map((item) => item.char);
  ctx.fillStyle = "#4A3827";
  ctx.font = "900 56px PingFang SC, sans-serif";
  wrapGridText(ctx, learnedChars, 450, 830);
  ctx.fillStyle = "#E8A800";
  ctx.font = "900 96px PingFang SC, sans-serif";
  ctx.fillText("★ ★ ★", 450, 1040);
  const link = document.createElement("a");
  link.download = "starlight-share-card.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  updateProgress({ shareSaved: true });
  showToast("海报已生成");
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapGridText(ctx, chars, centerX, y) {
  const cols = 6;
  const gap = 98;
  chars.forEach((char, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = centerX - ((cols - 1) * gap) / 2 + col * gap;
    ctx.fillText(char, x, y + row * 88);
  });
}

function handleClick(event) {
  if (Date.now() < suppressHomeClickUntil) {
    event.preventDefault();
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (action === "go") { cancelReplayCue(); cancelMicroReview(); setState({ route: target.dataset.route, feedback: "", selectedAnswer: "", showCelebration: false }); }
  if (action === "open-unit") setState({ route: "unit" });
  if (action === "open-treasure") setState({ route: "treasure", showCelebration: false });
  if (action === "open-verify") setState({ verifyOpen: true, verifyInput: "" });
  if (action === "locked") {
    if (isUnitComplete()) {
      setState({ route: "payment" });
    } else {
      showToast("完成第一单元后开启");
    }
  }
  if (action === "start-learning") {
    setState({ route: "recognize", currentIndex: nextStudyIndex(), strokeDone: 0, feedback: "", selectedAnswer: "" });
    scheduleIntroSpeech(150);
  }
  if (action === "jump-char") {
    state.currentIndex = Number(target.dataset.index);
    state.strokeDone = 0;
    state.question = null;
    setState({ route: "recognize", feedback: "", selectedAnswer: "" });
    scheduleIntroSpeech(150);
  }
  if (action === "speak-current") {
    if (state.route === "recognize" && (hasRecognitionVoiceCues(currentChar()) || hasBakedRecognitionAudio(currentChar()))) {
      cancelSpeech();
      restartRecognitionVideo({ audible: true });
    } else {
      speakCurrent();
    }
  }
  if (action === "replay-recognition") {
    cancelSpeech();
    restartRecognitionVideo({ audible: true });
  }
  if (action === "touch-world") {
    const message = target.dataset.say || storyWorldFor(currentChar())?.teacher || currentChar().phrase;
    state.feedback = message;
    render();
    speakText(message, { preset: "discovery" });
  }
  if (action === "speak-question") speakQuestion();
  if (action === "to-write") setState({ route: "write", strokeDone: 0, feedback: "", selectedAnswer: "" });
  if (action === "reset-writing") setState({ strokeDone: 0, feedback: "" });
  if (action === "skip-writing") {
    finishWriting();
  }
  if (action === "answer-question") answerQuestion(target.dataset.answer);
  if (action === "practice-next") openMicroReview(currentChar());
  if (action === "micro-review-next") dismissMicroReview();
  if (action === "dismiss-recovery-banner") {
    updateProgress({ recoveryBannerDismissedAt: Date.now() });
    render();
  }
  if (action === "dismiss-first-guide") {
    cancelSpeech();
    updateProgress({ firstGuideSeen: true });
    render();
  }
  if (action === "review-current") {
    state.feedback = "";
    state.selectedAnswer = "";
    state.question = null;
    setState({ route: "recognize" });
    scheduleIntroSpeech(150);
  }
  if (action === "retry-test") setState({ route: "unitTest", quiz: null, result: null, feedback: "", selectedAnswer: "" });
  if (action === "go-payment") setState({ route: "payment" });
  if (action === "choose-pay") setState({ payChoice: target.dataset.choice });
  if (action === "confirm-pay") {
    updateProgress({ paidIntent: true });
    showToast("已记录解锁意向");
  }
  if (action === "save-share") saveShareCard();
  if (action === "copy-link") {
    navigator.clipboard?.writeText(location.href);
    showToast("链接已复制");
  }
  if (action === "close-verify") setState({ verifyOpen: false, verifyInput: "" });
  if (action === "verify-key") {
    const value = `${state.verifyInput}${target.dataset.key}`.slice(0, 2);
    setState({ verifyInput: value });
  }
  if (action === "verify-submit") {
    if (state.verifyInput === "8") {
      setState({ verifyOpen: false, verifyInput: "", route: "parent" });
    } else {
      setState({ verifyInput: "" });
      showToast("再试一下");
    }
  }
}

function nextStudyIndex() {
  const next = nextPendingStudyIndex();
  return next === -1 ? 0 : next;
}

function nextUnlearnedIndex() {
  return nextStudyIndex();
}

function handlePointerDown(event) {
  const homeMap = event.target.closest("[data-home-map]");
  const actionTarget = event.target.closest("[data-action]");
  if (homeMap && state.route === "home" && !actionTarget) {
    homeMapDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      startMapY: homeMapY ?? defaultHomeMapY(),
      moved: false
    };
    homeMap.setPointerCapture?.(event.pointerId);
  }

  if (!event.target.closest(".writing-pad")) return;
  strokePointer = { x: event.clientX, y: event.clientY };
}

function handlePointerMove(event) {
  if (!homeMapDrag || homeMapDrag.pointerId !== event.pointerId) return;
  const deltaY = event.clientY - homeMapDrag.startY;
  if (Math.abs(deltaY) > 5) homeMapDrag.moved = true;
  const { min, max } = homeMapBounds();
  homeMapY = clamp(homeMapDrag.startMapY + deltaY, min, max);
  homeMapDrag.lastY = event.clientY;
  applyHomeMapY();
}

function handlePointerUp(event) {
  if (homeMapDrag && homeMapDrag.pointerId === event.pointerId) {
    const didMove = homeMapDrag.moved;
    homeMapDrag = null;
    if (didMove) suppressHomeClickUntil = Date.now() + 220;
  }

  if (!event.target.closest(".writing-pad") || !strokePointer) return;
  const dx = event.clientX - strokePointer.x;
  const dy = event.clientY - strokePointer.y;
  const distance = Math.hypot(dx, dy);
  strokePointer = null;
  if (distance > 18) completeStroke();
}

app.addEventListener("click", handleClick);
app.addEventListener("pointerdown", handlePointerDown);
app.addEventListener("pointermove", handlePointerMove);
app.addEventListener("pointerup", handlePointerUp);
app.addEventListener("pointercancel", () => {
  homeMapDrag = null;
  strokePointer = null;
});
window.addEventListener("resize", hydrateHomeMap);

if ("serviceWorker" in navigator && ["127.0.0.1", "localhost"].includes(location.hostname)) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !["127.0.0.1", "localhost"].includes(location.hostname)) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
