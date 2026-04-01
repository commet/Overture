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

Every step produces a **usable result**. The user can stop at any point and walk away with something valuable.

```
Input → Instant draft (~30 sec)
     → Q&A deepens it (2-3 rounds)
     → Full document synthesis (Mix)
     → "What would [judge] say?"
     → Apply fixes → Final deliverable
```

## Context detection

After receiving the problem, detect context from input:

**Build context** — creating something:
- Signals: build, make, create, app, tool, SaaS, MVP, ship, 만들다, 개발, 앱, 서비스, 플랫폼

**Decide context** (default) — making a decision or plan:
- Signals: decide, strategy, plan, expand, hire, should we, 결정, 전략, 기획, 기획안, 제안서, 보고서

If ambiguous, use AskUserQuestion:
- question: "이건 뭘 만드는 건가요, 아니면 판단/기획하는 건가요?"

Record as `context: build` or `context: decide`.

---

## Step 1: Instant First Draft

**Do this IMMEDIATELY after receiving input. No interview. No preamble.**

### Output format:

---

**Overture** · {context label}

**상황 정리**
[2-3줄. 사용자가 처한 상황을 명확히 정리.]

```diff
+ ▸ 진짜 질문
+ [사용자가 물어본 것과 실제로 해결해야 할 것의 차이. 1-2문장. 날카롭게.]
```

**{기획안 뼈대 / 제품 뼈대}** (context에 따라)

1. **[항목]**: [구체적 설명 1-2문장]
2. **[항목]**: [설명]
3. **[항목]**: [설명]
4. **[항목]**: [설명]
5. **[항목]**: [설명]

**숨겨진 전제**

```diff
- ? [전제 1 — 당연해 보이지만 검증 필요]
- ? [전제 2]
- ? [전제 3]
```

---

> 이건 초안이다. 몇 가지만 더 알면 훨씬 날카로워진다.

---

**Skeleton quality rules (CRITICAL):**
- Each line = ACTIONABLE item, not vague category
- Write so they can copy-paste into a doc and start filling in
- 5-7 lines, each specific, with 1-2 sentence description
- Good: "시장 현황: 현재 경쟁사 3곳의 접근법과 우리가 다른 점 정리"
- Bad: "시장 분석" (too vague, useless)

**Tone:**
- Direct. "이건 초안이다" not "이건 초안일 수 있습니다."
- Name what you DON'T know. Don't pretend.
- Concrete enough to be useful AS-IS.

Then **immediately generate the first question** using AskUserQuestion.

---

## Step 2: Progressive Deepening (2-3 rounds)

**⚠️ This is a MULTI-TURN conversation, not a single output.** The flow is:

```
You: [Step 1 output + first AskUserQuestion]
User: [answers]
You: [insight + updated analysis + next AskUserQuestion]
User: [answers]
You: [insight + updated analysis + mix trigger AskUserQuestion]
User: [picks "초안 완성"]
You: [Step 3 Mix]
```

Do NOT combine multiple rounds into one output. Wait for the user's answer before each update.

Each round:

1. Ask a targeted question (via AskUserQuestion — always use the tool, never type questions as text)
2. User answers
3. Show **insight** (what this answer revealed, 1 sentence)
4. Show **updated analysis** (changes highlighted with diff)
5. Generate **next question** via AskUserQuestion (must open a NEW dimension)
6. Repeat until ready for Mix (2-3 rounds typically)

### Question quality rules (CRITICAL):

- **Reference their specific answer**: "대표님이 확인한다고 했는데, 그러면..." — not generic follow-ups
- **Each question opens a NEW dimension**: Don't drill into same theme twice
- **Never ask lazy questions**: "목표가 뭐야?" or "어떤 결과를 원해?" are BANNED
- **Offer 3-4 concrete options** when possible — people answer better with choices
- **If answer is vague**, ask something concrete with specific options
- **If user is more sophisticated than expected**, level up the questions

