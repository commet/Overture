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

**Rendering:** Final output in markdown sections separated by `---`. NOT a single code block. Use diff blocks for assumptions/thesis, bold for section labels, blockquotes for insights, markdown tables for execution steps/features.

**No box drawing.** Do NOT use `╭╮╰╯`, `┌│└`, `═══╪`, `───┼`, `━━━`, or any Unicode box characters. Use `---`, `**bold**`, and whitespace for structure.

**No fixed width.** Do NOT enforce 76-char width. Markdown auto-wraps.

**diff blocks = color tool.** `+` lines = confirmed/positive (green). `-` lines = uncertain/risk (red). Use sparingly (max 2-3 per output).

## If no argument is provided

If the user just types `/recast` without a goal, and there's no `/reframe` result in the conversation, ask:

> What's the goal or project you want to plan? (Tip: try /reframe first for a sharper starting point)

## Before starting

Check if `.overture/journal.md` exists. If it has previous `/recast` entries, apply adaptive rules below.

### Adaptive rules (journal → behavior)

Scan last 10 journal entries:

**Pattern: Previous recast in same topic area had "feature-not-product" critique**
→ In Step 1, stress-test the thesis harder: "Is this a product or a feature of an existing product?"

**Pattern: Previous rehearse showed all personas rejecting → user went back to recast**
→ Add a note: `이전에 이 단계에서 thesis를 바꿔야 했습니다. thesis가 충분히 차별화되었는지 확인하세요.`

**Topic linking:** If journal has entries in the same domain, show:

> 💭 관련 이전 실행: [date] "[topic]" — [key learning, 1 line]

Show the header as markdown bold:

**📋 Overture · Recast**

### Reflection block (show FIRST, before heavy analysis)

If continuing from `/reframe`, output a brief reflection block immediately after the header. This gives the user something to think about while the full card generates. Pick the most provocative element from the previous step:

> 💭 **이전 단계에서:**
> "[the blind spot insight or sharpest reframed question]"
>
> **생각해볼 것:**
> - [1 question that deepens their thinking — tied to the uncertain assumptions]
> - [1 relevant external reference: competing product, market trend, or analogous case — be specific with names]

**Rules:** Max 4 lines of content. Be specific, not generic. The external reference should name a real product, company, or trend. This block is a "thinking appetizer" — not a summary of what's coming. Output this block, then proceed to the full analysis.

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

**⚠️ If 0 confirmed assumptions from reframe:** All assumptions are doubtful or uncertain — the foundation is unvalidated. Add a note at the top of the output:

> ⚠️ Reframe에서 확인된 가정 0개 — 이 계획은 탐색적(exploratory)입니다. 검증 단계를 실행 앞에 배치합니다.
In decide context: place the FIRST step as a validation/experiment step (actor: Human or Both). In build context: add "가정 검증" as a mandatory pre-P0 step in the feature spec. Adapt language to match user's language.

### Engine-driven backward recommendation

After generating the card, before showing quick actions, check these conditions. If triggered, show the recommendation **above** the quick action menu:

**Condition: 0 confirmed + thesis makes a specific bet (not exploratory)**
If all assumptions are uncertain/doubtful AND the product thesis commits to a specific solution (not a validation-first approach), the engine recommends going back:

> 💡 **엔진 추천:** 모든 가정이 미검증인데 thesis가 구체적 bet을 잡고 있습니다. ← /reframe에서 최소 1개 가정을 검증하거나, thesis를 탐색형으로 바꾸는 걸 권장합니다.
This is a recommendation, not a blocker. The user can proceed with `1` or go back with `0`.

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

**Markdown sections** — separated by `---`. Auto-save to `.overture/recast.md`.

### Decide context: Output template

**📋 Recast**

**▸** [governing idea — one sentence]

[situation] → [complication]
[approach]: [resolution]

---

**[실행 label]**

| # | Actor | Task | Deliverable | |
|---|-------|------|-------------|-|
| 1 | 🧑 | [task] | [deliverable] | ⚑ |
| 2 | 🤖 | [task] | [deliverable] | |
| 3 | ⚡ | [task] | [deliverable] | ★ |
| 4 | 🧑 | [task] | [deliverable] | ⚑ |

⚑ checkpoint · ★ critical

