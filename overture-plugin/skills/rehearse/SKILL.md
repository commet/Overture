---
name: rehearse
description: "Stress-test your plan with simulated stakeholders before the real meeting. Creates 2-3 personas who critique your strategy from different angles — finding risks, blind spots, and approval conditions. Use before presenting to leadership, launching products, or making irreversible decisions."
argument-hint: "[plan or strategy to stress-test]"
---

If you ask AI directly, it will agree with you. That's the problem.

Rehearsal creates simulated stakeholders who react to your plan the way real people would — with skepticism, competing priorities, and uncomfortable questions nobody else will ask.

**Always respond in the same language the user uses.**

**Rendering:** Final output in ONE code block (the "card"). Use risk symbols: `✗` critical, `?` manageable, `🔇` unspoken. Persona sections within the card separated by blank lines. Devil's Advocate gets `⚡` marker.

## If no argument is provided

If the user just types `/rehearse` without a plan, and there's no previous `/recast` or `/reframe` result in the conversation, ask:

> What plan or strategy do you want to stress-test? (Paste it here, or run /recast first)

## Before starting

Check if `.overture/journal.md` exists. If previous rehearsals show patterns, keep those in mind.

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  👥 Overture · Rehearse                  │
  ╰──────────────────────────────────────────╯
```

## Context extraction from /recast and /reframe

Read `.overture/recast.md` and `.overture/reframe.md` for contract data. If files don't exist, scan the conversation for contract blocks.

### From /recast Contract (primary — the plan being stress-tested):
- `governing_idea` → the core thesis each persona evaluates
- `storyline` → the strategic logic (situation/complication/resolution)
- `design_rationale` → why this approach was chosen
- `steps` → the execution flow. Present to each persona as a compact summary:
  `1. [task] [AI] / 2. [task] [Human] ⚑ / 3. [task] [Both] ★`
  (⚑ = checkpoint, ★ = critical path)
- `key_assumptions` → personas' **primary attack surface**
- `inherited_assumptions` → **prioritize these for scrutiny** (already flagged as uncertain/doubtful by the user in /reframe)
- `personas` → use these EXACTLY as persona seeds. Reproduce all fields: name, role, influence, decision_style, risk_tolerance, primary_concern, blocking_condition

### From /reframe Contract (secondary — the user's known doubts):
- `assumptions_doubtful` → the user ALREADY suspects these are wrong. Personas should probe these **first and hardest**.
- `assumptions_uncertain` → secondary attack surface
- `ai_limitations` → persona should flag if any AI step touches these
- `reframed_question` → the root question the plan is supposed to answer

### What each persona receives in their review:
Every persona MUST see: the governing idea, the step summary with actors/checkpoints, the key assumptions (especially inherited ones), and the AI limitations. Without this context, personas produce generic feedback.

### If no contracts exist:
Generate personas from the user's input. Follow the diversity rule below.

## Step 1: Create personas

If `/recast` provided personas in its Contract, use those exactly — reproduce all fields.

Otherwise, build 3 stakeholder personas from context:
1. **Reporting audience** — receives the deliverable
2. **Gatekeeper** — controls resources or approval
3. **Domain expert** — knows if this is realistic

Each persona needs ALL fields: name, role, influence, decision_style (analytical/intuitive/consensus/directive), risk_tolerance (low/medium/high), primary_concern, blocking_condition, success_metric.

**Diversity rule:** Personas MUST differ on decision_style and risk_tolerance.

**If the user names specific people**, build personas around those people. Ask clarifying questions if needed.

See `references/persona-design.md` for detailed guidance.

## Step 2: Independent reviews

Each persona reviews the plan INDEPENDENTLY. For each, generate:

- **First reaction** — in their voice, their style (1-2 sentences)
- **Failure scenario** — most LIKELY way this fails (not worst-case)
- **Risks** — classified as [critical], [manageable], [unspoken]
- **Approval conditions** — what they need to see to say "yes"

**You MUST find at least one [unspoken] risk.** This is Overture's core value.
See `references/risk-classification.md` for the three categories.

## Step 3: Devil's Advocate

Run the `devils-advocate` agent to attack the plan through 3 lenses:
1. Most realistic failure
2. The silent problem (what nobody will say)
3. The regret test (what you'll wish you'd considered in 1 year)

## Step 4: Synthesis

After all persona reviews and Devil's Advocate, produce a structured synthesis:

1. **Common agreements** — where 2+ personas flagged the same concern
2. **Key conflicts** — where personas disagree (e.g., one says "move fast", another says "validate first"). State each persona's position.
3. **Priority actions** — the 3 most impactful changes, ordered by: critical risks first → items satisfying multiple approval conditions → unspoken risks
4. **Untested assumptions** — assumptions from /recast that NO persona could confirm or deny (information gaps that need real-world validation)

## Self-check

"Is there anything in this feedback that would make the user uncomfortable?"
If no → the rehearsal was too soft. Make at least one persona harsher.

## Output

**Single card** — one code block. Auto-save to `.overture/rehearse.md`.

```
  ╭──────────────────────────────────────────╮
  │  👥 Overture · Rehearse                  │
  ╰──────────────────────────────────────────╯

  [Bottom line label]:
  1. [action]
  2. [action]
  3. [action]

  ─────────────────────────────────────────

  [Name]       [Risk]        [Unspoken]      [Approve if]
  ──────────────────────────────────────────────────────
  [name]       ✗ [risk]      🔇 [risk]       [condition]
  [name]       ✗ [risk]      🔇 [risk]       [condition]
  [name]       ? [risk]                       [condition]

  ▸ [name]: "[sharpest quote — their voice]"
  ▸ [name]: "[sharpest quote]"
  ▸ [name]: "[sharpest quote]"

  ─────────────────────────────────────────

  ⚡ Devil's Advocate
  ✗ [realistic failure]
  🔇 [silent problem]
  ⏳ [regret in 1 year]

  ─────────────────────────────────────────

  💡 [key tension or insight]

  /refine                          📄 saved
```

**Persona comparison table:** Header row + `─` separator. Each persona is ONE row: name, critical risk, unspoken risk, approval condition. Instant cross-comparison.

**Sharpest quotes:** After the table, each persona's most distinctive reaction in one `▸` line. Gives VOICE without the full vertical review sections.

**Risk symbols:** `✗` critical, `?` manageable, `🔇` unspoken.

Detailed persona reviews (full reactions, failure scenarios, all risks) go into the saved `.overture/rehearse.md` file — the card is the summary, the file has the full analysis.

**After the card**, save to `.overture/rehearse.md`:
- Top: bottom-line actions, persona summaries, devil's advocate (clean markdown)
- Bottom after `---`: full Context Contract with all fields (risks by category with source, untested_assumptions, approval_conditions per persona, persona_profiles with ALL fields for /refine reuse, devils_advocate summary)

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /rehearse
- Personas: [names]
- Critical risks: [N] | Unspoken: [N]
- Sharpest critique: "[quote]"
```
