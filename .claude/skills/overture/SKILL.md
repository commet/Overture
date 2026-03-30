---
name: overture
description: "Structured thinking tool for decisions and plans. Input a problem, get an instant first draft. Answer a few questions, it gets sharper. Simulate your boss's reaction. Get a final deliverable. Progressive — each step adds value, stop anytime."
argument-hint: "[problem, decision, or task you need to figure out]"
effort: high
allowed-tools: Read, Write, Agent, AskUserQuestion
---

## When to use

- ✓ You need to produce something outside your expertise (dev asked to write a plan, PM asked for strategy)
- ✓ Important decisions — before committing time, money, or reputation
- ✓ Building a product — get a sharp spec before coding
- ✓ You're stuck and need structure, not more brainstorming
- ✗ Quick tactical questions (use /reframe alone)
- ✗ You already know exactly what to do (just do it)

**Always respond in the same language the user uses.** All output in user's language.

## If no argument is provided

Ask ONLY this:

> What problem or decision are you working on?

Wait for response. Then proceed.

## Core principle: Progressive Value

Every step produces a **usable result**. The user can stop at any point and walk away with something valuable. Don't make them wait through a long pipeline before seeing output.

```
Input → Instant draft (~30 sec)
     → Interview sharpens it (~1 min)
     → "What would [judge] say?" (~1 min)
     → Final deliverable (~1 min)
```

## Context detection

After receiving the problem, detect context from input:

**Build context** — creating something:
- Signals: build, make, create, app, tool, SaaS, MVP, ship, 만들다, 개발, 앱, 서비스, 플랫폼
- Deliverable adapts: product spec, implementation prompt

**Decide context** (default) — making a decision or plan:
- Signals: decide, strategy, plan, expand, hire, should we, 결정, 전략, 기획, 기획안, 제안서, 보고서
- Deliverable adapts: execution plan, sharpened prompt

If ambiguous, use AskUserQuestion:
- question: "이건 뭘 만드는 건가요, 아니면 판단/기획하는 건가요?"
- header: "컨텍스트"
- options:
  - label: "만드는 것", description: "앱, 서비스, 도구 등을 만들려는 상황"
  - label: "판단/기획", description: "전략, 기획안, 제안서 등을 만들거나 결정하는 상황"

Record as `context: build` or `context: decide`.

## Step 1: Instant First Draft

**Do this IMMEDIATELY after receiving input. No interview. No preamble.**

Analyze the input and produce a first draft in ~30 seconds:

### Output format:

---

**Overture** · {context label}

**상황 정리**
[2-3줄. 사용자가 처한 상황을 명확히 정리. 입력에서 추론.]

**진짜 질문**
[리프레이밍된 핵심 질문. 사용자가 물어본 것과 실제로 해결해야 할 것의 차이를 짚는다. 1-2문장.]

**{기획안 뼈대 / 제품 뼈대 / 실행 구조}** (context에 따라 레이블)

```
1. [첫 번째 항목 — 구체적]
2. [두 번째 항목]
3. [세 번째 항목]
4. [네 번째 항목] (있다면)
5. [다섯 번째 항목] (있다면)
```

**숨겨진 전제**

```diff
- ? [전제 1 — 맞는지 확인 필요]
- ? [전제 2 — 맞는지 확인 필요]
- ? [전제 3 — 맞는지 확인 필요]
```

---

> 이건 초안이다. 몇 가지만 더 알면 훨씬 날카로워진다.

---

**Tone rules for Step 1:**
- Direct. No hedging. "이건 초안이다" not "이건 초안일 수 있습니다."
- Name what you DON'T know yet, don't pretend to know.
- The draft must be concrete enough to be useful AS-IS. "기획안 구조" not "기획안에 대해 생각해볼 점".

## Step 2: Interview (AskUserQuestion)

**Use the AskUserQuestion tool.** Do NOT present questions as code blocks or numbered lists. Call the AskUserQuestion tool directly.

Ask 2-3 questions depending on what's missing from the input. Skip questions whose answers are already clear from input.

### Decide context questions:

**Q1 (always ask):**
- question: "이 결과물을 누가 최종 판단해?"
- header: "판단자"
- options:
  - label: "대표/CEO", description: "대표님이 직접 검토하고 판단"
  - label: "팀장/이사", description: "중간 관리자가 검토"
  - label: "투자자/외부", description: "외부 이해관계자가 대상"
  - label: "아직 모름", description: "판단자가 불명확하거나 나 자신"

→ Record as `judge`. This determines the persona in Step 3.

**Q2 (ask if not clear from input):**
- question: "가장 걱정되는 건?"
- header: "핵심 걱정"
- options:
  - label: "뭘 해야 할지 모름", description: "방향 자체가 안 잡힘"
  - label: "구조화가 안 됨", description: "내용은 있는데 정리가 안 됨"
  - label: "설득력 부족", description: "논리나 근거가 약할 것 같음"
  - label: "시간 부족", description: "급해서 빠르게 결과를 내야 함"

