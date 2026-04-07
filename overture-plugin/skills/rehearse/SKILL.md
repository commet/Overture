---
name: rehearse
description: "Simulate how your boss, stakeholders, or users would react to your plan. Finds weak spots, unspoken risks, and what needs to change for approval. No persona setup needed — auto-generated from context."
argument-hint: "[plan or strategy to stress-test]"
allowed-tools: Read, Write, Agent, AskUserQuestion
---

## When to use

- ✓ After /recast — see how stakeholders would react
- ✓ Before presenting to leadership or stakeholders
- ✓ When you suspect blind spots but can't find them
- ✓ Triggered as "XX은 뭐라고 할까?" from /overture
- ✗ When the plan is still too vague (run /recast first)
- ✗ Quick, low-stakes decisions

If you ask AI directly, it'll agree with you. That's the problem. Rehearsal creates simulated critics who react the way real people would.

**Always respond in the same language the user uses.**

## If no argument

If no `/recast` result and no argument:

> What plan or strategy do you want tested? (Paste it, or run /recast first)

## Context extraction

Read `.overture/recast.md` and `.overture/reframe.md` for contracts.

**From /recast:** governing_idea, storyline, steps (with actor/checkpoint/critical_path), key_assumptions (attack surface), personas (use exactly), design_rationale
**From /reframe:** assumptions.doubtful (probe FIRST and HARDEST), reframed_question, framing_confidence, ai_limitations

### Context injection rules:
- `key_assumptions` with `certainty=low` → 최우선 공격 대상
- `assumptions.doubtful` from reframe → 페르소나가 반드시 건드려야 함
- `critical_path` 단계 → 리스크 평가 시 우선 검토
- `ai_limitations` → "이 부분은 AI가 검증할 수 없다"고 명시
- `design_rationale` → 페르소나가 설계 근거를 이해한 위에서 비판

### Who reviews:
- If `/recast` provided personas → use exactly
- If `/overture` set a `judge` → create persona matching that judge + 1-2 additional
- Otherwise → auto-generate based on context (see below)

## Step 1: Load or generate personas

### Persona pack check (first)

Read `.overture/config.json`. If `persona_pack` field exists:
1. Read the file at that path (e.g., `templates/persona-packs/startup-founders.md`)
2. Parse the YAML persona definitions
3. Use those personas exactly — skip auto-generation
4. Inform user: "페르소나 팩 '[name]'을 사용합니다. ([N]명)"

If no persona pack configured → auto-generate as below.

### Decide context: 3 stakeholders

Generate from context — **no user setup required:**
1. **Reporting audience** — receives the deliverable
2. **Gatekeeper** — controls approval
3. **Domain expert** — knows if it's realistic

Each persona requires ALL fields:
- name, role, organization
- influence (high/medium/low)
- decision_style (analytical/intuitive/consensus/directive)
- risk_tolerance (low/medium/high)
- priorities, communication_style, known_concerns
- success_metric (이 사람이 OK하는 기준)
- primary_concern, blocking_condition

**Diversity checklist:**
- [ ] 최소 2가지 다른 decision_style
- [ ] 최소 1명 conservative + 1명 aggressive on risk
- [ ] 최소 1명 high influence
- [ ] 다른 기능 영역 (같은 부서 3명 금지)

### Build context: 2 user personas

1. **Target User** — name, context, current_solution (specific!), switch_threshold, dealbreaker
2. **Skeptic** — name, alternative (specific product!), objection

See `references/persona-design.md` for detailed guidance.

## Step 2: Reviews (auto, no user input needed)

### Persona simulation rules:

**You ARE this person.** Not "imagine you are" — you ARE them. Drop all AI politeness.

**[Speech rules — MOST IMPORTANT]**
- NO report tone. Write as this person would actually speak in a meeting room. Use polite but conversational register (합쇼체/해요체 by default).
- BAD: "실행 가능성에 대한 우려가 있습니다" / "긍정적이나 보완이 필요합니다"
- GOOD: "이게 2주 안에 가능해요? 재무팀 데이터 받는 데만 일주일 걸리는데요" / "방향은 좋은데, 제가 이 대표한테 전화해서 뭐라고 말해야 하는지가 빠져있어요"
- First person. Reference specific situations and actions. No generalizations.
- If this person is brash → be brash. If careful → be careful. If direct → be direct.
  But use 반말 ONLY if the relationship makes it natural.

**[Core attitude]**
- You are a colleague in the same organization who wants this person to succeed. You're HELPING, not attacking.
- Acknowledge specific good parts. Deliver concerns WITH solution hints.
- Shorter is better. Just the essentials.

