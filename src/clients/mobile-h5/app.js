import { teaserUnit, unit01 } from "../../shared/unit-01.js";

const app = document.querySelector("#app");
const STORAGE_KEY = "starlight-literacy-mobile-h5-v1";
const MAP_DESIGN_WIDTH = 390;
const MAP_DESIGN_HEIGHT = 1800;
const MAP_FOCUS_Y = 846;

const groups = Array.from(new Set(unit01.characters.map((item) => item.group)));
const groupImages = {
  1: "../../../images/p01-start-house-large-ui-20260426.png",
  2: "../../../images/p01-start-home-entrance-ui-20260426.png",
  3: "../../../images/generated-daytime-fire-lesson.png",
  4: "../../../images/generated-daytime-result-celebration-clean.png"
};

const defaultProgress = {
  learnedIds: [],
  correctAnswers: 0,
  totalAnswers: 0,
  bestScore: 0,
  bestStars: 0,
  paidIntent: false,
  startedAt: Date.now(),
  dayKey: todayKey(),
  shareSaved: false
};

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
  progress: loadProgress()
};

let strokePointer = null;
let homeMapY = null;
let homeMapDrag = null;
let suppressHomeClickUntil = 0;
let toastTimer = null;
let transientTimer = null;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.dayKey !== todayKey()) return { ...defaultProgress };
    return { ...defaultProgress, ...saved };
  } catch {
    return { ...defaultProgress };
  }
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
  saveProgress();
}

function currentChar() {
  return unit01.characters[state.currentIndex] || unit01.characters[0];
}

function learnedCount() {
  return state.progress.learnedIds.length;
}

function learningAccuracy() {
  if (!state.progress.totalAnswers) return 0;
  return Math.round((state.progress.correctAnswers / state.progress.totalAnswers) * 100);
}

function elapsedMinutes() {
  return Math.min(45, Math.max(1, Math.round((Date.now() - state.progress.startedAt) / 60000)));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
  if (item.id === "huo") return "../../../images/generated-daytime-fire-lesson.png";
  return groupImages[item.group] || "../../../images/generated-daytime-fire-lesson.png";
}

function render() {
  app.innerHTML = `<div class="phone"><div class="screen">${routeMarkup()}${verifyMarkup()}${celebrationMarkup()}${toastMarkup()}</div></div>`;
  if (state.route === "home") hydrateHomeMap();
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
    treasure: renderTreasure,
    parent: renderParent,
    payment: renderPayment
  };
  return (routes[state.route] || renderHome)();
}

function renderHome() {
  const hasStarted = learnedCount() > 0;
  return `
    <section class="home" data-screen="home">
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

          <button class="journey-node journey-node--done journey-node--u1" data-action="open-treasure" aria-label="第一站已点亮">
            <span class="journey-node__orb"><span>${icon("check")}</span></span>
            <span class="journey-node__badge">★</span>
          </button>
          <div class="journey-label journey-label--u1">
            <strong>第一站 · 已点亮</strong>
            <span>${learnedCount()} / ${unit01.characters.length} 个字</span>
          </div>

          <button class="journey-node journey-node--done journey-node--u2" data-action="open-treasure" aria-label="小星宝库">
            <span class="journey-node__orb"><span>${icon("treasure")}</span></span>
            <span class="journey-node__badge">★</span>
          </button>
          <div class="journey-label journey-label--u2">
            <strong>小星宝库</strong>
            <span>收集今天的小星星</span>
          </div>

          <button class="journey-node journey-node--done journey-node--u3" data-action="open-unit" aria-label="启蒙第一课">
            <span class="journey-node__orb"><span>${hasStarted ? icon("check") : icon("play")}</span></span>
            <span class="journey-node__badge">★</span>
          </button>
          <div class="journey-label journey-label--u3">
            <strong>启蒙第一课</strong>
            <span>一 二 三 大 小</span>
          </div>

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

          <div class="home-map__mist" aria-hidden="true"></div>

          <div class="map-brand" aria-hidden="true">
            <span>★</span>
            <strong>星光识字</strong>
          </div>
          <button class="map-top-btn map-top-btn--treasure" data-action="open-treasure" aria-label="小星宝库">★</button>
          <button class="map-top-btn map-top-btn--parent" data-action="open-verify" aria-label="家长中心">${icon("parent")}</button>

          <button class="map-future" data-action="locked" aria-label="更多旅程">
            <strong>更多旅程</strong>
            <span>云雾后面 · 即将开启</span>
          </button>

          <button class="journey-node journey-node--next journey-node--u5" data-action="locked" aria-label="第二单元待解锁">
            <span>★</span>
          </button>
          <div class="journey-label journey-label--u5">
            <strong>下一站</strong>
            <span>完成本关后开启</span>
          </div>

          <button class="journey-current" data-action="open-unit" aria-label="${hasStarted ? "继续学习第一单元" : "开始学习第一单元"}">
            <span class="journey-current__ring"></span>
            <span class="journey-current__shadow"></span>
            <span class="journey-current__orb">
              <span class="journey-current__shine"></span>
              <span class="journey-current__icon">${hasStarted ? "✦" : icon("play")}</span>
            </span>
            <span class="journey-current__badge">${icon("play")}</span>
          </button>
          <div class="journey-sign">
            <strong>第一单元</strong>
            <span>${hasStarted ? "继续学习" : "启蒙第一课"}</span>
          </div>
          <div class="journey-progress-pill">已学 ${learnedCount()} / ${unit01.characters.length}</div>

          <span class="map-breeze map-breeze--one" aria-hidden="true"></span>
          <span class="map-breeze map-breeze--two" aria-hidden="true"></span>
          <span class="map-breeze map-breeze--three" aria-hidden="true"></span>
          <span class="map-twinkle map-twinkle--left" aria-hidden="true">✦</span>
          <span class="map-twinkle map-twinkle--right" aria-hidden="true">✦</span>
        </div>
        <div class="home-map__top-fade" aria-hidden="true"></div>
      </div>
    </section>
  `;
}

