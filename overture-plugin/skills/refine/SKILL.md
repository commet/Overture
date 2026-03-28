---
name: refine
description: "Iterate on a plan using stakeholder feedback until critical issues are resolved. Revises, re-tests with personas, checks convergence. Use after /rehearse when issues need fixing."
argument-hint: "[plan with rehearsal feedback to refine]"
allowed-tools: Read, Write, Agent, AskUserQuestion
---

## When to use

- ✓ After /rehearse — stakeholders found critical issues to fix
- ✓ You received real feedback on a plan and want to iterate systematically
- ✓ Need to verify that fixes actually resolved the issues (convergence check)
- ✗ Before running /rehearse (you need feedback to refine against)
- ✗ When the plan needs a complete rethink (go back to /reframe)

No plan survives first contact with stakeholders. This skill takes rehearsal feedback, fixes what matters, re-tests, and repeats until the critical issues are gone.

**Always respond in the same language the user uses.**

**Rendering:** Final output in ONE code block (the "card"). Changes shown as `- old → + new` inline. Convergence bars (`█░`) for progress visualization.

## Before starting

**If no `/rehearse` results exist in the conversation**, tell the user: "I need stakeholder feedback to refine against. Run `/rehearse` first, or paste the feedback you've received and I'll work with that."

Check if `.overture/journal.md` exists. Apply adaptive rules below.

### Adaptive rules (journal → behavior)

Scan last 10 journal entries:

**Pattern: Previous refine didn't converge (Converged: no in 2+ entries)**
→ Be more aggressive with changes in Round 1. Don't make incremental tweaks — make structural revisions. Add note: `이전 refine이 수렴 실패했습니다. 이번에는 수술적 수정 대신 구조적 변경을 시도합니다.`

**Pattern: Previous refine's "key change" was always about positioning/thesis (2+ times)**
→ The underlying issue is likely in /recast, not /refine. After Round 1, if thesis change is needed again, proactively recommend `← /recast`.

**Topic linking:** If journal has related entries, surface what worked before:
```
  💭 관련 이전 실행: [date] — key change: "[what worked]"
```

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  🔧 Overture · Refine                   │
  ╰──────────────────────────────────────────╯
```

### Reflection block (show FIRST, before heavy analysis)

If continuing from `/rehearse`, output a brief reflection block immediately after the header. Surface the core tension from the rehearsal:

```
  💭 해결해야 할 핵심:
  ▸ "[sharpest critique from rehearse — the exact quote]"

  이 피드백이 맞다면:
  · [what changes in the plan]
  · [what stays the same despite the critique]
```

**Rules:** Max 4 lines. Quote the sharpest critique verbatim — this is what the user needs to confront. The "what stays" line is equally important: it prevents over-correction. Output this block first, then proceed to revision.

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

### Critique tracking (from /rehearse journal or Contract):
- Read the **sharpest critique** from the most recent `/rehearse` entry in `.overture/journal.md` (or from the rehearse Contract's `devils_advocate` section).
- This critique is the **primary resolution target**. After each refinement round, explicitly check: was this critique addressed? How?
- In the journal entry, record the resolution status. This creates a traceable link between rehearse feedback and refine outcomes.

### Persona continuity:
Use the `persona_profiles` from the /rehearse Contract to reproduce the exact same personas for re-testing:
- Same name, role, decision_style, risk_tolerance
- Same primary_concern and blocking_condition
- DO NOT soften personas between rounds (this defeats the purpose)
- DO NOT add new personas (stability needed for convergence measurement)

## Context detection

Read `context` from upstream Contracts (/recast, /reframe). Build context adapts:
- Max **1 round** (instead of 3) — keep it fast for builders
- Revise the **spec/features**, not an execution plan
- Re-test with the same **user personas** (target user + skeptic)
- Focus: "Did the spec get tighter and more buildable?"
- Update the **Implementation Prompt** with refinements

## How it works

1. Extract issues from `/rehearse` results (using Contract data)
2. Ask the user which to address (or auto-address all critical ones)
3. Revise the plan/spec — surgically, not wholesale, respecting design constraints
4. Re-run stakeholder/user review on the revised version (same personas)
5. Check if issues are converging. If not, repeat. Max 3 rounds (1 round for build context).

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

### Engine-driven backward recommendation

After each round's re-test, check these conditions. If triggered, show the recommendation in the card **above** the quick action menu:

**Condition A: Zero critical reduction after round 1**
If critical count didn't decrease at all (e.g., 3 → 3, or 2 → 2), surgical fixes aren't working:
```
  💡 엔진 추천: 수술적 수정으로 critical이 줄지 않았습니다.
     ← /recast에서 스펙 재설계를 권장합니다.
