#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

########################################
# 1. Install project dependencies
########################################
echo "Installing root dependencies..."
cd "$PROJECT_DIR"
npm install

echo "Installing mock/ dependencies..."
cd "$PROJECT_DIR/mock"
npm install

########################################
# 2. Install gh CLI
########################################
GH_VERSION="2.65.0"

if ! command -v gh &>/dev/null; then
  echo "Installing GitHub CLI (gh) v${GH_VERSION}..."
  # Download pre-built binary from GitHub Releases (works behind proxies that block cli.github.com)
  curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz" \
    -o /tmp/gh.tar.gz
  tar -xzf /tmp/gh.tar.gz -C /tmp/
  cp /tmp/gh_${GH_VERSION}_linux_amd64/bin/gh /usr/local/bin/gh
  chmod +x /usr/local/bin/gh
  rm -rf /tmp/gh.tar.gz /tmp/gh_${GH_VERSION}_linux_amd64
  echo "gh CLI installed: $(gh --version | head -1)"
else
  echo "gh CLI already installed: $(gh --version | head -1)"
fi

########################################
# 3. Authenticate gh with GITHUB_TOKEN
########################################
# GITHUB_TOKEN should be configured as a secret in Claude Code on the web settings.
# To set it up:
#   1. Go to your Claude Code on the web project settings
#   2. Add a secret named GITHUB_TOKEN with a GitHub Personal Access Token (classic or fine-grained)
#   3. The token needs at minimum: repo, read:org scopes for full gh functionality
if [ -n "${GITHUB_TOKEN:-}" ]; then
  echo "Authenticating gh CLI with GITHUB_TOKEN..."
  echo "$GITHUB_TOKEN" | gh auth login --with-token
  echo "gh auth status:"
  gh auth status || true
else
  echo "WARNING: GITHUB_TOKEN is not set. gh CLI will not be authenticated."
  echo "To enable gh authentication, add GITHUB_TOKEN as a secret in your Claude Code on the web project settings."
fi

echo "Session start hook completed successfully."
