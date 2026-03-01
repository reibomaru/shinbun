#!/bin/bash
set -euo pipefail

# Usage:
#   .github/scripts/upload-image-to-github.sh --file <画像パス> [--dest <リポジトリ内パス>] [--branch <ブランチ>]
#
# 画像をGitHubリポジトリにアップロードし、raw URLをstdoutに出力する。
#
# オプション:
#   --file     アップロードする画像ファイルパス（必須）
#   --dest     リポジトリ内の保存先パス（デフォルト: .github/screenshots/<タイムスタンプ>-<ファイル名>）
#   --branch   アップロード先ブランチ（デフォルト: 現在のブランチ）
#   --help     このヘルプを表示

usage() {
  sed -n '3,12p' "$0" | sed 's/^# \?//'
  exit 0
}

FILE=""
DEST=""
BRANCH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --file)   FILE="$2";   shift 2 ;;
    --dest)   DEST="$2";   shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
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
BRANCH="${BRANCH:-$(git branch --show-current)}"

if [[ -z "$DEST" ]]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  FILENAME=$(basename "$FILE")
  DEST=".github/screenshots/${TIMESTAMP}-${FILENAME}"
fi

BASE64_CONTENT=$(base64 < "$FILE")

gh api "repos/${REPO}/contents/${DEST}" \
  -X PUT \
  -f message="docs: add screenshot ${DEST}" \
  -f content="${BASE64_CONTENT}" \
  -f branch="${BRANCH}" \
  --silent >&2

echo "https://github.com/${REPO}/blob/${BRANCH}/${DEST}?raw=true"
