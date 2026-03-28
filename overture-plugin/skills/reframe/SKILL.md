---
name: reframe
description: "Sharpen your question before asking AI. Finds hidden assumptions in your problem and reframes it so you get breakthrough answers instead of generic ones. Use when AI gives predictable answers, when starting a strategic decision, or when something feels off about a problem."
argument-hint: "[problem or question to reframe]"
allowed-tools: Read, Write, AskUserQuestion
---

## When to use

- ✓ Starting a strategic decision — before committing time or resources
- ✓ Building a product — before asking AI to code it
- ✓ AI keeps giving predictable, generic answers to your question
- ✓ Something feels off about the problem but you can't articulate why
- ✓ Before a big meeting where you need to present a sharp question
- ✗ Tactical questions with obvious answers (just do them)
- ✗ When you already know the real question and just need execution (use /recast)

Most strategic failures start with the wrong question, not the wrong answer. Your job is to find the hidden assumptions in the user's problem and reframe it into a sharper question.

**Always respond in the same language the user uses.** If the input is in Korean, all output — including headers, labels, and options — should be in Korean. The UI chrome (boxes, symbols, progress indicators) stays the same regardless of language.

## Step 0: Get the problem first

**If no argument is provided** (user just typed `/reframe` without a problem):

Ask ONLY this — nothing else, no overview, no interview yet:

> What problem or decision are you thinking about?

Wait for their response. Only AFTER receiving the problem, proceed to the overview + interview.

**If an argument IS provided** (e.g., `/reframe "expand into SEA"`), proceed immediately.

## Context detection

After receiving the problem, determine the context. This shapes the entire flow — interview questions, assumption dimensions, reframing strategy, and output.

**Build context** — user wants to CREATE something:
- Signal words: build, make, create, develop, app, tool, SaaS, service, platform, MVP, ship, 만들다, 개발, 앱, 서비스, 플랫폼, 도구, 사이트, 웹앱
- Pattern: describes a product, tool, or app idea — something to be built and used
- Examples: "할 일 관리 앱", "AI 블로그 자동화 SaaS", "프리랜서용 인보이스 도구"

**Decide context** (default) — user wants to DECIDE or ANALYZE:
- Signal words: decide, strategy, expand, invest, hire, restructure, adopt, should we, 결정, 전략, 도입, 투자, 확장, 채용, 구조, 해야 할지
- Pattern: describes an organizational, strategic, or career challenge
- Examples: "AI 도입 전략", "동남아 진출 여부", "팀 구조 개편"

**Ambiguous?** If unclear, ask ONE routing question before proceeding:

```
  [What are you doing?]

    1 · [Building something — app, tool, service]
    2 · [Making a decision — strategy, direction, action]

  ▸
```

Record in Context Contract as `context: build` or `context: decide`. This field propagates to all downstream skills (/recast, /rehearse, /refine).

## Before starting (after you have the problem)

Check if `.overture/journal.md` exists in the project root.

**If it does NOT exist (first use):** Briefly say this is the first time, then show the overview + Q1.

**If it exists:** Read the last 10 entries. If you see patterns from previous runs, mention them briefly before the overview.

## Handling edge cases

- **Very short input** (fewer than ~10 words, e.g., "pricing"): Ask ONE clarifying question before proceeding.
- **Personal decisions** (e.g., "should I go to grad school"): Adapt interview options and assumption dimensions to personal context (see Step 1 notes).
- **Trivial decisions**: Mention it's a quick call, offer to proceed anyway or skip.

## Rendering rules

**Interview phase (Phase 1-2):** Each question/assumption in its own code block — interactive, one at a time. Confirmations (`✓ 분석 필요`) outside code blocks as plain text.

**Final output (Phase 3):** ONE code block (the "card"). Internal hierarchy through spacing, `─` separators, symbols, and emojis. No multiple blocks, no markdown between sections.

**Critical:** ALL designed output MUST be inside fenced code blocks so Claude Code preserves monospace formatting.

