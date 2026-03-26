---
name: refine
description: "Iterate on a plan using stakeholder feedback until critical issues are resolved. Revises, re-tests with personas, checks convergence. Use after /rehearse when issues need fixing."
argument-hint: "[plan with rehearsal feedback to refine]"
---

No plan survives first contact with stakeholders. This skill takes rehearsal feedback, fixes what matters, re-tests, and repeats until the critical issues are gone.

**Always respond in the same language the user uses.**

## Before starting

Check if `.overture/journal.md` exists. If previous refinements show patterns (e.g., "convergence usually takes 2 rounds", "stakeholder X is always the blocker"), note them.

## How it works

1. Extract issues from `/rehearse` results
2. Ask the user which to address (or auto-address all critical ones)
3. Revise the plan — surgically, not wholesale
4. Re-run stakeholder review on the revised version
5. Check if issues are converging. If not, repeat. Max 3 rounds.

## Step 1: Extract and prioritize issues

**If no `/rehearse` results exist in the conversation**, tell the user: "I need stakeholder feedback to refine against. Run `/rehearse` first, or paste the feedback you've received and I'll work with that."

From the rehearsal results:

| Priority | Source | Action |
|----------|--------|--------|
| **Must fix** | [critical] risks | Address in this round |
| **Should fix** | Devil's Advocate points | Address if possible |
| **Can fix** | [manageable] risks | Add mitigation |
| **Track** | Approval conditions | Monitor fulfillment |

## Step 2: Confirm direction with user

> I found [N] issues from the rehearsal. Here they are by priority:
> 1. [critical issue] — must fix
> 2. [critical issue] — must fix
> 3. [manageable issue] — optional
>
> Address all of them, or would you like to pick?

If the user skips this, auto-fix all critical issues.

## Step 3: Revise the plan

- Keep the original structure. Change only what's broken.
- For each change, state what you changed, why, and which stakeholder's feedback it addresses.
- If you chose NOT to address something, explain why.
- Output the COMPLETE revised plan, not just the changes.
- Refinement means the plan CHANGES, not that the language softens. If you mark a critical issue as "resolved," the plan must contain a concrete structural change — not just acknowledgment.
- Never declare an issue resolved by adding a disclaimer like "we'll monitor this." That's not resolution, that's avoidance.
- If after 3 rounds the plan still has critical issues, it may be a sign the premise is wrong. Suggest going back to `/reframe`.

**Self-check:** Did the revised plan actually change in substance, or did you just reword the concerns as "considerations"?

## Step 4: Re-test

Reproduce the exact same persona profiles from the previous rehearsal and run them through the revised plan. This time, instruct them:
- Check if their previous concerns were addressed
- Flag any NEW issues caused by the changes
- Mark previously-critical issues as resolved if they are

Run Devil's Advocate again too.

## Step 5: Convergence check

| Metric | Converged | Not yet |
|--------|-----------|---------|
| Critical issues | 0 | 1+ remaining |
| Total issues | Decreased from previous round | Same or increased |
| Approval conditions | Key ones met | Key ones still unmet |

**Converged:** Done. Output the final plan.
**Not converged:** Go back to Step 2. Maximum 3 rounds (2 rounds when running inside `/overture`).

After 3 rounds without convergence:
> "3 rounds of refinement, but [N] issues remain: [list]. These may need to be accepted as known constraints. Proceed?"

## Output

```
## Refinement — Round [N]

**Changes made:**
1. [what changed] — because [which feedback] said [what]
2. ...

**Not addressed:**
- [issue] — Reason: [why not addressed this round]

**Re-test results:**
- Critical issues: [N] (was [M])
- Approval conditions met: [N/M]

**Status:** [Converged / Iterating / Max rounds reached]

## Final Plan
[complete revised plan]
```

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
```
## [date] /refine
- Rounds: [N] | Converged: [yes/no]
- Critical issues: [N] → [M]
- Key change: [biggest revision in one line]
```