### Question progression pattern:

| Round | Dimension | Purpose |
|-------|-----------|---------|
| 1 | WHO judges/uses this | Determines decision maker, shapes tone |
| 2 | Constraints, resources, timeline | Shapes execution feasibility |
| 3 | Success criteria, risks | Sharpens focus and priorities |

Skip rounds whose answers are already clear from input.

### Round 1 question examples:

**Decide context — always ask first:**
- question: "이 결과물을 누가 최종 판단해?"
- header: "판단자"
- options:
  - label: "대표/CEO", description: "대표님이 직접 검토하고 판단"
  - label: "팀장/이사", description: "중간 관리자가 검토"
  - label: "투자자/외부", description: "외부 이해관계자가 대상"
  - label: "아직 모름", description: "판단자가 불명확하거나 나 자신"

→ Record as `judge`. Determines persona in Step 4.

**Build context — always ask first:**
- question: "이걸 누가 쓸 건가요?"
- header: "사용자"
- options:
  - label: "나만 쓸 것", description: "개인 도구나 프로젝트"
  - label: "특정 그룹", description: "정해진 사용자층이 있음"
  - label: "누구나", description: "대중을 대상으로"
  - label: "아직 모름", description: "사용자가 불명확"

### After each answer — show updated analysis:

---

**💡** [이번 답변에서 발견된 핵심 — 1문장, bold]

```diff
- ▸ [이전 진짜 질문]
+ ▸ [업데이트된 진짜 질문]
```

**뼈대 (수정)**

```diff
  1. [변경 없는 항목]
+ 2. [새로 추가되거나 변경된 항목] ← [이유]
  3. [변경 없는 항목]
- 4. [제거되거나 대체된 항목]
+ 4. [대체된 새 항목]
  5. [변경 없는 항목]
```

**전제 업데이트**

```diff
+ ✓ [확인된 전제]
- ✗ [의심되는 전제]
- ? [아직 불확실]
```

---

### After round 2+: Include execution plan + 실행 준비

실행 계획을 보여주되, **이건 "나중에 할 일"이 아니라 "지금 이 세션에서 일어나는 일"**로 프레이밍한다:

**실행 계획** (이 세션에서 처리)

| # | 할 일 | 담당 | 처리 방식 |
|---|-------|------|----------|
| 1 | [AI가 할 수 있는 것] | 🤖 | → **지금 해줌** (Mix에서 내용 채움) |
| 2 | [사용자 판단 필요] | 🧑 | → **지금 물어봄** (AskUserQuestion) |
| 3 | [둘 다] | ⚡ | → AI가 초안 + 사용자가 확인 |
| 4 | [오프라인 행동] | 🧑⏳ | → **다음 단계에 명시** (문서 완성 후 해야 할 것) |

실행 계획을 보여준 직후, **🧑 단계의 핵심 판단을 AskUserQuestion으로 즉시 수집**한다.
이 답변이 Mix 문서의 품질을 결정하므로, 꼭 필요한 것만 1-2개 묻는다.

**예시:**
- 🧑 "대표님이 특별히 강조한 키워드나 방향이 있어?" (판단 수집)
- 🧑 "경쟁사 중 특히 의식하는 곳이 있어?" (맥락 수집)

### 역할 설계 심화 (선택적):

실행 계획 + 🧑 질문 후, AskUserQuestion으로 역할 검토 깊이를 선택:

- question: "AI/사람 역할 배분을 더 세밀하게 볼까?"
- header: "역할 설계"
- options:
  - label: "이대로 좋아", description: "바로 초안 완성으로"
  - label: "역할 검토하기", description: "각 단계의 담당자를 4가지 기준으로 재검토"

If "역할 검토" → 4-question framework:
1. 내부/정치적 지식 필요? → 🧑
2. 주관적/전략적 판단? → 🧑
3. 틀리면 되돌릴 수 없음? → 🧑 or ⚡
4. 누군가 책임져야 함? → 🧑
→ 해당 없으면 → 🤖