function renderUnit() {
  const progressValue = Math.round((learnedCount() / unit01.characters.length) * 100);
  return `
    <section class="screen--scroll page-pad">
      ${topbar("第一单元", "启蒙第一课", "home")}
      <div class="unit-hero">
        <div>
          <h2>${unit01.title}</h2>
          <p>${unit01.subtitle}</p>
        </div>
        <div class="unit-hero__stamp" aria-hidden="true"></div>
      </div>
      <div class="progress-line">
        <span>已学 ${learnedCount()} / ${unit01.characters.length}</span>
        <div class="progress-bar" aria-hidden="true"><i style="--value:${progressValue}%"></i></div>
        <span>${progressValue}%</span>
      </div>
      <div class="char-grid">
        ${unit01.characters.map((item, index) => {
          const learned = state.progress.learnedIds.includes(item.id);
          const current = index === state.currentIndex && !learned;
          return `
            <button class="char-tile ${learned ? "char-tile--learned" : ""} ${current ? "char-tile--current" : ""}" data-action="jump-char" data-index="${index}">
              <strong>${item.char}</strong>
              <span>${item.pinyin}</span>
            </button>
          `;
        }).join("")}
      </div>
      <div class="bottom-action">
        <button class="cta" data-action="start-learning">${learnedCount() ? "继续学习" : `${icon("play")} 开始学习`}</button>
      </div>
    </section>
  `;
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
        <span class="mode-tab ${active === "practice" ? "mode-tab--active" : ""}">练</span>
        <span class="mode-tab ${active === "write" ? "mode-tab--active" : ""}">${icon("pen")} 写</span>
      </div>
    </div>
  `;
}

function renderRecognize() {
  const item = currentChar();
  const isFirst = item.id === "yi" && !state.progress.learnedIds.includes("yi");
  return `
    <section class="page-pad recognize">
      ${renderLessonTabs("recognize")}
      <button class="illustration-card ${item.id === "huo" ? "illustration-card--fullpage" : ""}" data-action="speak-current" aria-label="播放 ${item.char} 的语音">
        <img src="${imageFor(item)}" alt="${item.scene}" />
        <span class="learn-sparkles" aria-hidden="true"></span>
        <span class="speech-orbit" aria-hidden="true">${icon("sound")}</span>
      </button>
      <div class="hero-char-block">
        <div class="hero-char" data-char="${item.char}" style="--char-color:${item.color}">${item.char}</div>
        <div class="pinyin">${item.tone}</div>
        <div class="phrase">${item.phrase}</div>
      </div>
      <div class="word-card">
        <h3>常见组词</h3>
        <div class="word-list">
          ${item.words.map((word) => `<span class="word-chip">${word}</span>`).join("")}
        </div>
      </div>
      ${isFirst ? `<div class="guide-bubble"><span class="guide-hand">☝</span><span>点一下，听声音哦</span></div>` : ""}
      <div class="bottom-action">
        <button class="cta" data-action="to-write">下一步 →</button>
      </div>
    </section>
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
    <section class="page-pad write-layout">
      ${renderLessonTabs("write")}
      <div>
        <h1 class="write-title">${item.char} <span class="caption">${item.tone}</span></h1>
        <div class="writing-card">
          <div class="writing-pad" data-action="writing-pad" aria-label="书写 ${item.char}">
            <div class="writing-pad__char">${item.char}</div>
            <svg class="stroke-svg" viewBox="0 0 100 100" aria-hidden="true">
              ${item.strokes.map((stroke, index) => `
                <line class="${index < state.strokeDone ? "done" : ""}" x1="${stroke.x1}" y1="${stroke.y1}" x2="${stroke.x2}" y2="${stroke.y2}"></line>
              `).join("")}
            </svg>
            ${state.strokeDone < total ? `<span class="finger" style="${fingerStyle}">☝</span>` : ""}
          </div>
          <div class="write-progress">
            ${item.strokes.map((_, index) => `<span class="write-dot ${index < state.strokeDone ? "done" : ""}"></span>`).join("")}
          </div>
          <div class="write-actions">
            <button class="secondary-btn" data-action="reset-writing">重写</button>
            <button class="secondary-btn" data-action="skip-writing">跳过</button>
          </div>
        </div>
      </div>
      ${item.id === "yi" && state.strokeDone === 0 ? `<div class="guide-bubble"><span class="guide-hand">☝</span><span>跟着小手，划一划</span></div>` : ""}
    </section>
  `;
}

function renderPractice() {
  const question = state.question || makeQuestion("image", currentChar(), groupPool(currentChar().group));
  if (!state.question) state.question = question;
  return `
    <section class="page-pad question-shell">
      ${renderLessonTabs("practice")}
      ${questionMarkup(question, "单字速练")}
      <div class="bottom-action">
        ${state.feedback ? `<button class="cta cta--gold" data-action="practice-next">继续</button>` : ""}
      </div>
    </section>
  `;
}

function renderQuiz() {
  const quiz = state.quiz || startQuiz(state.route === "unitTest" ? "unitTest" : "groupQuiz");
  if (!state.quiz) state.quiz = quiz;
  const question = quiz.questions[quiz.index];
  const label = state.route === "unitTest" ? "单元测验" : `第 ${currentChar().group} 组练习`;
  return `
    <section class="page-pad question-shell">
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
      <div class="audio-card">
        <button class="audio-card__button" data-action="speak-question">${icon("sound")}</button>
      </div>
    ` : `
      <div class="quiz-art">
        <img src="${imageFor(question.target)}" alt="${question.target.scene}" />
      </div>
    `}
    <h2 class="question-title">${question.title}</h2>
    <div class="answer-grid">
      ${question.options.map((item) => {
        const selected = state.selectedAnswer === item.id;
        const resultClass = selected ? (item.id === question.answerId ? "correct" : "wrong") : "";
        return `
          <button class="answer-card ${resultClass}" data-action="answer-question" data-answer="${item.id}">
            <span><strong>${item.char}</strong><span>${item.pinyin}</span></span>
          </button>
        `;
      }).join("")}
    </div>
    ${state.feedback ? `<div class="feedback-bar">${state.feedback}</div>` : ""}
  `;
}

