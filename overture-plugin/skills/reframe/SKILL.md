---
name: reframe
description: "Sharpen your question before asking AI. Finds hidden assumptions in your problem and reframes it so you get breakthrough answers instead of generic ones. Use when AI gives predictable answers, when starting a strategic decision, or when something feels off about a problem."
argument-hint: "[problem or question to reframe]"
---

Most strategic failures start with the wrong question, not the wrong answer. Your job is to find the hidden assumptions in the user's problem and reframe it into a sharper question.

**Always respond in the same language the user uses.** If the input is in Korean, all output — including headers and labels — should be in Korean.

## Before starting

Check if `.overture/journal.md` exists in the project root.

**If it does NOT exist (first use):** Before the analysis, say:

> First time using Overture! I'll find the hidden assumptions behind your problem and reframe it into a sharper question. Takes about 30 seconds.

Then proceed normally.

**If it exists:** Read the last 10 entries. If you see patterns from previous runs (e.g., "user often has capacity assumptions"), mention it briefly.

## If no argument is provided

If the user just types `/reframe` without a problem, ask:

> What problem or decision are you thinking about?

Wait for their response, then proceed.

## What you do

1. Take the user's problem as stated
2. Find 3-4 hidden assumptions it depends on (across different dimensions)
3. Treat all assumptions as "uncertain" by default and reframe immediately
4. Deliver a sharpened prompt they can immediately use
5. THEN offer: "Want to evaluate these assumptions yourself? Your input will sharpen the reframe further."

**Default is fast.** Most users want the result, not the process. Interactive evaluation is opt-in, not mandatory.

## Handling edge cases

- **Very short input** (fewer than ~10 words, e.g., "pricing"): Ask ONE clarifying question: "Pricing for what? Give me one more sentence of context and I'll find the hidden assumptions."
- **Personal decisions** (e.g., "should I go to grad school"): The framework still works, but adapt the language. Use personal dimensions (personal growth, financial impact, opportunity cost, readiness) instead of organizational ones (value, feasibility, viability, capacity). Stakeholders become personal advisors (mentor, partner, friend).
- **Trivial decisions**: If the input is clearly low-stakes, say: "This seems like a quick call. I can still find hidden assumptions if you want — or just go with your gut."

## Finding hidden assumptions

Look for assumptions the problem DEPENDS ON to be meaningful. Check across these dimensions — at least one from each:

- **Value**: Is this actually valuable to someone?
- **Feasibility**: Can this realistically be done?
- **Viability**: Does the economics work?
- **Capacity**: Can the team/org actually handle this?

For each assumption, state:
- What the assumption is (one clear sentence)
- What happens if it's wrong (specific risk, not vague worry)

**Example:**

Problem: "We need to expand into Southeast Asia"

Assumptions found:
1. **Southeast Asia is our best next market** (Value) — If wrong: we burn 6 months on a suboptimal market while competitors take better ones
2. **We have the operational capacity for international expansion** (Capacity) — If wrong: we stretch the team thin and quality drops domestically
3. **The regulatory environment allows our business model** (Feasibility) — If wrong: we need a completely different go-to-market, adding 3-6 months
4. **Unit economics work at SEA price points** (Viability) — If wrong: we grow revenue but lose money on every transaction

## User evaluation (default-and-override)

After the initial reframe, **pre-fill your own assessment** of each assumption and present it for quick correction:

```
내 판단:                             My read:
1. ✓ [assumption]                    ✓ = likely true
2. ? [assumption]                    ? = uncertain
3. ? [assumption]                    ✗ = likely wrong
4. ✗ [assumption]

고치려면 번호만: "2✗ 4✓"             Fix: "2✗ 4✓"
맞으면 엔터                          Enter if correct
```

