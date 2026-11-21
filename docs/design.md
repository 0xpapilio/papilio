# Papilio v1 — Design

Testnet skeleton: private intent on Aleo, settlement on CoW Protocol (Sepolia).
No mainnet, no token, no UI. One trusted relayer.

## Flow

```
 user (Aleo wallet)
   │ 1. lock_intent(token_record, denomination, pair_hash, receiver, salt)
   │    - consumes a private Token record (proves balance >= denomination)
   │    - escrow credited under commitment hash (public mapping)
   │    - RefundTicket record back to user
   │    - IntentNote record encrypted to the relayer (pair, denomination, receiver)
   ▼
 Aleo testnet ──── only the commitment hash + expiry are public
   │ 2. relayer sees the accepted lock tx, decrypts IntentNote with its view key
   ▼
 relayer (holds its own Sepolia inventory)
   │ 3. places a CoW order on Sepolia: sell <denomination> of pair.sell,
   │    receiver = intent.receiver, from the relayer's own funds
   ▼
 CoW Protocol (Sepolia) ─── solvers compete, batch settles
   │ 4. order fills → tokens land at the receiver address
   ▼
   │ 5a. relayer calls claim(commitment) on Aleo → escrow pays the relayer
   │ 5b. if the order expires unfilled (or the relayer vanishes):
   │     after `expiry` block height the user consumes the RefundTicket
   │     → refund(commitment) returns the escrowed Token record
```

The Aleo network itself verifies the zero-knowledge proof when it accepts the
lock transaction. The relayer only confirms the transaction is accepted and
the escrow mapping entry exists — it never re-verifies the proof and never
sees the user's balance or address.

## Who learns what

| Observer         | User wallet (Aleo) | Exact balance | Trade amount        | Token pair | Receiver (Sepolia) | Timing |
|------------------|--------------------|---------------|---------------------|------------|--------------------|--------|
| User             | yes                | yes           | yes                 | yes        | yes                | yes    |
| Relayer          | **no**             | **no**        | denomination only   | yes        | yes                | yes    |
| CoW solver       | no (sees relayer)  | no            | denomination only   | yes        | yes                | yes    |
| Public observer  | **no**             | **no**        | denomination only¹  | yes²       | yes (on-chain)     | yes    |

¹ Amounts are fixed denominations (e.g. 0.01 WETH), so an order reveals the
tier, not the user's balance or a bespoke amount.
² The pair hash on Aleo is a hash, but the CoW order on Sepolia names the
pair in the clear, so a public observer learns it at settlement.

## Trust assumptions (stated plainly)

- **The relayer is trusted for delivery.** It fronts its own Sepolia funds and
  is repaid from the Aleo escrow. Nothing in v1 forces it to place the order
  before claiming; a malicious relayer can claim the escrow and never trade.
  The user's recourse is only that the relayer is ours and the funds are
  testnet. v2 gates `claim` on a proof of CoW settlement.
- **The relayer learns the receiver address and the pair.** It cannot learn
  the user's Aleo address or balance.
- The exchange rate is whatever CoW settles at; the relayer repays itself the
  fixed denomination regardless. v1 has no price protection beyond the CoW
  order's own `buyAmount` minimum, which the relayer sets.

## Failure and revert handling

| Failure                                   | Outcome |
|-------------------------------------------|---------|
| Insufficient balance in the Token record  | `lock_intent` proof fails; nothing is published |
| Same record used for two intents          | Record is consumed on first use; second lock is rejected by the network |
| Same commitment submitted twice           | `finalize` asserts the mapping key is absent; tx rejected |
| CoW order expires unfilled                | Relayer never claims; user calls `refund` after `expiry` block height |
| Relayer offline / disappears              | Same refund path; user is made whole on Aleo, no trade happens |
| Relayer claims without trading            | Possible in v1 — see trust assumptions |
| Both claim and refund attempted           | Escrow mapping entry is removed by whichever lands first; the other tx fails |
| Refund attempted before expiry            | `refund` asserts `block.height >= expiry`; tx fails |

## What still leaks at settlement (honest list)

1. **Token pair** — the CoW order names sell/buy tokens in the clear.
2. **Exact amount** — the denomination is public; fixed tiers hide the
   balance, not the trade size.
3. **Receiver address** — the Sepolia output address is public forever.
4. **Timing correlation** — a lock on Aleo followed minutes later by a
   Papilio order on Sepolia links the two for anyone watching both chains.
5. **Common owner** — every v1 order is signed by the same relayer address,
   so all Papilio flow is trivially clusterable.
6. **Gas funding of the receiver** — if the user funds a fresh receiver
   address from an exchange or an old wallet, that funding path deanonymizes
   them outside Papilio entirely.
7. **Anonymity set ≈ 1** — on testnet, with one user, every order is that
   user. Privacy here is a mechanism demo, not an operational guarantee.
8. **Public fee payer** — an Aleo tx that pays a *public* fee names the fee
   payer's address. The web app asks the wallet for a private fee by default;
   the CLI demo scripts pay public fees and so expose the demo account.

## Roadmap (not built in v1)

- **v2 — trust-minimised claim:** `claim` requires a proof that the CoW
  settlement containing the order UID executed (storage/receipt proof relayed
  to Aleo). Removes "claim without trading".
- **v3 — batching and delay:** random submission delay and batched orders to
  blunt timing correlation; multiple relayers to break the common-owner
  cluster.
