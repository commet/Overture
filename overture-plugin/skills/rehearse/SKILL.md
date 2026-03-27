---
name: rehearse
description: "Stress-test your plan with simulated stakeholders before the real meeting. Creates 2-3 personas who critique your strategy from different angles — finding risks, blind spots, and approval conditions. Use before presenting to leadership, launching products, or making irreversible decisions."
argument-hint: "[plan or strategy to stress-test]"
---

If you ask AI directly, it will agree with you. That's the problem.

Rehearsal creates simulated stakeholders who react to your plan the way real people would — with skepticism, competing priorities, and uncomfortable questions nobody else will ask.

**Always respond in the same language the user uses.**

**ALL designed output (boxes, section headers, option lists, results) MUST be inside fenced code blocks** so Claude Code preserves monospace formatting. Plain text commentary between sections stays outside code blocks.

## If no argument is provided

If the user just types `/rehearse` without a plan, and there's no previous `/recast` or `/reframe` result in the conversation, ask:

> What plan or strategy do you want to stress-test? (Paste it here, or run /recast first)

## Before starting

Check if `.overture/journal.md` exists. If previous rehearsals show patterns, keep those in mind.

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  Overture · Rehearse                     │
  │  Stakeholder stress-test                 │
  ╰──────────────────────────────────────────╯
```

## Context from previous steps

- If `/recast` generated stakeholders → use them as personas
- If `/reframe` found uncertain assumptions → make sure personas probe those specifically

## Step 1: Create personas

Build 2-3 stakeholder personas. If `/recast` already suggested reviewers, use those. Otherwise, generate them from context.

Each persona needs: name/title, role, influence level, thinking style, risk appetite, #1 concern, communication style.

**Diversity rule:** Personas MUST differ on thinking style and risk appetite.

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

Combine all feedback into: where they agree, where they clash, what to do before executing.

## Self-check

"Is there anything in this feedback that would make the user uncomfortable?"
If no → the rehearsal was too soft. Make at least one persona harsher.

## Output

```
  ╭──────────────────────────────────────────╮
  │  Overture · Rehearse                     │
  │  Stakeholder stress-test                 │
  ╰──────────────────────────────────────────╯


  ■ Bottom Line

    Do this before executing:
    1 · [action]
    2 · [action]
    3 · [action]

    Key tension: [where personas disagree]

  ──────────────────────────────────────────


  ■ [Persona 1 Name] — [Title]

    First reaction:
    ▸ "[their words, their style]"

    Most likely failure:
      "[specific scenario]"

    Risks:
      [critical]    [risk description]
      [manageable]  [risk description]
      [unspoken]    [risk description]

    Will approve if:
      [specific conditions]


  ■ [Persona 2 Name] — [Title]
    ...


  ■ Devil's Advocate

    Most realistic failure:
      [scenario]

    The silent problem:
      [what nobody will say]

    The regret test:
      [what you'll wish you'd considered]

  ──────────────────────────────────────────

  Next: /refine to address these issues
```

After the output, suggest: *"Issues found? /refine to address them."*

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /rehearse
- Personas: [names]
- Critical risks: [N] | Unspoken: [N]
- Sharpest critique: "[quote]"
```
