---
name: recast
description: "Design an execution plan that separates what AI should do from what humans must decide. Creates a storyline, assigns actors, identifies checkpoints. Use after /reframe or when planning any complex project involving both AI and human work."
argument-hint: "[goal or reframed question]"
allowed-tools: Read, Write, AskUserQuestion
---

## When to use

- ✓ After /reframe — you have a sharp question and need an execution plan
- ✓ After /reframe (build) — you have a sharp product thesis and need a spec
- ✓ Planning a project with both AI and human involvement
- ✓ Need to clarify who does what before starting work
- ✓ Want to identify decision checkpoints before committing resources
- ✗ Simple tasks that one person can do alone
- ✗ When you need feedback on an existing plan (use /rehearse)

A task list is not a plan. A plan tells a story: why this approach, who does what, and where to stop and think.

Your job is to design an execution plan where every step has a clear owner (AI, human, or both) and the critical decision points are surfaced — not buried.

**Always respond in the same language the user uses.**

**Rendering:** Final output in ONE code block (the "card"). Use emoji markers for actor types (`🧑 Human`, `🤖 AI`, `⚡ Both`), `⚑` for checkpoints, `★` for critical path. Interview/interaction phases use separate code blocks.

## If no argument is provided

If the user just types `/recast` without a goal, and there's no `/reframe` result in the conversation, ask:

> What's the goal or project you want to plan? (Tip: try /reframe first for a sharper starting point)

## Before starting

Check if `.overture/journal.md` exists. If it has previous `/recast` entries, note any patterns.

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  📋 Overture · Recast                    │
  ╰──────────────────────────────────────────╯
```

## Context extraction from /reframe

If a `/reframe` result exists, read `.overture/reframe.md` and locate the `## Context Contract` section. If the file doesn't exist, scan the conversation for the reframe card output. Extract:

### Mandatory extractions:
- `reframed_question` → this is your GOAL, not the user's original text
- `assumptions_doubtful` → each becomes a key_assumption with importance: H, certainty: L. Include validation steps in the plan for each.
- `assumptions_uncertain` → each becomes a key_assumption with importance: M, certainty: L. Include verification method.
- `assumptions_confirmed` → use as plan foundation. Do not re-validate.
- `ai_limitations` → any step touching these areas MUST have actor: human or both. Cross-check after assigning actors.

### Risk stance (from `assumption_pattern`):
- `mostly_doubtful` → be conservative. Place validation steps BEFORE commitment steps. Front-load cheap experiments.
- `confirmed` → be execution-focused. Optimize for speed and specificity.
- `mixed` → maintain direction but add verification checkpoints for doubtful items.

### Interview signal → execution style (from `interview_signals`):
- nature=known_path → focus on execution specifics, proven methods
- nature=needs_analysis → include data gathering and expert consultation steps
- nature=no_answer → design as **learning loops**: small experiments, frequent checkpoints
- nature=on_fire → **separate immediate response from structural fix** (two tracks)
- goal=competing → include **stakeholder alignment step** early
- goal=unclear → include **goal-definition step** before execution
- stakes=irreversible → place validation BEFORE any commitment point

### Assumption merge (critical):
Every assumption from `assumptions_doubtful` and `assumptions_uncertain` MUST appear in your key_assumptions output:
- From `assumptions_doubtful`: importance=H, certainty=L
- From `assumptions_uncertain`: importance=M, certainty=L
- Add `if_wrong` based on the original reason from reframe
- If your own key_assumption covers the same ground, keep yours and note it inherits from reframe
- Mark inherited assumptions with `[from reframe]`

### AI limitation validation:
After assigning actors to all steps, cross-check: does any AI-assigned step touch an area listed in `ai_limitations`? If yes, reassign to human or both.

### If no /reframe result exists:
Proceed normally using the user's input as the goal. The extraction rules above are skipped — but still generate key_assumptions and stakeholders independently. Detect context from input using the same signals as /reframe (see /reframe's Context Detection section).

## Context: Build vs Decide

If `context: build` (from /reframe Contract or self-detected), the entire flow adapts. The mapping:

| Decide (default) | Build |
|---|---|
| Governing idea | Product thesis |
| Storyline | Product narrative (same structure) |
| Execution steps (3-5, with actors) | Feature spec (P0/P1/P2) + scope cuts |
| Actor assignment (AI/Human/Both) | Not applicable — replaced by priority |
| Checkpoints | Not applicable — replaced by success metric |
| 3 stakeholder personas | 2 user personas (target user + skeptic) |
| — | Implementation Prompt (new deliverable) |

Below, each step has both decide and build versions. Follow the one matching the detected context.

## Step 1: Governing idea / Product thesis

**Decide:** Answer "So what are we actually doing?" in ONE sentence. A decision-maker should understand this in 10 seconds.

**Bad:** "We'll conduct market research and develop a strategy"
**Good:** "We'll validate SEA market fit with a 90-day single-country experiment before committing to full expansion"

