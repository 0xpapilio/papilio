# papilio_intent.aleo

Private trade-intent escrow. See [`../../docs/design.md`](../../docs/design.md)
for the full flow and threat model.

- **Network:** Aleo testnet only
- **Program ID:** `papilio_intent.aleo` — deployed address recorded in
  [`DEPLOYMENT.md`](DEPLOYMENT.md) after first deploy.

## Setup

```bash
# install Leo: https://github.com/ProvableHQ/leo
leo build
```

Create `.env` (never committed):

```
NETWORK=testnet
PRIVATE_KEY=APrivateKey1...   # your funded testnet key (faucet: https://faucet.aleo.org)
ENDPOINT=https://api.explorer.provable.com/v1
```

## Run locally (no network)

```bash
leo run mint 1000000u64
leo run lock_intent "<token record>" 10000u64 <pair_hash>field <receiver>field <relayer_addr> <expiry>u32 <salt>scalar
```

## Tests

```bash
./tests/test.sh
```

Covers: mint; lock with sufficient balance passes; lock with insufficient
balance fails; claim/refund run; the balance never appears in the public
finalize arguments.

## Deploy + execute on testnet

```bash
leo deploy --broadcast
leo execute lock_intent ... --broadcast
```

Pay fees with a **private fee record** (`--fee-records <record>`), not a
public balance — a public fee reveals the sender address and defeats the
point.

## Verify a proof

Every accepted transaction *is* a verified proof: the network only includes
`lock_intent` transactions whose zk-proof (balance ≥ denomination, correct
commitment) checks out. To verify independently:

```bash
curl -s "$ENDPOINT/testnet/transaction/<tx_id>" | jq '.execution'
```

The execution contains the transition's proof and only public outputs: the
commitment, denomination, relayer address and expiry. No user address, no
balance.
