---
name: clarify
description: Sharpen a problem before deploying a team to work on it. Surfaces hidden assumptions, reframes the surface question into the real question, and produces a skeleton + execution plan. Entry point of the Overture pipeline (charting the waters before sailing). Use when the user has a problem to work through — a technical decision, a PR to review, a design choice, a fuzzy goal. Output is an AnalysisSnapshot written to `.overture/sessions/{id}/versions/v0.1/analysis.json` that `/overture:team` will consume. NEVER skip this step to save time — the analysis IS the value. Invoked as `/overture:clarify`.
---

# /overture:clarify

**What this skill does:** Takes a user problem and produces a structured understanding before any team deployment. This is Phase 0 of the Overture judgment harness: **reframe the question before answering it**.

**Why this matters (M5 — Analysis Primacy):** Every other skill in this plugin assumes the question has been sharpened. If a user invokes `/overture:team` directly on a surface question, output quality collapses. This skill IS the differentiator vs commodity "multi-agent code review" tools.

---

## When to run

Invoke automatically when:
- `/overture:sail` is called without prior session state in `.overture/sessions/`
- User passes a problem via `/overture:clarify "<problem text>"`
- User passes a target via `/overture:clarify @PR#123` / `@<file-path>` / `@<branch>`
- After `/overture:clarify --revise <session-id>` — re-clarifies with new input

Do NOT run when:
- A session with phase >= `conversing` already exists and user hasn't asked to restart
- User explicitly skips with `--skip-clarify` flag (not recommended)

---

## Inputs

One of:

1. **Direct problem text** (string argument)
2. **Target reference** — expand via context collection:
   - `@PR#N` → `gh pr view N --json title,body,files,state,commits` + diff
   - `@<file>` → Read file contents + `git log -5 --oneline <file>` for recent churn
   - `@<branch>` → `git log main..<branch>` + `git diff main...<branch> --stat`
   - `@<issue-N>` → `gh issue view N`
3. **Autodetect from git state** (no args):
   - Current branch name (not `main`/`master`)
   - Last 1-3 commit messages
   - Uncommitted changes (`git diff HEAD`)
   - Open PRs authored by user
   - Report what was detected before proceeding

If multiple candidates, use **AskUserQuestion** to disambiguate: "Which of these are you working on?"

---

## Execution steps

### Step 1 — Session bootstrap

1. **Read config**: Load `.overture/config.yaml` (schema: `data/schemas/config.json`). If file missing, ask user via AskUserQuestion whether to create from `lib/config.example.yaml` template. If user declines, proceed with defaults (`locale: ko`, no boss). All user-facing text in this skill uses `config.locale`.
2. Compute session ID: `YYYY-MM-DD-<kebab-of-first-N-words-of-problem>`. Collision-safe by appending `-2`, `-3`.
3. Create `.overture/sessions/{id}/` directory.
4. Create `session.json` at the root with schema from `data/schemas/session.json`. Fields:
   - `id`, `problem_text`, `repo_path` (from `pwd`), `repo_branch` (from `git branch --show-current`)
   - `invoking_context`: `{target_type, target_ref}` from the input expansion
   - `boss_agent`: from `config.boss` if present
   - `phase: "analyzing"`, `round: 0`, `max_rounds: 3`
   - `created_at`, `updated_at`
5. Create `versions/v0.1/` subdirectory. This holds all artifacts for draft v0.1.

### Step 2 — Initial analysis

**Prompt the LLM (yourself) as follows:**

> You are analyzing a problem for a decision-making plugin. Your job is NOT to solve it. Your job is to reframe it so the team (invoked next) can work on the RIGHT thing.
>
> <user-data context="problem">
> {{problem_text}}
> </user-data>
>
> {{if invoking_context}}
> <user-data context="target">
> {{target expansion — PR description, file contents, etc.}}
> </user-data>
> {{endif}}
>
> Produce JSON conforming to `data/schemas/analysis-snapshot.json`:
>
> - `real_question`: what the user is ACTUALLY deciding. Often different from surface.
> - `hidden_assumptions`: 3-5 assumptions the user is making without stating.
> - `skeleton`: 3-7 bullets of what a complete answer would contain (structural, not substantive).
> - `framing_confidence`: 0-100, your self-assessment. Low when the surface question looks like an XY problem.
> - `insight`: one-line insight that surfaced from this analysis.
>
> Rules:
> 1. The `real_question` MUST NOT be "how do I {{surface request verbatim}}?". If surface matches real, you haven't reframed. Examples:
>    - Surface: "should we use TypeScript or JavaScript?" → Real: "How much long-term velocity are we willing to trade for short-term setup speed, given team seniority?"
>    - Surface: "review my PR" → Real: "What's the ONE risk in this PR that would make me roll it back in 48 hours?"
> 2. `hidden_assumptions` must be declarative sentences, not questions.
> 3. Do NOT propose solutions. This skill's job ends at structuring the question.

**Note on `execution_plan`**: At version 0 (initial analysis), `execution_plan` is usually `null` or absent. It emerges in later rounds (deepening) once the real_question is locked AND enough specificity has been extracted. Do NOT force-fill execution_plan on round 0. The `/overture:team` skill is blocked from running until execution_plan with ≥2 steps exists.

Write result to `versions/v0.1/analysis.json`.

### Step 3 — Framing validation (conditional)

If `framing_confidence < 70`:

