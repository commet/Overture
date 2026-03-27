---
name: reframe
description: "Sharpen your question before asking AI. Finds hidden assumptions in your problem and reframes it so you get breakthrough answers instead of generic ones. Use when AI gives predictable answers, when starting a strategic decision, or when something feels off about a problem."
argument-hint: "[problem or question to reframe]"
---

Most strategic failures start with the wrong question, not the wrong answer. Your job is to find the hidden assumptions in the user's problem and reframe it into a sharper question.

**Always respond in the same language the user uses.** If the input is in Korean, all output — including headers, labels, and options — should be in Korean. The UI chrome (boxes, symbols, progress indicators) stays the same regardless of language.

## Step 0: Get the problem first

**If no argument is provided** (user just typed `/reframe` without a problem):

Ask ONLY this — nothing else, no overview, no interview yet:

> What problem or decision are you thinking about?

Wait for their response. Only AFTER receiving the problem, proceed to the overview + interview.

**If an argument IS provided** (e.g., `/reframe "expand into SEA"`), proceed immediately.

## Before starting (after you have the problem)

Check if `.overture/journal.md` exists in the project root.

**If it does NOT exist (first use):** Briefly say this is the first time, then show the overview + Q1.

**If it exists:** Read the last 10 entries. If you see patterns from previous runs, mention them briefly before the overview.

## Handling edge cases

- **Very short input** (fewer than ~10 words, e.g., "pricing"): Ask ONE clarifying question before proceeding.
- **Personal decisions** (e.g., "should I go to grad school"): Adapt interview options and assumption dimensions to personal context (see Step 1 notes).
- **Trivial decisions**: Mention it's a quick call, offer to proceed anyway or skip.

## Rendering rules — hybrid approach

Use **hybrid rendering** to create visual rhythm: structure/data in code blocks, insights/commentary in markdown.

- **Code blocks**: box headers, progress indicators, option lists, data tables (Hidden Assumptions, Questions)
- **Markdown** (outside code blocks): analysis text, "Why this is sharper", short insights — keep to 1-2 sentences max
- **`diff` blocks**: original vs reframed comparison (`-` red = old thinking, `+` green = new thinking)
- **Blockquotes** (`>`): "What you didn't see", Sharpened Prompt — creates breathing room
- **Bold/italic**: key phrases in markdown sections

This creates rhythm: dense data → breathing room → dense data → insight. Never put everything in one giant code block.

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

After the interview, analyze the problem using interview signals to find 3-4 hidden assumptions. Check across these dimensions (at least one from each):

- **Value**: Is this actually valuable to someone?
- **Feasibility**: Can this realistically be done?
- **Viability**: Does the economics work?
- **Capacity**: Can the team/org actually handle this?

For personal decisions, adapt: Personal growth / Financial impact / Opportunity cost / Readiness.

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