### Build context questions:

**Q1 (always ask):**
- question: "이걸 누가 쓸 건가요?"
- header: "사용자"
- options:
  - label: "나만 쓸 것", description: "개인 도구나 프로젝트"
  - label: "특정 그룹", description: "정해진 사용자층이 있음"
  - label: "누구나", description: "대중을 대상으로"
  - label: "아직 모름", description: "사용자가 불명확"

→ Record as `audience`.

**Q2 (ask if not clear):**
- question: "성공이 뭔가요?"
- header: "성공 기준"
- options:
  - label: "사람들이 쓴다", description: "실제 사용자 확보"
  - label: "아이디어 검증", description: "가설이 맞는지 확인"
  - label: "돈을 번다", description: "매출/수익 발생"
  - label: "배움/포트폴리오", description: "실력 향상이 목적"

## Step 2 Output: Updated Draft

Interview 답변을 반영해서 Step 1의 결과물을 **즉시 업데이트**한다.

### Output format:

---

**상황 업데이트**: [인터뷰에서 새로 파악된 것 1줄]

**진짜 질문 (수정)**
[인터뷰 반영해서 더 날카로워진 질문. 변한 부분을 diff로:]

```diff
- [이전 질문]
+ [업데이트된 질문]
```

**{기획안 뼈대 / 제품 뼈대} (수정)**
[인터뷰 반영 업데이트. 판단자·대상·약점이 반영됨.]

```
1. [수정된 항목 — 변경 이유 간단히]
2. [항목]
3. [항목]
...
```

**전제 업데이트**

```diff
+ ✓ [확인된 전제]
- ✗ [의심되는 전제 — 인터뷰로 드러남]
- ? [아직 불확실한 전제]
```

**확인하면 좋은 것**
1. [구체적 질문 — 이유]
2. [구체적 질문 — 이유]

---

## Step 3: Curiosity Trigger — "XX은 뭐라고 할까?"

After showing the updated draft, trigger curiosity:

Based on the `judge` from Q1:
- 대표/CEO → "**대표님은 이걸 보고 뭐라고 할까?**"
- 팀장/이사 → "**팀장님은 뭐라고 할까?**"
- 투자자/외부 → "**투자자는 뭐라고 할까?**"
- 모름/자신 → "**가장 까다로운 사람이라면 뭐라고 할까?**"
- Build context → "**실제 사용자는 이걸 보고 뭐라고 할까?**"