### When to transition to Mix:

After 🧑 판단 수집 완료 (+ 선택적 역할 검토), 자동으로 Mix로 전환.
"충분하다"고 판단되면 별도 질문 없이 바로 진행. 사용자가 "이 정도면 됐어" / "다음"을 말하면 즉시 전환.

---

## Step 3: Mix — Full Document Synthesis

**실행 계획의 🤖 단계를 실제로 수행하고, 🧑 수집 답변을 반영하여 REAL document를 만든다.**
이건 outline이 아니다 — AI가 자기 담당 부분을 실제로 채운 first draft다.

### Output format:

---

**Overture · 초안 완성**

**[구체적 제목 — 상황 반영]**

> [Executive summary — 2-3문장. 판단자가 이것만 읽어도 80%를 파악할 수 있어야 함.]

**[섹션 1 제목]**
[3-5문장. 구체적. 핵심 수치/사실 포함. **중요한 용어 볼드.**]

**[섹션 2 제목]**
[3-5문장.]

**⚠️ 리스크와 대응** ← 반드시 포함, 이 섹션이 차별점
[각 리스크를 bold 처리하고 대응은 들여쓰기. 2-3개.]
- **리스크 1: [이름].** [설명]. **대응:** [구체적 행동]
- **리스크 2: [이름].** [설명]. **대응:** [구체적 행동]

**[섹션 4-6]**
[필요한 만큼]

**전제 조건**
- [이 문서가 전제하는 것 — 명시하는 것이 지적 정직]

**다음 단계**
1. [누가, 언제까지, 무엇을]
2. [누가, 언제까지, 무엇을]
3. [누가, 언제까지, 무엇을]

---

**Mix quality rules (CRITICAL — this is the core deliverable):**
- **🤖 AI 단계를 실제로 수행**: 실행 계획에서 AI 담당이었던 것(시장 분석, 경쟁사 조사, 구조화 등)은 이 문서에서 **실제 내용으로 채운다.** "시장 분석이 필요하다"가 아니라 시장 분석 결과를 쓴다.
- **🧑 수집한 답변을 반영**: Step 2에서 AskUserQuestion으로 받은 사용자 판단을 문서에 녹인다.
- **🧑⏳ 오프라인 행동은 "다음 단계"에**: 이 세션에서 해결 못한 것(대표님에게 직접 물어봐야 할 것 등)은 "다음 단계"에 구체적 질문과 함께 명시. "[확인 필요]"로 표시.
- **Send-as-is quality**: 사용자가 이걸 그대로 보내도 되는 수준. "[여기에 입력]" 금지.
- **Substantial**: 아웃라인이 아니라 사고의 깊이가 보이는 실제 초안.
- **4-6 sections**, each 3-5 sentences. **Section content는 flowing text.** **핵심 용어/수치 bold.**
- **"⚠️ 리스크와 대응" MANDATORY**: 2-3 risks + mitigation.
- **다음 단계 = 오프라인에서 해야 할 🧑 행동**: 시간/담당/구체적 산출물. "논의" "검토" 금지.
- **전제 조건**: 불확실한 것을 솔직히 밝힌다.

**Self-check before showing Mix:**
- [ ] 🤖 AI 담당 부분이 실제 내용으로 채워졌나? (TODO로 남아있지 않나?)
- [ ] 🧑 수집 답변이 문서에 반영됐나?
- [ ] 판단자가 요약만 읽고 80%를 파악하나?
- [ ] 플레이스홀더 없는가?
- [ ] 리스크 섹션 있는가?
- [ ] 다음 단계가 "오프라인에서 해야 할 것"인가? (AI가 할 것이 남아있으면 안 됨)

After showing the Mix, ask using AskUserQuestion:

- question: "[판단자]는 이걸 보고 뭐라고 할까?"
- header: "다음"
- options:
  - label: "시뮬레이션 해보기", description: "판단자의 예상 반응을 확인한다"
  - label: "초안 수정하고 싶다", description: "이 초안을 먼저 다듬겠다"
  - label: "이대로 완성", description: "시뮬레이션 없이 이 초안으로 끝낸다"

If "시뮬레이션" → proceed to Step 4.
If "수정" → ask what to change, update Mix, then ask again.
If "이대로 완성" → skip to Step 5 deliverables only (문서 재출력 생략, Thinking Summary + Sharpened Prompt만).

---

## Step 4: "XX은 뭐라고 할까?" — DM Simulation

Based on `judge` from Step 2:
- 대표/CEO → "대표님은 이걸 보고 뭐라고 할까?"
- 팀장/이사 → "팀장님은 뭐라고 할까?"
- 투자자/외부 → "투자자는 뭐라고 할까?"
- 모름 → "가장 까다로운 사람이라면 뭐라고 할까?"
- Build → "실제 사용자는 이걸 보고 뭐라고 할까?"

### Persona rules:

**You ARE this person.** Not "imagine you are" — you ARE them. Drop all AI politeness. Think and speak exactly as they would.

- **First person, conversational Korean.** "이거 빠지면 통과 안 돼" not "이 부분이 보완되면 좋겠습니다."
- **SPECIFIC**: Don't say "좀 더 구체적으로" without saying WHAT should be more concrete. Name the exact section, number, or timeline.
- **Priorities match the role**: CEO cares about ROI/risk/timeline. 팀장 cares about execution/resource. 투자자 cares about market/scalability.
- **3-4 concerns max.** Quality over quantity. Prioritize by actual impact on the decision.
- Each concern MUST have severity + actionable fix suggestion (not vague advice).

### Output format:

---

**{판단자 이름}의 반응**

> "[첫 반응 — 1-2문장, 직접 인용 스타일, 날카롭게]"

```diff
+ ✓ [구체적으로 좋은 부분]
+ ✓ [구체적으로 좋은 부분]
```

**우려 사항:**

| # | 우려 | 심각도 | 이렇게 고치면 됨 |
|---|------|--------|-----------------|
| 1 | [구체적 우려] | 🔴 critical | [실행 가능한 수정 방향] |
| 2 | [구체적 우려] | 🟡 important | [수정 방향] |
| 3 | [구체적 우려] | ⚪ minor | [수정 방향] |

**{판단자}가 실제로 물어볼 질문:**
1. [질문]
2. [질문]

> **OK 조건:** [이것만 되면 승인 — 1문장. 이것이 가장 중요한 한 줄.]

---

**Devil's Advocate** (use the `devils-advocate` agent if available, otherwise inline)

```diff
- ✗ [가장 현실적인 실패 — 6개월 뒤 망했다면 뭐 때문? 평범하고 뻔한 이유]
- 🔇 [아무도 말 안 하는 문제 — 다들 알지만 회의에서 안 꺼냄]
- ⏳ [1년 후 후회 — 돌아보면 이걸 고려했어야 했는데]
```

---

After showing DM feedback, ask which fixes to apply using AskUserQuestion:

- question: "🔴 critical은 기본 반영됩니다. 나머지는?"
- header: "반영 범위"
- options:
  - label: "전부 반영", description: "모든 우려 사항을 반영"
  - label: "critical만", description: "🔴 항목만 반영하고 나머지는 무시"
  - label: "이대로 완성", description: "수정 없이 현재 초안으로 완성"

---

## Step 5: Final Deliverable

Apply selected fixes to the Mix document. Output the COMPLETE final document.

If fixes were applied:
- Show which changes were made
- Output the full updated document (not just diffs)

If no fixes (user said "이대로 완성"):
- **Do NOT re-output the Mix document** (user already saw it). Skip directly to deliverables below (Sharpened Prompt, Thinking Summary).

