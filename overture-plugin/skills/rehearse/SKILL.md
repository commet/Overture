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

### Saved persona check (highest priority)

Read `.overture/personas.json`. If it exists and has confirmed/user_refined personas:
1. Load those personas first
2. Show: "저장된 리뷰어 [N]명 로드됨" with completeness indicators
3. Supplement with auto-generated personas if needed for diversity (don't duplicate roles)
4. Skip to **Persona preview + inline customization**

### Persona pack check (second priority)

Read `.overture/config.json`. If `persona_pack` field exists:
1. Read the file at that path (e.g., `templates/persona-packs/startup-founders.md`)
2. Parse the YAML persona definitions
3. Use those personas exactly — skip auto-generation
4. Inform user: "페르소나 팩 '[name]'을 사용합니다. ([N]명)"

If no saved personas and no persona pack → auto-generate as below.

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

### Persona preview + inline customization

After generating personas, show them to the user with completeness indicators BEFORE running reviews.

**Display format:**

```
리뷰어 구성:

1. **김 부장** — 데이터분석팀장
   ●●●○○ 구체화 (60%) — 소통 습관 추가하면 더 정확해져요
   analytical · risk:low · influence:high

2. **박 실장** — 사업기획실장
   ●●○○○ 윤곽 (40%) — 이 사람이 중요하게 여기는 건 뭔가요?
   consensus · risk:low · influence:high

3. **이 대리** — 현장 PM
   ●○○○○ 윤곽 (20%) — 어떻게 결정하는 사람인가요?
   (미정) · influence:medium
```

**Completeness levels:**
- ●○○○○ **윤곽** (0-34%) — 이름+역할만. 일반적 시뮬레이션.
- ●●○○○ **구체화** (35-59%) — 의사결정 방식, 우선순위 있음. 방향성 맞는 시뮬레이션.
- ●●●○○~●●●●○ **생생함** (60-84%) — 소통 습관, 우려, OK 기준까지. 실제에 가까운 시뮬레이션.
- ●●●●● **살아있음** (85-100%) — 사용자가 직접 묘사 + 리허설 이력. 거의 진짜.

**Then ask:**

```
questions: [{
  question: "이 리뷰어들로 진행할까요? 실제 사람에 가깝게 만들고 싶으면 설명해주세요.",
  header: "리뷰어 확인",
  multiSelect: false,
  options: [
    {
      label: "이대로 진행",
      description: "자동 생성된 페르소나로 리뷰"
    },
    {
      label: "내 팀장/상사를 알려줄게",
      description: "자유롭게 설명하면 반영됩니다"
    },
    {
      label: "이 사람 맞아 ✓",
      description: "자동 생성 결과가 실제와 비슷함 — 저장"
    }
  ]
}]
```

### Inline persona refinement (free-form)

If user chooses "내 팀장/상사를 알려줄게" OR at ANY point in the conversation describes their boss/stakeholder:

**Detection:** User's message contains descriptions like:
- "우리 팀장은 ..." / "내 상사는 ..."
- "이 사람은 ISTJ고 ..." / "숫자 없으면 안 넘어가는 사람이야"
- "좀 더 까다로운 사람인데" / "결론부터 말하라는 타입"
- Any specific personality/behavior description targeting a reviewer

**Action:**

1. Take the user's free-form text AS-IS
2. Extract structured persona fields from it (using LLM inline — no external function call needed):
   - Map personality types (MBTI → decision_style + risk_tolerance)
   - Extract communication patterns → communication_style
   - Extract priorities/concerns → priorities, known_concerns
   - Extract approval patterns → success_metric
   - Preserve user's original words in extracted_traits
3. Merge with existing auto-generated persona (override where user was specific)
4. Show the updated persona with before→after progression:

```
📋 김 부장 업데이트:

●●○○○ 윤곽 → ●●●●○ 생생함

+ 의사결정: analytical (ISTJ 기반)
+ 리스크: low
+ 소통: "숫자 없으면 안 넘어감, 결론부터 말하라는 타입"
+ 성격: 숫자 중시, 직설적, 근거 집착, 결론 우선

💬 원본: "우리 팀장은 ISTJ고 숫자 없으면 아예 안 넘어가는 사람이야"

이 프로필로 리허설할까요?
```

5. Save `user_description` field — user's original text is preserved and injected into the feedback prompt
6. Updated persona is saved to `.overture/personas.json` for future rehearsals

**Key UX principle:** The persona "fills up" visually. ●●○○○ → ●●●●○. Users SEE their input making the agent more concrete. This drives engagement — "한 마디 더 하면 이 사람이 더 진짜가 된다."

### Confirmation shortcut ("이 사람 맞아")

If user says "이 사람 맞아" / "맞아" / confirms persona accuracy:
1. Save persona with `is_example: false` (user-confirmed, not example data)
2. Mark as confirmed in `.overture/personas.json`
3. Future rehearsals auto-load this persona
4. Show: "✓ 저장됨. 다음 리허설부터 자동 적용됩니다."

### Mid-conversation persona refinement

During ANY step of rehearse (even after reviews have started), if the user interjects with a persona description:

1. Pause the current flow
2. Process the description inline
3. Show before→after diff
4. Ask: "업데이트된 프로필로 다시 리뷰할까요, 아니면 이어서 갈까요?"
   - Re-review: rerun with refined persona
   - Continue: apply to future runs only

### Persona persistence

Save to `.overture/personas.json`:

```json
{
  "personas": [
    {
      "name": "김 부장",
      "role": "데이터분석팀장",
      "decision_style": "analytical",
      "risk_tolerance": "low",
      "priorities": "숫자와 데이터의 정합성",
      "communication_style": "숫자 없으면 안 넘어감, 결론부터 말하라는 타입",
      "known_concerns": "근거 없는 주장, 출처 불명확",
      "success_metric": "모든 수치의 출처와 정합성 확인",
      "extracted_traits": ["숫자 중시", "직설적", "근거 집착"],
      "influence": "high",
      "user_description": "우리 팀장은 ISTJ고 숫자 없으면 아예 안 넘어가는 사람이야",
      "confirmed": true,
      "completeness": 80,
      "created_at": "2026-04-07",
      "source": "user_refined"
    }
  ]
}
```

On next `/rehearse` run: read `.overture/personas.json` first. If confirmed personas exist, use them (+ supplement with auto-generated if needed for diversity).

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

## Review depth selection (AskUserQuestion with preview)

Before running reviews, let the user choose depth:

```
questions: [{
  question: "리뷰의 기본 구조를 어떻게 가져갈까요?",
  header: "리뷰 구조",
  multiSelect: false,
  options: [
    {
      label: "Quick Review (Recommended)",
      description: "핵심 페르소나 1명, 빠른 검증",
      preview: "Quick Review\n\n[가장 영향력 높은 페르소나]의 시선으로 검토\n\n✓ 잘한 점  2-3개\n△ 우려 1-2개 (해법 포함)\n→ OK 조건 1개\n\n[ 반영하고 완성 ]  [ 더 깊이 검토 → ]"
    },
    {
      label: "Full Review",
      description: "3명 페르소나 + Devil's Advocate 병렬",
      preview: "Full Review\n\n- 페르소나 3명 동시 실행 (Agent 병렬)\n- 각각: 첫 반응 + 실패 시나리오 + 우려 + OK 조건\n- Devil's Advocate: 3렌즈 공격\n- 종합: 합의/충돌/미검증 가정 분석\n\n더 깊지만 시간이 더 걸립니다"
    },
    {
      label: "Custom",
      description: "페르소나 수와 톤을 직접 설정",
      preview: "Custom Review\n\n- 페르소나 수: 1-4명 선택\n- 리뷰어 톤: 부드럽게/솔직하게/까다롭게\n- 특정 관점 지정 가능\n  (전반적/논리구조/실행가능성/리스크/숫자)\n\n가장 유연하지만 설정이 필요합니다"
    }
  ]
}]
```

If "Quick Review" → run 1 persona inline, show result, offer "더 깊이 검토 →" to expand.
If "Full Review" → proceed to Parallel Execution Mode below.
If "Custom" → ask follow-up questions for persona count, tone, perspective.

## Parallel Execution Mode (Full Review)

**Use the Agent tool to run ALL persona reviews simultaneously.** This is dramatically faster than sequential simulation.

For each persona, spawn an agent with this prompt pattern:

```
You are [name], [role] at [organization].
Influence: [level]. Decision style: [style]. Risk tolerance: [tolerance].
Priorities: [priorities]. Known concerns: [concerns]. Success metric: [metric].

[Copy the FULL speech rules and analysis method from Step 2 above into each agent prompt]

Review this plan:
[plan text from /recast]

Key assumptions to probe (from /reframe — attack these FIRST):
[assumptions.doubtful list]

Respond with:
1. First reaction (1-2 sentences, in your voice — conversational, not report tone)
2. Failure scenario (most LIKELY way this fails — mundane, boring, common)
3. Concerns table: each row = concern | severity (🔴/🟡/⚪) | fix direction | which plan element
4. Approval condition (1 sentence — "Show me THIS and I approve")
5. Translated approval (map your condition to a specific plan step)
```

**Launch all personas + devils-advocate in parallel.** 4 agents running simultaneously.

After all agents return, proceed to Step 3 (Confidence Gate) and Step 4 (Synthesis) inline.

---

### If running inline (1-2 personas or Agent tool unavailable):

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

**[Name]** — [Role] · [decision_style] · risk:[risk_tolerance] · [completeness visual] → **[verdict]**

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
- `2` → edit (a. swap personas, b. re-evaluate, c. redo DA, **d. refine persona**)
- `3` → save and stop
- `0` → back to /recast with insights

If user picks `2d` (refine persona) → ask which persona to refine, then accept free-form description and show before→after diff.

**Post-review persona feedback:** After showing all reviews, if any persona has completeness < 60%, append:

```
💬 [Name]의 시뮬레이션을 더 정확하게 만들고 싶다면, 이 사람에 대해 한 마디만 더 알려주세요.
   현재: [completeness visual] [label] — [nextHint]
```

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

Save/update `.overture/personas.json`:
- All personas used in this rehearsal (auto-generated + user-refined)
- Include completeness score, user_description, source (auto/user_refined/confirmed)
- Existing confirmed personas are preserved (never overwritten by auto-generation)

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
