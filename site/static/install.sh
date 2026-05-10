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
  Darwin) PLATFORM="macOS" ;;
  Linux)  PLATFORM="Linux" ;;
  *)      die "Unsupported OS: $OS. pk installer supports macOS and Linux." ;;
esac

info "pk installer"
echo "Platform: $PLATFORM"
echo ""

# ── Git ───────────────────────────────────────────────────────────────────────

if command -v git &>/dev/null; then
  success "Git already installed ($(git --version))"
else
  info "Installing Git..."
  case "$PLATFORM" in
    macOS)
      warn "Git not found. macOS will prompt you to install Xcode Command Line Tools."
      xcode-select --install || true
      echo "After installation completes, rerun this installer."
      exit 0
      ;;
    Linux)
      if command -v apt-get &>/dev/null; then
        sudo apt-get update
        sudo apt-get install -y git
      elif command -v dnf &>/dev/null; then
        sudo dnf install -y git
      elif command -v yum &>/dev/null; then
        sudo yum install -y git
      elif command -v pacman &>/dev/null; then
        sudo pacman -Sy --noconfirm git
      else
        die "Could not find a supported package manager. Install Git manually: https://git-scm.com"
      fi
      ;;
  esac
  success "Git installed"
fi

# ── Bun ───────────────────────────────────────────────────────────────────────

if command -v bun &>/dev/null; then
  success "Bun already installed ($(bun --version))"
else
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash

  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"

  if ! command -v bun &>/dev/null; then
    die "Bun installed but is not on PATH. Open a new terminal or add $BUN_INSTALL/bin to PATH, then rerun."
  fi
  success "Bun installed ($(bun --version))"
fi

# ── pk ────────────────────────────────────────────────────────────────────────

if command -v pk &>/dev/null; then
  success "pk already installed ($(pk --version))"
else
  info "Installing pk..."
  bun install -g @justestif/pk
  success "pk installed ($(pk --version))"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
success "All done! Run ${BOLD}pk init${RESET} inside any project to get started."