## The flow

The reframe process has 3 phases. Show the overview first, then walk through each phase one question at a time.

### Overview + First question (combined in ONE code block)

The overview and Q1 go in a SINGLE code block. The box header (`Overture · Reframe`) and progress dots ALWAYS stay in English. All other text (phase labels, question text, options) is in the user's language.

**Template — translate text content to the user's language, keep UI chrome identical:**

```
  ╭──────────────────────────────────────────╮
  │  Overture · Reframe                      │
  │  ● Interview  ○ Assumptions  ○ Reframe   │
  ╰──────────────────────────────────────────╯

  ① [Interview] (3)  ② [Assumptions] (3-4)  ③ [Reframe]

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ■ [Interview]                        1 / 3

  [What best describes this task?]

    1 · [Clear path — we know what to do]
    2 · [Needs analysis — right answer exists but unclear]
    3 · [No clear answer — must explore and learn]
    4 · [On fire — urgent, need to act now]

  ▸
```

`[brackets]` = translate to user's language. Everything else (╭╮, ●○, ■, ▸, numbers, separators) stays exactly the same.

**Example in Korean:**
- `[Interview]` → `인터뷰`
- `[What best describes this task?]` → `이 과제의 성격은?`
- `[Clear path]` → `방법이 명확함`
- `[Needs analysis]` → `분석 필요`
- `[No clear answer]` → `답이 불분명`
- `[On fire]` → `긴급 대응`

### Phase 1: Interview

After Q1, show a brief text confirmation (e.g., "✓ Top-down directive" / "✓ 위에서 지시") outside the code block, then Q2 in a new code block. This creates visual separation.

#### Build context: Interview questions

If `context: build`, replace the standard Q1-Q3 with product-focused questions. Same rendering rules (code blocks, one at a time, confirmations between).

**Q1 (replaces "nature"):**
```
  ■ [Interview]                        1 / 3

  [Who is this for?]

    1 · [Just me — personal tool]
    2 · [Specific group — who?]
    3 · [Anyone — mass market]
    4 · [Don't know yet]

  ▸
```
Maps to `audience`: 1=personal, 2=niche, 3=mass, 4=unknown

**Q2 (replaces "goal"):**
```
  ■ [Interview]                        2 / 3

  [What does success look like?]

    1 · [Users — people actually use it]
    2 · [Validation — proves the idea works]
    3 · [Revenue — makes money]
    4 · [Learning — build skills / portfolio]

  ▸
```
Maps to `success_model`: 1=users, 2=validation, 3=revenue, 4=learning

**Q3 (replaces "stakes"):**
```
  ■ [Interview]                        3 / 3

  [How big is the first version?]

    1 · [Weekend project — quick and scrappy]
    2 · [Side project — a few weeks]
    3 · [Full product — months of work]
    4 · [Not sure yet]

  ▸
```
Maps to `scale`: 1=weekend, 2=side_project, 3=full_product, 4=unknown

#### Build context: Interview signal mapping

- audience=personal → "is this worth building vs. using existing tools?"
- audience=niche → "do these people actually need this? have you talked to them?"
- audience=mass → "differentiation is everything"
- audience=unknown → MUST include assumption "you don't know who wants this"
- success_model=users → include distribution/discovery assumption
- success_model=revenue → include business model assumption
- success_model=learning → lighter assumptions, focus on scope control
- scale=weekend → feasibility = "can you do this in a weekend?"
- scale=full_product → "is ambition matched to resources?"

#### Decide context: Interview questions (default, unchanged below)

**Q2 template:**
```
  ■ [Interview]                        2 / 3

  [What's the goal?]

    1 · [Clear goal — know exactly what success looks like]
    2 · [Direction only — general direction but unclear target]
    3 · [Competing goals — stakeholders want different things]
    4 · [Unclear — not sure what we're optimizing for]

  ▸
```

After Q2 confirmation, Q3:

