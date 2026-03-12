#!/usr/bin/env bash
set -e

echo "Installing Bun..."

curl -fsSL https://bun.sh/install | bash
~/.bun/bin/bun --version