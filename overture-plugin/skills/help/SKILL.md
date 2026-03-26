---
name: overture-help
description: "Show available Overture skills and how to use them. Use when the user asks about Overture, asks for help, or seems unsure which skill to use."
---

**Always respond in the same language the user uses.**

When invoked, display:

```
# Overture — Decision Harness for AI

Sharpen your thinking before asking AI to execute.

## Available skills

  /reframe [problem]     Find hidden assumptions, get a sharper question
                         Example: /reframe "We need to hire a VP of Engineering"

  /orchestrate [goal]    Design who does what (AI vs human) with checkpoints
                         Example: /orchestrate (uses /reframe result if available)

  /rehearse [plan]       Stress-test with simulated stakeholders
                         Example: /rehearse (uses /orchestrate result if available)

  /refine               Fix issues from rehearsal, re-test until converged
                         Example: /refine (uses /rehearse result)

  /overture [problem]    Full pipeline: all of the above + quality score
                         Example: /overture "Series A fundraising strategy"

## How to use

Quick analysis:    /reframe "your problem here"
Deep analysis:     /reframe → /orchestrate → /rehearse → /refine
Full auto:         /overture "your problem here"

Each skill works alone. Chain them for deeper thinking.

## What you get

- Sharpened Prompt: a better question to paste into AI
- Thinking Summary: share with your team (Slack-ready)
- Agent Harness: instruction doc for AI agents (CLAUDE.md-compatible)
```
