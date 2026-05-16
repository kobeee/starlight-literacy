import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unit01 } from "../src/shared/unit-01.js";

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, "../src/clients/mobile-h5/app.js"), "utf8");
const errors = [];
const now = 1778100000000;

const progress = {
  characters: {},
  learnedIds: []
};

const groupPool = (group) => unit01.characters.filter((item) => item.group === group);
const characterEvidence = (id) => progress.characters[id] || {};
const isRecognized = (id) => Boolean(characterEvidence(id).recognizedAt);
const isMastered = (id) => Boolean(characterEvidence(id).masteredAt);
const needsReview = (id) => Boolean(characterEvidence(id).needsReview);
const recognizedIdsFor = () => unit01.characters.filter((item) => isRecognized(item.id)).map((item) => item.id);
const writeEvidence = (id, patch) => {
  progress.characters[id] = { ...characterEvidence(id), ...patch };
  progress.learnedIds = recognizedIdsFor();
};
const markTraced = (id) => writeEvidence(id, { seenAt: characterEvidence(id).seenAt || now, tracedAt: now + 1 });
const markRecognized = (id) => writeEvidence(id, { seenAt: characterEvidence(id).seenAt || now, recognizedAt: now + 2, needsReview: false });
const markNeedsReview = (id) => writeEvidence(id, { seenAt: characterEvidence(id).seenAt || now, masteredAt: null, needsReview: true, lastMissAt: now + 3 });
const markMasteredFromQuiz = (answers) => {
  [...new Set(answers.filter((answer) => answer.correct).map((answer) => answer.targetId))].forEach((id) => {
    writeEvidence(id, {
      seenAt: characterEvidence(id).seenAt || now,
      recognizedAt: characterEvidence(id).recognizedAt || now + 4,
      masteredAt: now + 5,
      needsReview: false
    });
  });
};
const groupHasPendingStudy = (group) => groupPool(group).some((item) => needsReview(item.id) || !isRecognized(item.id));
const groupNeedsQuiz = (group) => groupPool(group).some((item) => isRecognized(item.id) && !needsReview(item.id) && !isMastered(item.id));
const nextPendingStudyIndex = () => {
  const review = unit01.characters.findIndex((item) => needsReview(item.id));
  if (review !== -1) return review;
  return unit01.characters.findIndex((item) => !isRecognized(item.id));
};
const nextAfterQuiz = () => {
  const nextIndex = nextPendingStudyIndex();
  return nextIndex === -1 ? "unitTest" : unit01.characters[nextIndex].id;
};
const isUnitComplete = () => progress.learnedIds.length >= unit01.characters.length
  && unit01.characters.every((item) => !needsReview(item.id));
const isUnitMastered = () => unit01.characters.every((item) => isMastered(item.id))
  && unit01.characters.every((item) => !needsReview(item.id));

const first = unit01.characters[0];
const second = unit01.characters[1];

markTraced(first.id);
markNeedsReview(first.id);
expect(needsReview(first.id), "Wrong answer must mark the character for review.");
expect(!isRecognized(first.id), "A first wrong answer must not create recognizedAt.");
expect(nextPendingStudyIndex() === 0, "Pending review must be the next study target.");

markRecognized(first.id);
expect(isRecognized(first.id), "Correct practice must create recognizedAt.");
expect(!needsReview(first.id), "Correct practice must clear needsReview.");
expect(Boolean(characterEvidence(first.id).tracedAt), "Correct practice must preserve existing tracedAt.");
expect(!isMastered(first.id), "Correct practice must not grant masteredAt.");

markMasteredFromQuiz([{ targetId: first.id, correct: true }]);
expect(isMastered(first.id), "Correct quiz answer must grant masteredAt.");

markRecognized(second.id);
markMasteredFromQuiz([{ targetId: second.id, correct: true }]);
markNeedsReview(second.id);
expect(!isMastered(second.id), "A later wrong answer must clear masteredAt.");
expect(nextPendingStudyIndex() === 1, "A later miss must take priority over unseen characters.");

groupPool(1).forEach((item) => {
  if (item.id === second.id) return;
  markRecognized(item.id);
});
expect(groupHasPendingStudy(1), "A group with a review item must keep studying before quiz.");

markRecognized(second.id);
expect(!groupHasPendingStudy(1), "A fully recognized group with no review should be ready to test.");
expect(groupNeedsQuiz(1), "A recognized but unmastered group must require group review.");
expect(nextAfterQuiz() === unit01.characters[5].id, "After a clean first group quiz, the flow should continue to the first pending character in group 2.");

markNeedsReview(unit01.characters[2].id);
expect(nextAfterQuiz() === unit01.characters[2].id, "After any later miss, quiz completion should return to the pending review character.");
markRecognized(unit01.characters[2].id);

unit01.characters.forEach((item) => {
  markRecognized(item.id);
  markMasteredFromQuiz([{ targetId: item.id, correct: true }]);
});
markNeedsReview(unit01.characters[unit01.characters.length - 1].id);
expect(!isUnitComplete(), "Unit completion must stay false while any character needs review.");
markRecognized(unit01.characters[unit01.characters.length - 1].id);
expect(isUnitComplete(), "Unit completion should unlock only after all characters are recognized with no review.");
markMasteredFromQuiz([{ targetId: unit01.characters[unit01.characters.length - 1].id, correct: true }]);
expect(isUnitMastered(), "Unit celebration should require all characters to have mastered evidence.");

const staticChecks = [
  ["group quizzes use the full group pool", /const targets = kind === "unitTest"[\s\S]*?: pool;/],
  ["practice completion checks pending study before quiz", /function nextAfterPractice\(\)[\s\S]*?groupHasPendingStudy\(completedGroup\)[\s\S]*?nextPendingStudyIndex\(\)/],
  ["quiz completion uses unified pending target", /function nextQuizQuestion\(\)[\s\S]*?const nextIndex = nextPendingStudyIndex\(\)/],
  ["unit celebration waits for all mastered evidence", /function nextQuizQuestion\(\)[\s\S]*?if \(isUnitMastered\(\)\)[\s\S]*?state\.route = "celebrate"/],
  ["celebration route exists", /celebrate: renderUnitCelebration/],
  ["payment route blocks incomplete unit", /function renderPayment\(\)[\s\S]*?if \(!isUnitComplete\(\)\)/],
  ["result route uses completion gate", /function renderResult\(\)[\s\S]*?const canAdvance = result\.passed && isUnitComplete\(\)/]
];

staticChecks.forEach(([label, pattern]) => {
  expect(pattern.test(appSource), `Missing app integration: ${label}.`);
});

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Mobile H5 learning flow ok: review priority, evidence gates, group quizzes and unlock gating are consistent.");

function expect(condition, message) {
  if (!condition) errors.push(message);
}
