#!/bin/bash
set -euo pipefail

# Usage:
#   .github/scripts/upload-image-to-github.sh --file <画像パス> [--dest <リポジトリ内パス>]
#
# 画像をGitHubリポジトリの screenshots ブランチにアップロードし、raw URLをstdoutに出力する。
# フィーチャーブランチのコミット履歴を汚さないよう、専用のorphanブランチを使用する。
#
# オプション:
#   --file     アップロードする画像ファイルパス（必須）
#   --dest     リポジトリ内の保存先パス（デフォルト: <タイムスタンプ>-<ファイル名>）
#   --help     このヘルプを表示

SCREENSHOTS_BRANCH="screenshots"

usage() {
  sed -n '3,14p' "$0" | sed 's/^# \?//'
  exit 0
}

FILE=""
DEST=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --file)   FILE="$2";   shift 2 ;;
    --dest)   DEST="$2";   shift 2 ;;
    --help)   usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$FILE" ]]; then
  echo "Error: --file is required" >&2
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  echo "Error: File not found: $FILE" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

if [[ -z "$DEST" ]]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  FILENAME=$(basename "$FILE")
  DEST="${TIMESTAMP}-${FILENAME}"
fi

BASE64_CONTENT=$(base64 < "$FILE")

# Ensure the screenshots orphan branch exists
if ! gh api "repos/${REPO}/git/ref/heads/${SCREENSHOTS_BRANCH}" --silent 2>/dev/null; then
  # Create an orphan branch with an empty initial commit
  EMPTY_TREE=$(gh api "repos/${REPO}/git/trees" -X POST -f 'tree[0][path]=.gitkeep' -f 'tree[0][mode]=100644' -f 'tree[0][type]=blob' -f 'tree[0][content]=' -q .sha)
  INIT_COMMIT=$(gh api "repos/${REPO}/git/commits" -X POST -f message="chore: init screenshots branch" -f tree="${EMPTY_TREE}" -q .sha)
  gh api "repos/${REPO}/git/refs" -X POST -f ref="refs/heads/${SCREENSHOTS_BRANCH}" -f sha="${INIT_COMMIT}" --silent >&2
  echo "Created orphan branch '${SCREENSHOTS_BRANCH}'" >&2
fi

# Upload the image to the screenshots branch
gh api "repos/${REPO}/contents/${DEST}" \
  -X PUT \
  -f message="docs: add screenshot ${DEST}" \
  -f content="${BASE64_CONTENT}" \
  -f branch="${SCREENSHOTS_BRANCH}" \
  --silent >&2

echo "https://github.com/${REPO}/blob/${SCREENSHOTS_BRANCH}/${DEST}?raw=true"