**Build:** Answer "What exactly are we building and for whom?" in ONE sentence. A developer should know what to build after reading this.

**Bad:** "A task management app"
**Good:** "A keyboard-first task tool for solo developers who find Notion too slow and Todoist too rigid"

The thesis must be sharper than the user's original idea. If it's just a polished version, push harder.

## Step 2: Storyline / Product narrative

**Decide:** Why this approach?
- **Situation:** What everyone agrees is true
- **Complication:** The tension — what makes this hard
- **Resolution:** Our approach and why

**Build:** Same structure, product-framed:
- **Situation:** How people currently handle this (the status quo)
- **Complication:** Why current solutions frustrate them (the gap)
- **Resolution:** What we build and why it's different

## Step 3: Execution steps / Feature spec

### Decide context: Execution steps (3-5 steps)

For each step, define:

- **Task**: What specifically gets done
- **Owner**: `AI` / `Human` / `Both`
- **Why this owner**: Based on these 4 questions:
  1. Does it need internal/political knowledge? → Human
  2. Is the judgment call subjective or strategic? → Human
  3. Is the cost of getting it wrong high and irreversible? → Human or Both
  4. Does someone specific need to be accountable? → Human
  If none apply → AI can handle it.
- **Deliverable**: Specific output (not "market research" but "TAM analysis with 3 scenario models")
- **Checkpoint**: Does a human need to approve before the next step? Why?

When the owner is `Both`, always specify AI scope and Human scope separately.

See `references/execution-design.md` for detailed guidance.

### Build context: Feature spec

Replace execution steps with a prioritized feature spec:

- **P0** (must have for v1): MAX 2 features. If you listed more, re-prioritize.
- **P1** (build after P0 works): MAX 2 features.
- **P2** (nice to have, cut if behind): MAX 1 feature.

For each feature:
- **Feature**: specific name
- **Behavior**: what it does — MUST fit on one line in the card. Use `·` to join attributes (e.g., "카드형 UI · 마감일 · 정산 상태"). If it doesn't fit one line, you're describing too much.
- **Why this priority**: tied to product thesis or assumption validation

**User story**: One sentence — "As a [audience], I want [core action], so that [value]."

**Scope cuts (mandatory)**: List 2-3 things the user probably imagines but SHOULD NOT build in v1. Name specific features, not vague categories. This is where most vibe coding projects fail — building too much.

**Success metric**: One concrete, measurable thing. Not "users love it" but "5 people use it daily for a week."

**Rules:**
- P0 = MAX 2. Hard rule.
- Every feature must describe BEHAVIOR ("Google OAuth login" not "auth")
- Scope cuts must name specific things ("dark mode", "team collaboration", "analytics dashboard")

## Step 4: Key assumptions

What must be TRUE for this plan to work? 2-4 assumptions with importance, confidence, and what happens if wrong.

## Step 5: Stakeholders / User personas (→ /rehearse)

### Decide context: Stakeholders (3 personas)

Generate 3 stakeholder personas who should review this plan. These flow directly to `/rehearse`.

**Diversity rule — at least one from each category:**
1. **Reporting audience** — the person who receives the deliverable
2. **Gatekeeper** — the person who controls resources or approval
3. **Domain expert** — the person who knows if this is realistic

**For each persona, provide ALL of these fields** (needed for /rehearse to reproduce them exactly):
- **name** — realistic name for the persona
- **role** — title and function
- **influence** — high / medium / low
- **decision_style** — analytical / intuitive / consensus / directive
- **risk_tolerance** — low / medium / high
- **primary_concern** — what they care about MOST in this project
- **blocking_condition** — what would make them say no
- **success_metric** — what they need to see to say yes

### Build context: User personas (2 personas)

Generate 2 user personas for `/rehearse`. These are USERS, not stakeholders.

1. **Target User** — the actual daily user
   - **name** — realistic
   - **context** — what they do, how they'd discover this product
   - **current_solution** — what they use today (MUST be specific: "Notion", "spreadsheet", "nothing")
   - **switch_threshold** — what would make them switch from current solution
   - **dealbreaker** — what would make them stop using it / delete it

2. **Skeptic** — someone who's tried or seen similar products
   - **name** — realistic
   - **context** — why they're skeptical (past experience, industry knowledge)
   - **alternative** — specific competing product/tool/behavior they'd recommend instead (MUST name something real)
   - **objection** — the core "why would anyone need this when X exists?" argument

## Rules

- If the execution plan mirrors exactly what the user described, you haven't added value. Challenge the approach, the sequence, or the actor assignments.
- At least one step must have a human checkpoint.
- The governing idea must be falsifiable — something someone could disagree with.

**Self-check:** Would this plan make the user rethink anything, or did you just organize what they already had in mind?

## Output

**Single card** — one code block. Auto-save to `.overture/recast.md`.

### Decide context: Output card