Within the chosen pattern, use the strategy that fits the signal combination:
- nature=on_fire → **Diagnose Root Cause** (separate immediate response from structural fix)
- nature=no_answer + mostly doubtful → **Challenge Existence** (the problem may not need solving)
- nature=needs_analysis + mostly confident → **Narrow Scope** (find the smallest experiment)
- goal=competing → **Redirect Angle** (look through a different stakeholder's eyes)
- Otherwise → **Redirect Angle** (find the perspective shift)

See `references/reframing-strategies.md` for strategy details and examples.

#### Step 3c: Strategic thinking frame (mental checklist before reframing)

1. What does the person who assigned this REALLY want? (surface goal ≠ actual goal)
2. What happens if we do nothing for 6 months? (urgency signal)
3. What is this problem deliberately NOT addressing that might matter?
4. Is this a technical problem, organizational problem, political problem, or timing problem?
5. Scope check: the reframed question should be equal or broader in scope than the original.

The **hidden questions** CAN point to focused experiments or first steps.

**Output — hybrid rendering with `---` act separators. Translate ALL section labels and content to user's language. UI chrome stays the same.**

The output has 4 acts separated by `---`: Answer → Shift → Evidence → Punch.

**Act 1: The Answer**

```
  ╭──────────────────────────────────────────╮
  │  Overture · Reframe                      │
  │  ● Interview  ● Assumptions  ● Reframe   │
  ╰──────────────────────────────────────────╯
```

> **✦ Sharpened Prompt**
>
> *"[reframed question with constraints and context baked in]"*

---

**Act 2: The Shift**

```diff
- [You asked:] "[original problem]"
+ [The real question:] "[reframed question]"
```

**[Why this is sharper:]** [1-2 sentences explaining the shift. What changes in how you'd approach this.]

---

**Act 3: The Evidence** (grouped in one code block — reference material, lower visual weight)

```
  ■ [Hidden Assumptions]

    1  ✓  [assumption]
    2  ✗  [assumption]
    3  ?  [assumption]
    4  ✗  [assumption]

  ──────────────────────────────────────────

  ■ [Hidden Questions]

    1 · [question] — [why this matters for execution]
    2 · [question] — [why]

  ──────────────────────────────────────────

  ■ [AI Limitations]

    · [specific limitation]
    · [specific limitation]
```

---

**Act 4: The Punch**

> **What you didn't see**
> *[One sentence: the core blind spot. What the user was optimizing for vs what actually matters.]*

```
  ■ Context Contract — /reframe

    reframed_question: [the reframed question]
    assumption_pattern: [confirmed | mixed | mostly_doubtful]
    strategy: [challenge_existence | narrow_scope | diagnose_root | redirect_angle]
    interview_signals: nature=[X] goal=[X] stakes=[X]

    assumptions_doubtful:
      - [assumption] | reason: [user's reason if given]
    assumptions_uncertain:
      - [assumption] | reason: [user's reason if given]
    assumptions_confirmed:
      - [assumption]

    ai_limitations:
      - [specific limitation]

    hidden_questions:
      - [question]

  Next: /recast to design an execution plan
        /rehearse to stress-test with stakeholders
```

**Keep these in English always:** `Overture · Reframe`, `Sharpened Prompt`, `Context Contract`, progress dots (● ○), all symbols (■ ▸ ✓ ✗ ? ·), all field names in the contract.
**Translate to user's language:** section labels (Hidden Assumptions, etc.), all content, option text. Contract field VALUES are in user's language.

### "What you didn't see" — Overture's signature

**Rules for this line:**
- It must be specific to THIS problem, not generic
- It must be uncomfortable — if the user nods and says "yeah I knew that," you failed
- It captures the DELTA: "You were thinking about X, but the real issue is Y"
- It should be the kind of thing a smart mentor would say after listening carefully

**Good examples:**
- "You were solving a technology problem, but this is a people problem."
- "You're optimizing for the stakeholder who'll say yes, not the one who'll block you."
- "The question isn't whether to do this — it's whether now is the right time."

**Bad examples:**
- "There are risks to consider." (too vague)
- "This is a complex problem." (says nothing)
- "You should think more carefully." (patronizing)

## Rules

- Never start with "Great question!" or any form of flattery. Go straight to the overview, then the first interview question.
- The reframed question MUST be meaningfully different from the original. If you can't find a sharper angle, you haven't looked hard enough.
- Uncomfortable assumptions are the most important ones. Find what the user doesn't want to hear.
- The Sharpened Prompt must be immediately usable — copy, paste, get a better answer.
- For AI limitations: be specific. Not "AI can't predict the future" but "AI has no access to your internal team dynamics or adoption history."
- **Keep the visual formatting consistent.** Always use the box header with progress dots, section headers with ■, options with `number · text`, and ▸ for key highlights.

**Self-check before outputting:** Did the reframed question actually challenge the user's thinking, or did it just polish their original question? If you removed the labels and showed someone both questions, would they immediately see the difference?

## Learning journal

After completing, append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):

```
## [date] /reframe
- Original: "[original question]"
- Reframed: "[new question]"
- Interview: nature=[answer] goal=[answer] stakes=[answer]
- Pattern: [confirmed | mixed | mostly_doubtful]
- Strategy: [challenge_existence | narrow_scope | diagnose_root | redirect_angle]
- Assumptions: [N] confident, [N] uncertain, [N] doubtful
```

Read only the **last 10 entries** at the start of future runs. If the journal exceeds 50 entries, mention to the user that they can archive older ones.
