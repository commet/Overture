---
name: recast
description: "Design an execution plan that separates what AI should do from what humans must decide. Creates a storyline, assigns actors, identifies checkpoints. Use after /reframe or when planning any complex project involving both AI and human work."
argument-hint: "[goal or reframed question]"
---

A task list is not a plan. A plan tells a story: why this approach, who does what, and where to stop and think.

Your job is to design an execution plan where every step has a clear owner (AI, human, or both) and the critical decision points are surfaced — not buried.

**Always respond in the same language the user uses.**

Use **hybrid rendering** — structure/data in code blocks, rationale/insights in markdown. Use **actor-specific box styles** to visually distinguish Human/AI/Both steps. Use `diff` blocks for low-confidence assumptions.

## If no argument is provided

If the user just types `/recast` without a goal, and there's no `/reframe` result in the conversation, ask:

> What's the goal or project you want to plan? (Tip: try /reframe first for a sharper starting point)

## Before starting

Check if `.overture/journal.md` exists. If it has previous `/recast` entries, note any patterns.

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  Overture · Recast                  │
  │  Execution design with AI/human roles    │
  ╰──────────────────────────────────────────╯
```

## Context extraction from /reframe

If a `/reframe` result exists in this conversation, locate its `■ Context Contract — /reframe` block and extract:

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
Proceed normally using the user's input as the goal. The extraction rules above are skipped — but still generate key_assumptions and stakeholders independently.

## Step 1: Governing idea

Answer "So what are we actually doing?" in ONE sentence. A decision-maker should understand this in 10 seconds.

**Bad:** "We'll conduct market research and develop a strategy"
**Good:** "We'll validate SEA market fit with a 90-day single-country experiment before committing to full expansion"

## Step 2: Storyline

Why this approach? Structure it as:
- **Situation:** What everyone agrees is true
- **Complication:** The tension — what makes this hard
- **Resolution:** Our approach and why

## Step 3: Execution steps (3-5 steps)

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

## Step 4: Key assumptions

What must be TRUE for this plan to work? 2-4 assumptions with importance, confidence, and what happens if wrong.

## Step 5: Stakeholders (→ personas for /rehearse)

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

## Rules

- If the execution plan mirrors exactly what the user described, you haven't added value. Challenge the approach, the sequence, or the actor assignments.
- At least one step must have a human checkpoint.
- The governing idea must be falsifiable — something someone could disagree with.

**Self-check:** Would this plan make the user rethink anything, or did you just organize what they already had in mind?

## Output

Output has 4 acts separated by `---`.

**Act 1: Direction**

```
  ╭──────────────────────────────────────────╮
  │  Overture · Recast                       │
  │  Execution design with AI/human roles    │
  ╰──────────────────────────────────────────╯
```

**▸ Governing Idea:** [one sentence — a decision-maker gets it in 10 seconds]

```
  ■ Storyline

    Situation:    [agreed facts]
    Complication: [the tension]
    Resolution:   [our approach]
```

---

**Act 2: Execution** — each owner type gets a distinct box style:

```
  ■ Execution Steps

  ┌─ Step 1 ────────────────────── 🧑 Human ──┐
  │  [task]                                     │
  │  Why: [reasoning]                           │
  │  Deliverable: [output]                      │
  │  Checkpoint: [yes/no + reason]              │
  └─────────────────────────────────────────────┘
```
```
  ╔═ Step 2 ════════════════════════ 🤖 AI ═══╗
  ║  [task]                                     ║
  ║  Deliverable: [output]                      ║
  ╚═════════════════════════════════════════════╝
```
```
  ┏━ Step 3 ━━━━━━━━━━━━━━━━━━━━━━ ⚡ Both ━━━┓
  ┃  [task]                                     ┃
  ┃  AI does: [scope]                           ┃
  ┃  Human does: [scope]                        ┃
  ┃  Deliverable: [output]                      ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

**Act 3: Evidence** (grouped — reference material)

Key Assumptions — `diff` block for low-confidence and inherited items:

```
  ■ Key Assumptions

    1  [assumption]
       Importance: H · Confidence: H
       If wrong: [impact]
```
```diff
-   2  [assumption] [from reframe]
-      Importance: H · Confidence: L
-      If wrong: [impact]
```

```
  ■ Stakeholders (→ /rehearse personas)

    1 · [Name] — [Role]
        Influence: [H/M/L] · Style: [analytical/intuitive/consensus/directive]
        Risk tolerance: [low/medium/high]
        Primary concern: [what they care about most]
        Will block if: [specific condition]
        Needs to see: [success metric]

    2 · [Name] — [Role]
        ...

    3 · [Name] — [Role]
        ...
```

---

**Act 4: Rationale + Contract**

**Design Rationale:** [2-3 sentences: why this sequence, why these owners]

```
  ■ Context Contract — /recast

    governing_idea: [one sentence]
    design_rationale: [why this approach]

    storyline:
      situation: [facts]
      complication: [tension]
      resolution: [approach]

    steps:
      1. [task] | actor: [ai|human|both] | checkpoint: [yes|no] | critical: [yes|no]
      2. [task] | actor: [ai|human|both] | checkpoint: [yes|no] | critical: [yes|no]
      ...

    critical_path: [step numbers that gate everything]

    key_assumptions:
      - [assumption] | importance: [H|M|L] | certainty: [H|M|L] | if_wrong: [impact]

    inherited_assumptions:
      - [from reframe] [assumption] | importance: H | certainty: L | if_wrong: [impact]

    personas:
      1. [name] | role: [role] | style: [X] | risk: [X] | concern: [X] | blocks_if: [X]
      2. [name] | role: [role] | style: [X] | risk: [X] | concern: [X] | blocks_if: [X]
      3. [name] | role: [role] | style: [X] | risk: [X] | concern: [X] | blocks_if: [X]

    ai_limitations:
      - [carried from reframe]

  Next: /rehearse to stress-test with stakeholders
```

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /recast
- Goal: "[governing idea]"
- Steps: [N] | AI: [M]% / Human: [K]%
- Key assumptions: [N]
```
