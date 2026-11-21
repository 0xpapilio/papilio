#!/usr/bin/env bash
# Offline tests for papilio_intent using `leo run` (no network, throwaway key).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v leo >/dev/null; then
  echo "leo CLI not found — install from https://github.com/ProvableHQ/leo" >&2
  exit 1
fi

# Throwaway account; never funded, never leaves this machine.
if [ ! -f .env ]; then
  OUT=$(leo account new)
  PK=$(echo "$OUT" | grep -oE 'APrivateKey1[0-9A-Za-z]+' | head -1)
  ADDR=$(echo "$OUT" | grep -oE 'aleo1[0-9a-z]+' | head -1)
  printf 'NETWORK=testnet\nPRIVATE_KEY=%s\nENDPOINT=https://api.explorer.provable.com/v1\n' "$PK" > .env
  echo "$ADDR" > .address
fi
ADDR=$(cat .address)

TOKEN="{ owner: ${ADDR}.private, amount: 1000000u64.private, _nonce: 0group.public }"
SMALL_TOKEN="{ owner: ${ADDR}.private, amount: 1u64.private, _nonce: 0group.public }"
TICKET="{ owner: ${ADDR}.private, amount: 10000u64.private, commitment: 123field.private, expiry: 10u32.private, _nonce: 0group.public }"

pass=0; fail=0
ok()  { echo "PASS: $1"; pass=$((pass+1)); }
bad() { echo "FAIL: $1"; fail=$((fail+1)); }

echo "== 1. mint builds and runs =="
leo run mint 1000000u64 >/dev/null 2>&1 && ok "mint" || bad "mint"

echo "== 2. lock_intent succeeds with sufficient balance =="
leo run lock_intent "$TOKEN" 10000u64 123field 456field "$ADDR" 100000u32 1scalar >/dev/null 2>&1 \
  && ok "lock with sufficient balance" || bad "lock with sufficient balance"

echo "== 3. lock_intent FAILS with insufficient balance =="
if leo run lock_intent "$SMALL_TOKEN" 10000u64 123field 456field "$ADDR" 100000u32 1scalar >/dev/null 2>&1; then
  bad "insufficient balance was accepted"
else
  ok "insufficient balance rejected"
fi

echo "== 4. claim and refund transitions run =="
leo run claim 123field 10000u64 >/dev/null 2>&1 && ok "claim" || bad "claim"
leo run refund "$TICKET" >/dev/null 2>&1 && ok "refund" || bad "refund"

echo "== 5. no balance in public transition inputs =="
# The only public artifacts of lock_intent are the finalize args:
# (commitment, denomination, relayer, expiry). Verify the user's balance
# (1000000) never appears among the future's arguments.
LOCK_OUT=$(leo run lock_intent "$TOKEN" 10000u64 123field 456field "$ADDR" 100000u32 1scalar 2>&1 || true)
FUTURE=$(echo "$LOCK_OUT" | sed -n '/Future/,$p')
if echo "$FUTURE" | grep -q '1000000u64'; then
  bad "balance leaked into public finalize args"
else
  ok "balance absent from public finalize args"
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