**How to pre-fill well:** Look for signals in the user's input.
- "We need to..." (directive) → ✓ on direction, ? on execution
- "I'm not sure if..." → ?
- "We've already validated..." → ✓
- Minimal context → ? for all (but still pre-fill, don't leave blank)

**Correction format — accept ANYTHING:**
- `2✗ 4✓` → changes 2 to doubtful, 4 to confident
- `2x 4y` → same (x=doubtful, y=confident)
- "2번은 아닌 것 같고 4번은 확실해" → same
- `Enter` → accept all as-is

**After the user confirms or corrects → immediately re-reframe.** The evaluation changes the reframing strategy, so the reframed question and sharpened prompt MUST update. Show the updated result, then offer next steps.

## Reframing strategy

Based on the evaluation pattern:

**Mostly confident** → Sharpen the execution angle. The direction is right — make the question more precise. "Should we expand?" becomes "What's the fastest path to PMF in our first international market?"

**Mixed** → Keep the direction, shift the angle. Incorporate the uncertain assumptions as constraints. "Expand into SEA" becomes "Given that our ops capacity is uncertain and pricing may not work, what's the minimum viable experiment to test international readiness?"

**Mostly doubtful** → Question the premise. Maybe this isn't the right problem at all. "Expand into SEA" becomes "Is international expansion the right move right now, or is there a higher-leverage growth path we're not seeing?"

Before reframing, mentally check:
- What does the person who assigned this REALLY want?
- What happens if we do nothing for 6 months?
- What is this problem deliberately NOT addressing that might matter?
- Is this a technical problem, an organizational problem, a political problem, or a timing problem?

The **reframed question** should be equal or broader in scope than the original. However, the **hidden questions** CAN point to focused experiments or first steps — that's how "narrow scope" strategy works. The main question stays broad; the action items can be specific.

Refer to `references/reframing-strategies.md` for detailed strategy guides.

## Output

**Lead with the sharpened prompt** — the most actionable item goes first.

```
**Sharpened prompt** — paste this into your next AI conversation:

> [reframed question with key constraints and context baked in]

---

## Your real question

**You asked:** [original problem as stated]

**The sharper question:**
> [reframed question]

**Why this is better:** [1-2 sentences]

**Hidden assumptions:**
1. [assumption] → If wrong: [specific risk]
2. ...

**Questions to answer first:**
1. [question] — [why]
2. [question] — [why]

**What AI can't help with here:**
- [specific limitation — e.g., "no access to your internal team dynamics or budget constraints"]
```

After the output, present the pre-filled assumption assessment for correction. Then:

1. **User confirms or corrects** → Re-select reframing strategy based on updated confidence levels
2. **Re-reframe** → Generate a NEW reframed question and sharpened prompt reflecting the user's input
3. **Show the updated result**
4. **Then offer**: *"이 방향으로 실행 설계를 해볼까요? (/orchestrate)"*

(In English: *"Want to design an execution plan for this? (/orchestrate)"*)

**The evaluation is NOT the last step — the re-reframe is.** The user should always see how their input changed the analysis.

## Rules

- Never start with "Great question!" or any form of flattery. Go straight to the assumptions.
- The reframed question MUST be meaningfully different from the original. If you can't find a sharper angle, you haven't looked hard enough.
- Uncomfortable assumptions are the most important ones. Find what the user doesn't want to hear.
- The "Sharpened prompt" at the end should be immediately usable — copy, paste, get a better answer.
- For AI limitations: be specific. Not "AI can't predict the future" but "AI has no access to your internal team capacity data or organizational politics."

**Self-check before outputting:** Did the reframed question actually challenge the user's thinking, or did it just polish their original question? If you removed the labels and showed someone both questions, would they immediately see the difference?

## Learning journal

After completing, append to `.overture/journal.md` in the project root (directory with `.git`, or current working directory):

```
## [date] /reframe
- Original: "[original question]"
- Reframed: "[new question]"
- Strategy: [which pattern] | Uncertain assumptions: [N]
```

Read only the **last 10 entries** at the start of future runs. If the journal exceeds 50 entries, mention to the user that they can archive older ones. If you see patterns ("user always has capacity assumptions"), mention it.
