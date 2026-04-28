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

## Execution steps

### Step 0 — Load config

Read `.overture/config.yaml` (schema: `data/schemas/config.json`). If missing, prompt via AskUserQuestion:
- **ko**: "Overture 설정 파일이 없네요. `lib/config.example.yaml` 기반으로 만들까요?" → Options: "네, 만들어줘", "나중에 할게 (기본값 사용)"
- **en**: "No Overture config found. Create from `lib/config.example.yaml` template?" → Options: "Yes, create it", "Not now (use defaults)"

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
1. `/overture:clarify` (until ready for mix, or max rounds)
2. `/overture:team` (on the snapshot's execution_plan)
3. `/overture:boss` (unless `--no-boss`)
4. `/overture:chart` (final — show scaffold + tree)

Between skills, report brief transition to user:
> "Clarify done. Deploying team..."
> "Team done ({{N}} agents). Running boss review..."
> "Boss review done. Final scaffold below."

### Step 5 — `--quick` mode

Runs only `/overture:clarify`. Produces a scaffold based on analysis alone (no team deployed). Useful for:
- Fast problem framing check ("is this even the right question?")
- When the problem is too small for team deployment
- Initial exploration

The scaffold in quick mode has `key_trade_offs` and `hidden_assumptions` but empty `team_contradictions` and a note that team was not deployed.

### Step 6 — Default mode (no flag)

If `--full` / `--quick` not specified: run `/overture:clarify` first, then:
- If the snapshot has clear `execution_plan` and stakes seem important/critical → offer to proceed to team
- If the snapshot suggests the problem is small / routine → offer quick scaffold

Use AskUserQuestion:
- Title: "다음 단계"
- Question: "문제가 {{stakes_guess}}으로 보입니다. 어떻게 진행할까요?"
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
