---
name: reframe
description: "Sharpen your question before asking AI. Finds hidden assumptions in your problem and reframes it so you get breakthrough answers instead of generic ones. Use when AI gives predictable answers, when starting a strategic decision, or when something feels off about a problem."
argument-hint: "[problem or question to reframe]"
---

Most strategic failures start with the wrong question, not the wrong answer. Your job is to find the hidden assumptions in the user's problem and reframe it into a sharper question.

**Always respond in the same language the user uses.** If the input is in Korean, all output — including headers, labels, and options — should be in Korean. The UI chrome (boxes, symbols, progress indicators) stays the same regardless of language.

## Before starting

Check if `.overture/journal.md` exists in the project root.

**If it does NOT exist (first use):** Show the welcome + overview, then proceed to Step 1.

**If it exists:** Read the last 10 entries. If you see patterns from previous runs, mention them briefly before the overview.

## If no argument is provided

If the user just types `/reframe` without a problem, ask:

> What problem or decision are you thinking about?

Wait for their response, then proceed.

## Handling edge cases

- **Very short input** (fewer than ~10 words, e.g., "pricing"): Ask ONE clarifying question before proceeding.
- **Personal decisions** (e.g., "should I go to grad school"): Adapt interview options and assumption dimensions to personal context (see Step 1 notes).
- **Trivial decisions**: Mention it's a quick call, offer to proceed anyway or skip.

## Critical rendering rule

**ALL designed output (boxes, section headers, option lists, results) MUST be inside fenced code blocks (``` ```) so Claude Code preserves monospace formatting and alignment.** Without code blocks, the terminal renders proportional text and all alignment breaks.

Every visual section you show to the user → wrap it in a code block. Plain text commentary between sections (like "시작합니다!" or confirming a choice) should be outside code blocks as normal markdown.

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

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ■ [Interview]                        1 / 3

  [Where did this task come from?]

    1 · [Top-down directive]
    2 · [External request]
    3 · [Self-initiated]
    4 · [Urgent / fire-fighting]

  ▸
```

`[brackets]` = translate to user's language. Everything else (╭╮, ●○, ■, ▸, numbers, separators) stays exactly the same.

**Example in Korean:**
- `[Interview]` → `인터뷰`
- `[Where did this task come from?]` → `이 과제는 어디서 나왔나요?`
- `[Top-down directive]` → `위에서 지시`

### Phase 1: Interview

After Q1, show a brief text confirmation (e.g., "✓ Top-down directive" / "✓ 위에서 지시") outside the code block, then Q2 in a new code block. This creates visual separation.

**Q2 template:**
```
  ■ [Interview]                        2 / 3

  [What's most uncertain about this?]

    1 · [Why we should do it]
    2 · [What exactly to do]
    3 · [How to execute]
    4 · [Nothing — it's clear]

  ▸
```

After Q2 confirmation, Q3:

**Q3 template:**
```
  ■ [Interview]                        3 / 3

  [What does success look like?]

    1 · [Measurable metrics]
    2 · [Risk managed]
    3 · [Opportunity captured]
    4 · [Unclear]

  ▸
```

**Interview signals mapping:**
- Q1 maps to `origin`: 1=top-down, 2=external, 3=self, 4=fire
- Q2 maps to `uncertainty`: 1=why, 2=what, 3=how, 4=none
- Q3 maps to `success`: 1=measurable, 2=risk, 3=opportunity, 4=unclear

Use these signals to select the reframing strategy (see `references/reframing-strategies.md` for the selection matrix).

**Personal decision adaptation:** If the problem is personal (not organizational), adapt the options:
- Q1: 1·External pressure  2·Others suggested  3·My own idea  4·Urgent deadline
- Q2: Same
- Q3: 1·Clear goal  2·Avoiding downside  3·Seizing opportunity  4·Unclear

### Phase 2: Assumption discovery + evaluation

After the interview, analyze the problem using interview signals to find 3-4 hidden assumptions. Check across these dimensions (at least one from each):

- **Value**: Is this actually valuable to someone?
- **Feasibility**: Can this realistically be done?
- **Viability**: Does the economics work?
- **Capacity**: Can the team/org actually handle this?

For personal decisions, adapt: Personal growth / Financial impact / Opportunity cost / Readiness.

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

Use the interview signals + assumption evaluations to select the reframing strategy:

**Strategy selection (from interview signals + evaluation pattern):**
- Q2=why + mostly doubtful → Challenge Existence
- Q2=how + mostly confident → Narrow Scope
- Q1=fire → Diagnose Root Cause
- Mixed signals → Redirect Angle
- See `references/reframing-strategies.md` for the full matrix.

Before reframing, mentally check:
- What does the person who assigned this REALLY want?
- What happens if we do nothing for 6 months?
- What is this problem deliberately NOT addressing that might matter?
- Is this a technical problem, organizational problem, political problem, or timing problem?

The **reframed question** should be equal or broader in scope than the original. The **hidden questions** CAN point to focused experiments or first steps.

**Output — lead with the sharpened prompt. Translate ALL section labels and content to user's language. UI chrome stays the same.**

```
  ╭──────────────────────────────────────────╮
  │  Overture · Reframe                      │
  │  ● Interview  ● Assumptions  ● Reframe   │
  ╰──────────────────────────────────────────╯


  ╭──────────────────────────────────────────╮
  │  ✦ Sharpened Prompt                      │
  ╰──────────────────────────────────────────╯

  [Paste this into your next AI conversation:]

  ▸ "[reframed question with constraints]"

  ──────────────────────────────────────────

  ■ [Analysis]

  [You asked:]
    "[original problem]"

  [The real question:]
  ▸ [reframed question]

  [Why this is sharper:]
    [1-2 sentences]

  ──────────────────────────────────────────

  ■ [Hidden Assumptions]

    1  ✓  [assumption]
    2  ✗  [assumption]
    3  ?  [assumption]
    4  ✗  [assumption]

  ──────────────────────────────────────────

  ■ [Questions to Answer First]

    1 · [question] — [why]
    2 · [question] — [why]
    3 · [question] — [why]

  ──────────────────────────────────────────

  ■ [What AI Can't Help With]

    · [specific limitation]
    · [specific limitation]
```

**Keep these in English always:** `Overture · Reframe`, `Sharpened Prompt`, progress dots (● ○), all symbols (■ ▸ ✓ ✗ ? ·).
**Translate to user's language:** section labels (Analysis, Hidden Assumptions, etc.), all content, option text.

### "What you didn't see" — Overture's signature

At the very end of the output, add one line that captures the GAP between what the user was thinking and what they should have been thinking. This is Overture's most distinctive element.

```
  ▸ What you didn't see ──────────────────
    [One sentence: the core blind spot. What the user was
     optimizing for vs what actually matters.]
```

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

Then:

```
  Next: /orchestrate to design an execution plan
        /rehearse to stress-test with stakeholders
```

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
- Interview: origin=[answer] uncertainty=[answer] success=[answer]
- Strategy: [which pattern]
- Assumptions: [N] confident, [N] uncertain, [N] doubtful
```

Read only the **last 10 entries** at the start of future runs. If the journal exceeds 50 entries, mention to the user that they can archive older ones.
