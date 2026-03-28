#!/bin/bash
set -e

TEMP_DIR=$(mktemp -d)
REPO="https://github.com/commet/Overture.git"

# Clone quietly
git clone --depth 1 --quiet "$REPO" "$TEMP_DIR" 2>/dev/null

# Install
mkdir -p ~/.claude/skills ~/.claude/agents
cp -r "$TEMP_DIR/overture-plugin/skills/"* ~/.claude/skills/
cp -r "$TEMP_DIR/overture-plugin/agents/"* ~/.claude/agents/

# Cleanup
rm -rf "$TEMP_DIR"

# Welcome
cat << 'WELCOME'

  ██████  ██    ██ ███████ ██████  ████████ ██    ██ ██████  ███████
 ██    ██ ██    ██ ██      ██   ██    ██    ██    ██ ██   ██ ██
 ██    ██ ██    ██ █████   ██████     ██    ██    ██ ██████  █████
 ██    ██  ██  ██  ██      ██   ██    ██    ██    ██ ██   ██ ██
  ██████    ████   ███████ ██   ██    ██     ██████  ██   ██ ███████

  Decision Harness for AI

  Generic questions get generic answers.
  Overture sharpens your thinking before you ask.

 ─────────────────────────────────────────────────────────────────────

  ✓ Installed (v0.3.0)

    Core:
    /reframe "your problem here"       sharpen your question
    /recast "goal or question"         design execution plan
    /rehearse "plan to stress-test"    simulate stakeholders
    /refine "plan with feedback"       iterate until solid
    /overture "important decision"     full pipeline

    Utility:
    /overture:setup                    verify installation
    /overture:doctor                   diagnose issues
    /overture:configure                set preferences
    /overture:patterns                 analyze your thinking patterns
    /overture-help                     all commands

  Restart Claude Code to start.

WELCOME
