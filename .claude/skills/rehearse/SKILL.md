---
name: rehearse
description: "Stress-test your plan with simulated stakeholders before the real meeting. Creates 2-3 personas who critique your strategy from different angles — finding risks, blind spots, and approval conditions. Use before presenting to leadership, launching products, or making irreversible decisions."
argument-hint: "[plan or strategy to stress-test]"
---

If you ask AI directly, it will agree with you. That's the problem.

Rehearsal creates simulated stakeholders who react to your plan the way real people would — with skepticism, competing priorities, and uncomfortable questions nobody else will ask.

**Always respond in the same language the user uses.**

## If no argument is provided

If the user just types `/rehearse` without a plan, and there's no previous `/orchestrate` or `/reframe` result in the conversation, ask:

> What plan or strategy do you want to stress-test? (Paste it here, or run /orchestrate first)

## Before starting

Check if `.overture/journal.md` exists. If previous rehearsals show patterns (e.g., "unspoken risks always related to org politics"), keep those in mind.

## Context from previous steps

- If `/orchestrate` generated stakeholders → use them as personas
- If `/reframe` found uncertain assumptions → make sure personas probe those specifically

## Step 1: Create personas

Build 2-3 stakeholder personas. If `/orchestrate` already suggested reviewers, use those. Otherwise, generate them from context.

Each persona needs:
- **Name and title** (realistic for the domain)
- **Role**: What they're responsible for
- **Influence**: High (can kill this) / Medium (voice matters) / Low (advisory)
- **How they think**: Data-driven? Intuitive? Consensus-seeking? Directive?
- **Risk appetite**: Conservative? Balanced? Aggressive?
- **What they check first**: Their #1 concern for THIS project
- **Communication style**: How they give feedback (e.g., "Wants the conclusion in 30 seconds" or "Won't engage without data")

**Diversity rule:** Personas MUST differ on how they think and their risk appetite. Two data-driven conservatives give you one perspective, not two.

**If the user names specific people** (e.g., "test with my CEO and CTO"), build personas around those people. Ask clarifying questions about their priorities and concerns if needed.

See `references/persona-design.md` for detailed guidance.

## Step 2: Independent reviews

Each persona reviews the plan INDEPENDENTLY. They don't see each other's feedback.

For each persona, generate:

**First reaction** — What they say in the first 10 seconds. In their voice, their style. (1-2 sentences)

**Failure scenario** — "If we execute this plan as-is, the most likely way it fails is..." Not worst-case. Most LIKELY case. Concrete and specific.

**Risks** — Classified into three categories (see `references/risk-classification.md`):
- **[critical]** Blocks execution entirely. The project might not survive this.
- **[manageable]** Real but containable with preparation.
- **[unspoken]** Everyone knows this but nobody will say it. Political, cultural, personal.

**You MUST find at least one [unspoken] risk.** This is the core value of Overture. If every risk is safe and obvious, you haven't looked hard enough.

**Approval conditions** — Specifically: what does this person need to see to say "yes"?

## Step 3: Devil's Advocate

Run the `devils-advocate` agent to attack the plan through 3 lenses:

1. **Most realistic failure:** Not the catastrophic scenario. The boring, likely one — the way plans actually fail.
2. **The silent problem:** What everyone involved knows but won't say out loud. The political reality, the cultural friction, the misaligned incentive.
3. **The regret test:** One year from now, looking back at this decision, what's the most likely thing you'll wish you'd considered?

## Step 4: Synthesis

Combine all persona feedback + Devil's Advocate into:
- **Where they agree:** Points all personas raised
- **Where they clash:** Conflicting perspectives (this is valuable — it reveals real tensions)
- **What to do before executing:** Concrete actions, prioritized

## Self-check before outputting

Ask yourself: "Is there anything in this feedback that would make the user uncomfortable?"

If the answer is no, the rehearsal was too soft. Go back and make at least one persona harsher. All-positive feedback from a rehearsal is flattery, not preparation.

## Output

**Lead with the bottom line. Details below.**

```
## Rehearsal — [N] stakeholders reviewed your plan

### Bottom line
- **Do this before executing:**
  1. [action]
  2. [action]
  3. [action]
- **Key tension:** [where personas disagree — and why both sides have a point]
- **Sharpest critique:** "[direct quote]" — [persona name]

---
*Details below. For the full rehearsal, scroll down or ask "show full rehearsal."*

### [Persona 1 Name] — [Title]
**First reaction:** "[their words, their style]"
**Most likely failure:** "[specific scenario]"
**Risks:** [critical] ... | [manageable] ... | [unspoken] ...
**Will approve if:** [specific conditions]

### [Persona 2 Name] — [Title]
...

### Devil's Advocate
1. **Most realistic failure:** [scenario]
2. **The silent problem:** [what nobody will say]
3. **The regret test:** [what you'll wish you'd considered]
```

After the output, suggest: *"Issues found? Run /refine to address them and converge. Or run /overture for the full pipeline."*

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /rehearse
- Personas: [names]
- Critical risks: [N] | Unspoken: [N]
- Sharpest critique: "[quote]"
```
