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

  ╭──────────────────────────────────────────╮
  │                                          │
  │           O V E R T U R E                │
  │                                          │
  │       Decision Harness for AI            │
  │                                          │
  │  AI gives generic answers when you ask   │
  │  generic questions. Overture sharpens    │
  │  your thinking before you ask.           │
  │                                          │
  ╰──────────────────────────────────────────╯

  ✓ Installed

  Restart Claude Code, then try:

    /reframe "your problem here"

  Or run the full pipeline:

    /overture "important decision"

  Type /overture-help for all commands.

WELCOME
