---
name: recast
description: "Design an execution plan that separates what AI should do from what humans must decide. Creates a storyline, assigns actors, identifies checkpoints. Use after /reframe or when planning any complex project involving both AI and human work."
argument-hint: "[goal or reframed question]"
allowed-tools: Read, Write, AskUserQuestion
---

## When to use

- ✓ After /reframe — you have a sharp question and need an execution plan
- ✓ After /reframe (build) — you have a product thesis and need a spec
- ✓ Planning a project with both AI and human involvement
- ✗ Simple tasks that one person can do alone
- ✗ When you need feedback on an existing plan (use /rehearse)

**Always respond in the same language the user uses.**

## If no argument

If no `/reframe` result exists and no argument given:

> What's the goal or project? (Tip: /reframe first for a sharper start)

## Context extraction from /reframe

If `.overture/reframe.md` exists, read the Context Contract:

- `reframed_question` → this is your GOAL
- `assumptions_doubtful` → key_assumption with importance: H, certainty: L. Include validation steps.
- `assumptions_uncertain` → key_assumption with importance: M, certainty: L.
- `assumptions_confirmed` → foundation. Don't re-validate.
- `ai_limitations` → steps touching these = human or both. Cross-check after assigning.

**Risk stance from `assumption_pattern`:**
- `mostly_doubtful` → conservative. Validation BEFORE commitment.
- `confirmed` → execution-focused. Optimize for speed.
- `mixed` → maintain direction + add verification checkpoints.

**If no /reframe result:** Proceed with user's input as goal. Detect context from input.

## Step 1: Instant — Governing Idea + Structure

**Produce this IMMEDIATELY.** No preamble.

---

**Overture · Recast** — 실행 설계

**▸** [governing idea — ONE sentence. Falsifiable. A decision-maker gets it in 10 seconds.]

[Situation] → [Complication]
[Approach]: [Resolution]

**Bad governing idea:** "We'll conduct market research"
**Good:** "90일 단일국가 실험으로 동남아 시장성을 검증한 후 확장 여부를 결정한다"

---

## Step 2: Execution Plan / Feature Spec

### Decide context: Execution steps (3-5)

For each step:
- **Task**: Specific deliverable name
- **Owner**: `AI` / `Human` / `Both`
- **Why this owner** (4 questions):
  1. Internal/political knowledge needed? → Human
  2. Judgment subjective/strategic? → Human
  3. Cost of error high/irreversible? → Human or Both
  4. Specific accountability needed? → Human
  - None apply → AI
- **Deliverable**: Specific output ("TAM analysis with 3 scenario models" not "research")
- **Checkpoint**: Does human need to approve before next step?

When owner is `Both`: specify AI scope and Human scope separately.

See `references/execution-design.md` for detailed guidance.

### Build context: Feature spec

- **P0** (must have): MAX 2 features
- **P1** (after P0 works): MAX 2 features
- **P2** (nice to have): MAX 1 feature

Each feature: **name** + **behavior** (one line, specific: "Google OAuth login · session persistence · logout" not "auth")

**User story**: "As a [who], I want [action], so that [value]."
**Scope cuts** (mandatory): 2-3 specific things NOT to build.
**Success metric**: One measurable thing ("5 people use it daily for a week" not "users love it").

## Step 3: Key Assumptions (2-4)

What must be TRUE for this to work? Each with importance, confidence, and if_wrong.

Merge from /reframe: every doubtful/uncertain assumption MUST appear here, marked `← reframe`.

## Step 4: Personas → /rehearse

### Decide: 3 stakeholder personas

**Diversity rule:**
1. Reporting audience — receives the deliverable
2. Gatekeeper — controls resources/approval
3. Domain expert — knows if this is realistic

Each with: name, role, influence, decision_style, risk_tolerance, primary_concern, blocking_condition, success_metric.

### Build: 2 user personas

1. **Target User** — name, context, current_solution (specific!), switch_threshold, dealbreaker
2. **Skeptic** — name, context, alternative (specific!), objection

## Output

### Decide context:

---

**Overture · Recast** — 실행 설계

**▸** [governing idea]

[situation] → [complication]
[approach]: [resolution]

---

**실행 계획**

