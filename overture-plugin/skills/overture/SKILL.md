---
name: overture
description: "Full decision harness. Runs the complete pipeline: reframe your question, design execution, stress-test with stakeholders, refine until solid, score your thinking. Produces 3 deliverables: a sharpened prompt, a team-shareable summary, and an agent-ready harness document. Use for important decisions. Takes 5-10 minutes."
argument-hint: "[important decision or problem]"
effort: high
allowed-tools: Read, Write, Agent, AskUserQuestion
---

## When to use

- ✓ Important decisions that affect your team, product, or career
- ✓ Building a product — get a sharp spec before asking AI to code
- ✓ When the cost of a wrong decision is high (irreversible, expensive, political)
- ✓ Before a board meeting, product launch, or strategic pivot
- ✓ When you want the full analysis: reframe → plan → stress-test → refine → score
- ✗ Quick tactical questions (use /reframe alone)
- ✗ When you only need one step (use /reframe, /recast, /rehearse, or /refine individually)

This is the full pipeline. Like running a complete test suite before deploying — but for decisions and product ideas.

You will run 4 stages autonomously, then score the quality of the thinking process. Keep moving between stages, but after Stage 1 (Reframe), briefly pause to show the reframed question — if the user wants to adjust it, use their correction.

**Always respond in the same language the user uses. All deliverables must be in the user's language.**

## Context-adaptive pipeline

The pipeline auto-detects context from the user's input using /reframe's context detection logic:

**Build context** (product/app idea detected):
- Lighter: ~5 min total (vs 5-10 for decide)
- Reframe: build interview (audience/success/scale), product assumptions (3, not 4)
- Recast: product spec (features P0/P1/P2 + scope cuts) instead of execution steps
- Rehearse: 2 user personas instead of 3 stakeholders, lighter Devil's Advocate
- Refine: max 1 round
- Deliverables adapt (see Stage 5 below)

**Decide context** (default): full pipeline unchanged.

The `context` field flows through all stages via the Context Contract.

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

Then, after analyzing the user's initial problem statement, offer one **counterfactual insight** — a concrete suggestion framed as possibility, not criticism:

> ▸ Tip: if you had [specific action, e.g. "separated the timeline constraint from the market question"], [specific benefit, e.g. "the assumptions would have been clearer from the start"]. Something to try next time.

This plants a seed. Even on a first run, the user walks away with something they can consciously try next time.

**If it exists (2-4 entries):** Read all entries. Surface one specific improvement AND one area to watch:

> ▸ Growth: [specific observation, e.g. "Last time you missed the regulatory angle — this time you named it upfront."]
> ▸ Watch: [recurring pattern, e.g. "You tend to skip stakeholder concerns about timeline. Worth probing this time."]

**If it exists (5+ entries):** Read last 10 entries. Surface a **strength profile** alongside weak patterns:

> ▸ Your pattern (N runs): You consistently [strength, e.g. "reframe questions sharply — your reframing scores average 4.2/5"]. Your growth edge is [area, e.g. "exploring alternatives — you tend to commit to your first direction quickly"].

The tone is a coach who has watched you over time — not a scorecard, but a "here's what I've noticed."

## If no argument is provided

If the user just types `/overture` without a problem, ask:

> What important decision or problem should we think through?

Wait for their response, then proceed with the full pipeline.

## Context constraints

If running in a long conversation or constrained context, adapt: reduce to 2 personas (instead of 3), limit to 1 refinement round, but always produce all 3 deliverables.

Show the pipeline header at the start:

```
  ╭──────────────────────────────────────────────╮
  │  Overture · 4R Pipeline                     │
  │  reframe → recast → rehearse → refine       │
  ╰──────────────────────────────────────────────╯
```

## Stage 1 of 4: Reframe (~2 min)

Run `/reframe` in fast mode — use its full process, its design system, and its output format. The only difference:
- Skip the interactive interview. Infer signals from the user's input instead. Mark inferred signals with `[inferred]` in the Context Contract.
- If the user's input contains confidence signals ("we've validated X"), reflect those. Otherwise treat all assumptions as "uncertain."
- **MUST produce the `■ Context Contract — /reframe` block.** This is the input for Stage 2.

After the reframe output, show the breadcrumb — completed steps in diff `+` (green):

```diff
+ reframe ●  done
```
```
  recast  ○  next
  rehearse ○
  refine   ○
```

**Micro-acknowledgment (if earned):** Did the user's original input already contain a sharp insight — an assumption they named, a risk they anticipated, a nuance most people miss? If so, acknowledge it in one specific line: `▸ [what they did well and why it matters]`. If nothing stands out, say nothing — silence is better than generic praise.

