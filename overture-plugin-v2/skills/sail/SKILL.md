---
name: sail
description: Top-level Overture orchestrator — set sail on a decision. Structures the journey by running clarify → team → boss in sequence, adapting based on user intent. Use when the user has a problem to work through in their current codebase/repo — a technical decision, PR to review, design doc, fuzzy goal. Unlike Cursor or Copilot Review (which generate or critique code), Overture produces a DECISION SCAFFOLD preserving trade-offs, hidden assumptions, team contradictions, and human-required checkpoints. The output is thinking structure, not a solution. This is the entry point most users will invoke. Invoked as `/overture:sail`.
---

# /overture:sail

**What this skill does:** Routes a user's problem through the Overture pipeline. Detects intent from args + repo state, then chains appropriate sub-skills.

**Why this skill exists:** Users shouldn't need to memorize `/overture:clarify` → `/overture:team` → `/overture:boss`. This command does the right thing for their input.

---

## When to run

The default entry point. User typed:
- `/overture:sail "<problem description>"` — process a new problem
- `/overture:sail @PR#123` — work through this PR
- `/overture:sail @<file>` — think about this file
- `/overture:sail` (bare) — continue latest session, or prompt for input
- `/overture:sail --full "<problem>"` — force full pipeline (clarify → team → boss)
- `/overture:sail --quick "<problem>"` — clarify only (no team deployment)
- `/overture:sail --resume <session-id>` — continue a prior session

---

## Path resolution

When this skill (or any sub-skill it invokes) refers to `data/...` or `lib/...`,
these resolve to:
- `~/.claude/overture-data/` — schemas, agents.yaml, boss-types.yaml, classification.yaml, README.md
- `~/.claude/overture-lib/` — session-layout.md, version-numbering.md, locale-conventions.md, config.example.yaml, rehearsal-prompt.md

`install.sh` (both `--link` developer mode and copy mode) places them there.
User's session artifacts live in `<cwd>/.overture/sessions/`.

## Execution steps

### Step 0 — Load config

Read `.overture/config.yaml` (schema: `~/.claude/overture-data/schemas/config.json`). If missing, prompt via AskUserQuestion:
- **ko**: "Overture 설정 파일이 없네요. `~/.claude/overture-lib/config.example.yaml` 기반으로 만들까요?" → Options: "네, 만들어줘", "나중에 할게 (기본값 사용)"
- **en**: "No Overture config found. Create from `~/.claude/overture-lib/config.example.yaml` template?" → Options: "Yes, create it", "Not now (use defaults)"

All downstream skills inherit `locale` from this config.

### Step 1 — Parse input + detect intent

Given the raw args, determine:
- **Mode**: new session vs continuation
- **Target type**: problem_text / PR / file / branch / issue / bare
- **Scope flag**: `--full` / `--quick` / `--resume`
- **Boss skip**: `--no-boss` → don't invoke boss at the end

Emit an early message in config.locale confirming detection: e.g., "PR #42를 대상으로 full pipeline 진행합니다." (ko) / "Running full pipeline on PR #42." (en)

### Step 2 — Check session state

1. Scan `.overture/sessions/` for existing sessions.
2. If `--resume <id>`: load that session, determine next step based on `phase`.
3. Else: check whether a session for the same target already exists (same PR/file). If yes, ask via AskUserQuestion whether to continue or start fresh.
4. Else: new session — proceed to Step 3.

### Step 3 — Route based on phase

Decision table:

| Current phase | Next skill |
|---|---|
| new / no session | `/overture:clarify` |
| `analyzing` or `conversing` (not ready for mix) | `/overture:clarify --continue` |
| `conversing` (execution_plan ready) | `/overture:team` |
| `team_working` or `mixing` | wait / show progress via status |
| `dm_feedback` pending | `/overture:boss` |
| `refining` or `complete` | show scaffold via `/overture:chart`, offer `/overture:revise` |

### Step 4 — Chain skills (if `--full`)

