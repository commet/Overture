# Context Contract Schema

> Overture 스킬 간 데이터 흐름의 공식 스키마.
> 각 스킬은 `.overture/{skill}.md` 하단에 Context Contract를 YAML로 저장한다.
> 다음 스킬은 이전 스킬의 컨트랙트를 자동으로 읽어 컨텍스트를 이어간다.

---

## Data Flow

```
/reframe → .overture/reframe.md
    ↓ reads
/recast  → .overture/recast.md
    ↓ reads reframe + recast
/rehearse → .overture/rehearse.md
    ↓ reads all above
/refine   → .overture/refine.md

/overture → .overture/last-run.md (all-in-one, includes all contracts)
```

---

## 1. Reframe Contract

**File:** `.overture/reframe.md`
**Producer:** `/reframe`
**Consumers:** `/recast`, `/rehearse`, `/overture`

```yaml
context: build | decide                    # REQUIRED — determines downstream behavior
reframed_question: string                  # REQUIRED — the sharpened question
assumption_pattern: confirmed | mixed | mostly_doubtful  # REQUIRED
strategy: string                           # strategy name used (e.g., "Narrow Scope")
interview_signals:                         # varies by context
  # decide: nature, goal
  # build: audience, success_model, scale
  nature: string
  goal: string
assumptions_doubtful:                      # array of {assumption, reason}
  - assumption: string
    reason: string
assumptions_uncertain:                     # array of {assumption, reason}
  - assumption: string
    reason: string
assumptions_confirmed:                     # array of strings
  - string
ai_limitations:                            # things AI cannot verify
  - string
```

### Consumer rules:
- `/recast` MUST read `context` to decide output mode (decide → execution steps, build → feature spec)
- `/recast` MUST inherit `assumptions_doubtful` and mark them `[from reframe]`
- `/rehearse` uses `assumption_pattern` to calibrate persona harshness

---

## 2. Recast Contract

**File:** `.overture/recast.md`
**Producer:** `/recast`
**Consumers:** `/rehearse`, `/refine`

```yaml
governing_idea: string                     # REQUIRED — thesis of the plan
steps:                                     # REQUIRED — execution steps
  - task: string
    actor: 🤖 | 🧑 | ⚡                   # AI / Human / Both
    output: string
    checkpoint: boolean                    # true = human approval needed before next
    actor_reasoning: string
role_distribution:
  ai: number
  human: number
  both: number
changes_from_original: number              # role changes made
key_insight: string
personas:                                  # auto-generated for /rehearse
  - name: string
    role: string
    decision_style: analytical | intuitive | consensus | directive
    risk_tolerance: low | medium | high
    influence: high | medium | low
    primary_concern: string
    blocking_condition: string
```

### Consumer rules:
- `/rehearse` MUST use `personas` as-is (do not regenerate)
- `/rehearse` reads `steps` to ground risk assessment in specific plan elements
- `/refine` reads `governing_idea` as IMMUTABLE constraint

---

## 3. Rehearse Contract

**File:** `.overture/rehearse.md`
**Producer:** `/rehearse`
**Consumers:** `/refine`

```yaml
persona_reviews:                           # REQUIRED
  - persona_name: string
    role: string
    verdict: 조건부 | 거부 | 승인
    concerns:
      - text: string
        severity: critical | important | minor
        fix_suggestion: string
    approval_condition: string             # what this persona needs to approve
risks_critical:                            # array of strings
  - string
risks_unspoken:                            # array of strings — highest value category
  - string
risks_manageable:
  - string
synthesis:
  common_agreements: [string]
  key_conflicts: [string]
  priority_actions: [string]
  untested_assumptions: [string]
sharpest_critique: string                  # single most impactful criticism
pipeline: "reframe ✓ → recast ✓ → rehearse ✓ → refine ·"
```

### Consumer rules:
- `/refine` uses EXACT same `persona_reviews[].persona_name` — no softening, no adding new personas
- `/refine` targets `risks_critical` first, then `risks_unspoken`
- `/refine` tracks `sharpest_critique` as primary resolution target

---

## 4. Refine Contract

**File:** `.overture/refine.md`
**Producer:** `/refine`
**Consumers:** (terminal — or next /overture run)

```yaml
converged: boolean
rounds: number                             # actual rounds used
critical_remaining: number                 # critical risks still open
key_changes:                               # what was revised
  - what: string
    why: string
    addresses: string                      # which issue/persona concern
sharpest_critique_resolved: string         # how the #1 critique was handled
pipeline: "reframe ✓ → recast ✓ → rehearse ✓ → refine ✓"
```

---

## 5. Overture Contract (All-in-One)

**File:** `.overture/last-run.md`
**Producer:** `/overture`
**Consumers:** `/recast` (for role redesign), next session

```yaml
context: build | decide
judge: string                              # decision maker name/role
reframed_question: string
assumption_pattern: confirmed | mixed | mostly_doubtful
assumptions_doubtful: [string]
assumptions_confirmed: [string]
simulation_risks_critical:                 # with fix suggestions
  - risk: string
    fix: string
simulation_risks_unspoken: [string]
judge_approval_condition: string
deliverable_type: plan | spec | strategy
```

---

## Immutable Fields

These fields MUST NOT change once set, regardless of which skill is running:

| Field | Set by | Rule |
|-------|--------|------|
| `governing_idea` | /recast | Plan thesis — revisions work within it, not around it |
| `ai_limitations` | /reframe | Permanent constraints — cannot be "resolved" by refinement |
| `context` | /reframe | build or decide — cannot switch mid-pipeline |

---

## Reading Rules

1. **Auto-read:** Each skill checks `.overture/` for prior contracts on startup
2. **Offer to user:** "이전에 만든 [X]가 있습니다. 이걸로 이어갈까요?"
3. **Merge, don't replace:** New insights ADD to prior data; don't discard upstream work
4. **Mark inheritance:** `[from reframe]`, `[from recast]` markers on inherited data
5. **Validate chain:** `/doctor` checks that the contract chain is internally consistent

---

## File Format

Each `.overture/{skill}.md` file has two sections:

```markdown
[Human-readable output — the actual deliverable]

---

[YAML Context Contract — machine-readable for downstream skills]
```

The top section is what the user reads and shares.
The bottom section is what the next skill reads and builds on.