1. Use **AskUserQuestion** with locale-aware content:

   **locale: ko**
   - Title: "프레이밍 확인"
   - Question: "위 real_question으로 진행할까요? (자신도가 낮습니다: {{score}}/100)"
   - Options:
     - "맞아, 이 방향으로 가자" → lock framing, proceed
     - "내가 원래 생각한 것과 달라" → re-analyze with their correction
     - "다시 설명해줄게" → accept new input, re-analyze

   **locale: en**
   - Title: "Confirm framing"
   - Question: "Proceed with this real_question? (low confidence: {{score}}/100)"
   - Options:
     - "Yes, this is the right angle" → lock framing, proceed
     - "This isn't what I meant" → re-analyze with correction
     - "Let me reframe it" → accept new input, re-analyze

2. If user rejects, re-run Step 2 with rejection reason as additional context.

### Step 4 — Q&A loop (deepening rounds)

Repeat up to `max_rounds` times (default 3) or until the snapshot contains a filled `execution_plan`:

1. **Generate next question** based on latest snapshot. Priorities:
   - If `framing_confidence < 90` and not yet asked: ask a **strategic_fork** question to clarify the decision. Example: "이 결정에서 가장 중요한 건 (A) 속도 (B) 확실성 (C) 장기 유지보수 중 어느 쪽인가?"
   - If weakest_assumption identified: ask a **weakness_check** question. Example: "너는 X를 전제하고 있는데, 이게 틀리면 결정이 바뀌어? (O/X)"
   - Otherwise: ask a **skeleton_clarify** question. Example: "이 스켈레톤 중 어느 항목부터 자세히 채우는 게 가장 가치 있나?"

2. Use **AskUserQuestion** to get user input. Include:
   - `header`: short title in config.locale
   - `question`: the actual question in config.locale
   - `multiSelect: false` unless the question naturally accepts multiple
   - 2-4 options covering the answer space + open option: `"직접 입력"` (ko) / `"Let me type it"` (en)

3. **Run deepening analysis**: update the snapshot with the answer. Produce a new version of AnalysisSnapshot. Append to `snapshots[]` in session.json (NOT overwrite — keeping history).

4. **Check convergence**:
   - If `execution_plan.steps` now present with ≥2 steps AND `framing_confidence >= 75` → `readyForMix = true`, exit loop.
   - If `round >= max_rounds` → exit loop even if not ready. User can run again later.
   - Otherwise → continue loop.

### Step 5 — Output the scaffold (plain-text summary for user)

Print to user:

```
## Overture · Clarify · v0.1

**Real question:** {{real_question}}

**Hidden assumptions** (unverified):
- {{assumption 1}}
- {{assumption 2}}
...

**Skeleton:**
1. {{bullet}}
2. {{bullet}}
...

**Framing confidence:** {{score}}/100

{{if execution_plan ready}}
**Execution plan** ({{N}} steps) — team is ready to deploy.
Run `/overture:team` to deploy the agents.
{{else}}
**Not yet ready for team deployment.** Run `/overture:clarify --continue` to add another round, or invoke `/overture:team --force` to proceed on current snapshot.
{{endif}}

**Session:** `.overture/sessions/{{id}}/`
```

### Step 6 — Update session.json

Set `phase: "conversing"` (if not ready for team) or stay on `"conversing"` (if ready — team deployment is next). Update `snapshots[]`, `questions_and_answers[]`, `updated_at`.

---

## Output files

Written to `.overture/sessions/{id}/`:

- `session.json` — top-level session record (schema: `data/schemas/session.json`)
- `versions/v0.1/analysis.json` — the AnalysisSnapshot (schema: `data/schemas/analysis-snapshot.json`)
- `versions/v0.1/questions_and_answers.json` — the Q&A history
- `versions/v0.1/meta.json` — `{triggering_skill: "clarify", timestamp, framing_locked, user_accepted_framing}`

---

## Meta-check gates (self-verify before returning)

Before finalizing, verify:

- **M5 (Analysis primacy)**: Did you reframe? Is `real_question` different from the surface request? If same → fail, retry Step 2 with stricter instruction.
- **M4 (Decision scaffold shape)**: Does the snapshot contain `hidden_assumptions` and `skeleton` as actual arrays, not flat recommendation? If LLM returned a solution-like narrative → fail, retry.
- **M9 (Worker mode, not critic)**: clarify doesn't invoke workers. NA. But DO NOT include agent voices or critique in the analysis output — that's /overture:team and /overture:boss territory.
- **Security**: All user-provided text in prompts must be wrapped in `<user-data>` tags. No raw user text concatenated into system prompts.

If any gate fails, revise before emitting files.

---

## Error modes

- **No `.overture/` directory**: create it. First-time use.
- **`.overture/config.yaml` missing**: proceed without boss. Note in session.json that boss is not configured.
- **User provides no problem text and git state is clean**: prompt for problem text via AskUserQuestion.
- **PR/issue reference fails** (gh not installed, unauthorized): degrade gracefully — ask user to paste the text, note fallback in meta.json.
- **LLM returns malformed JSON**: retry once with stricter schema emphasis. If still fails, write what you got to `versions/v0.1/raw_analysis.txt` and explain the issue to user.

---

## Forbidden patterns

- Shortening clarify to save tokens. The full loop IS the product.
- Proposing solutions. This skill reframes; it does not answer.
- Aggregating `hidden_assumptions` into a single "main concern" bullet. Keep them separate.
- Skipping the framing validation when confidence < 70 "because it's probably fine."
- Using trait descriptions of agents ("a researcher would ask...") — no agents run here.
