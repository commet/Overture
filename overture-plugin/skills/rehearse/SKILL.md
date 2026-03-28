---
name: rehearse
description: "Stress-test your plan with simulated stakeholders before the real meeting. Creates 2-3 personas who critique your strategy from different angles — finding risks, blind spots, and approval conditions. Use before presenting to leadership, launching products, or making irreversible decisions."
argument-hint: "[plan or strategy to stress-test]"
allowed-tools: Read, Write, Agent, AskUserQuestion
---

## When to use

- ✓ Before presenting a plan to leadership or stakeholders
- ✓ Before making an irreversible decision (hiring, launch, investment)
- ✓ When you suspect your plan has blind spots but can't find them
- ✓ After /recast — stress-test the execution plan you just designed
- ✗ When the plan is still too vague (run /recast first)
- ✗ For quick, low-stakes decisions (overkill)

If you ask AI directly, it will agree with you. That's the problem.

Rehearsal creates simulated stakeholders who react to your plan the way real people would — with skepticism, competing priorities, and uncomfortable questions nobody else will ask.

**Always respond in the same language the user uses.**

**Rendering:** Final output in ONE code block (the "card"). Use risk symbols: `✗` critical, `?` manageable, `🔇` unspoken. Persona sections within the card separated by blank lines. Devil's Advocate gets `⚡` marker.

## If no argument is provided

If the user just types `/rehearse` without a plan, and there's no previous `/recast` or `/reframe` result in the conversation, ask:

> What plan or strategy do you want to stress-test? (Paste it here, or run /recast first)

## Before starting

Check if `.overture/journal.md` exists. If previous rehearsals exist, apply adaptive rules below.

### Adaptive rules (journal → behavior)

Scan last 10 journal entries:

**Pattern: Previous rehearse had only 2 personas and critique was weak**
→ Consider adding a 3rd persona with a fundamentally different perspective (e.g., end-user vs buyer vs competitor).

**Pattern: Previous rehearse's unspoken risks later proved most important (visible in /refine or /outcome entries)**
→ Push harder on unspoken risks this time. Allocate more depth to the Devil's Advocate section.

**Pattern: User always picks `1 → /refine` after rehearse (3+ times)**
→ Personas might be too soft. Increase harshness threshold.

**Topic linking:** If journal has entries in the same domain, surface the most relevant critique:
```
  💭 관련 이전 실행: [date] — sharpest critique: "[quote]"
```

Show the header:

```
  ╭──────────────────────────────────────────╮
  │  👥 Overture · Rehearse                  │
  ╰──────────────────────────────────────────╯
```

### Reflection block (show FIRST, before heavy analysis)

If continuing from `/recast`, output a brief reflection block immediately after the header. This gives the user something to think about while the full persona reviews generate:

```
  💭 스트레스 테스트 전에:
  ▸ "[the product thesis or governing idea being tested]"

  이 계획의 가장 약한 고리:
  · [the lowest-certainty assumption — name it explicitly]
  · [a "what if the opposite is true?" question]
```

**Rules:** Max 4 lines of content. Surface the assumption the user is LEAST confident about — that's what personas will attack hardest. This block is output first, then persona generation and reviews follow.

## Context extraction from /recast and /reframe

Read `.overture/recast.md` and `.overture/reframe.md` for contract data. If files don't exist, scan the conversation for contract blocks.

### From /recast Contract (primary — the plan being stress-tested):
- `governing_idea` → the core thesis each persona evaluates
- `storyline` → the strategic logic (situation/complication/resolution)
- `design_rationale` → why this approach was chosen
- `steps` → the execution flow. Present to each persona as a compact summary:
  `1. [task] [AI] / 2. [task] [Human] ⚑ / 3. [task] [Both] ★`
  (⚑ = checkpoint, ★ = critical path)
- `key_assumptions` → personas' **primary attack surface**
- `inherited_assumptions` → **prioritize these for scrutiny** (already flagged as uncertain/doubtful by the user in /reframe)
- `personas` → use these EXACTLY as persona seeds. Reproduce all fields: name, role, influence, decision_style, risk_tolerance, primary_concern, blocking_condition

