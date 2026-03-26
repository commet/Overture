# Overture

**Decision harness for AI.** Sharpen your thinking before asking AI to execute.

Getting generic answers from AI? The problem isn't the AI — it's your question. Overture finds hidden assumptions, stress-tests your plan with simulated stakeholders, and refines until solid.

## Skills

| Command | Time | What it does |
|---------|------|-------------|
| `/reframe` | 30 sec – 2 min | Find hidden assumptions, get a sharper question |
| `/orchestrate` | 2 min | Design who does what (AI vs human) with checkpoints |
| `/rehearse` | 3 min | Stress-test with simulated stakeholders |
| `/refine` | 3-5 min | Fix issues, re-test, repeat until converged |
| `/overture` | 5-10 min | Full pipeline → 3 deliverables + quality score |

Each skill works independently. Chain them for deeper analysis.

## Quick start

```
/reframe "We need to expand into Southeast Asia"
```

Your question changes — and so does every answer you'll get after it.

**Example output:**
```
Sharpened prompt — paste this into your next AI conversation:

> "Given that our ops capacity for international expansion is unvalidated
> and unit economics at SEA price points are uncertain, what's the minimum
> viable experiment to test international readiness within 90 days —
> and what would make us walk away?"

---
You asked: "We need to expand into Southeast Asia"

The sharper question:
> Is Southeast Asia actually our best next market, or are we
> defaulting to it because it's familiar?

Hidden assumptions:
1. SEA is our best next market → If wrong: 6 months on a suboptimal market
2. We can handle international ops → If wrong: domestic quality drops
3. Regulatory environment allows our model → If wrong: 3-6 month delay
4. Unit economics work at SEA prices → If wrong: growth without profit
```

## Full pipeline

```
/overture "Series A fundraising strategy"
```

5-10 minutes later, you get:

1. **Sharpened Prompt** — a better question to paste into your next AI conversation
2. **Thinking Summary** — a Slack-ready summary to share with your team
3. **Agent Harness** — an instruction document for AI agents to execute against (CLAUDE.md-compatible)

Plus a Decision Quality scorecard (0-100) measuring your thinking process.

## Installation

```
/plugin install overture
```

Or from source:
```
/plugin marketplace add commet/Overture
/plugin install overture@Overture
```

## What makes this different

**Anti-sycophancy by design.** AI agrees with you by default. Every Overture skill has "disagree" as a core principle. The rehearsal personas default to "tough." If the feedback is all positive, it runs again harder.

**Unspoken risk detection.** The #1 cause of "everyone saw it coming" failures is risks people know but won't say. Overture's [unspoken] risk category specifically targets the elephant in the room.

**Devil's Advocate agent.** Inspired by Anthropic's harness design research: "Tuning a separate evaluator to be skeptical is more tractable than making a generator critical of its own work." A dedicated sub-agent attacks your plan from 3 angles.

**Decision Quality scoring.** Based on Spetzler's (2016) Decision Quality framework. Measures framing, alternatives, information, perspectives, reasoning, and actionability — the process, not the outcome.

**Learning journal.** Each run appends to `.overture/journal.md`. Over time, Overture learns your patterns and surfaces recurring blind spots.

## Works in any language

Overture responds in whatever language you use. Input in Korean, get output in Korean. Input in English, get output in English.

## Research foundations

Grounded in cognitive science and AI research:
- Spetzler (2016) — Decision Quality framework
- Sharma/Anthropic (2023) — structural sycophancy mitigation
- Dell'Acqua/Harvard-BCG (2023) — structured AI outperforms free-form by 12%
- Du/MIT (2023) — multi-agent debate improves reasoning accuracy by 8 percentage points
- Klein/HBR — premortem improves risk identification by 30%