**Q3 template:**
```
  ■ [Interview]                        3 / 3

  [How heavy is this decision?]

    1 · [Irreversible — can't undo once committed]
    2 · [Important — significant but adjustable]
    3 · [Experiment — low cost to try and learn]
    4 · [Unknown — not sure yet]

  ▸
```

**Interview signals mapping (v2):**
- Q1 maps to `nature`: 1=known_path, 2=needs_analysis, 3=no_answer, 4=on_fire
- Q2 maps to `goal`: 1=clear_goal, 2=direction_only, 3=competing, 4=unclear
- Q3 maps to `stakes`: 1=irreversible, 2=important, 3=experiment, 4=unknown

These signals influence BOTH assumption extraction (Phase 2) AND reframing strategy (Phase 3). See below for specific mappings.

**Personal decision adaptation:** If the problem is personal (not organizational), adapt the options:
- Q1: 1·Clear path  2·Need to research  3·No right answer  4·Urgent deadline
- Q2: 1·Clear goal  2·General direction  3·Conflicting priorities  4·Unclear
- Q3: Same

### Phase 2: Assumption discovery + evaluation

After the interview, analyze the problem using interview signals to find 3-4 hidden assumptions.

#### Decide context: Assumption dimensions (default)

Check across these dimensions (at least one from each):
- **Value**: Is this actually valuable to someone?
- **Feasibility**: Can this realistically be done?
- **Viability**: Does the economics work?
- **Capacity**: Can the team/org actually handle this?

For personal decisions, adapt: Personal growth / Financial impact / Opportunity cost / Readiness.

#### Build context: Assumption dimensions

If `context: build`, use product dimensions instead (3 assumptions, not 4 — lighter):
- **Value**: Does someone actually want this enough to switch from what they're doing now?
- **Differentiation**: Why wouldn't they just use [specific existing tool]? (MUST name a plausible alternative)
- **Feasibility**: Can this actually be built as imagined, by this person/team, in this timeframe?

Shape emphasis using build interview signals (see mapping above).

**Interview signals shape what assumptions to look for:**
- nature=no_answer → find **existential** assumptions ("this direction has value", "this problem actually exists")
- nature=needs_analysis → find **methodological** assumptions ("the right approach is X", "data exists to decide")
- nature=on_fire → find **causal** assumptions ("the root cause is X", "this is urgent because Y")
- goal=competing → find **priority** assumptions ("stakeholder A's goal matters more than B's")
- goal=unclear → find **value** assumptions ("we know what success looks like")
- stakes=irreversible → MUST include at least one assumption about **consequences of being wrong**

Then present each assumption ONE AT A TIME for evaluation. Same template rules: UI chrome in English, content in user's language.

**First assumption includes the updated progress header. Subsequent ones omit the box header.**

```
  ╭──────────────────────────────────────────╮
  │  Overture · Reframe                      │
  │  ● Interview  ● Assumptions  ○ Reframe   │
  ╰──────────────────────────────────────────╯

  ■ [Assumptions]                      1 / 4

  "[assumption text in user's language]"

    1 · [Confident] ✓
    2 · [Uncertain] ?
    3 · [Doubtful] ✗

  ▸
```

For assumptions 2-4, omit the box header — just the section header + assumption + options.

Repeat for each assumption (3-4 total). Each is one number.

**If the user adds a comment** with their number (e.g., "3 — we tried this last year and nobody used it"), capture that context. It's extremely valuable for reframing.

**If the user just types Enter or skips**, default to 2 (uncertain).

### Phase 3: Reframing + output

Two things determine the reframing approach: the **evaluation pattern** (how the user rated assumptions) and the **interview signals** (nature/goal/stakes).

#### Step 3a: Select reframing PATTERN based on assumption evaluations

Count the evaluations from Phase 2:

**ALL CONFIRMED (0 doubtful, 0 uncertain)** → CONFIRMED pattern
- Direction is validated. Don't question the "why" — sharpen the "how."
- Reframed question focuses on execution effectiveness, not direction.
- Hidden questions should point to execution forks, not strategic pivots.

**MOSTLY DOUBTFUL (≥50% doubtful)** → CHALLENGED pattern
- Premises are broken. Question the task itself.
- Reframed question may challenge whether this should be done at all.
- Hidden questions should include fundamental alternatives.
- It's valid to suggest "don't do this" as a direction.

**MIXED (anything else)** → MIXED pattern
- Direction stands. Integrate the doubtful/uncertain items as CONDITIONS, not direction changes.
- **CRITICAL ANTI-PATTERN:** Do NOT flip the entire direction based on one doubtful assumption. The confirmed assumptions support the current direction — respect that.
- Reframed question = original direction + conditions revealed by the doubtful/uncertain assumptions.
- Example: If "AI 업무 효율화" has confirmed "비효율 존재" + "경영진 지원" but doubtful "팀원 수용성":
  - WRONG: "AI 대신 프로세스 개선부터 하라" (ignores confirmed direction)
  - RIGHT: "AI 효율화의 성패는 기술이 아니라 조직 설계에 달려 있다 — 기술 도입과 변화관리를 어떻게 동시에 설계할 것인가?" (maintains direction, integrates condition)

#### Step 3b: Select reframing STRATEGY based on interview signals

