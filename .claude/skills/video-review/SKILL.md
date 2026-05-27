---
name: video-review
description: |
  Run a double-blind product review on a Starlight recognition-video build.
  Spawns three independent agents:
    1. Claude reviewer (fresh sub-agent via the Agent tool)
    2. Codex reviewer (separate process via `codex exec`)
    3. Jury (fresh sub-agent via the Agent tool) that reads the two outputs and decides.
  The main session does NOT review, score, or judge — it only orchestrates and reports.
  Use this when the user wants to validate a build (e.g. `yi-v8`, `yi-v5-cinematic`) before
  promoting it to H5 official, or to audit a previously-shipped build.

  Trigger phrases: "review video", "review build", "double-blind review", "审一下 yi-v?", "video-review".
---

# Video Review · Double-Blind Orchestrator

> Architecture rationale: [reviewer-input-pack.md](../../../tools/recognition-video/reviewers/reviewer-input-pack.md)
> Output contract: [reviewer-output.schema.json](../../../tools/recognition-video/reviewers/reviewer-output.schema.json)

## Why this exists

Five validators passed on yi-v8 (2026-05-22) yet the video shipped with **no writing animation, hard-cut scenes, and a brush pointer appearing after the character was already written**. Single-model self-review (even fresh-session) does not catch this because it shares the same aesthetic blind spots. The fix is model-level independence: Claude + Codex blind-review the same input pack, then a third fresh-Claude Jury decides.

The main session must not review and must not judge — it only orchestrates.

## When to invoke

User says any of:
- "review yi-v?", "审一下 yi-v?", "double-blind review"
- "is this build ready for official?"
- "audit yi-v5-cinematic"

Argument: a `<build-id>` matching a directory under `tools/recognition-video/builds/`.

## Execution flow

### Step 0 — Resolve build id and run dir

```
build_id  = <from user message>
run_ts    = $(date -u +%Y-%m-%dT%H%M)        # minute precision
run_dir   = tools/recognition-video/reviewers/runs/${run_ts}-${build_id}
```

Create `${run_dir}`.

### Step 1 — Pre-flight the 5-piece input pack

Verify all five (six with optional narration-spec) files exist. Refuse to proceed if any is missing. See [reviewer-input-pack.md §2](../../../tools/recognition-video/reviewers/reviewer-input-pack.md).

```bash
test -f tools/recognition-video/briefs/${build_id}.brief.json
test -f tools/recognition-video/audio-plans/${build_id}.audio-plan.json
test -f tools/recognition-video/tail-specs/${build_id}.tail-spec.json
test -f tools/recognition-video/builds/${build_id}/renders/${build_id}.mp4
N_KEYFRAMES=$(ls tools/recognition-video/builds/${build_id}/snapshots/frame-*.png | wc -l)
[ "$N_KEYFRAMES" -ge 4 ] || { echo "FAIL: need >=4 keyframes"; exit 1; }
```

Any failure → stop and tell the user which file is missing. **Do not** spawn reviewers on incomplete input.

### Step 2 — Write `input-pack.json` to run dir

Resolve all paths to absolute paths and write them into `${run_dir}/input-pack.json` per [reviewer-input-pack.md §5](../../../tools/recognition-video/reviewers/reviewer-input-pack.md). Both reviewers will read this same file, ensuring they saw the same inputs.

### Step 3 — Spawn Claude reviewer and Codex reviewer **in parallel**

Use **one message with two parallel tool calls**:

**Tool call A — Agent tool, Claude reviewer:**

```
Agent({
  description: "Claude blind reviewer for <build>",
  subagent_type: "general-purpose",
  prompt: "Read .claude/skills/video-review-claude/SKILL.md and follow it exactly. Use run_dir=${run_dir}."
})
```

Prompt is intentionally a spec-pointer (skill path + run_dir) — all reviewer rules live in `video-review-claude/SKILL.md`. See Hard rule 8 below.

**Tool call B — Bash tool, Codex reviewer:**

```bash
IMG_FLAGS=()
while IFS= read -r line; do IMG_FLAGS+=( -i "$line" ); done < <(jq -r '.inputs.keyframes[]' "${run_dir}/input-pack.json")
SHEET=$(jq -r '.inputs.reviewSheet // empty' "${run_dir}/input-pack.json")
[ -n "$SHEET" ] && IMG_FLAGS+=( -i "$SHEET" )

PROMPT="Read tools/recognition-video/codex-skill/starlight-video-reviewer/SKILL.md and follow it exactly. Use run_dir=${run_dir}."

printf '%s' "$PROMPT" | codex exec \
  --sandbox workspace-write \
  "${IMG_FLAGS[@]}" \
  2>&1 | tee "${run_dir}/codex-stdout.log"
```

Three non-obvious requirements (each one learned by failing the 2026-05-23 smoke test):

1. **Prompt must arrive via stdin.** `codex exec` declares `-i, --image <FILE>...` as a trailing multi-value option. If you put `"$PROMPT"` as the positional argument *after* the `-i` flags, clap gobbles it as the next image filename, the positional `[PROMPT]` ends up empty, and codex falls back to *reading prompt from stdin* — which then blocks forever because no one is writing to it. `printf '%s' "$PROMPT" | codex exec ...` sidesteps the whole problem.
2. **Do not pass `--model`.** Hardcoding e.g. `--model gpt-5-codex` breaks on ChatGPT-account logins (`"The 'gpt-5-codex' model is not supported when using Codex with a ChatGPT account"`). Let codex pick the account default (currently `gpt-5.5`).
3. **One `-i` per image.** Using `--image $(jq ... | tr '\n' ' ')` as a single token works only when nothing else follows; the array form above is safer and also lets you append the optional `reviewSheet` cleanly.

