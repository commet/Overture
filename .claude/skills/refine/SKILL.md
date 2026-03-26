---
name: refine
description: "Iterate on a plan using stakeholder feedback until critical issues are resolved. Revises, re-tests with personas, checks convergence. Use after /rehearse when issues need fixing."
argument-hint: "[plan with rehearsal feedback to refine]"
---

No plan survives first contact with stakeholders. This skill takes rehearsal feedback, fixes what matters, re-tests, and repeats until the critical issues are gone.

**Always respond in the same language the user uses.**

## Before starting

**If no `/rehearse` results exist in the conversation**, tell the user: "I need stakeholder feedback to refine against. Run `/rehearse` first, or paste the feedback you've received and I'll work with that."

Check if `.overture/journal.md` exists. Note any patterns from previous refinements.

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  Overture · Refine                       │
  │  Converge until solid                    │
  ╰──────────────────────────────────────────╯
```

## How it works

1. Extract issues from `/rehearse` results
2. Ask the user which to address (or auto-address all critical ones)
3. Revise the plan — surgically, not wholesale
4. Re-run stakeholder review on the revised version
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

Reproduce the exact same persona profiles and run them through the revised plan. Also run Devil's Advocate again.

## Step 5: Convergence check

| Metric | Converged | Not yet |
|--------|-----------|---------|
| Critical issues | 0 | 1+ remaining |
| Total issues | Decreased | Same or increased |
| Approval conditions | Key ones met | Key ones unmet |

Max 3 rounds (2 when inside `/overture`).

## Output

```
  ╭──────────────────────────────────────────╮
  │  Overture · Refine                       │
  │  Converge until solid                    │
  ╰──────────────────────────────────────────╯


  ■ Round [N]

    Changes made:
    1 · [what changed] — [which feedback]
    2 · [what changed] — [which feedback]

    Not addressed:
    · [issue] — Reason: [why]


  ■ Re-test Results

    Critical:   [N] → [M]   [✓ resolved / ✗ remaining]
    Manageable: [N]
    Conditions: [N/M] met

    Status: [Converged ✓ / Iterating ○ / Max reached ✗]


  ■ Final Plan

    [complete revised plan]

  ──────────────────────────────────────────

  [If converged:]
  ✓ Converged after [N] rounds.
  Next: Your plan is ready for execution.
```

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /refine
- Rounds: [N] | Converged: [yes/no]
- Critical issues: [N] → [M]
- Key change: [biggest revision in one line]
```
