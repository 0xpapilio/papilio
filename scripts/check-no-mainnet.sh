#!/usr/bin/env bash
# Acceptance guard: no mainnet code anywhere in the protocol skeleton.
set -euo pipefail
cd "$(dirname "$0")/.."

PATTERNS='MAINNET|mainnet|chainId.{0,4}[^0-9]1[^0-9]|aleo\.network/v1/mainnet'
HITS=$(grep -rniE "$PATTERNS" relayer/src aleo/papilio_intent/src 2>/dev/null || true)

if [ -n "$HITS" ]; then
  echo "Mainnet reference found in protocol code:"
  echo "$HITS"
  exit 1
fi
echo "OK: no mainnet references in relayer/src or aleo program."