Ask: **"Does this capture the real question? Correct me if not — otherwise I'll continue."** Wait for a response. If the user confirms or says nothing, proceed. If they correct, use the correction.

## Stage 2 of 4: Recast (~2 min)

Run `/recast` — use its full process, design system, and output format.
- **Extract the `■ Context Contract — /reframe` from Stage 1 output above.** Apply the full context extraction protocol (assumption merge, risk stance, signal mapping, AI limitation validation).
- Use the reframed question as the goal
- Incorporate uncertain/doubtful assumptions as validation steps
- Generate 3 stakeholder personas for review
- **MUST produce the `■ Context Contract — /recast` block.** This is the input for Stage 3.

After the recast output, show breadcrumb:
```diff
+ reframe ●  done
+ recast  ●  done
```
```
  rehearse ○  next
  refine   ○
```

**Micro-acknowledgment (if earned):** Did the reframed question lead to an unusually clear role separation, or did the user's context make checkpoint placement obvious? Acknowledge one specific strength if genuine. Say nothing if nothing stands out.

## Stage 3 of 4: Rehearse (~3 min)

Run `/rehearse` — use its full process, design system, and output format.
- **Extract BOTH Contract blocks** from Stage 1 (/reframe) and Stage 2 (/recast). Inject into each persona's review per /rehearse's context extraction protocol.
- Use the personas from Stage 2's Contract
- **MUST produce the `■ Context Contract — /rehearse` block.** This is the input for Stage 4.

After the rehearse output, show breadcrumb:
```diff
+ reframe  ●  done
+ recast   ●  done
+ rehearse ●  done
```
```
  refine   ○  next
```

**Micro-acknowledgment (if earned):** Did a persona raise an issue the user had already flagged? Did the user's initial framing make the stress-test sharper than usual? Acknowledge if genuine.

## Stage 4 of 4: Refine (~2-5 min)

Run `/refine` — use its full process, design system, and output format.
- Auto-address all critical issues (no user confirmation needed)
- Maximum 2 refinement rounds (reduced from default 3 to keep total time under 10 minutes)

## Stage 5: Score and deliver

Evaluate the entire pipeline and produce 3 deliverables. Save all deliverables plus DQ scorecard to `.overture/last-run.md`.

### Context-dependent deliverables

| # | Decide context | Build context |
|---|---|---|
| 1 | Sharpened Prompt | **Implementation Prompt** |
| 2 | Thinking Summary | **Product Brief** |
| 3 | Agent Harness | Agent Harness (same) |

### ■ Deliverable 1

**Decide: Sharpened Prompt**

A ready-to-use prompt the user can paste into any AI conversation. It should incorporate the reframed question, key constraints discovered, and what to watch out for.

> **✦ Sharpened Prompt** — paste into your next AI conversation:
>
> *[reframed question with context, constraints, and guardrails baked in. Include what AI should focus on and what it should flag for human review.]*

**Build: Implementation Prompt**

A ready-to-use prompt the user can paste into Cursor, Claude Code, Bolt, or any AI coding tool. Incorporates the product thesis, features, constraints, and scope cuts.

> **✦ Implementation Prompt** — paste into Cursor, Claude Code, or any AI coding tool:
>
> Build a [type] that [thesis].
>
> Target user: [who — one line]
>
> Core features (build these first):
> - [P0]: [specific behavior]
> - [P0]: [specific behavior]
>
> Then add:
> - [P1]: [specific behavior]
>
> Do NOT build: [specific scope cuts]
>
> Constraints:
> - [from assumptions/persona feedback]
>
> Success = [metric]

Every line must earn its place. Features describe behavior, not labels. A developer should know what to build with zero follow-up questions.

### ■ Deliverable 2

**Decide: Thinking Summary**

A team-shareable summary. Written like an email you'd send to your team — not a consulting document. Keep it under 3000 characters (Slack-friendly).

**Build: Product Brief**

A shareable product brief. Same format as Thinking Summary but product-framed:

**Render as markdown bold/italic** — reads like an email, not a report:

**Decide context format:**

**TL;DR:** [one sentence: what changed in our thinking and what to do next]

**Original question vs. the real question:**

```diff
- Asked: [original]
+ Real question: [reframed]
```

**Why:** [one sentence]

**Key risks found:**

```diff
- [critical] [risk — one line]
- [unspoken] [risk — one line]
```

**Sharpest critique:** *"[direct quote from the most challenging persona]"* — [persona name]

**Next steps:**
1. [concrete action + who]
2. [concrete action + who]
3. [concrete action + who]

**Decision Quality:** [N]/100

**Build context format:**

