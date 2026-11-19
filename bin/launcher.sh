#!/usr/bin/env bash
# Antigravity i18n 启动器自动补丁管理入口
# 用法: ./bin/launcher.sh [enable|disable|status|ensure]
set -e

if ! command -v node >/dev/null 2>&1; then
    echo "[Error] Node.js is not installed or not in PATH. Please install from https://nodejs.org/"
    exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/../scripts/launcher.js" "$@"
