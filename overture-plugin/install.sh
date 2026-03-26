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

    ___   _  _  ___  ___  _____  _   _  ___  ___
   / _ \ | || || __|| _ \|_   _|| | | || _ \| __|
  | (_) || __ || _| |   /  | |  | |_| ||   /| _|
   \___/ |_||_||___||_|_\  |_|   \___/ |_|_\|___|

            Decision Harness for AI

  ─────────────────────────────────────────────

  AI gives generic answers when you ask generic
  questions. Overture sharpens your thinking
  before you ask.

  ✓ Installed to ~/.claude/skills/

  Restart Claude Code, then:

    /reframe "your problem here"
    /overture "important decision"
    /overture-help for all commands

WELCOME