For `⚡ Both` steps: add a line below the table: `> AI: [scope] / Human: [scope]`

---

**[가정 label]**

```diff
+ ✓ [confirmed assumption] — Imp: H, Conf: H
- ? [uncertain assumption] — Imp: M, Conf: L
- ? [assumption] — Imp: H, Conf: L  ← reframe
```

---

**[페르소나 label]** → /rehearse

1. **[Name]** — [Role]: [primary concern]
2. **[Name]** — [Role]: [primary concern]
3. **[Name]** — [Role]: [primary concern]

---

`███░░ ✓정의 ✓계획 ·가정 ·테스트 ·해결`

`다음? 1 /rehearse · 2 수정 · 3 저장 · ← 0`

**Step table:** Standard markdown table. Actor emoji (🧑/🤖/⚡) + task + deliverable. ⚑/★ as last column.
**Assumptions:** Single diff block. `+` = confirmed, `-` = uncertain/doubtful. Imp/Conf inline. `← reframe` when inherited.
**Personas:** Numbered bold list, 1 line each.

### Build context: Output template

**📋 Recast**

```diff
+ ▸ [product thesis]
```

**User Story:** [As a ... I want ... so that ...]

---

**MVP**

| Pri | 기능 | 동작 |
|-----|------|------|
| P0 | [feature] | [behavior — one line] |
| P0 | [feature] | [behavior] |
| P1 | [feature] | [behavior] |
| P2 | [feature] | [behavior] |

**✂ Scope Cuts:** [cut] · [cut] · [cut] · [cut]

---

**[가정 label]**

```diff
+ ✓ [confirmed assumption]
- ? [uncertain assumption]  ← reframe
- ? [uncertain assumption]  ← reframe
- ? [new assumption]  ← new
```

---

**[페르소나 label]** → /rehearse

- 🎯 **[Name]** — [role/context]: [current_solution or key trait]
- 🤨 **[Name]** — [role/context]: "[core objection — one sentence]"

---

**[성공 label]** = [metric]

`███░░ ✓정의 ✓계획 ·가정 ·테스트 ·해결`

`다음? 1 /rehearse · 2 수정 · 3 저장 · ← 0`

**Layout rules:**
- **Sections:** Separated by `---` horizontal rules.
- **Product thesis:** diff block (green highlight for emphasis).
- **MVP:** Standard markdown table. Feature names short. One behavior per line.
- **Assumptions:** Single diff block. `+` = confirmed, `-` = uncertain/doubtful. `← reframe`/`← new` inline.
- **Personas:** Bullet list with emoji + bold name. 1 line each.
- **No fixed width.** Markdown auto-wraps.

**Quick action:** The user can type `0`, `1`, `2`, or `3`. `1` saves and launches the next skill. `2` shows editable items (see below). `3` saves and stops. `0` goes back to /reframe with current insights as context. If the user types anything else, respond naturally. Adapt labels to user's language.

**When user picks `2` (수정):** Show numbered items they can modify:

> a. Product thesis
> b. 기능 (P0/P1/P2)
> c. 페르소나
> d. Scope cuts
> e. 기타 (직접 입력)
After adjustment, re-output the card and show quick actions again.

**Going back (`0`):** When the user chooses to go back, summarize what was learned in recast that should inform the redo:
> 💡 Recast에서 발견한 것:
> - [key insight that changes the reframe, e.g., "thesis를 세우려니 가정 X가 더 근본적 문제"]
> - [what to probe differently in reframe]
Then launch `/reframe` with the original question + these insights as context.

Only save `.overture/recast.md` after the user confirms (choice 1 or 3, or says "ok", "save", or anything indicating approval).

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
**Header uniqueness rule:** Include date + skill + short topic slug (≤5 words). Example: `## 2026-03-27 /recast — AI 코드 리뷰 어시스턴트`

```
## [date] /recast — [short topic, ≤5 words]
- Context: [build|decide]
- Goal: "[governing idea]"
- Steps: [N] | AI: [M]% / Human: [K]%
- Key assumptions: [N] ([M] from reframe)
  - [each assumption — importance H/M/L, certainty H/M/L — 1 line, max 4]
- Pipeline: reframe ✓ → recast ✓ → rehearse · refine
```
