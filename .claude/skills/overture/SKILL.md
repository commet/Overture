---
name: overture
description: "Full decision harness. Runs the complete pipeline: reframe your question, design execution, stress-test with stakeholders, refine until solid, score your thinking. Produces 3 deliverables: a sharpened prompt, a team-shareable summary, and an agent-ready harness document. Use for important decisions. Takes 5-10 minutes."
argument-hint: "[important decision or problem]"
effort: high
---

This is the full pipeline. Like running a complete test suite before deploying — but for decisions.

You will run 4 stages autonomously, then score the quality of the thinking process. Keep moving between stages, but after Stage 1 (Reframe), briefly pause to show the reframed question — if the user wants to adjust it, use their correction.

**Always respond in the same language the user uses. All three deliverables must be in the user's language.**

## Before starting

Check if `.overture/journal.md` exists.

**If it does NOT exist (first use):** Before starting, say:

> First time running the full pipeline! Here's what'll happen:
> 1. I'll find hidden assumptions in your problem and reframe it (~2 min)
> 2. Design an execution plan with clear AI/human roles (~2 min)
> 3. Simulate 3 stakeholders who'll stress-test your plan (~3 min)
> 4. Fix the issues they find and re-verify (~2-5 min)
> 5. Score your thinking quality and give you 3 deliverables
>
> Let's go.

Then proceed.

**If it exists:** Read the last 10 entries. Look for patterns — recurring weak areas, repeated assumption types. Mention anything relevant before starting.

## Context constraints

If running in a long conversation or constrained context, adapt: reduce to 2 personas (instead of 3), limit to 1 refinement round, but always produce all 3 deliverables.

## Stage 1 of 4: Reframe (~2 min)

Follow the `/reframe` process in fast mode:
- Find 3-4 hidden assumptions
- If the user's input contains confidence signals ("we've validated X", "I'm sure about Y"), reflect those. Otherwise treat as "uncertain."
- Select reframing strategy based on the inferred confidence pattern
- Generate the reframed question + 3-5 hidden questions

Show the reframed question and ask: **"Does this capture the real question? Correct me if not — otherwise I'll continue to execution design."** Wait for a response. If the user says nothing or confirms, proceed. If they correct, use the correction.

## Stage 2 of 4: Orchestrate (~2 min)

Follow the `/orchestrate` process:
- Use the reframed question from Stage 1 as the goal
- Incorporate uncertain assumptions as validation steps
- Generate 3 stakeholder personas for review
- Design 3-5 execution steps with clear AI/human separation

Show the execution design, then move on.

## Stage 3 of 4: Rehearse (~3 min)

Follow the `/rehearse` process:
- Use the stakeholders from Stage 2 as personas
- Run independent reviews for each persona
- Run Devil's Advocate (3 lenses)
- Synthesize findings

Show the rehearsal results, then move on.

## Stage 4 of 4: Refine (~2-5 min)

Follow the `/refine` process:
- Auto-address all critical issues (no user confirmation needed)
- Maximum 2 refinement rounds (reduced from refine's default 3 to keep total time under 10 minutes)
- Check convergence

## Stage 5: Score and deliver

Evaluate the entire pipeline and produce 3 deliverables. **Lead with the most actionable item (Sharpened Prompt), then the summary, then the full harness.**

Also save the 3 deliverables (Sharpened Prompt, Thinking Summary, Agent Harness) plus the DQ scorecard to `.overture/last-run.md` in the project root (directory containing `.git`, or current working directory). This lets users reference the results later without scrolling through conversation history.

### Deliverable 1: Sharpened Prompt

A ready-to-use prompt the user can paste into any AI conversation. It should incorporate:
- The reframed question
- Key constraints discovered
- What to watch out for

```
## Sharpened Prompt

Paste this into your next AI conversation:

> [reframed question with context, constraints, and guardrails baked in.
> Include what AI should focus on and what it should flag for human review.]
```

### Deliverable 2: Thinking Summary

A team-shareable summary. Written like an email you'd send to your team — not a consulting document. Keep it under 3000 characters (Slack-friendly).

```
## Thinking Summary

**TL;DR:** [one sentence: what changed in our thinking and what to do next]

**Original question vs. the real question:**
- Asked: [original]
- Real question: [reframed]
- Why: [one sentence]

**Key risks found:**
- [critical] [risk — one line]
- [unspoken] [risk — one line]

**Sharpest critique:** "[direct quote from the most challenging persona]" — [persona name]

**Next steps:**
1. [concrete action + who]
2. [concrete action + who]
3. [concrete action + who]

Decision Quality: [N]/100
```

### Deliverable 3: Agent Harness

A structured instruction document for AI agents — ready to paste into a CLAUDE.md, project brief, or any agent configuration tool. This gives an AI agent everything it needs to execute the plan with the right constraints and checkpoints.

```
## Agent Harness

# Mission
[reframed question — this is what we're solving]

# Success Criteria
[from orchestrate: what "done" looks like for each step]

# Execution Steps
1. [step] — Owner: [AI/Human/Both]
   Deliverable: [specific output]
2. ...

# Checkpoints (stop and verify)
- Before step [N]: [what to verify and who approves]
- Before step [M]: [what to verify]

# Constraints
- [uncertain assumption → must validate before proceeding]
- [AI limitation → human must handle this]
- [stakeholder requirement → must satisfy before delivery]

# Known Risks
- [critical risk + mitigation]
- [unspoken risk + how to surface it]

# Stakeholder Requirements
- [Name]: needs [specific deliverable/metric] to approve
- [Name]: will block if [specific concern] isn't addressed
```

### Decision Quality Scorecard

Score the thinking process (not the outcome — outcomes aren't known yet).

6 elements, each 0-5:

| Element | What it measures |
|---------|-----------------|
| Framing | Did we redefine the problem? Find hidden assumptions? |
| Alternatives | Did we explore multiple directions? |
| Information | Did we identify and plan to validate key assumptions? |
| Perspectives | Did diverse stakeholders participate? |
| Reasoning | Did the refinement loop reduce issues? |
| Actionability | Are there concrete deliverables, owners, and checkpoints? |

Calculate overall score: (sum of elements / 30) × 100

Anti-sycophancy check:
- Was the initial framing challenged? (reframed ≠ original)
- Were blind spots surfaced? (unspoken risks found)
- Was the plan actually changed after rehearsal?

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Decision Quality Score
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Framing        ████░  4/5
  Alternatives   ███░░  3/5
  Information    ████░  4/5
  Perspectives   █████  5/5
  Reasoning      ████░  4/5
  Actionability  ███░░  3/5
  ────────────────────────
  Overall        77/100

  Anti-sycophancy:
  ✓ Initial framing challenged
  ✓ 2 blind spots surfaced
  ✓ Plan revised after rehearsal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Warning:** If score ≥ 80 but anti-sycophancy checks are all empty, flag it: "High score but no pushback detected. The analysis may be validating existing thinking rather than challenging it."

## Final check

Before delivering, ask yourself:
- Did any part of this analysis just agree with the user's initial framing?
- Is there at least one finding that would make the user uncomfortable?
- Would a smart, skeptical colleague find this analysis rigorous?

If any answer is "no," strengthen that section.

## Learning journal

Append to `.overture/journal.md` in the project root (the directory containing `.git`, or the current working directory):
```
## [date] /overture — full pipeline
- Problem: "[original]"
- Reframed: "[new question]"
- Steps: [N] | AI [M]% / Human [K]%
- Rehearsal: [N] personas, [M] critical, [K] unspoken
- Convergence: [N] rounds | [converged/not]
- DQ: [N]/100
- Sharpest critique: "[quote]"
```
