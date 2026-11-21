# Papilio — Aleo grant cover page

**One line:** private trade intents on Aleo, settled through CoW Protocol,
with the user's wallet and balance never leaving zero knowledge.

## What is built (v1, Aleo testnet)

- [`papilio_intent.aleo`](../aleo/papilio_intent/src/main.leo): a user locks a
  fixed denomination of a private token record under a commitment. The
  network's proof verification establishes *holds ≥ denomination* — the
  balance and address appear in no public input, no log, no mapping.
- Escrow lifecycle on-chain: lock → claim (relayer) / refund (user after
  expiry), double-use blocked by record consumption, double-commitment
  blocked in `finalize`.
- The relayer learns the trade parameters through an encrypted `IntentNote`
  record — decrypted with its view key, never posted anywhere.
- Fees are paid with private fee records, so the lock transaction reveals no
  sender address.
- Offline test suite ([`tests/test.sh`](../aleo/papilio_intent/tests/test.sh)):
  sufficient balance proves, insufficient balance cannot produce a proof,
  the balance never appears in the public finalize arguments.

## Why it matters for Aleo

Every DEX intent today doxxes the trader. Papilio uses Aleo as the privacy
layer *in front of* existing EVM liquidity — a use case that needs no
liquidity migration to Aleo, only proofs. It exercises records, mappings,
async finalize, encrypted program-to-relayer messaging, and private fees in
one small, auditable program.

## Honesty

[`design.md`](design.md) lists seven things that still leak at settlement and
names the v1 relayer trust assumption plainly. No marketing claims.

## Milestones (Aleo ask)

| # | Milestone | Deliverable |
|---|-----------|-------------|
| 1 | v1 skeleton (done) | deployed testnet program, e2e demo, test suite |
| 2 | Trust-minimised claim | `claim` gated on proof of CoW settlement (receipt/storage proof verified on Aleo) |
| 3 | Audit + hardening | external review of the Leo program, fuzzing of the escrow lifecycle |