```
  ╭──────────────────────────────────────────╮
  │  📋 Overture · Recast                    │
  ╰──────────────────────────────────────────╯

  ▸ [governing idea — one sentence, 10초 이해]

  [situation] → [complication]
  [approach]: [resolution]

  ─────────────────────────────────────────

  #  Actor  [Task label]        [Deliverable label]
  ─────────────────────────────────────────────────
  1  🧑    [task]               [deliverable]       ⚑
  2  🤖    [task]               [deliverable]
  3  ⚡    [task]               [deliverable]       ★
  4  🧑    [task]               [deliverable]       ⚑

  ⚑ = checkpoint  ★ = critical

  ─────────────────────────────────────────

  [Assumption label]        [Imp] [Conf] [Source]
  ─────────────────────────────────────────────────
  [assumption]               H     H
  [assumption]               M     L     reframe
  [assumption]               H     L     reframe

  [Personas label] (→ /rehearse)
  1 · [Name] — [Role] — [primary concern]
  2 · [Name] — [Role] — [primary concern]
  3 · [Name] — [Role] — [primary concern]

  /rehearse · /refine              📄 saved
```

**Step table:** Header row with column labels + `─` separator. Each step is one row: `#`, actor emoji, task, deliverable, checkpoint/critical marker.
- For `⚡ Both` steps: add `AI: [scope] / [Human label]: [scope]` on next line
**Assumption table:** Columns for importance (H/M/L), confidence (H/M/L), source (`reframe` if inherited). Inherited assumptions from /reframe are flagged visually.

### Build context: Output card

**Readability rules for build card:**
- **One line per item.** If a feature behavior wraps to 2 lines, shorten it. Use `·` to join attributes inline.
- **Narrative goes in saved file only** — NOT in the card. The card is a 10-second scan.
- **Assumptions: symbol first** — `?` or `✗` left-aligned, text, source right-aligned. No multi-column tables.
- **Personas: 2 lines each** — name+context on line 1, current solution or alternative on line 2.

```
  ╭──────────────────────────────────────────────╮
  │  📋 Overture · Recast                        │
  ╰──────────────────────────────────────────────╯

  ▸ [product thesis — 1-2 lines max]

  ─────────────────────────────────────────────────
  [User Story]
  [As a ... I want ... so that ...]

  ─────────────────────────────────────────────────
  MVP

  P0  [feature]          [behavior — short, use · for multiple attributes]
  P0  [feature]          [behavior]
  P1  [feature]          [behavior]
  P2  [feature]          [behavior]

  ✂ [cut] · [cut] · [cut] · [cut]

  ─────────────────────────────────────────────────
  [Assumptions]

  ?  [short assumption text]                reframe
  ?  [short assumption text]                reframe
  ?  [short assumption text]                new

  ─────────────────────────────────────────────────
  [Personas]                             → /rehearse

  🎯 [Name]  [role/context] · [current_solution]
  🤨 [Name]  [role/context] · [named alternative]

  ─────────────────────────────────────────────────
  [Success] = [metric]
```

**After the card, ask before saving:**

> [Next step?]
> `/rehearse` [to stress-test] · [adjust] · [save and continue]

Only save `.overture/recast.md` after the user confirms (says next step, "ok", "save", or anything indicating approval). If the user requests adjustments, revise the card and ask again.

**After the card**, produce the Implementation Prompt as a blockquote:

> **✦ Implementation Prompt** — paste into Cursor, Claude Code, or any AI coding tool:
>
> Build a [type] that [thesis].
>
> Target user: [who — one line]
>
> Core features (build these first):
> - [P0 feature]: [specific behavior]
> - [P0 feature]: [specific behavior]
>
> Then add:
> - [P1 feature]: [specific behavior]
>
> Do NOT build: [specific scope cuts]
>
> Constraints:
> - [from doubtful/uncertain assumption]
> - [from persona insight]
>
> Success = [metric]

**Implementation Prompt rules:**
- Every line must earn its place — no filler
- Features describe BEHAVIOR, not labels
- "Do NOT build" names specific things
- Constraints come from actual findings
- A developer reading this should know what to build with zero follow-up questions

### Auto-save

**When the user approves** (or moves to the next skill), save to `.overture/recast.md` with shareable top + contract bottom (same pattern as reframe):
- Top: thesis, narrative (full version here — NOT in the card), user story, features, assumptions, personas, implementation prompt (clean markdown)
- Bottom after `---`: full Context Contract with all fields

**Decide context contract fields:** governing_idea, design_rationale, storyline, steps with actor/checkpoint/critical, critical_path, key_assumptions, inherited_assumptions, personas with ALL fields, ai_limitations

**Build context contract fields:** context: build, product_thesis, storyline, user_story, features (p0/p1/p2 with behaviors), scope_cuts, key_assumptions, inherited_assumptions, target_user (all fields), skeptic (all fields), success_metric, implementation_prompt

Personas in the contract MUST include ALL fields — these are needed for /rehearse to reproduce exactly.

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /recast
- Goal: "[governing idea]"
- Steps: [N] | AI: [M]% / Human: [K]%
- Key assumptions: [N]
```