### From /reframe Contract (secondary — the user's known doubts):
- `assumptions_doubtful` → the user ALREADY suspects these are wrong. Personas should probe these **first and hardest**.
- `assumptions_uncertain` → secondary attack surface
- `ai_limitations` → persona should flag if any AI step touches these
- `reframed_question` → the root question the plan is supposed to answer

### What each persona receives in their review:
Every persona MUST see: the governing idea, the step summary with actors/checkpoints, the key assumptions (especially inherited ones), and the AI limitations. Without this context, personas produce generic feedback.

### If no contracts exist:
Generate personas from the user's input. Follow the diversity rule below.

## Context detection

Read `context` from /recast or /reframe Contract. If no contracts exist, detect from user input (same signals as /reframe).

## Step 1: Create personas

### Decide context: Stakeholders (3 personas)

If `/recast` provided personas in its Contract, use those exactly — reproduce all fields.

Otherwise, build 3 stakeholder personas from context:
1. **Reporting audience** — receives the deliverable
2. **Gatekeeper** — controls resources or approval
3. **Domain expert** — knows if this is realistic

Each persona needs ALL fields: name, role, influence, decision_style (analytical/intuitive/consensus/directive), risk_tolerance (low/medium/high), primary_concern, blocking_condition, success_metric.

**Diversity rule:** Personas MUST differ on decision_style and risk_tolerance.

**If the user names specific people**, build personas around those people. Ask clarifying questions if needed.

See `references/persona-design.md` for detailed guidance.

### Build context: User personas (2 personas)

If `/recast` provided user personas in its Contract, use those exactly.

Otherwise, create 2 user personas:
1. **Target User** — daily user. Fields: name, context, current_solution (specific!), switch_threshold, dealbreaker
2. **Skeptic** — has seen similar products. Fields: name, context, alternative (specific product!), objection

## Step 2: Independent reviews

### Decide context reviews

Each persona reviews the plan INDEPENDENTLY. For each, generate:

- **First reaction** — in their voice, their style (1-2 sentences)
- **Failure scenario** — most LIKELY way this fails (not worst-case)
- **Risks** — classified as [critical], [manageable], [unspoken]
- **Approval conditions** — what they need to see to say "yes"

### Build context reviews

Each persona reviews the product spec INDEPENDENTLY:

**Target User:**
- **First reaction** — in their voice ("Oh this is..." — authentic)
- **Would I switch?** — honest answer referencing their current_solution
- **What's missing?** — the one thing that would actually make them use it daily
- **Risks** — [critical]: what makes them delete it / [unspoken]: what nobody says about products like this

**Skeptic:**
- **First reaction** — skeptical, referencing their known alternative
- **"Why not just use [alternative]?"** — the core objection, fully argued
- **What would change my mind?** — specific evidence or demo that would convince them
- **Risks** — [critical]: most likely failure mode / [unspoken]: the market reality nobody admits

**You MUST find at least one [unspoken] risk.** This is Overture's core value.
See `references/risk-classification.md` for the three categories.

## Step 3: Devil's Advocate

### Decide context
Run the `devils-advocate` agent to attack the plan through 3 lenses:
1. Most realistic failure
2. The silent problem (what nobody will say)
3. The regret test (what you'll wish you'd considered in 1 year)

### Build context
Lighter version — integrated as a final section (no separate agent needed):
1. **Most realistic failure**: How this product most likely dies (not worst-case, MOST LIKELY)
2. **The thing nobody says**: The market/user reality that builders avoid acknowledging
3. **6-month regret**: What you'll wish you'd built differently after 6 months of users

## Step 4: Synthesis

After all persona reviews and Devil's Advocate, produce a structured synthesis:

1. **Common agreements** — where 2+ personas flagged the same concern
2. **Key conflicts** — where personas disagree (e.g., one says "move fast", another says "validate first"). State each persona's position.
3. **Priority actions** — the 3 most impactful changes, ordered by: critical risks first → items satisfying multiple approval conditions → unspoken risks
4. **Untested assumptions** — assumptions from /recast that NO persona could confirm or deny (information gaps that need real-world validation)

