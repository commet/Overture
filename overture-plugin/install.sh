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

 ─────────────────────────────────────────────────────────────────────

  ✓ Installed

    /reframe "your problem here"       sharpen your question
    /overture "important decision"      full pipeline
    /overture-help                      all commands

  Restart Claude Code to start.

WELCOME