**TL;DR:** [one sentence: what you're building and the one thing that changed]

**Original idea vs. real product:**

```diff
- Idea: [original]
+ Product: [thesis]
```

**Why the shift:** [one sentence]

**MVP scope:** P0: [features] | Cut: [what NOT to build]

**Reality check:**

```diff
- [critical] [user risk — one line]
- [unspoken] [market risk — one line]
```

**Sharpest pushback:** *"[skeptic's core objection]"*

**Before you build:**
1. [validate this assumption first]
2. [build this P0 feature first]
3. [measure this metric]

**Decision Quality:** [N]/100

### ■ Deliverable 3: Agent Harness

A structured instruction document for AI agents — ready to paste into a CLAUDE.md, project brief, or any agent configuration tool. This gives an AI agent everything it needs to execute the plan with the right constraints and checkpoints.

**Render as `yaml` code block** — structured document with syntax highlighting:

```yaml
mission: "[reframed question — this is what we're solving]"

success_criteria:
  - "[from recast: what 'done' looks like for each step]"

steps:
  - name: "[step]"
    owner: human
    deliverable: "[specific output]"
    checkpoint: true

  - name: "[step]"
    owner: ai
    deliverable: "[specific output]"

  - name: "[step]"
    owner: both
    ai_scope: "[what AI does]"
    human_scope: "[what human does]"
    deliverable: "[specific output]"

constraints:
  - "[uncertain assumption → must validate before proceeding]"
  - "[AI limitation → human must handle this]"
  - "[stakeholder requirement → must satisfy before delivery]"

risks:
  critical: "[risk + mitigation]"
  unspoken: "[risk + how to surface it]"

stakeholders:
  - name: "[Name]"
    needs: "[specific deliverable/metric to approve]"
    will_block_if: "[specific concern isn't addressed]"
```

### ■ Decision Quality Scorecard

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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Anti-sycophancy checks — render as diff (green = passed):

```diff
+ ✓ Initial framing challenged
+ ✓ 2 blind spots surfaced
+ ✓ Plan revised after rehearsal
```

For **returning users** with journal data, show score changes with diff:

```diff
- Framing      ███░░  3/5  (last run)
+ Framing      ████░  4/5  (+1: named assumptions upfront)
  Alternatives ███░░  3/5
- Reasoning    ██░░░  2/5  (needs work)
```

**Qualitative interpretation:** After the scorecard, add one line explaining the score — not just the number but the *why*:

- **First run (no journal):** Identify the strongest element and frame what could improve it further as a counterfactual: `▸ Strongest: Framing (4/5) — you questioned the premise early. If you had also named your confidence level on each assumption, Information would have scored higher.`
- **Returning user (journal exists):** Compare to previous runs and attribute the change to a specific action: `▸ +12p from last run. The jump came from Perspectives — you brought in a stakeholder angle you've never considered before.`
- **Declining score:** Don't sugarcoat, but attribute to a cause: `▸ -8p from last run. Alternatives dropped — this time you committed to one direction without exploring options. That may be fine if you're in execution mode.`

**Warning:** If score ≥ 80 but anti-sycophancy checks are all empty, flag it: "High score but no pushback detected. The analysis may be validating existing thinking rather than challenging it."


## Final check

Before delivering, ask yourself:
- Did any part of this analysis just agree with the user's initial framing?
- Is there at least one finding that would make the user uncomfortable?
- Would a smart, skeptical colleague find this analysis rigorous?

If any answer is "no," strengthen that section.

### "What you didn't see" — Overture's signature

At the very end, after all deliverables and the DQ scorecard, add one line as a **blockquote**:

> **What you didn't see**
> *[One sentence capturing the core blind spot. The gap between what the user was thinking and what actually matters.]*

This must be specific, uncomfortable, and insightful. See `/reframe` SKILL.md for examples and rules.

This is the last thing the user reads. Make it count.

## Learning journal

Append to `.overture/journal.md` in the project root (the directory containing `.git`, or the current working directory):

```
## [date] /overture — full pipeline
- Context: [build|decide]
- Problem: "[original]"
- Reframed: "[new question / product thesis]"
- Score: DQ [N] · [four notes, e.g. ░▓█▒]
- Scores by element: F[n] A[n] I[n] P[n] R[n] Act[n]
- Rehearsal: [N] personas, [M] critical, [K] unspoken
- Convergence: [N] rounds | [converged/not]
- Sharpest critique: "[quote]" — [persona]
- Strength: [what the user did well — specific, earned]
- Growth edge: [area where improvement would have the most impact]
- Blind spots: [which assumption dimensions were missed]
```

The `Strength` and `Growth edge` fields are critical for growth tracking. They must be specific and honest — "good framing" is useless, "named the regulatory risk before any prompt" is useful. These fields power the returning-user insights in the "Before starting" section.