### Output format:

---

**Overture · 최종**

[Complete document: title, executive summary, all sections, assumptions, next steps.
If fixes applied, integrate them seamlessly — don't just append.]

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

| Element | Score |
|---------|-------|
| Framing | [N]/5 |
| Alternatives | [N]/5 |
| Information | [N]/5 |
| Perspectives | [N]/5 |
| Reasoning | [N]/5 |
| Actionability | [N]/5 |
| **Overall** | **[N]/100** |

Anti-sycophancy:
```diff
+ ✓ Initial framing challenged (reframed ≠ original)
+ ✓ Blind spots surfaced
+ ✓ Draft changed after simulation
```

---

### Signature: "What you didn't see"

At the very end:

> **What you didn't see**
> *[핵심 블라인드 스팟. 사용자가 생각하고 있던 것과 실제로 중요한 것 사이의 간극. 구체적이고, 불편하고, 통찰적. 1문장.]*

---

## Before starting (returning users)

Check `.overture/journal.md`. If exists:

**2-4 entries:** Surface one improvement + one watch area:
> ▸ 지난번보다: [specific]
> ▸ 이번에 신경 쓸 것: [pattern]

**5+ entries:** Strength profile:
> ▸ [N]번 사용 패턴: [strength]. 성장 포인트: [area].

## Journal

Append to `.overture/journal.md`:

```
## [date] /overture — [topic, ≤5 words]
- Context: [build|decide]
- Judge: [대표|팀장|투자자|unknown]
- Problem: "[original]"
- Reframed: "[final question]"
- Rounds: [N] (deepening rounds used)
- Score: DQ [N]
- Assumptions: [N] confirmed, [N] uncertain, [N] doubtful
- Simulation: [judge name], [N] critical, [N] important, [N] minor
- Fixes applied: [N] of [total]
- Sharpest critique: "[quote]"
- Strength: [specific]
- Growth edge: [specific]
```

## Auto-save

Save to `.overture/last-run.md`:
- Top: final deliverable + thinking summary (human-readable)
- Bottom after `---`: Context Contract (yaml)

```yaml
context: [build|decide]
judge: [name]
reframed_question: [final]
assumption_pattern: [confirmed|mixed|mostly_doubtful]
assumptions_doubtful: [list]
assumptions_confirmed: [list]
simulation_risks_critical: [list with fix_suggestion]
simulation_risks_unspoken: [list]
judge_approval_condition: [text]
deliverable_type: [plan|spec|strategy]
```

## Rendering rules

- Markdown first. Bold, blockquote, list, diff blocks.
- **No box drawing.** No `╭╮╰╯`, `┌│└`, `═══`. Use `---`, `**bold**`, whitespace.
- **No fixed width.** Markdown auto-wraps.
- **diff = color.** `+` = confirmed/positive (green). `-` = risk/uncertain (red). Max 3 per section.
- Code blocks for structured data only (prompts, yaml contracts).
- No academic citations. No generic praise.

**Visual hierarchy rules (CRITICAL for readability):**
- **"진짜 질문"은 항상 diff 블럭** (`+ ▸`) — 가장 중요한 한 줄이므로 녹색 강조.
- **잘된 점은 diff 블럭** (`+ ✓`) — 우려 사항(테이블)과 대비되어야 함.
- **OK 조건은 blockquote** (`> **OK 조건:**`) — 승인의 핵심이므로 시각적으로 분리.
- **리스크 섹션은 `⚠️` 접두사** — 다른 섹션과 무게 차별화.
- **뼈대 항목은 bold 번호** (`1. **항목**:`) — 코드블럭 대신 마크다운 넘버링. 변경 시에만 diff 블럭.
- **단계 전환은 `---` + bold 헤더** — `**Overture · [단계명]**`으로 새 단계 시작을 명확히.
