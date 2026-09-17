#!/usr/bin/env bash
set -e

if ! command -v node >/dev/null 2>&1; then
    echo "===================================================================="
    echo "  [Error] Node.js is not installed or not in PATH!"
    echo "  This patch suite requires Node.js runtime."
    echo "  Please install Node.js from: https://nodejs.org/"
    echo "===================================================================="
    exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/../scripts/install.js" "$@"
