# Papilio relayer (Sepolia)

Verifies an Aleo intent was accepted on-chain, settles it on CoW Protocol
(Sepolia) from its own inventory, then claims the Aleo escrow.
Full flow and trust model: [`../docs/design.md`](../docs/design.md).

## Setup

```bash
npm install
cp env.example .env   # fill in — testnet keys only, never committed
```

The Sepolia key needs test ETH (gas + wrapping) and WETH
(`0xfFf9…6B14`, wrap via deposit). Aleo keys need faucet credits.

## Commands

```bash
npm test              # unit tests (no network)
npm run typecheck
npm run spike:cow     # day-0 spike: settle a CoW order with receiver != owner
npm run relayer -- <aleo_lock_tx_id>
npm run demo          # full happy path: mint -> lock -> order -> settle -> claim
npm run demo:fail     # insufficient balance + expiry refund paths
```

## Evidence logs

Every relayer run writes `logs/run-<ts>.json`: the commitment, CoW order UID,
settlement tx, and `solverVisiblePayload` — the exact order the solver saw,
kept as proof of what does and does not leak.

Links per run:
- CoW order: `https://explorer.cow.fi/sepolia/orders/<orderUid>`
- Settlement: `https://sepolia.etherscan.io/tx/<txHash>`
- Aleo txs: `https://testnet.aleoscan.io/transaction?id=<txId>`
