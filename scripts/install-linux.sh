#!/usr/bin/env bash
set -euo pipefail

if [[ -t 1 ]]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  BLUE="\033[34m"
  RED="\033[31m"
  RESET="\033[0m"
else
  BOLD=""
  DIM=""
  GREEN=""
  YELLOW=""
  BLUE=""
  RED=""
  RESET=""
fi

log() {
  local level=$1
  shift
  printf "%b[%s]%b %s\n" "$DIM" "$level" "$RESET" "$*"
}

log_info() { log "INFO" "$@"; }
log_step() { printf "%b▶%b %s\n" "$BLUE" "$RESET" "$*"; }
log_warn() { printf "%b⚠%b %s\n" "$YELLOW" "$RESET" "$*"; }
log_success() { printf "%b✔%b %s\n" "$GREEN" "$RESET" "$*"; }
log_error() { printf "%b✖%b %s\n" "$RED" "$RESET" "$*" >&2; }

on_error() {
  local exit_code=$?
  local line_no=${1:-"?"}
  log_error "Installation aborted on line ${line_no}."
  log_error "Check install.log for details if logging was enabled."
  exit "$exit_code"
}

trap 'on_error $LINENO' ERR

usage() {
  cat <<'USAGE'
ZickZackClient - Linux install helper

Usage: ./scripts/install-linux.sh [options]

Options:
  --skip-build          Install dependencies only; skip the Tauri build step.
  --debug-build         Build a debuggable bundle instead of an optimised release bundle.
  --ci                  Non-interactive mode (suppresses prompts and colours when piped).
  --target <triple>     Build for a specific Rust target triple (defaults to host toolchain).
  --log <file>          Mirror script output to the specified log file (appended).
  --help                Display this help message.

Examples:
  ./scripts/install-linux.sh
  ./scripts/install-linux.sh --skip-build --log install.log
  ./scripts/install-linux.sh --target x86_64-unknown-linux-gnu
USAGE
}

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQUIRED_NODE_MAJOR=18
SKIP_BUILD=false
BUILD_PROFILE="release"
CI_MODE=false
CUSTOM_TARGET=""
LOG_FILE=""

while (($#)); do
  case "$1" in
    --skip-build)
      SKIP_BUILD=true
      ;;
    --debug-build)
      BUILD_PROFILE="debug"
      ;;
    --ci)
      CI_MODE=true
      ;;
    --target)
      shift
      if [[ -z "${1:-}" ]]; then
        log_error "--target requires a value"
        usage
        exit 2
      fi
      CUSTOM_TARGET="$1"
      ;;
    --log)
      shift
      if [[ -z "${1:-}" ]]; then
        log_error "--log requires a filename"
        usage
        exit 2
      fi
      LOG_FILE="$1"
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
  shift
done

if [[ -n "$LOG_FILE" ]]; then
  exec > >(tee -a "$LOG_FILE") 2>&1
  log_info "Mirroring output to $LOG_FILE"
fi

if [[ "$CI_MODE" == true || ! -t 1 ]]; then
  BOLD=""
  DIM=""
  GREEN=""
  YELLOW=""
  BLUE=""
  RED=""
  RESET=""
fi

log_step "Preparing environment"
log_info "Project directory: $PROJECT_ROOT"

require_command() {
  local command_name=$1
  local friendly_name=$2
  if ! command -v "$command_name" >/dev/null 2>&1; then
    missing_tools+=("$friendly_name")
  fi
}

missing_tools=()
require_command node "Node.js >= ${REQUIRED_NODE_MAJOR}.x"
require_command yarn "Yarn package manager"
require_command cargo "Rust toolchain (cargo)"
require_command rustup "Rust toolchain manager (rustup)"
require_command rustc "Rust compiler (rustc)"
require_command python3 "Python 3 (required by some native node modules)"

if ((${#missing_tools[@]} > 0)); then
  log_warn "Some required tools are missing:"
  for tool in "${missing_tools[@]}"; do
    log_warn "  - $tool"
  done
  if command -v apt-get >/dev/null 2>&1; then
    log_info "Suggested apt packages: build-essential curl pkg-config libssl-dev";
  elif command -v dnf >/dev/null 2>&1; then
    log_info "Suggested dnf packages: @development-tools nodejs python3 pkgconfig openssl-devel";
  elif command -v pacman >/dev/null 2>&1; then
    log_info "Suggested pacman packages: base-devel nodejs npm python openssl";
  fi
  log_error "Install the missing dependencies and re-run the installer."
  exit 1
fi

node_version_raw=$(node -v | sed 's/^v//')
node_major="${node_version_raw%%.*}"
if (( node_major < REQUIRED_NODE_MAJOR )); then
  log_error "Node.js $node_version_raw detected, but version ${REQUIRED_NODE_MAJOR}.x or newer is required."
  exit 1
fi

if [[ -f "$PROJECT_ROOT/.nvmrc" ]]; then
  required_from_nvmrc=$(<"$PROJECT_ROOT/.nvmrc")
  log_info "Found .nvmrc requesting Node.js $required_from_nvmrc"
  if [[ "$node_version_raw" != "$required_from_nvmrc" ]]; then
    log_warn "Active Node.js version ($node_version_raw) differs from .nvmrc ($required_from_nvmrc)."
  fi
fi

log_step "Ensuring Yarn via Corepack"
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  if [[ -f "$PROJECT_ROOT/.yarnrc.yml" ]]; then
    yarn_version=$(awk '/^yarnPath:/{print $2}' "$PROJECT_ROOT/.yarnrc.yml" 2>/dev/null || true)
    if [[ -n "$yarn_version" ]]; then
      log_info "Project pins Yarn binary at $yarn_version"
    fi
  fi
else
  log_warn "Corepack not found; using system Yarn $(yarn --version)"
fi

yarn --version >/dev/null
log_success "Yarn $(yarn --version) ready"

log_step "Syncing project dependencies"
cd "$PROJECT_ROOT"
yarn install --immutable || yarn install --frozen-lockfile
log_success "JavaScript dependencies installed"

log_step "Verifying Rust targets"
host_triple=$(rustc -Vv | awk '/^host:/ {print $2}')
log_info "Active Rust toolchain: $(rustup show active-toolchain 2>/dev/null | head -n1)"
if [[ -z "$CUSTOM_TARGET" ]]; then
  CUSTOM_TARGET="$host_triple"
fi
if ! rustup target list --installed | grep -q "^${CUSTOM_TARGET}$"; then
  log_info "Installing Rust target ${CUSTOM_TARGET}"
  rustup target add "$CUSTOM_TARGET"
else
  log_success "Rust target ${CUSTOM_TARGET} already installed"
fi

if [[ "$SKIP_BUILD" == true ]]; then
  log_warn "Skipping Tauri build step as requested"
  log_success "Environment ready for development"
  exit 0
fi

log_step "Building Tauri bundle"
TAURI_ARGS=(build)
if [[ "$BUILD_PROFILE" == "debug" ]]; then
  TAURI_ARGS+=(--debug)
fi
if [[ -n "$CUSTOM_TARGET" ]]; then
  TAURI_ARGS+=(--target "$CUSTOM_TARGET")
fi

log_info "Running: yarn tauri ${TAURI_ARGS[*]}"
yarn tauri "${TAURI_ARGS[@]}"

log_success "Build complete! Artifacts are available under src-tauri/target/${CUSTOM_TARGET}/${BUILD_PROFILE}."
log_info "Happy hacking with ZickZackClient!"