```

**Condition B: Fix requires thesis change**
If the only way to resolve a critical is to change the governing idea / product thesis (which /refine is constrained to preserve):
```
  💡 엔진 추천: 이 critical을 해결하려면 thesis 변경이
     필요합니다 — /refine 범위를 초과합니다.
     ← /recast에서 thesis부터 재설계를 권장합니다.
```

These are recommendations, not blockers. The user can override with `1` (continue refining) or follow with `0`.

**Self-check:** Did the revised plan actually change in substance, or did you just reword concerns as "considerations"? If any critical issue remains unresolved, is the `[Not addressed]` section present with a concrete reason (e.g., "requires build to validate") — not just omitted?

## Step 4: Re-test

Reproduce personas from the /rehearse Contract's `persona_profiles` — field by field, no deviations. Run them through the revised plan with the same context injection as the original rehearsal. Also run Devil's Advocate again.

After re-testing, verify: does the revised plan still answer the `reframed_question` from /reframe? If not, flag the drift.

## Step 5: Convergence check

| Metric | Converged | Not yet |
|--------|-----------|---------|
| Critical issues | 0 (or all deferred) | 1+ actionable remaining |
| Total issues | Decreased | Same or increased |
| Approval conditions | Key ones met | Key ones unmet |

### Deferred validation (build context)

Some critical issues can only be resolved by building and testing (e.g., "does the AI actually learn reviewer judgment?"). These are NOT failures — they're **deferred validations**. Mark them explicitly:

```
  ✗ Critical:    ███░░ 3 → █░░░░ 1 (deferred: 빌드 후 증명)
```

**Deferred rules:**
- Only criticals that are literally impossible to resolve without shipping code qualify
- "We'll think about it later" does NOT qualify — only "we need real user data"
- Deferred items MUST have a specific validation plan (what to build, what to measure, pass/fail criteria)
- In the journal, mark as `Converged: yes (1 deferred)` — not `no`

**Build context:** Max 1 round of refinement (keep it fast for builders). If critical issues remain after 1 round, classify each as either `actionable` (go to round 2 or back to /recast) or `deferred` (needs build to validate). This prevents the pipeline from blocking on issues that only real users can answer.

Max 3 rounds for decide context. Max 1 round for build context (with deferred option).

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

  다음?  1 → /rehearse (재검증)  2 → 수정  3 → 저장
  ← 0   /recast 다시 (근본 수정 필요 시)
```

**Quick action:** `0`, `1`, `2`, or `3`. `1` saves and launches /rehearse for re-verification. `2` lets user adjust. `3` saves and stops. `0` goes back to /recast (or /reframe if the problem is fundamental). Adapt labels to user's language.

**Going back (`0`):** When refinement reveals the plan needs more than surgical fixes:
> 💡 Refine에서 발견한 것:
> - [why surgical fixes aren't enough, e.g., "thesis 자체를 바꿔야 한다"]
> - [what to redesign]
Then launch `/recast`. If the issue is even more fundamental (the reframed question itself was wrong), suggest `/reframe` instead.

**After the card**, save to `.overture/refine.md`:
- Top: changes, results, final plan (clean markdown)
- Bottom after `---`: Context Contract (converged, rounds, critical_remaining, approval_conditions met/unmet, key_changes, governing_idea_preserved)

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
**Header uniqueness rule:** Include date + skill + short topic slug (≤5 words). Example: `## 2026-03-27 /refine — AI 코드 리뷰 어시스턴트`

```
## [date] /refine — [short topic, ≤5 words]
- Rounds: [N] | Converged: [yes/no]
- Critical issues: [N] → [M]
- Key change: [biggest revision in one line]
- Sharpest critique resolved: "[original critique from /rehearse]" → [how addressed, or "not resolved" if still open]
- Pipeline: reframe ✓ → recast ✓ → rehearse ✓ → refine ✓
```