function renderResult() {
  const result = state.result || { score: 0, total: 8, stars: 0, passed: false };
  const title = result.passed ? "星星点亮啦" : "再试一次吧";
  return `
    <section class="page-pad">
      ${topbar("测验结果", "", "unit")}
      <div class="result-hero">
        <div class="stars" aria-label="${result.stars} 星">
          ${[1, 2, 3].map((star) => `<span class="${star <= result.stars ? "active" : ""}">★</span>`).join("")}
        </div>
        <div class="result-score">
          <div>
            <strong>${result.score}/${result.total}</strong>
            <span>答对</span>
          </div>
        </div>
        <h1 class="topbar__title" style="font-size:30px">${title}</h1>
        <p class="caption" style="max-width:270px">${result.passed ? "第一单元已经完成，小星宝库多了一张新卡片。" : "这些字已经见过面了，再玩一轮会更熟。"}</p>
      </div>
      <div class="bottom-action stack">
        ${result.passed ? `
          <button class="cta cta--gold" data-action="open-treasure">去宝库</button>
          <button class="secondary-btn" data-action="go-payment">继续第二单元</button>
        ` : `
          <button class="cta cta--gold" data-action="retry-test">再试一次</button>
          <button class="secondary-btn" data-action="go" data-route="home">回首页</button>
        `}
      </div>
    </section>
  `;
}

