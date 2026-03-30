---
name: overture-setup
description: "Set up Overture — validate installation, detect platform, verify all skills and agents are in place. Use when first installing Overture, after updates, or when something isn't working."
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
---

## When to use

- ✓ First time installing Overture
- ✓ After updating Overture to a new version
- ✓ When a skill isn't being recognized
- ✓ When you want to verify everything is properly installed
- ✗ When you want to change settings (use /overture:configure)
- ✗ When diagnosing a specific issue (use /overture:doctor)

**Always respond in the same language the user uses.**

**No box drawing.** Do NOT use `╭╮╰╯`, `┌│└`, `═══╪`, `───┼`, `━━━`, or any Unicode box characters. Use `---`, `**bold**`, and whitespace for structure.

## Setup Flow

### Step 0: Detect environment

Detect the user's platform and shell:

```
Platform: [win32 / darwin / linux]
Shell: [bash / zsh / powershell / cmd]
Claude Code version: [from conversation context]
```

### Step 1: Check for ghost installations

Look for Overture files in multiple possible locations:

1. `~/.claude/skills/` — standard install location
2. `~/.claude/agents/` — agent location
3. Current project's `.claude/skills/` — project-level install
4. Check if multiple copies exist (ghost installs)

If ghost installations found:

> ⚠ Found Overture installed in multiple locations:
> - ~/.claude/skills/ (global)
> - ./.claude/skills/ (project)
>
> This can cause conflicts. Want me to clean up and keep only [recommended location]?

### Step 2: Verify core skills

Check each required skill file exists and is readable:

**Overture · Setup**

Checking installation...

**Skills:**
- ✓ /reframe — `~/.claude/skills/reframe/SKILL.md`
- ✓ /recast — `~/.claude/skills/recast/SKILL.md`
- ✓ /rehearse — `~/.claude/skills/rehearse/SKILL.md`
- ✓ /refine — `~/.claude/skills/refine/SKILL.md`
- ✓ /overture — `~/.claude/skills/overture/SKILL.md`
- ✓ /overture-help — `~/.claude/skills/help/SKILL.md`
- ✓ /overture:setup — `~/.claude/skills/setup/SKILL.md`
- ✓ /overture:doctor — `~/.claude/skills/doctor/SKILL.md`
- ✓ /overture:configure — `~/.claude/skills/configure/SKILL.md`
- ✓ /overture:patterns — `~/.claude/skills/patterns/SKILL.md`

**Agents:**
- ✓ devils-advocate — `~/.claude/agents/devils-advocate.md`

**Data:**
- [✓/✗] .overture/ directory
- [✓/✗] .overture/journal.md

Use `✓` for found, `✗` for missing, `⚠` for found but possibly outdated.

### Step 3: Create data directory

If `.overture/` doesn't exist in the project root, create it:

```bash
mkdir -p .overture
```

### Step 4: Verify write permissions

Test that the journal and output files can be written:

```bash
touch .overture/.setup-test && rm .overture/.setup-test
```

If this fails, report the permission issue.

### Step 5: Install missing components

If any skills or agents are missing, offer to install them:

> Missing components found. Install now?
> - [list of missing items]

For installation, use the same method as `install.sh`:
1. Clone the repo to a temp directory
2. Copy missing skills to `~/.claude/skills/`
3. Copy missing agents to `~/.claude/agents/`
4. Clean up temp directory

### Step 6: Version check

Read the installed `plugin.json` version and compare with the repo version. If outdated:

> ⚠ Overture v0.2.0 installed, v0.3.0 available.
> Run /overture:setup again after updating to get the latest skills.

### Step 7: Summary

**✓ Overture · Ready**

10 skills · 1 agent · journal ready

**Quick start:**
- `/reframe "your problem"` — sharpen your question
- `/overture "your problem"` — full pipeline
- `/overture:configure` — set preferences
- `/overture-help` — all commands

> Restart Claude Code if this is a fresh install.

## Error Recovery

If any step fails, don't stop — continue checking and collect all issues. Present a summary at the end:

```
  Setup completed with warnings:

  ✓ 8/10 skills installed
  ✗ Missing: /overture:configure, /overture:patterns
  ✗ Cannot write to .overture/ — check permissions

  Run /overture:doctor for detailed diagnostics.
```