**Decide context (default):**
- nature=on_fire → **Diagnose Root Cause** (separate immediate response from structural fix)
- nature=no_answer + mostly doubtful → **Challenge Existence** (the problem may not need solving)
- nature=needs_analysis + mostly confident → **Narrow Scope** (find the smallest experiment)
- goal=competing → **Redirect Angle** (look through a different stakeholder's eyes)
- Otherwise → **Redirect Angle** (find the perspective shift)

See `references/reframing-strategies.md` for strategy details and examples.

**Build context:**
- CONFIRMED → **Sharpen Wedge** — idea is sound, specify the exact MVP and first user
  - "할 일 관리 앱" → "GTD를 아는 프리랜서가 Notion 대신 쓸 만큼 빠르고 가벼운 태스크 도구"
- MIXED → **Narrow Scope** — maintain direction, add constraint from the doubtful assumption
  - Don't flip the idea. Constrain it. "앱 만들되, [doubtful assumption]을 먼저 검증할 수 있는 최소 버전부터"
- MOSTLY DOUBTFUL → **Validate First** — reframe toward validation, not building
  - "만들기 전에 확인할 것: [specific question to answer with 5 potential users]"
  - It's valid to suggest "don't build this yet"

#### Step 3c: Strategic thinking frame (mental checklist before reframing)

1. What does the person who assigned this REALLY want? (surface goal ≠ actual goal)
2. What happens if we do nothing for 6 months? (urgency signal)
3. What is this problem deliberately NOT addressing that might matter?
4. Is this a technical problem, organizational problem, political problem, or timing problem?
5. Scope check: the reframed question should be equal or broader in scope than the original.

The **hidden questions** CAN point to focused experiments or first steps.

**Output — single card. Everything the user sees in ONE code block.**

**Card template:**

```
  ╭──────────────────────────────────────────╮
  │  🎯 Overture · Reframe                   │
  ╰──────────────────────────────────────────╯

  ┌──────────────────────────────────────┐
  │  [original problem]                  │
  └──────────────────┬───────────────────┘
                     ↓
  ╔══════════════════════════════════════╗
  ║  [reframed question]                ║
  ╚══════════════════════════════════════╝

  ─────────────────────────────────────────

  [Assumption label]                   [Eval]
  ─────────────────────────────────────────
  [assumption full text]                 ✓
  [assumption full text]                 ?
  [assumption full text]                 ?
  [assumption full text]                 ✗

  [Check First label]
  · [question — concrete, one line]
  · [question — bake AI limitation naturally]

  ─────────────────────────────────────────

  💡 [blind spot — 1-2 lines max]

  /recast · /rehearse                📄 saved
```

**Visual shift boxes:** Original question in thin box (`┌┐`), reframed in bold box (`╔═╗`). The visual weight difference immediately shows the upgrade. `↓` arrow connects them.

**Assumption table:** Each assumption gets its own row with evaluation symbol (`✓ ? ✗`) right-aligned. Full text, not abbreviated — the table format makes it readable without compression.

**`[Check First]` absorbs AI limitations** — phrase questions to naturally show what needs human investigation (e.g., "직원 AI 수준 — 직접 파악" instead of separate section).

**`💡`** = the uncomfortable blind spot. **`📄 saved`** = saved to `.overture/reframe.md`.

**Translate to user's language:** [Assumption label], [Check First label], all content. Keep in English: `Overture · Reframe`, emojis, symbols.

## Auto-save

After outputting the card, save to `.overture/reframe.md` (create `.overture/` dir if needed):

```markdown
# 🎯 Reframe

**[Original]:** [original question]
**[Real question]:** [reframed question]

## [Assumptions]
- [symbol] [full assumption text] — [reason if user gave one]

## [Check First]
- [question]

> 💡 [blind spot]

---

## Context Contract
context: [build|decide]
reframed_question: [question]
assumption_pattern: [confirmed|mixed|mostly_doubtful]
strategy: [strategy name]
# decide context:
interview_signals: nature=[X] goal=[X] stakes=[X]
# build context:
build_signals: audience=[X] success_model=[X] scale=[X]
assumptions_doubtful:
  - [assumption] | reason: [reason]
assumptions_uncertain:
  - [assumption] | reason: [reason]
assumptions_confirmed:
  - [assumption]
ai_limitations:
  - [limitation]
```

Top section (above `---`) = shareable (Slack, email, Notion). Bottom section = pipeline data for next skill. `[brackets]` = translate to user's language.

### 💡 Blind spot rules

The `💡` line in the card is Overture's signature — the uncomfortable truth.

- Specific to THIS problem, not generic
- Uncomfortable — if the user nods "yeah I knew that," you failed
- Captures the DELTA: "You were thinking about X, but the real issue is Y"
- Like a smart mentor after listening carefully

**Good:** "기술 프로젝트가 아니라 조직 변화 프로젝트다." / "승인해줄 사람이 아니라 막을 사람을 보고 있다."
**Bad:** "리스크가 있다." (vague) / "복잡한 문제다." (nothing) / "더 신중해야 한다." (patronizing)

## Rules

- Never start with "Great question!" or any form of flattery. Go straight to the overview, then the first interview question.
- The reframed question MUST be meaningfully different from the original. If you can't find a sharper angle, you haven't looked hard enough.
- Uncomfortable assumptions are the most important ones. Find what the user doesn't want to hear.
- For AI limitations: absorb into "Check First" questions naturally. Be specific — not "AI can't predict" but "내부 팀 역학은 직접 파악 필요."
- **Keep the card formatting consistent.** Box header with 🎯, `─` separators between sections, symbols (`✓ ? ✗`) for assumptions, `💡` for blind spot.

**Self-check before outputting:** Did the reframed question actually challenge the user's thinking, or did it just polish their original question? If you removed the labels and showed someone both questions, would they immediately see the difference?

## Learning journal

After completing, append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):

```
## [date] /reframe
- Context: [build|decide]
- Original: "[original question]"
- Reframed: "[new question]"
- Interview: [decide: nature/goal/stakes] [build: audience/success_model/scale]
- Pattern: [confirmed | mixed | mostly_doubtful]
- Strategy: [challenge_existence | narrow_scope | diagnose_root | redirect_angle | sharpen_wedge | validate_first]
- Assumptions: [N] confident, [N] uncertain, [N] doubtful
```

Read only the **last 10 entries** at the start of future runs. If the journal exceeds 50 entries, mention to the user that they can archive older ones.