function renderTreasure() {
  return `
    <section class="screen--scroll page-pad">
      ${topbar("小星宝库", `${learnedCount()} 个字已收集`, "home")}
      <div class="treasure-card" style="padding:18px;margin-bottom:16px">
        <h2 class="section-title">已点亮的字</h2>
        <div class="treasure-grid" style="margin-top:14px">
          ${unit01.characters.map((item) => {
            const learned = state.progress.learnedIds.includes(item.id);
            return `<span class="treasure-badge ${learned ? "" : "dim"}">${learned ? item.char : "?"}</span>`;
          }).join("")}
        </div>
      </div>
      <div class="share-card" id="share-card">
        <div class="share-card__inner">
          <span class="caption">星光识字 · 第一单元</span>
          <h2>我已经点亮 ${learnedCount()} 个汉字</h2>
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

function renderParent() {
  return `
    <section class="screen--scroll page-pad">
      ${topbar("家长中心", "学习进度", "home")}
      <div class="stack">
        <div class="parent-card">
          <h2 class="section-title">今日学习</h2>
          <div class="metric-grid" style="margin-top:14px">
            <div class="metric"><div><strong>${learnedCount()}</strong><span>新学字</span></div></div>
            <div class="metric"><div><strong>${learningAccuracy()}%</strong><span>正确率</span></div></div>
            <div class="metric"><div><strong>${elapsedMinutes()}</strong><span>分钟</span></div></div>
          </div>
        </div>
        <div class="parent-card">
          <h2 class="section-title">护眼节奏</h2>
          <p class="caption">单次建议 15 分钟，今天已用 ${elapsedMinutes()} 分钟。</p>
          <div class="progress-bar"><i style="--value:${Math.min(100, (elapsedMinutes() / 15) * 100)}%"></i></div>
        </div>
        <div class="parent-card">
          <h2 class="section-title">付费意向</h2>
          <p class="caption">${state.progress.paidIntent ? "已记录第二单元解锁意向。" : "完成第一单元后可继续体验第二单元引导。"}</p>
        </div>
      </div>
    </section>
  `;
}

function renderPayment() {
  return `
    <section class="screen--scroll page-pad">
      ${topbar("解锁下一课", teaserUnit.subtitle, "home")}
      <div class="payment-hero">
        <h2>${teaserUnit.title}</h2>
        <p>孩子已经学会 ${learnedCount()} 个字，可以继续往前走。</p>
      </div>
      <div class="stack" style="margin-top:18px">
        <button class="pay-card ${state.payChoice === "trial" ? "selected" : ""}" data-action="choose-pay" data-choice="trial">
          <span class="price-mark">¥9.9</span>
          <span><strong>第二单元</strong><br><span class="caption">解锁一组新字和练习</span></span>
          <span>${state.payChoice === "trial" ? icon("check") : ""}</span>
        </button>
        <button class="pay-card ${state.payChoice === "lifetime" ? "selected" : ""}" data-action="choose-pay" data-choice="lifetime">
          <span class="price-mark">¥299</span>
          <span><strong>终身买断</strong><br><span class="caption">正式发布后可开放</span></span>
          <span>${state.payChoice === "lifetime" ? icon("check") : ""}</span>
        </button>
      </div>
      <div class="bottom-action stack">
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
  return clamp((viewportHeight / 2) - (MAP_FOCUS_Y * homeMapScale()), min, max);
}

function hydrateHomeMap() {
  if (homeMapY === null) homeMapY = defaultHomeMapY();
  const { min, max } = homeMapBounds();
  homeMapY = clamp(homeMapY, min, max);
  applyHomeMapY();
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
    : pool.slice(0, 3);
  return {
    kind,
    index: 0,
    score: 0,
    questions: targets.map((target, index) => makeQuestion(index % 3 === 1 ? "audio" : "image", target, pool))
  };
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
  updateProgress({
    totalAnswers: state.progress.totalAnswers + 1,
    correctAnswers: state.progress.correctAnswers + (correct ? 1 : 0)
  });
  state.selectedAnswer = answerId;
  state.feedback = correct ? "答对啦，星星亮起来了。" : `没关系，是「${question.target.char}」。`;

  if (state.route === "practice") {
    state.showCelebration = correct;
    render();
    if (correct) schedule(nextAfterPractice, 820);
    return;
  }

  if (correct) state.quiz.score += 1;
  render();
  schedule(nextQuizQuestion, 760);
}

