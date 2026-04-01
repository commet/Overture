#!/bin/bash
# Overture installer — installs skills, agents, and statusline to Claude Code
# Usage: curl -fsSL https://raw.githubusercontent.com/commet/Overture/main/overture-plugin/install.sh | bash

set -e

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${DIM}  $1${NC}"; }
ok()    { echo -e "${GREEN}  ✓${NC} $1"; }
warn()  { echo -e "${YELLOW}  !${NC} $1"; }
fail()  { echo -e "${RED}  ✗${NC} $1"; }

# ── Platform detection ──
CLAUDE_DIR="$HOME/.claude"
if [ ! -d "$CLAUDE_DIR" ]; then
  # Try Windows-style paths (Git Bash / WSL)
  if [ -d "$USERPROFILE/.claude" ]; then
    CLAUDE_DIR="$USERPROFILE/.claude"
  else
    fail "Claude Code directory not found."
    echo "  Install Claude Code first: https://claude.ai/code"
    exit 1
  fi
fi

# ── Version check ──
CURRENT_VERSION=""
if [ -f "$CLAUDE_DIR/skills/overture/SKILL.md" ]; then
  CURRENT_VERSION=$(head -10 "$CLAUDE_DIR/skills/overture/SKILL.md" | grep -o 'version:.*' | head -1 || echo "")
fi

echo ""
echo -e "${BOLD}  Overture${NC} — structured thinking for decisions and plans"
echo ""

if [ -n "$CURRENT_VERSION" ]; then
  info "Existing installation detected. Updating..."
else
  info "Installing..."
fi

# ── Clone ──
TEMP_DIR=$(mktemp -d)
REPO="https://github.com/commet/Overture.git"

info "Downloading latest version..."
if ! git clone --depth 1 --quiet "$REPO" "$TEMP_DIR" 2>/dev/null; then
  fail "Failed to download. Check your internet connection."
  rm -rf "$TEMP_DIR"
  exit 1
fi

# ── Verify contents ──
if [ ! -f "$TEMP_DIR/overture-plugin/skills/overture/SKILL.md" ]; then
  fail "Downloaded package is incomplete. Try again."
  rm -rf "$TEMP_DIR"
  exit 1
fi

# ── Install skills ──
mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/agents"

SKILL_COUNT=0
for skill_dir in "$TEMP_DIR/overture-plugin/skills/"*/; do
  skill_name=$(basename "$skill_dir")
  cp -r "$skill_dir" "$CLAUDE_DIR/skills/$skill_name"
  SKILL_COUNT=$((SKILL_COUNT + 1))
done
ok "$SKILL_COUNT skills installed"

# ── Install agents ──
AGENT_COUNT=0
for agent_file in "$TEMP_DIR/overture-plugin/agents/"*.md; do
  [ -f "$agent_file" ] || continue
  cp "$agent_file" "$CLAUDE_DIR/agents/"
  AGENT_COUNT=$((AGENT_COUNT + 1))
done
ok "$AGENT_COUNT agents installed"

# ── Install statusline (optional) ──
if [ -f "$TEMP_DIR/overture-plugin/statusline/index.js" ]; then
  mkdir -p "$CLAUDE_DIR/statusline"
  cp "$TEMP_DIR/overture-plugin/statusline/index.js" "$CLAUDE_DIR/statusline/overture.js"
  ok "Statusline installed"
fi

# ── Create data directory ──
mkdir -p .overture
ok "Data directory ready (.overture/)"

# ── Cleanup ──
rm -rf "$TEMP_DIR"

# ── Verify ──
ERRORS=0
for required in overture reframe recast rehearse refine; do
  if [ ! -f "$CLAUDE_DIR/skills/$required/SKILL.md" ]; then
    fail "Missing: $required"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  Installed successfully (v0.4.0)${NC}"
  echo ""
  echo "  Restart Claude Code, then try:"
  echo ""
  echo -e "    ${BOLD}/overture${NC} \"기획안 써야 하는데 막막해\""
  echo ""
  echo -e "  ${DIM}30초 안에 초안이 나옵니다.${NC}"
  echo -e "  ${DIM}질문 2-3개에 답하면 바로 제출 가능한 문서가 완성됩니다.${NC}"
  echo ""
  echo -e "  ${DIM}더 알아보기: /overture:help${NC}"
else
  fail "Installation incomplete. Run /overture:doctor for diagnostics."
fi

echo ""