Show this as a prompt, then **automatically proceed** (don't wait for user to say "yes"):

> **[판단자]는 이걸 보고 뭐라고 할까?**

Then run the simulation:

### Simulation rules:
- Create a persona based on `judge` + context. Infer role, priorities, communication style from the situation.
- The persona reviews the updated draft (Step 2 output).
- Be SPECIFIC and UNCOMFORTABLE. Not "좋은 방향이지만 보완이 필요합니다" but "이 기획안은 실행 타임라인이 없다. 2주 안에 뭘 언제까지 하겠다는 건지 안 보인다."
- Must surface at least 1 unspoken concern (what they think but won't say directly).

### Devil's Advocate (runs simultaneously):
Use the devils-advocate agent with 3 lenses:
1. **가장 현실적인 실패**: 6개월 뒤 이게 망했다면, 뭐 때문이었을까? (평범한 이유)
2. **아무도 말 안 하는 문제**: 모두가 알지만 회의에서 안 꺼내는 것
3. **1년 후 후회**: 돌아보면 이걸 고려했어야 했는데

### Step 3 Output format:

---

**{판단자 이름/역할}의 반응**

> "[핵심 한마디 — 직접 인용 스타일, 날카롭게]"

**약점 3가지:**
1. [구체적 약점 + 왜 문제인지]
2. [구체적 약점]
3. [구체적 약점]

**이렇게 고치면 OK할 가능성 높아짐:**
1. [구체적 수정 방향]
2. [구체적 수정 방향]
3. [구체적 수정 방향]

```diff
- ✗ [critical — 이게 안 되면 전체가 안 됨]
- 🔇 [unspoken — 다들 알지만 안 말하는 것]
```

---

**Devil's Advocate**

```diff
- ✗ [가장 현실적인 실패 — 1줄]
- 🔇 [아무도 말 안 하는 문제 — 1줄]
- ⏳ [1년 후 후회 — 1줄]
```

---

## Step 4: Final Deliverable

Combine everything into the final output. Apply the fixes from Step 3.

### Output format:

---

**Overture · 최종 정리**

**진짜 질문**
[최종 리프레이밍]

**{최종 기획안 / 제품 스펙 / 실행 계획}**

[Step 2의 구조를 Step 3의 피드백으로 수정한 최종본.
각 항목에 구체적 내용이 있어야 함. 뼈대가 아니라 살이 붙은 결과물.]

```
1. [항목] — [구체적 내용/설명]
2. [항목] — [구체적 내용/설명]
3. [항목] — [구체적 내용/설명]
...
```

**핵심 전제 (최종)**

```diff
+ ✓ [확인된 것]
- ✗ [위험한 전제 — 반드시 확인 필요]
- ? [불확실 — 진행하면서 확인]
```

---

### ■ Deliverable: Sharpened Prompt

> **✦ 이 프롬프트를 AI에 바로 붙여넣으세요:**
>
> [리프레이밍된 질문 + 제약 조건 + 주의할 점이 녹아든 프롬프트.
>  AI가 바로 작업할 수 있을 정도로 구체적이어야 함.]

**Build context → Implementation Prompt:**

> **✦ 이 프롬프트를 Cursor/Claude Code에 붙여넣으세요:**
>
> Build a [type] that [thesis].
> Target user: [who]
> Core features: [P0 — specific behavior]
> Do NOT build: [scope cuts]
> Success = [metric]

### ■ Deliverable: Thinking Summary

Team-shareable. Slack/email에 바로 붙여넣을 수 있는 분량 (3000자 이내).

**TL;DR:** [한 문장]

```diff
- 물어본 것: [original]
+ 진짜 질문: [reframed]
```

**핵심 리스크:**
```diff
- [critical risk — 1줄]
- [unspoken risk — 1줄]
```

**날카로운 한마디:** *"[판단자의 핵심 피드백]"*

**다음 단계:**
1. [구체적 행동 + 누가]
2. [구체적 행동 + 누가]

---

### ■ Decision Quality Score (선택적)

Score the thinking process. 6 elements, each 0-5:

| Element | Score |
|---------|-------|
| Framing | [N]/5 |
| Alternatives | [N]/5 |
| Information | [N]/5 |
| Perspectives | [N]/5 |
| Reasoning | [N]/5 |
| Actionability | [N]/5 |
| **Overall** | **[N]/100** |

Anti-sycophancy check:
```diff
+ ✓ Initial framing challenged (reframed ≠ original)
+ ✓ Blind spots surfaced (unspoken risks found)
+ ✓ Draft changed after simulation
```

---

### Signature: "What you didn't see"

At the very end:

> **What you didn't see**
> *[핵심 블라인드 스팟. 사용자가 생각하고 있던 것과 실제로 중요한 것 사이의 간극. 구체적이고, 불편하고, 통찰적이어야 한다. 1문장.]*

## Journal

Append to `.overture/journal.md`:

```
## [date] /overture — [topic, ≤5 words]
- Context: [build|decide]
- Judge: [대표|팀장|투자자|unknown]
- Problem: "[original]"
- Reframed: "[final question]"
- Score: DQ [N]
- Assumptions: [N] confirmed, [N] uncertain, [N] doubtful
- Simulation: [judge name], [N] critical, [N] unspoken
- Sharpest critique: "[quote]"
- Strength: [specific — what user did well]
- Growth edge: [specific — where improvement matters most]
```

## Before starting (returning users)

Check `.overture/journal.md`. If it exists:

**2-4 entries:** Surface one improvement + one area to watch:
> ▸ 지난번보다 나아진 점: [specific]
> ▸ 이번에 신경 쓸 것: [specific pattern]

**5+ entries:** Surface strength profile:
> ▸ [N]번 사용 패턴: [strength]. 성장 포인트: [area].

Keep it to 1-2 lines. Coach tone, not report tone.

## Rendering rules

- Markdown first. Bold, blockquote, list, diff blocks.
- **No box drawing.** No `╭╮╰╯`, `┌│└`, `═══`. Use `---`, `**bold**`, whitespace.
- **No fixed width.** Markdown auto-wraps.
- **diff blocks = color tool.** `+` = confirmed/positive (green). `-` = risk/uncertain (red). Max 3 per output.
- Code blocks for structured data only (plan outlines, prompts).
- No academic citations in output.
- No generic praise. Specific acknowledgments only, and only when earned.

## Context Contract

For chaining with individual skills (/reframe, /recast, /rehearse, /refine), save to `.overture/last-run.md`:

Top section: shareable deliverables (human-readable).
Bottom section (after `---`): Context Contract:

```yaml
context: [build|decide]
judge: [대표|팀장|투자자|unknown]
reframed_question: [final question]
assumption_pattern: [confirmed|mixed|mostly_doubtful]
assumptions_doubtful: [list]
assumptions_uncertain: [list]
assumptions_confirmed: [list]
simulation_risks_critical: [list]
simulation_risks_unspoken: [list]
judge_feedback: [key quote]
deliverable_type: [plan|spec|strategy]
```
