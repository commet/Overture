#!/bin/bash
set -e

echo ""
echo "  Installing Overture — Decision Harness for AI"
echo ""

TEMP_DIR=$(mktemp -d)
REPO="https://github.com/commet/Overture.git"

# Clone
git clone --depth 1 --quiet "$REPO" "$TEMP_DIR" 2>/dev/null

# Install skills
mkdir -p ~/.claude/skills ~/.claude/agents
cp -r "$TEMP_DIR/overture-plugin/skills/"* ~/.claude/skills/
cp -r "$TEMP_DIR/overture-plugin/agents/"* ~/.claude/agents/

# Cleanup
rm -rf "$TEMP_DIR"

echo "  ✓ Installed to ~/.claude/skills/"
echo ""
echo "  Restart Claude Code, then try:"
echo ""
echo "    /reframe \"your problem here\""
echo ""