Run them in **the same message** so they execute concurrently. Wait for both to finish before Step 4.

### Step 4 — Validate both reviewer outputs

For each of `claude-review.json` and `codex-review.json`:

```bash
# 1. Parse-able JSON
jq empty "${run_dir}/claude-review.json"
jq empty "${run_dir}/codex-review.json"

# 2. blockers array has length >= 3
[ "$(jq '.blockers | length' "${run_dir}/claude-review.json")" -ge 3 ]
[ "$(jq '.blockers | length' "${run_dir}/codex-review.json")" -ge 3 ]

# 3. Required fields present (schema validation if ajv-cli available, jq presence check otherwise)
jq -e '.schemaVersion and .reviewerId and .scores and .overallScore and .decision and .confidence' "${run_dir}/claude-review.json"
jq -e '.schemaVersion and .reviewerId and .scores and .overallScore and .decision and .confidence' "${run_dir}/codex-review.json"
```

**Reviewer fitness checks** (per [input-pack §6](../../../tools/recognition-video/reviewers/reviewer-input-pack.md)):

- Reviewer returned < 3 blockers → re-spawn that reviewer once with prompt addendum: "Your previous output had only N blockers on a non-shipped build. Look again at the keyframes — you missed obvious issues. Do not be polite."
- Both reviewers gave overall ≥ 9.0 but the build has known issues → continue anyway, but tag the Jury prompt with `reviewer-fitness: questionable` so the Jury must flag it.

### Step 5 — Spawn Jury (fresh sub-agent)

```
Agent({
  description: "Jury for <build> double-blind review",
  subagent_type: "general-purpose",
  prompt: "Read .claude/skills/video-review-jury/SKILL.md and follow it exactly. Use run_dir=${run_dir}."
})
```

Same spec-pointer rule as Step 3A: jury read-order, no-read list, output schema, divergence/fitness algorithm all live in `video-review-jury/SKILL.md`. See Hard rule 8 below.

### Step 6 — Report to user

Format a terse summary message to the user:

```
## ${build_id} double-blind review · ${run_ts}

### Claude reviewer
- overall: X.X · decision: ... · confidence: ...
- top blocker: <severity> <issue first 80 chars>

### Codex reviewer
- overall: X.X · decision: ... · confidence: ...
- top blocker: <severity> <issue first 80 chars>

### Jury verdict
- decision: ...
- divergence: low | medium | high
- key call-out: <one line>

Run dir: ${run_dir}
```

Then **ask the user** which next action they want (e.g. "fix top blocker", "abandon build", "review another build"). **Do not** start fixing automatically.

## Hard rules for the main session

1. **Do not score, judge, or write a review of your own**. You only orchestrate.
2. **Do not edit any file inside `tools/recognition-video/builds/${build_id}/`**. The whole purpose is independent review — touching the build invalidates it.
3. **Do not summarize a reviewer's output and feed the summary to the Jury**. The Jury reads the raw JSONs.
4. **Do not run validators** (`validate-*.mjs`) during review. Validators are pipeline gates, not review tools — they have already passed/failed before review starts.
5. **Do not skip Step 4** (fitness checks). The minimum-3-blocker floor is the whole point.
6. **If `codex exec` fails** (network, auth, sandbox refusal), stop and report the error to the user. Do not silently fall back to a Claude-only review — that defeats the architecture.
7. **Do not re-use a previous run dir**. Each review gets a fresh timestamped dir.
8. **Spawn prompts must be spec-pointers, not rule recitations.** When spawning the Claude reviewer / Codex reviewer / Jury, the prompt contains exactly two things: (a) the path to that agent's SKILL.md, (b) `run_dir=<abs path>`. All behavior rules (read order, no-read list, blocker floor, output schema, evidence requirements, fitness logic) live in the agent's SKILL.md, which is the single source of truth. Inlining rules into the spawn prompt creates a second-source contract that silently drifts from SKILL.md and weakens blind-review independence (the reviewer's behavior depends on the orchestrator's prompt wording, not the contract). If a rule belongs in the prompt, it belongs in SKILL.md instead.

## Cost ceiling

A single double-blind review is approximately:
- Claude reviewer: ~60k tokens × Opus = ~$0.50
- Codex reviewer: ~150k tokens × gpt-5.5 (ChatGPT account default) = ~$0.30
- Jury: ~50k tokens × Opus = ~$0.25
- Total: ~$1/run

(Numbers updated from the 2026-05-23 yi-v8 smoke: claude 57.8k, codex 147k, jury 46k.)

If a build needs > 3 review iterations, that signals deeper trouble with the build, not the review tool. Escalate to the user.

## Related

- Memory: `feedback_validator_pass_not_product_pass` — the failure mode this whole tool exists to prevent
- Memory: `feedback_first_principle_on_craft_issue` — "挫=设计选择问题不是工艺问题"
- Sibling skill: `video-review-claude` (the Claude reviewer's behavior)
- Sibling skill: `video-review-jury` (the Jury's behavior)
- Codex skill: `tools/recognition-video/codex-skill/starlight-video-reviewer/SKILL.md` (the Codex reviewer's behavior)
