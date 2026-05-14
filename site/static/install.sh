#!/usr/bin/env bash
set -euo pipefail

# pk installer — installs Git, Bun, and pk CLI
# Usage: curl -fsSL https://justestif.github.io/pk/install.sh | bash

# ── Colours ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

TOTAL_STEPS=4
# Parse flags
NON_INTERACTIVE=false
for arg in "$@"; do
  [[ "$arg" == "--non-interactive" ]] && NON_INTERACTIVE=true
done
step=0

step() {
  step=$((step + 1))
  echo ""
  echo -e "${CYAN}[${step}/${TOTAL_STEPS}]${RESET} ${BOLD}$*${RESET}"
}
ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
skip() { echo -e "  ${DIM}–${RESET} $*"; }
warn() { echo -e "  ${YELLOW}!${RESET} $*"; }
die()  { echo -e "\n  ${RED}✗${RESET} $*" >&2; echo -e "  ${DIM}Log: ${LOG}${RESET}" >&2; exit 1; }

# ── Log file ──────────────────────────────────────────────────────────────────

LOG="$(mktemp /tmp/pk-install.XXXXXX.log)"
# Redirect all sub-installer noise to log; keep our own output clean
exec 3>&1          # save original stdout
run() { "$@" >>"$LOG" 2>&1 || { echo -e "\n  ${RED}✗${RESET} Command failed: $*" >&2; die "See log for details."; }; }

# ── OS detection ──────────────────────────────────────────────────────────────

OS="$(uname -s)"
case "$OS" in
  Darwin) PLATFORM="macOS" ;;
  Linux)  PLATFORM="Linux" ;;
  *)      die "Unsupported OS: $OS. pk supports macOS and Linux." ;;
esac

echo ""
echo -e "${BOLD}pk installer${RESET}  ${DIM}(${PLATFORM})${RESET}"
echo -e "${DIM}Log: ${LOG}${RESET}"

# ── Step 1: Git ───────────────────────────────────────────────────────────────

step "Git"

if command -v git &>/dev/null; then
  skip "already installed — $(git --version)"
else
  case "$PLATFORM" in
    macOS)
      warn "Git not found. Installing Xcode Command Line Tools..."
      warn "A system dialog may appear — click Install, then rerun this script."
      xcode-select --install 2>/dev/null || true
      # Wait for the install to finish (xcode-select --install is async)
      until command -v git &>/dev/null; do
        sleep 5
        echo -ne "  ${DIM}waiting...${RESET}\r"
      done
      ok "Git installed — $(git --version)"
      ;;
    Linux)
      if command -v apt-get &>/dev/null; then
        run sudo apt-get update -q
        run sudo apt-get install -y git
      elif command -v dnf &>/dev/null; then
        run sudo dnf install -y git
      elif command -v yum &>/dev/null; then
        run sudo yum install -y git
      elif command -v pacman &>/dev/null; then
        run sudo pacman -Sy --noconfirm git
      else
        die "No supported package manager found. Install Git manually: https://git-scm.com"
      fi
      ok "Git installed — $(git --version)"
      ;;
  esac
fi

# ── Step 2: Bun ───────────────────────────────────────────────────────────────

step "Bun"

if command -v bun &>/dev/null; then
  skip "already installed — bun $(bun --version)"
else
  run curl -fsSL https://bun.sh/install | bash

  # Source into current session
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"

  if ! command -v bun &>/dev/null; then
    die "Bun installed but not found on PATH. Try opening a new terminal and running: bun install -g @justestif/pk"
  fi
  ok "Bun installed — bun $(bun --version)"

  # Persist to shell config
  SHELL_NAME="$(basename "${SHELL:-bash}")"
  case "$SHELL_NAME" in
    zsh)   SHELL_RC="$HOME/.zshrc" ;;
    fish)  SHELL_RC="$HOME/.config/fish/config.fish" ;;
    *)     SHELL_RC="$HOME/.bashrc" ;;
  esac

  BUN_LINE='export PATH="$HOME/.bun/bin:$PATH"'
  if [[ "$SHELL_NAME" == "fish" ]]; then
    BUN_LINE='fish_add_path $HOME/.bun/bin'
  fi

  if ! grep -qF '.bun/bin' "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Added by pk installer" >> "$SHELL_RC"
    echo "$BUN_LINE" >> "$SHELL_RC"
    ok "Added Bun to ${SHELL_RC}"
  else
    skip "Bun PATH already in ${SHELL_RC}"
  fi
fi

# ── Step 3: pk ────────────────────────────────────────────────────────────────

step "pk"

INSTALLED_VERSION=""
if command -v pk &>/dev/null; then
  INSTALLED_VERSION="$(pk --version 2>/dev/null || true)"
fi

LATEST_VERSION="$(curl -fsSL https://registry.npmjs.org/@justestif/pk/latest 2>/dev/null | grep '"version"' | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/' || true)"

if [[ -n "$INSTALLED_VERSION" && "$INSTALLED_VERSION" == "$LATEST_VERSION" ]]; then
  skip "already up to date — pk ${INSTALLED_VERSION}"
elif [[ -n "$INSTALLED_VERSION" && -n "$LATEST_VERSION" ]]; then
  run bun install -g @justestif/pk
  ok "Updated pk ${INSTALLED_VERSION} → ${LATEST_VERSION}"
else
  run bun install -g @justestif/pk
  ok "pk installed — $(pk --version 2>/dev/null || echo 'installed')"
fi

# ── Step 4: Ollama (semantic search) ────────────────────────────────────────

step "Semantic search (Ollama + nomic-embed-text)"

# ── Install Ollama ────────────────────────────────────────────────────────────
if command -v ollama &>/dev/null; then
  skip "Ollama already installed — $(ollama --version 2>/dev/null || echo 'ok')"
else
  case "$PLATFORM" in
    macOS)
      if ! command -v brew &>/dev/null; then
        echo -e "  ${DIM}Installing Homebrew (required for Ollama on macOS)...${RESET}"
        run /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        # Add Homebrew to PATH for the rest of this script
        eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)" || true
      fi
      echo -e "  ${DIM}Installing Ollama via Homebrew...${RESET}"
      run brew install ollama
      ;;
    Linux)
      echo -e "  ${DIM}Installing Ollama...${RESET}"
      run curl -fsSL https://ollama.com/install.sh | sh
      ;;
  esac
  ok "Ollama installed"
fi

# ── Pull model ────────────────────────────────────────────────────────────────
if ollama list 2>/dev/null | grep -q 'nomic-embed-text'; then
  skip "nomic-embed-text already pulled"
else
  echo -e "  ${DIM}Starting Ollama server...${RESET}"
  ollama serve >>"$LOG" 2>&1 &
  OLLAMA_PID=$!
  sleep 3

  # Let ollama's own progress bar show for the download
  echo -e "  Pulling nomic-embed-text ${DIM}(~270 MB — this takes a minute)${RESET}"
  ollama pull nomic-embed-text

  kill "$OLLAMA_PID" 2>/dev/null || true
  ok "nomic-embed-text ready"
fi

# ── Configure pk ─────────────────────────────────────────────────────────────
run pk config --embedding nomic-embed-text
ok "Semantic search enabled"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}All done!${RESET}"
echo ""
echo -e "  Next: open a new terminal tab so PATH changes take effect."
echo -e "  Then run ${BOLD}pk init${RESET} inside any project to get started."
echo ""
echo -e "${DIM}Full log saved to: ${LOG}${RESET}"
