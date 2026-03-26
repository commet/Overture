---
name: orchestrate
description: "Design an execution plan that separates what AI should do from what humans must decide. Creates a storyline, assigns actors, identifies checkpoints. Use after /reframe or when planning any complex project involving both AI and human work."
argument-hint: "[goal or reframed question]"
---

A task list is not a plan. A plan tells a story: why this approach, who does what, and where to stop and think.

Your job is to design an execution plan where every step has a clear owner (AI, human, or both) and the critical decision points are surfaced — not buried.

**Always respond in the same language the user uses.**

## Before starting

Check if `.overture/journal.md` exists. If it has previous `/orchestrate` entries, note any patterns (e.g., "user tends to over-assign to AI" or "always needs more checkpoints").

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

**Example:**
- Situation: "Our product has strong domestic PMF with 40% MoM growth"
- Complication: "But domestic TAM caps at $50M and three funded competitors are entering. Growth requires new markets, but international expansion has a 70% failure rate for our stage."
- Resolution: "Run a focused 90-day experiment in one market to validate international unit economics before committing resources"

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
- **Deliverable**: What this step produces (be specific — not "market research" but "TAM analysis with 3 scenario models")
- **Checkpoint**: Does a human need to approve before the next step? Why?

When the owner is `Both`, always specify:
- AI does: [concrete scope]
- Human does: [concrete scope]

**Example step:**
```
### Step 2: Competitive landscape analysis — Both
AI does: Map all competitors in target market, pricing, features, funding, growth signals
Human does: Interpret competitive positioning, identify our defensible angle, decide go/no-go
Deliverable: 1-page competitive map + strategic positioning recommendation
Checkpoint: Yes — go/no-go decision determines if we proceed to Step 3
```

## Step 4: Key assumptions

What must be TRUE for this plan to work? List 2-4 assumptions with:
- The assumption
- How important it is (high/medium/low)
- How confident you are (high/medium/low)
- What happens if it's wrong

## Step 5: Stakeholders

Identify 2-4 people who should review this plan before execution. Aim for 3, but use judgment:
1. The decision-maker (can kill or approve this)
2. The resource controller (budget, team, timeline authority)
3. The reality checker (closest to the ground truth)

For each: name/title, role, what they care about most, what would make them say no, what they need to see to say yes.

These become personas for `/rehearse`.

## Rules

- If the execution plan mirrors exactly what the user described, you haven't added value. Challenge the approach, the sequence, or the actor assignments.
- At least one step must have a human checkpoint. If every step is AI-only, the plan lacks judgment gates.
- Never start with "This is a great plan." Go straight to the governing idea.
- The governing idea must be falsifiable — something someone could disagree with.

**Self-check before outputting:** Would this plan make the user rethink anything, or did you just organize what they already had in mind?

## Output

```
## Execution Design

**Governing idea:** [one sentence]

**Storyline:**
- Situation: [agreed facts]
- Complication: [the tension]
- Resolution: [our approach]

### Step 1: [task] — [Owner]
- Why this owner: [reasoning]
- Deliverable: [specific output]
- Checkpoint: [yes/no + reason]

### Step 2: [task] — [Owner]
...

**Key assumptions:**
1. [assumption] — Importance: [H/M/L] | Confidence: [H/M/L]
   If wrong: [impact]

**Stakeholders to review:**
1. [Name/Title] — cares about: [priority] | needs to see: [success metric]
2. ...
3. ...

**Design rationale:** [2-3 sentences: why this sequence, why these owners]
```

After the output, suggest: *"Ready for stakeholder stress-test? Run /rehearse. Or run /overture for the full pipeline."*

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /orchestrate
- Goal: "[governing idea]"
- Steps: [N] | AI: [M]% / Human: [K]%
- Key assumptions: [N]
```
