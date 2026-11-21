# Papilio — CoW grant cover page

**One line:** a privacy front-end for CoW Protocol — users commit to trades
in zero knowledge on Aleo; a relayer settles them as ordinary CoW orders, so
solvers see a denomination and a receiver, never a trader.

## What is built (v1, Sepolia)

- A relayer ([`relayer/`](../relayer)) that turns an accepted Aleo commitment
  into a real CoW order via the official SDK, waits for settlement, and
  records evidence.
- **Solver-visibility logs:** every run writes the exact signed order payload
  the solver saw (`solverVisiblePayload` in `relayer/logs/run-*.json`),
  alongside the order UID and settlement tx. The privacy claim is checkable
  against real settlements, not asserted.
- Fixed denominations (0.001 / 0.01 WETH tiers): every Papilio order in a
  tier is identical except for its receiver, which is the start of order
  indistinguishability on CoW.
- Failure handling that never strands funds: unfilled order → on-chain refund
  path on Aleo.

## Why it matters for CoW

CoW already protects traders from MEV at execution time; Papilio extends the
protection to *identity* at intent time. The flow adds order volume from
users who will not trade from a doxxed wallet, and it uses the order book and
settlement exactly as designed — no protocol changes requested.

## Honesty

[`design.md`](design.md) lists what solvers and the public still learn
(pair, tier, receiver, timing, common relayer owner) and the v1 trust
assumption. No marketing claims.

## Milestones (CoW ask)

| # | Milestone | Deliverable |
|---|-----------|-------------|
| 1 | v1 skeleton (done) | settled Sepolia orders from Aleo commitments, evidence logs |
| 2 | Order indistinguishability | batching + randomized submission delay to blunt timing correlation; metrics on anonymity-set size |
| 3 | Multi-relayer | break the common-owner cluster; relayer set with independent inventories |