Run sequentially:
1. `/overture:clarify --no-minimal` (until ready for mix, or max rounds). The `--no-minimal` flag suppresses Step 6a auto-collapse — `--full` is an explicit user override.
2. `/overture:team` (on the snapshot's execution_plan)
3. `/overture:boss` (unless `--no-boss`)
4. `/overture:chart` (final — show scaffold + tree)

Clarify still computes `decision_density` (for telemetry/logging in meta.json) but Step 5 emits the regular scaffold instead of MinimalScaffold.

Between skills, report brief transition to user:
> "Clarify done. Deploying team..."
> "Team done ({{N}} agents). Running boss review..."
> "Boss review done. Final scaffold below."

### Step 5 — `--quick` mode

Runs only `/overture:clarify --no-minimal`. The `--no-minimal` flag forces clarify to emit the regular scaffold (Step 5b) even on low-density questions, because the user explicitly opted into the framing exercise. Useful for:
- Fast problem framing check ("is this even the right question?")
- When the problem is too small for team deployment
- Initial exploration

The scaffold in quick mode has `key_trade_offs` and `hidden_assumptions` but empty `team_contradictions` and a note that team was not deployed.

**Difference from auto-MinimalScaffold (Step 6a)**:
- `--quick` always emits the regular scaffold structure (skeleton + hidden_assumptions arrays). The user explicitly opted into the framing exercise.
- Auto-MinimalScaffold (Step 6a) emits a 1-line directive when decision_density==low. The user did NOT opt in — clarify decided the question was sub-routine and the framing exercise itself would over-engineer.

If user passes `--quick` AND clarify computes density==low: still emit regular scaffold (user override). The minimal-mode collapse is only for the no-flag default path.

### Step 6 — Default mode (no flag)

If `--full` / `--quick` not specified: run `/overture:clarify` first, then branch on the resulting AnalysisSnapshot.

#### Step 6a — `decision_density == "low"` → MinimalScaffold path (no further action)

Clarify Step 5a already wrote `versions/{label}/minimal_scaffold.json` AND set `session.phase = "complete"`. Sail's job here:
- Print a one-line confirmation ("Minimal mode — bikeshed prevention. 1줄 권장이 위에 있습니다.").
- DO NOT offer team deployment, DO NOT offer boss review, DO NOT AskUserQuestion. The user already got their answer.
- Exit.

**Why no AskUserQuestion here**: rule 4 in clarify Step 2 already gated this with strict conditions (reversibility==reversible AND framing_confidence>=80 AND single-action AND no >5min checkpoint). Adding a confirmation prompt re-introduces the bikeshed cost we just saved. The user can override with `/overture:sail --full "<problem>"` if they disagree — that's the escape hatch printed in clarify Step 5a output.

#### Step 6b — `decision_density in {"medium", "high"}` AND `stakes_confidence < 75` → confirm stakes first

When clarify is uncertain about stakes (borderline routine/important or important/critical), ask before locking the routing:

Use AskUserQuestion:
- Title (ko): "스테이크 확인" / Title (en): "Confirm stakes"
- Question (ko): "이 결정이 **{{stakes_guess}}** 정도로 보이는데(자신도: {{stakes_confidence}}/100) 맞나요?"
- Question (en): "I read this as **{{stakes_guess}}** stakes (confidence: {{stakes_confidence}}/100). Right?"
- Options:
  - "맞아 — {{stakes_guess}}로 진행" / "Yes, proceed as {{stakes_guess}}"
  - "더 가볍게 봐도 돼" / "Lighter than that" — downgrade one level
  - "더 무겁게 봐야 해" / "Heavier than that" — upgrade one level

Persist the user-confirmed stakes to `session.classification.stakes` and `session.classification.stakes_user_confirmed = true`. Then continue to Step 6c with the locked stakes.

If `stakes_confidence >= 75`: skip directly to Step 6c without asking — clarify is sure enough that the friction of asking outweighs the routing risk.

#### Step 6c — Standard routing (medium/high density, stakes locked)

- If snapshot has clear `execution_plan` and stakes is important/critical → offer to proceed to team.
- If stakes is routine but density wasn't low (e.g. routine but irreversible signal, or routine with framing_confidence<80) → offer quick scaffold.

Use AskUserQuestion:
- Title: "다음 단계"
- Question: "어떻게 진행할까요?"
- Options: "팀 배치 (3-5 에이전트)", "빠른 스캐폴드만 (에이전트 없이)", "일단 멈추자 — 더 생각해볼게"

---

## Output

Final message from orchestrator should summarize:
- Session id + path
- Version label of result
- Key findings (1-2 sentences from mix.executive_summary)
- Any unresolved contradictions
- Suggested next step

---

## Meta-check gates

- **M5 (Analysis primacy)**: Clarify must always run first — even in `--quick` mode. No path to team without clarify.
- **M7 (Commodity test)**: Would Cursor or Copilot Review produce this output? If yes, the orchestrator is not surfacing the judgment-scaffold shape.
- **Never bypass AskUserQuestion for mode choice** when intent is ambiguous. Overture is about preserving user agency.

---

## Error modes

- **No args + no git state**: prompt for input via AskUserQuestion.
- **Session exists in intermediate phase**: resume is default; offer restart only if user asks.
- **Sub-skill fails**: log to `.overture/errors.log`, report to user, don't proceed to next skill.

---

## Forbidden patterns

- Running `/overture:team` before `/overture:clarify`. The whole pipeline is invalidated.
- Skipping `/overture:boss` silently when user didn't pass `--no-boss`. Boss is default unless explicitly skipped.
- Collapsing the pipeline into a single monolithic prompt "to save time." The pipeline IS the product.
- Renaming sessions or modifying existing versions — orchestrator only creates new sessions or advances phases.
