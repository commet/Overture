---
name: orchestrate
description: "Design an execution plan that separates what AI should do from what humans must decide. Creates a storyline, assigns actors, identifies checkpoints. Use after /reframe or when planning any complex project involving both AI and human work."
argument-hint: "[goal or reframed question]"
---

A task list is not a plan. A plan tells a story: why this approach, who does what, and where to stop and think.

Your job is to design an execution plan where every step has a clear owner (AI, human, or both) and the critical decision points are surfaced — not buried.

**Always respond in the same language the user uses.**

## If no argument is provided

If the user just types `/orchestrate` without a goal, and there's no `/reframe` result in the conversation, ask:

> What's the goal or project you want to plan? (Tip: try /reframe first for a sharper starting point)

## Before starting

Check if `.overture/journal.md` exists. If it has previous `/orchestrate` entries, note any patterns.

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  Overture · Orchestrate                  │
  │  Execution design with AI/human roles    │
  ╰──────────────────────────────────────────╯
```

## Context from previous steps

If there's a `/reframe` result in the conversation, use it:
- Uncertain assumptions → include validation steps in the plan
- AI limitations → assign those steps to humans
- Reframed question → this is the goal now, not the original question

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

## Step 5: Stakeholders

Identify 2-4 people who should review this plan. These become personas for `/rehearse`.

For each: name/title, role, what they care about most, what would make them say no, what they need to see to say yes.

## Rules

- If the execution plan mirrors exactly what the user described, you haven't added value. Challenge the approach, the sequence, or the actor assignments.
- At least one step must have a human checkpoint.
- The governing idea must be falsifiable — something someone could disagree with.

**Self-check:** Would this plan make the user rethink anything, or did you just organize what they already had in mind?

## Output

Format the output inside a code block for consistent rendering:

```
  ╭──────────────────────────────────────────╮
  │  Overture · Orchestrate                  │
  │  Execution design with AI/human roles    │
  ╰──────────────────────────────────────────╯


  ■ Governing Idea

  ▸ [one sentence]


  ■ Storyline

    Situation:    [agreed facts]
    Complication: [the tension]
    Resolution:   [our approach]


  ■ Execution Steps

  ┌─ Step 1 ─────────────────────── Human ──┐
  │  [task]                                  │
  │  Why: [reasoning]                        │
  │  Deliverable: [output]                   │
  │  Checkpoint: [yes/no + reason]           │
  └──────────────────────────────────────────┘

  ┌─ Step 2 ──────────────────────── Both ──┐
  │  [task]                                  │
  │  AI does: [scope]                        │
  │  Human does: [scope]                     │
  │  Deliverable: [output]                   │
  └──────────────────────────────────────────┘

  ┌─ Step 3 ───────────────────────── AI ───┐
  │  [task]                                  │
  │  Deliverable: [output]                   │
  └──────────────────────────────────────────┘


  ■ Key Assumptions

    1  [assumption]
       Importance: [H/M/L] · Confidence: [H/M/L]
       If wrong: [impact]

    2  [assumption]
       ...


  ■ Stakeholders

    1 · [Name/Title]
        Cares about: [priority]
        Will block if: [concern]
        Needs to see: [success metric]

    2 · [Name/Title]
        ...


  ■ Design Rationale

    [2-3 sentences: why this sequence, why these owners]

  ──────────────────────────────────────────

  Next: /rehearse to stress-test with stakeholders
```

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /orchestrate
- Goal: "[governing idea]"
- Steps: [N] | AI: [M]% / Human: [K]%
- Key assumptions: [N]
```