| # | Actor | Task | Deliverable | Mark |
|---|-------|------|-------------|------|
| 1 | 🧑 | [task] | [deliverable] | ⚑ |
| 2 | 🤖 | [task] | [deliverable] | |
| 3 | ⚡ | [task] | [deliverable] | ★ |

⚑ checkpoint · ★ critical

For ⚡ Both: `> AI: [scope] / Human: [scope]`

---

**전제**

```diff
+ ✓ [confirmed] — importance: H, confidence: H
- ? [uncertain] — importance: M, confidence: L  ← reframe
- ✗ [doubtful] — importance: H, confidence: L  ← reframe
```

---

**사전 검증 대상** → /rehearse

1. **[Name]** — [Role]: [primary concern]
2. **[Name]** — [Role]: [primary concern]
3. **[Name]** — [Role]: [primary concern]

---

`Next? 1 /rehearse · 2 edit · 3 save · ← 0`

---

### Build context:

---

**Overture · Recast** — 실행 설계

```diff
+ ▸ [product thesis]
```

**User Story:** [As a ... I want ... so that ...]

---

**MVP**

| # | Feature | Behavior |
|---|---------|----------|
| P0 | [feature] | [behavior] |
| P0 | [feature] | [behavior] |
| P1 | [feature] | [behavior] |
| P2 | [feature] | [behavior] |

**✂ Scope Cuts:** [cut] · [cut] · [cut]

---

**전제**

```diff
+ ✓ [confirmed]
- ? [uncertain]  ← reframe
```

---

**사용자 검증** → /rehearse

- 🎯 **[Name]** — [context]: [current_solution]
- 🤨 **[Name]** — [context]: "[objection]"

---

**성공 기준** = [metric]

`Next? 1 /rehearse · 2 edit · 3 save · ← 0`

---

**Implementation Prompt** (Build only, after card):

> **✦ 이 프롬프트를 Cursor/Claude Code에 붙여넣으세요:**
>
> Build a [type] that [thesis].
> Target user: [who]
> Core features:
> - [P0]: [behavior]
> - [P0]: [behavior]
> Then add:
> - [P1]: [behavior]
> Do NOT build: [scope cuts]
> Constraints:
> - [from assumption/persona]
> Success = [metric]

## Quick actions

- `1` → save + launch /rehearse
- `2` → edit (show: a. thesis, b. steps/features, c. personas, d. scope cuts)
- `3` → save and stop
- `0` → back to /reframe with insights
- Anything else → respond naturally

## Rendering rules

- Markdown sections separated by `---`. NOT a single code block.
- **No box drawing.** Use `---`, `**bold**`, whitespace.
- **No fixed width.** Markdown auto-wraps.
- **diff = color tool.** `+` confirmed (green), `-` risk (red). Max 3 per output.
- No academic citations.

## Auto-save

Save to `.overture/recast.md` when user approves:
- Top: shareable content
- Bottom after `---`: Context Contract (all fields for /rehearse)

**Contract must include ALL persona fields** — /rehearse reproduces them exactly.

## Journal

Append to `.overture/journal.md`:

```
## [date] /recast — [topic, ≤5 words]
- Context: [build|decide]
- Goal: "[governing idea]"
- Steps: [N] | AI: [M]% / Human: [K]%
- Key assumptions: [N] ([M] from reframe)
- Pipeline: reframe ✓ → recast ✓ → rehearse · refine
```

## Returning users

Check journal. If previous /recast in same topic area:
> 💭 관련 이전 분석: [date] "[topic]" — [key learning]

## Rules

- If the plan mirrors exactly what user described, you haven't added value. Challenge something.
- At least one step must have a human checkpoint.
- The governing idea must be falsifiable.
- Self-check: Would this make the user rethink anything?

**Skeleton quality (from progressive engine):**
- Each item = ACTIONABLE, not vague category
- Good: "시장 현황: 현재 경쟁사 3곳의 접근법과 우리가 다른 점 정리"
- Bad: "시장 분석" (too vague)
- 사용자가 copy-paste해서 바로 채울 수 있는 수준

**Feature behavior rule (Build context):**
- "Google OAuth login · session persistence · logout" (specific behavior)
- NOT "auth" (label only)
