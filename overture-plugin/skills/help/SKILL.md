---
name: overture-help
description: "Show available Overture skills and how to use them. Use when the user asks about Overture, asks for help, or seems unsure which skill to use."
allowed-tools: Read
---

**Always respond in the same language the user uses.**

Display using hybrid rendering — description in markdown, commands in code blocks:

**Overture — Decision Harness for AI**

AI gives generic answers when you ask generic questions. Overture sharpens your thinking before you ask — whether you're building a product or making a strategic decision.

---

**Quick start** — same commands, auto-adapts to what you're doing:

```
  /reframe "expand into SEA"        → strategy mode (decide)
  /reframe "할 일 관리 앱"            → product mode (build)

  The framework detects your context and adapts:
  interview questions, assumptions, personas, output format.
```

```
  The 4R Framework:

  /reframe       Find hidden assumptions, sharpen your question
  /recast        Design execution plan (decide) or product spec (build)
  /rehearse      Stress-test with stakeholders or user personas
  /refine        Fix issues, iterate until solid
  /overture      Full pipeline — all 4 stages + score + deliverables

  /reframe → /recast → /rehearse → /refine
  Each step works independently, or chain them. /overture runs all.

  Utility:

  /overture:setup       Verify installation, detect issues
  /overture:doctor      Diagnose problems in detail
  /overture:configure   Set language, presets, journal
  /overture:patterns    Analyze your thinking patterns
```

**Context-adaptive output:**

Building something? → Implementation Prompt (paste into Cursor/Claude Code) + Product Brief
Making a decision? → Sharpened Prompt + Thinking Summary + Agent Harness

\+ Decision Quality score (0-100) on every `/overture` run