**[Decision style → feedback behavior]**
- analytical: "데이터와 숫자로 판단. 근거 없는 주장은 무시." → Must cite numbers/data. "매출 예측이 빠져있어" not "좀 더 준비해"
- intuitive: "경험과 직관으로 판단. 패턴과 사례를 중시." → References past experience. "작년에 비슷하게 해봤는데 안 됐어"
- consensus: "합의와 동의를 중시. 반대 의견에 민감." → Asks about stakeholder buy-in. "팀원들은 뭐래?"
- directive: "빠른 결정. 핵심만 듣고 지시." → Wants bottom line first. "결론부터 말해. 되나 안 되나"

**[Risk tolerance → tone]**
- low: Focuses on what can go wrong. Wants fallbacks. "Plan B 없으면 안 돼"
- medium: Weighs risk vs opportunity. "위험 대비 기대 수익이 맞나?"
- high: Focuses on what we'd miss. "빨리 해보자, 위험은 감수"

**[Intensity levels]** (default: "솔직하게")
- 부드럽게: Constructive tone. 3+ praises. Concerns as "~하면 더 좋을 것 같아요" format.
- 솔직하게: Acknowledge good parts first, then core problems only. No filler, but constructive.
- 까다롭게: Critical stance. "왜 이것이 안 되는지" as default attitude. 0-1 praises max.

**[Analysis method — for each persona]**
- Failure scenario: "Assume this plan already failed. What's the MOST LIKELY cause?" (mundane, not dramatic)
- Risk classification:
  * critical — core threat. Can't proceed without fixing this.
  * manageable — scary but containable with preparation.
  * unspoken — everyone knows but nobody says (org politics, capability gaps, etc.).
- Approval condition: specific condition that gets a "yes" — "Show me THIS and I'll approve."

### Decide context — each persona independently:

- **First reaction** — in their voice (1-2 sentences)
- **Failure scenario** — most LIKELY way this fails (mundane, not dramatic)
- **Risks with severity + fix** — each concern MUST include:
  - severity: 🔴 critical ("이거 빠지면 통과 안 됨") / 🟡 important ("있으면 훨씬 좋음") / ⚪ minor
  - fix_suggestion: 구체적이고 실행 가능한 수정 방향
  - plan_element: 어떤 단계/가정을 공격하는지 (e.g., "Step 3", "가정: 시장 존재")
- **Approval conditions** — what they need to say "yes" (1 sentence)
- **Translated approvals** — 승인 조건을 구체적 계획 요소로 번역:
  - "매출 예측이 필요하다" → "Step 2에서 3개 시나리오 재무모델 추가"

### Build context:

**Target User:**
- First reaction (authentic)
- Would I switch? (honest, referencing current_solution)
- What's missing? (one thing for daily use)
- Risks: [critical] = what makes them delete it / [unspoken] = market reality

**Skeptic:**
- First reaction (skeptical)
- "Why not just [alternative]?" (full argument)
- What would change my mind?
- Risks: [critical] = likely death / [unspoken] = what nobody admits

**MUST find at least 1 [unspoken] risk.** This is core value.
See `references/risk-classification.md`.

## Step 3: Devil's Advocate

Run `devils-advocate` agent:
1. **Most realistic failure**: 6 months from now, this stalled. What happened? (mundane, likely)
2. **Silent problem**: What everyone suspects but won't say in a meeting
3. **Regret test**: 1 year later, what's the one thing you wish you'd considered?

Build context uses lighter version (no agent, inline):
1. How this product most likely dies
2. Market reality builders avoid
3. 6-month regret

## Confidence Gate

After all persona reviews, before showing to user:

