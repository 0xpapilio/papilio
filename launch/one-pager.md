# Papilio — one-pager

**Trade without doxxing your wallet.** Private trade intents on Aleo, settled on CoW Protocol.

## Problem
Every on-chain swap publishes the trader's wallet, balance and history. That's a
privacy leak and a price leak: visible intent invites front-running, and wallets
become permanent public profiles.

## Solution
Papilio separates *who* trades from *what* is traded:
1. **Lock (Aleo).** The user's wallet proves in zero knowledge that it holds a
   fixed-size amount and locks it in escrow. Only a commitment hash and expiry
   become public.
2. **Order (relayer → CoW).** A relayer decrypts the private intent note and
   places a standard CoW Protocol order from its own funds.
3. **Settle and claim.** Solvers fill it at the batch price; the relayer is
   repaid from the escrow. Unfilled intents are refunded by the user after expiry.

## Why it's different
- **No liquidity migration:** Aleo is the privacy layer *in front of* existing
  EVM liquidity; CoW's order book is used exactly as designed.
- **Fixed tiers:** every order in a tier looks identical, the start of order
  indistinguishability.
- **Verifiable, not claimed:** every step of real trades is on public explorers,
  and the design doc lists what still leaks.

## Status (Nov 2026)
- `papilio_intent.aleo` deployed on Aleo testnet
- Live dapp: connect Shield/Leo/Puzzle, mint test tokens, shield & swap, track, refund
- Relayer watches the chain and settles automatically on CoW Sepolia
- End-to-end trades and the refund path verified on-chain
- Open source (MIT), CI blocks any mainnet code

## Roadmap
| Milestone | What |
|---|---|
| M2 · Trust-minimised claim | `claim` requires proof that the CoW settlement happened |
| M3 · Indistinguishability | batching + randomized delays; anonymity-set metrics |
| M4 · Multi-relayer + audit | independent relayers; external review of the Leo program |

## Honest limits (v1)
Single trusted relayer; pair, tier and receiver are public at settlement; timing
across chains can correlate; testnet anonymity set is tiny.

## Team
- **Anukul Pandey:** engineering (Leo program, relayer, app)
- **Veevaa Bajaj** (NIFT SXR): design + marketing
- **Sarandha Bhola** (PIMR, BA LLB): legal + compliance

## Links
App https://papilio.vitalveev.in/app · Proof https://papilio.vitalveev.in/testnet ·
Code https://github.com/anukulpandey/papilio · Site https://papilio.vitalveev.in