function nextAfterPractice() {
  markLearned(currentChar().id);
  state.showCelebration = false;
  state.feedback = "";
  state.selectedAnswer = "";
  state.question = null;

  const isEndOfGroup = state.currentIndex === unit01.characters.length - 1
    || unit01.characters[state.currentIndex + 1].group !== currentChar().group;

  if (isEndOfGroup) {
    state.quiz = null;
    state.route = "groupQuiz";
  } else {
    state.currentIndex += 1;
    state.strokeDone = 0;
    state.route = "recognize";
    schedule(() => speakCurrent(), 180);
  }
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

  if (state.quiz.kind === "unitTest") {
    const score = state.quiz.score;
    const stars = score >= 8 ? 3 : score >= 7 ? 2 : score >= unit01.passScore ? 1 : 0;
    const passed = score >= unit01.passScore;
    updateProgress({
      bestScore: Math.max(state.progress.bestScore, score),
      bestStars: Math.max(state.progress.bestStars, stars)
    });
    state.result = { score, total: state.quiz.questions.length, stars, passed };
    state.quiz = null;
    state.route = "result";
    render();
    return;
  }

  const nextIndex = state.currentIndex + 1;
  state.quiz = null;
  if (nextIndex >= unit01.characters.length) {
    state.route = "unitTest";
  } else {
    state.currentIndex = nextIndex;
    state.strokeDone = 0;
    state.route = "recognize";
    schedule(() => speakCurrent(), 180);
  }
  render();
}

function markLearned(id) {
  if (state.progress.learnedIds.includes(id)) return;
  updateProgress({ learnedIds: [...state.progress.learnedIds, id] });
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
  state.showCelebration = true;
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
  if (!("speechSynthesis" in window)) {
    showToast(`${item.char}，${item.phrase}`);
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`${item.char}，${item.phrase}`);
  utterance.lang = "zh-CN";
  utterance.rate = 0.86;
  utterance.pitch = 1.16;
  window.speechSynthesis.speak(utterance);
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
  ctx.fillText(`已点亮 ${learnedCount()} 个汉字`, 450, 610);
  ctx.font = "700 38px PingFang SC, sans-serif";
  ctx.fillStyle = "#7A6A55";
  ctx.fillText(`正确率 ${learningAccuracy()}% · 第一单元`, 450, 690);
  const learnedChars = unit01.characters
    .filter((item) => state.progress.learnedIds.includes(item.id))
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
  if (action === "go") setState({ route: target.dataset.route, feedback: "", selectedAnswer: "", showCelebration: false });
  if (action === "open-unit") setState({ route: "unit" });
  if (action === "open-treasure") setState({ route: "treasure", showCelebration: false });
  if (action === "open-verify") setState({ verifyOpen: true, verifyInput: "" });
  if (action === "locked") {
    if (learnedCount() > 0) {
      setState({ route: "payment" });
    } else {
      showToast("先体验第一单元");
    }
  }
  if (action === "start-learning") {
    setState({ route: "recognize", currentIndex: nextUnlearnedIndex(), strokeDone: 0, feedback: "", selectedAnswer: "" });
    schedule(() => speakCurrent(), 150);
  }
  if (action === "jump-char") {
    state.currentIndex = Number(target.dataset.index);
    state.strokeDone = 0;
    state.question = null;
    setState({ route: "recognize", feedback: "", selectedAnswer: "" });
    schedule(() => speakCurrent(), 150);
  }
  if (action === "speak-current") speakCurrent();
  if (action === "speak-question") speakQuestion();
  if (action === "to-write") setState({ route: "write", strokeDone: 0, feedback: "", selectedAnswer: "" });
  if (action === "reset-writing") setState({ strokeDone: 0 });
  if (action === "skip-writing") {
    finishWriting();
  }
  if (action === "answer-question") answerQuestion(target.dataset.answer);
  if (action === "practice-next") nextAfterPractice();
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

function nextUnlearnedIndex() {
  const next = unit01.characters.findIndex((item) => !state.progress.learnedIds.includes(item.id));
  return next === -1 ? 0 : next;
}

function handlePointerDown(event) {
  const homeMap = event.target.closest("[data-home-map]");
  if (homeMap && state.route === "home") {
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