## Self-check

"Is there anything in this feedback that would make the user uncomfortable?"
If no → the rehearsal was too soft. Make at least one persona harsher.

"Does each risk cite a specific element from /recast — a feature name (P0/P1), step number, assumption, or metric?"
If no → the critique is generic. Tie each risk to a concrete part of the plan.

### Engine-driven backward recommendation

After synthesis, before rendering the card, check these conditions. If triggered, show the recommendation in the card **above** the quick action menu:

**Condition A: All personas flat reject (no conditional)**
If every persona says "사용 안 함" or equivalent WITHOUT conditions (not "would use if X"), the thesis itself is broken:
```
  💡 엔진 추천: 전원 거부 — thesis 자체 재설계 필요.
     ← /recast에서 product thesis를 다시 세우는 걸 권장합니다.
```

**Condition B: Sharpest critique attacks the thesis, not features**
If the most damaging feedback targets the governing idea/product thesis directly (e.g., "이 제품이 존재할 이유가 없다", "feature이지 product가 아니다") rather than specific features or execution:
```
  💡 엔진 추천: 핵심 비판이 개별 기능이 아닌 제품 방향 자체를
     겨냥합니다. /refine으로 수술적 수정보다 ← /recast에서
     thesis 재설계를 권장합니다.
```

**Condition C: Devil's Advocate questions problem existence**
If the Devil's Advocate "silent problem" or "realistic failure" concludes that the target users don't actually have this problem, or the market doesn't exist:
```
  💡 엔진 추천: 문제 존재 여부 자체가 의심됩니다.
     ← /reframe에서 문제 정의부터 재검증을 권장합니다.
```

These are recommendations, not blockers. Show them inline, then show the normal quick action menu below. The user decides.

## Output

**Single card** — one code block. Auto-save to `.overture/rehearse.md`.

### Decide context: Output card (76-char width, ONE code block)

```
  👥 Rehearse ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [바꿔야 할 것 label]
  1  [action — specific]
  2  [action — specific]
  3  [action — specific]

  [페르소나 label] ─────────────────────────────────────────

  ┌ [Name] — [Role] — [primary concern]      [판정]
  │ ✗  [critical risk — one line]
  │ 🔇 [unspoken risk — one line]
  └ ▸ "[sharpest quote]"

  ┌ [Name] — [Role] — [primary concern]      [판정]
  │ ✗  [critical risk — one line]
  │ 🔇 [unspoken risk — one line]
  └ ▸ "[sharpest quote]"

  ┌ [Name] — [Role] — [primary concern]      [판정]
  │ ?  [manageable risk — one line]
  └ ▸ "[sharpest quote]"

  Devil's Advocate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✗  [realistic failure — one line]
  🔇 [silent problem — one line]
  ⏳ [regret in 1 year — one line]

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  💡 [key tension or insight — 1-2 lines]

  ████░ ✓정의 ✓계획 ✓테스트 ·해결 ·수렴
  [severity + quick actions — see below]
```

### Build context: Output card (76-char width, ONE code block)

```
  👥 Rehearse ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [바꿔야 할 것 label]
  1  [action — specific]
  2  [action — specific]

  [페르소나 label] ─────────────────────────────────────────

  ┌ 🎯 [Name] · [role/context] · [current solution]
  │ ✗  [critical risk — one line]
  │ 🔇 [unspoken risk — one line]
  └ → [verdict: 조건부/거부/사용]

  ┌ 🤨 [Name] · [role/context] · [alternative]
  │ ✗  [critical risk — one line]
  │ 🔇 [unspoken risk — one line]
  └ → [verdict]

  [핵심 발언 label] ────────────────────────────────────────

  [Name]  "[sharpest quote — one sentence]"
  [Name]  "[sharpest quote — one sentence]"

  Devil's Advocate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✗  [most likely death — one line]
  🔇 [what nobody says — one line]
  ⏳ [6-month regret — one line]

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  💡 [product blind spot — 1-2 lines max]

  ████░ ✓정의 ✓계획 ✓테스트 ·해결 ·수렴
  [severity + quick actions — see below]
```

