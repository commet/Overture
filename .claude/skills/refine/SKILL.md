---
name: refine
description: "Iterate on a plan using stakeholder feedback until critical issues are resolved. Revises, re-tests with personas, checks convergence. Use after /rehearse when issues need fixing."
argument-hint: "[plan with rehearsal feedback to refine]"
---

No plan survives first contact with stakeholders. This skill takes rehearsal feedback, fixes what matters, re-tests, and repeats until the critical issues are gone.

**Always respond in the same language the user uses.**

**Rendering:** Final output in ONE code block (the "card"). Changes shown as `- old → + new` inline. Convergence bars (`█░`) for progress visualization.

## Before starting

**If no `/rehearse` results exist in the conversation**, tell the user: "I need stakeholder feedback to refine against. Run `/rehearse` first, or paste the feedback you've received and I'll work with that."

Check if `.overture/journal.md` exists. Note any patterns from previous refinements.

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  🔧 Overture · Refine                   │
  ╰──────────────────────────────────────────╯
```

## Context extraction — design constraints (DO NOT violate)

Read `.overture/recast.md`, `.overture/reframe.md`, and `.overture/rehearse.md` for contract data. If files don't exist, scan the conversation for contract blocks.

### From /recast Contract (immutable constraints):
- `governing_idea` → the revised plan MUST still serve this direction. If a change contradicts it, flag explicitly and explain why.
- `design_rationale` → the reasoning behind the original design. Changes should work WITH this, not against it.
- `critical_path` → steps on this path need extra care. Changes to critical-path steps cascade to everything downstream.
- `ai_limitations` → these are PERMANENT. Never reassign AI-limitation areas to AI during refinement.

### From /reframe Contract (root question):
- `reframed_question` → the ROOT question. If refinement drifts from this, the entire pipeline is compromised. After each revision round, verify: "Does the revised plan still answer this question?"

### From /rehearse Contract (feedback + personas):
- `risks_critical` → must-fix items
- `risks_unspoken` → should-fix (these are Overture's core value)
- `devils_advocate` → should-fix
- `risks_manageable` → can-fix (add mitigation)
- `approval_conditions` → convergence targets
- `persona_profiles` → reproduce EXACTLY for re-testing (see below)

### Persona continuity:
Use the `persona_profiles` from the /rehearse Contract to reproduce the exact same personas for re-testing:
- Same name, role, decision_style, risk_tolerance
- Same primary_concern and blocking_condition
- DO NOT soften personas between rounds (this defeats the purpose)
- DO NOT add new personas (stability needed for convergence measurement)

## How it works

1. Extract issues from `/rehearse` results (using Contract data)
2. Ask the user which to address (or auto-address all critical ones)
3. Revise the plan — surgically, not wholesale, respecting design constraints
4. Re-run stakeholder review on the revised version (same personas)
5. Check if issues are converging. If not, repeat. Max 3 rounds.

## Step 1: Extract and prioritize issues

From the rehearsal results:

| Priority | Source | Action |
|----------|--------|--------|
| **Must fix** | [critical] risks | Address in this round |
| **Should fix** | Devil's Advocate points | Address if possible |
| **Can fix** | [manageable] risks | Add mitigation |
| **Track** | Approval conditions | Monitor fulfillment |

## Step 2: Confirm direction with user

> I found [N] issues from the rehearsal:
> 1. [critical issue] — must fix
> 2. [critical issue] — must fix
> 3. [manageable issue] — optional
>
> Address all, or pick?

If the user skips, auto-fix all critical issues.

## Step 3: Revise the plan

- Keep the original structure. Change only what's broken.
- For each change, state what, why, and which feedback it addresses.
- If you chose NOT to address something, explain why.
- Output the COMPLETE revised plan.
- Refinement means the plan CHANGES, not that the language softens.
- Never declare an issue resolved by adding "we'll monitor this."
- If after 3 rounds still critical, suggest going back to `/reframe`.

**Self-check:** Did the revised plan actually change in substance, or did you just reword concerns as "considerations"?

## Step 4: Re-test

Reproduce personas from the /rehearse Contract's `persona_profiles` — field by field, no deviations. Run them through the revised plan with the same context injection as the original rehearsal. Also run Devil's Advocate again.

After re-testing, verify: does the revised plan still answer the `reframed_question` from /reframe? If not, flag the drift.

## Step 5: Convergence check

| Metric | Converged | Not yet |
|--------|-----------|---------|
| Critical issues | 0 | 1+ remaining |
| Total issues | Decreased | Same or increased |
| Approval conditions | Key ones met | Key ones unmet |

Max 3 rounds (2 when inside `/overture`).

## Output

**Single card** — one code block per round. Auto-save to `.overture/refine.md`.

```
  ╭──────────────────────────────────────────╮
  │  🔧 Overture · Refine · Round [N]       │
  ╰──────────────────────────────────────────╯

  [Changes label]:
  - Step 2: [old] → [new]
    [Reason]: [feedback addressed]
  - Step 4: [old] → [new]
    [Reason]: [feedback addressed]

  [Not addressed]: [issue] — [why]

  ─────────────────────────────────────────

  [Results label]:
    ✗ [Critical]:  ██░░░ [N] → ░░░░░ [M]  ✓
    ? [Manageable]: ███░░ [N]   ██░░░ [M]
    ✓ [Conditions]: █░░░░ [N/M] ███░░ [K/M]

  [Status]: ✓ [Converged after N rounds]
       or:  ✗ [N critical remaining — iterating]

  ─────────────────────────────────────────

  [Final Plan — compact revised version]

  /rehearse ([re-verify])          📄 saved
```

**After the card**, save to `.overture/refine.md`:
- Top: changes, results, final plan (clean markdown)
- Bottom after `---`: Context Contract (converged, rounds, critical_remaining, approval_conditions met/unmet, key_changes, governing_idea_preserved)

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /refine
- Rounds: [N] | Converged: [yes/no]
- Critical issues: [N] → [M]
- Key change: [biggest revision in one line]
```
