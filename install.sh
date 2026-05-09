#!/usr/bin/env bash
set -euo pipefail

# pk installer — installs Git, Bun, and pk CLI
# Usage: curl -fsSL https://justestif.github.io/pk/install.sh | bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}!${RESET} $*"; }
error()   { echo -e "${RED}✗${RESET} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── OS detection ──────────────────────────────────────────────────────────────

OS="$(uname -s)"
case "$OS" in
  Linux)  PLATFORM="linux" ;;
  Darwin) PLATFORM="mac" ;;
  *)      die "Unsupported OS: $OS. On Windows, run this inside WSL." ;;
esac

info "pk installer"
echo "Platform: $PLATFORM"
echo ""

# ── Git ───────────────────────────────────────────────────────────────────────

if command -v git &>/dev/null; then
  success "Git $(git --version | awk '{print $3}') already installed"
else
  info "Installing Git..."
  if [[ "$PLATFORM" == "mac" ]]; then
    if command -v brew &>/dev/null; then
      brew install git
    else
      die "Git not found. Install Xcode Command Line Tools: xcode-select --install"
    fi
  else
    if command -v apt-get &>/dev/null; then
      sudo apt-get update -q && sudo apt-get install -y git
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y git
    elif command -v pacman &>/dev/null; then
      sudo pacman -S --noconfirm git
    else
      die "Could not install Git automatically. Install it manually: https://git-scm.com/downloads"
    fi
  fi
  success "Git installed"
fi

# ── Bun ───────────────────────────────────────────────────────────────────────

if command -v bun &>/dev/null; then
  success "Bun $(bun --version) already installed"
else
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  # Add to current session
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  success "Bun installed"
  warn "Add Bun to your PATH permanently by adding this to your shell profile:"
  echo "  export BUN_INSTALL=\"\$HOME/.bun\""
  echo "  export PATH=\"\$BUN_INSTALL/bin:\$PATH\""
  echo ""
fi

# ── pk ────────────────────────────────────────────────────────────────────────

if command -v pk &>/dev/null; then
  success "pk $(pk --version 2>/dev/null || echo '') already installed"
else
  info "Installing pk..."
  bun install -g @justestif/pk
  success "pk installed"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
success "All done! Run ${BOLD}pk init${RESET} inside any project to get started."