**Self-check each concern:**
- Does it cite a specific plan element (step, assumption, number)? → `plan_element` 필드 필수. 없으면 → too vague, strengthen or drop.
- Is the fix_suggestion actionable within this plan's scope? If not → rewrite.
- Is this concern unique (not repeating another persona's point)? If duplicate → merge.
- Does the severity match the actual impact? 🔴 is reserved for "can stop the project", not "would be nice to have".

**Low-confidence marker:** If a concern is based on general knowledge rather than plan specifics, mark it `[일반론]` and deprioritize. The user needs plan-specific pushback, not generic risk warnings.

## Step 4: Structured Synthesis

After individual reviews, synthesize across all personas:

1. **Priority actions** — top 3 changes, ordered: critical risks → multi-persona concerns → unspoken risks
2. **Common agreements** — 페르소나들이 공통으로 동의한 것
3. **Key conflicts** — 페르소나 간 의견이 충돌하는 지점 (topic + each persona's stance)
4. **Untested assumptions** — what no persona could verify

## Backward recommendations

Check after synthesis:

**All reject without conditions** → thesis broken:
> 💡 전체 거부 — /recast에서 재설계 필요

**Sharpest critique attacks thesis itself** → can't fix with refinement:
> 💡 핵심 비판이 방향 자체를 겨냥 — /recast 재설계 권장

**Devil's Advocate questions problem existence** → go to /reframe:
> 💡 문제 자체의 존재가 의심됨 — /reframe 재검토 권장

These are recommendations, not blockers.

## Output

### Decide context:

---

**Overture · Rehearse** — 사전 검증

**바꿔야 할 것**
1. [action — specific, with plan element reference]
2. [action — specific]
3. [action — specific]

---

**[Name]** — [Role] · [decision_style] · risk:[risk_tolerance] → **[verdict]**

> "[첫 반응 — 직접 인용, 날카롭게]"

| 우려 | 심각도 | 수정 방향 | 대상 |
|------|--------|----------|------|
| [구체적 우려] | 🔴 critical | [이렇게 고치면 됨] | Step [N] |
| [구체적 우려] | 🟡 important | [수정 방향] | 가정 [X] |
| [unspoken] | 🔇 | [대응 방향] | |

> **OK 조건:** [이것만 되면 승인 — 1문장]
> → 계획 반영: [어떤 단계에서 이걸 해결할 수 있는지]

---

**[Name]** — [Role] · [decision_style] · risk:[risk_tolerance] → **[verdict]**

> "[첫 반응]"

| 우려 | 심각도 | 수정 방향 | 대상 |
|------|--------|----------|------|
| [우려] | 🔴 critical | [수정] | Step [N] |
| [우려] | 🟡 important | [수정] | |

> **OK 조건:** [1문장]
> → 계획 반영: [매핑]

---

**[Name]** — [Role] · [decision_style] · risk:[risk_tolerance] → **[verdict]**

> "[첫 반응]"

| 우려 | 심각도 | 수정 방향 | 대상 |
|------|--------|----------|------|
| [우려] | ⚪ minor | [수정] | |

> **OK 조건:** [1문장]

---

**Devil's Advocate**

```diff
- ✗ [realistic failure — cite plan element]
- 🔇 [silent problem]
- ⏳ [1-year regret]
```

---

**종합**

**동의:** [페르소나들이 공통으로 인정한 것]

**충돌:**
| 주제 | [Name A] | [Name B] |
|------|----------|----------|
| [topic] | [stance] | [stance] |

**미검증 가정:** [아무도 확인 못한 것]

---

> 💡 [key insight — 1-2 lines]

Severity-based actions:
- Critical ≥ 1: `⚠️ Critical [N] · 1 /refine 권장 · 2 edit · 3 save · ← 0`
- Critical = 0: `✓ 1 save · 2 edit · 3 /refine · ← 0`

---

### Build context:

---

**Overture · Rehearse** — 사전 검증

**바꿔야 할 것**
1. [action]
2. [action]

---

🎯 **[Name]** · [context] · [current_solution] → **[verdict]**

> "[첫 반응]"

| 우려 | 심각도 | 수정 방향 |
|------|--------|----------|
| [what makes them delete it] | 🔴 critical | [수정] |
| [unspoken market reality] | 🔇 unspoken | [대응] |

🤨 **[Name]** · [alternative] → **[verdict]**

> "[첫 반응]"

| 우려 | 심각도 | 수정 방향 |
|------|--------|----------|
| [likely death mode] | 🔴 critical | [수정] |
| [what nobody admits] | 🔇 unspoken | [대응] |

---

**Devil's Advocate**

```diff
- ✗ [most likely death]
- 🔇 [what nobody says]
- ⏳ [6-month regret]
```

---

> 💡 [blind spot]

`⚠️/✓ [severity] · 1 /refine · 2 edit · 3 save · ← 0`

---

## Quick actions

- `1` → save + recommended next
- `2` → edit (a. swap personas, b. re-evaluate, c. redo DA)
- `3` → save and stop
- `0` → back to /recast with insights

## Rendering rules

- Markdown sections separated by `---`.
- No box drawing. No fixed width.
- diff = color tool. Max 3 per output.
- Risk symbols: `✗` critical, `?` manageable, `🔇` unspoken
- Persona headers include decision_style and risk_tolerance for transparency

## Auto-save

Save to `.overture/rehearse.md`:
- Top: actions + persona summaries + DA + synthesis
- Bottom: Context Contract (full schema — risks by category, approval_conditions with translated_approvals, persona_profiles with ALL fields for /refine, synthesis with agreements/conflicts/priority_actions, devils_advocate)

## Journal

```
## [date] /rehearse — [topic, ≤5 words]
- Context: [build|decide]
- Personas: [names with roles, decision_styles]
- Critical: [each — 1 line, with plan element]
- Unspoken: [each — 1 line]
- Sharpest critique: "[quote]" — [persona]
- Conflicts: [topic — persona vs persona]
- Untested: [assumptions no one could verify]
- Pipeline: reframe ✓ → recast ✓ → rehearse ✓ → refine ·
```

## Self-check

- Is there anything here that would make the user uncomfortable? If not → too soft.
- Does each risk cite a specific element from /recast? If not → too generic.
- Does each persona speak differently (reflecting their decision_style)? If they sound the same → persona simulation failed.
- Is there at least 1 🔇 unspoken risk? If not → you aren't looking hard enough.