**Layout rules:**
- **Header:** 1-line, emoji + name + ━━━.
- **Personas:** Card blocks (`┌│└`). Header line includes name + context + verdict (right-aligned). Body: ✗ critical, 🔇 unspoken, ▸ quote OR → verdict. Max 4 lines per persona.
- **Quotes (build context):** Extracted to separate "핵심 발언" section. `[Name]  "[quote]"` — one line each.
- **Devil's Advocate:** Own section with ━━━ separator (heavier weight = different voice). 3 items, 1 line each.
- **Footer:** ━━━ → 💡 → readiness → severity + actions.
- **Readiness:** `████░ ✓item ·item` — one line.

**Severity-based quick actions (after the card, outside code block if needed):**

If critical ≥ 1: `⚠️ Critical [N]개 · 다음? 1 /refine 권장 · 2 수정 · 3 저장 · ← 0`
If critical = 0, unspoken ≥ 2: `🔇 Unspoken [N]개 · 다음? 1 /refine · 2 수정 · 3 저장 · ← 0`
If none: `✓ 리스크 없음 · 다음? 1 저장 · 2 수정 · 3 /refine · ← 0`

All on one line. Adapt to user's language.

**Quick action:** The user can type `0`, `1`, `2`, or `3`. `1` saves and launches the recommended next action. `2` shows editable items (see below). `3` saves (or launches optional refine). `0` goes back to /recast with rehearsal insights. If the user types anything else, respond naturally. Adapt labels to user's language.

**When user picks `2` (수정):** Show numbered items they can modify:
```
  수정할 항목?
  a · 페르소나 교체/추가
  b · 특정 리스크 재평가
  c · Devil's Advocate 다시
  d · 기타 (직접 입력)
```
After adjustment, re-output the affected section and show quick actions again.

**Going back (`0`):** When the user chooses to go back, summarize what rehearsal revealed that requires spec changes too large for /refine:
> 💡 Rehearse에서 발견한 것:
> - [fundamental issue, e.g., "product thesis 자체가 틀렸다 — /refine으로 안 고쳐짐"]
> - [what to redesign in recast]
Then launch `/recast` with the original reframed question + these insights. If the issue is even more fundamental (questioning whether the problem exists), suggest going back to `/reframe` instead.

Only save `.overture/rehearse.md` after user confirms. Full persona reviews (detailed reactions, failure scenarios, all risks) go in the saved file — the card is the summary.

**Persona comparison table:** Header row + `─` separator. Each persona is ONE row: name, critical risk, unspoken risk, approval condition. Instant cross-comparison.

**Sharpest quotes:** After the table, each persona's most distinctive reaction in one `▸` line. Gives VOICE without the full vertical review sections.

**Risk symbols:** `✗` critical, `?` manageable, `🔇` unspoken.

Detailed persona reviews (full reactions, failure scenarios, all risks) go into the saved `.overture/rehearse.md` file — the card is the summary, the file has the full analysis.

**After the card**, save to `.overture/rehearse.md`:
- Top: bottom-line actions, persona summaries, devil's advocate (clean markdown)
- Bottom after `---`: full Context Contract with all fields (risks by category with source, untested_assumptions, approval_conditions per persona, persona_profiles with ALL fields for /refine reuse, devils_advocate summary)

## Learning journal

Append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):
**Header uniqueness rule:** Include date + skill + short topic slug (≤5 words). Example: `## 2026-03-27 /rehearse — AI 코드 리뷰 어시스턴트`

```
## [date] /rehearse — [short topic, ≤5 words]
- Context: [build|decide]
- Personas: [names with roles]
- Critical: [each critical risk — 1 line per item]
- Unspoken: [each unspoken risk — 1 line per item]
- Sharpest critique: "[quote]" — [persona]
- Unresolved: yes
- Pipeline: reframe ✓ → recast ✓ → rehearse ✓ → refine ·
```
