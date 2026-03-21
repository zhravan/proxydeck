#!/usr/bin/env bash
# Curl-install bootstrap: clone repo then run install.sh. Usage: curl -fsSL <url> | bash
set -e
REPO="${PROXYDECK_REPO:-https://github.com/zhravan/proxydeck.git}"
BRANCH="${PROXYDECK_BRANCH:-main}"
TARGET="${PROXYDECK_DIR:-$(mktemp -d)}"
git clone --depth 1 -b "$BRANCH" "$REPO" "$TARGET"
cd "$TARGET"
exec ./scripts/install.sh
