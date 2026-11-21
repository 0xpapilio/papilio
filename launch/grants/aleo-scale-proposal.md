# Papilio — Aleo Developer Grant Proposal

> Paste each section into a copy of the official template
> (https://docs.google.com/document/d/1u_qGdlCVovocr91G78bw59poIMhvi9HU8DVqhpN0cy0),
> export as PDF, and upload it in the form. Form answers: `aleo-form-answers.md`.
> Numbers in **[brackets]** are proposals: change them if you want.

**Project:** Papilio: private trade intents on Aleo, settled on CoW Protocol
**Category:** ZeFi
**Ask:** **[USD 40,000]** in three milestones
**Live:** https://papilio.vitalveev.in/app · proof of a full trade: https://papilio.vitalveev.in/testnet
**Code:** https://github.com/anukulpandey/papilio (MIT)

---

## 1. Project Overview

### The problem
Every swap on a public chain publishes the trader's wallet, balance and full
history. That is a privacy leak and a price leak: visible intent invites
front-running, and wallets become permanent public profiles. Traders who care
(funds, DAOs, individuals in hostile environments) either don't trade on-chain
or split activity across throwaway wallets, which leaks anyway.

### What Papilio does
Papilio separates **who** trades from **what** is traded:

1. **Lock (Aleo).** The user's wallet runs `lock_intent` in `papilio_intent.aleo`.
   It consumes a private token record, proving in zero knowledge that the user
   holds at least a fixed denomination, and escrows that amount under a
   commitment hash. Only the commitment, denomination tier, relayer and expiry
   become public. The user's address and balance appear nowhere.
2. **Order (relayer → CoW Protocol).** The trade details travel to the relayer
   in an encrypted `IntentNote` record. The relayer finds it by scanning blocks
   and trial-decrypting with its view key (no API, no submission endpoint), then
   places a standard CoW Protocol order from its own funds.
3. **Settle and claim.** Solvers fill the order in a batch auction. The relayer
   repays itself from the Aleo escrow with `claim`. If the order never fills,
   the user calls `refund` after expiry and takes the escrow back.

### Why Aleo, and why privacy matters here
Papilio's whole value is a private *pre-trade* step that a public chain can't
provide. Aleo gives us exactly the primitives it needs in one small program:
private records (balances never public), async `final` blocks (public escrow
bookkeeping), encrypted program-to-relayer messaging (records owned by the
relayer), and private fees (no fee-payer address). The Aleo network itself
verifies the proof when it accepts the lock, so the relayer never needs to
re-verify anything or learn the user's address.

### How Papilio differs from on-Aleo trading (e.g. Shield Swap)
Private trading venues on Aleo trade *Aleo liquidity*. Papilio uses Aleo as a
**privacy layer in front of existing EVM liquidity**: the user gets Ethereum's
deep liquidity and CoW's MEV protection without moving liquidity to Aleo. Both
are complementary: on-Aleo venues for Aleo-native assets, Papilio for routing
private intent into the largest liquidity pools. Every Papilio trade is also an
Aleo transaction, so it brings EVM order flow onto Aleo.

### Impact on the Aleo ecosystem
- A new class of user: EVM traders who come to Aleo *for privacy*, not to
  migrate assets.
- A reference design for "Aleo as a privacy co-processor for other chains":
  records + view-key messaging + async finalize, in an auditable ~130-line program.
- Drives wallet usage (Shield, Leo, Puzzle) through the standard Provable wallet
  adapter, including record inputs and private fees.

---

## 2. Team Background

| Name | Role | Background |
|---|---|---|
| **[Anukul Pandey]** | Engineering: Leo program, relayer, app | **[degree / college]** · GitHub: github.com/anukulpandey · **[LinkedIn]** · **[notable projects or hackathon wins]** |
| **Veevaa Bajaj** | Design + marketing | NIFT SXR · **[LinkedIn / portfolio]** |
| **Sarandha Bhola** | Legal + compliance | PIMR, BA LLB · **[LinkedIn]** |

What we've already shipped (in about a month): deployed `papilio_intent.aleo`
on testnet, a relayer that settles real CoW Protocol orders, a wallet-connected
dapp, and an honest design doc listing eight things that still leak.

---

## 3. Market Potential & Demand

**Target segments**
1. **Privacy-sensitive retail traders** who already use CoW Swap or other DEXs
   and don't want a public wallet history.
2. **DAOs, treasuries and funds** whose rebalancing is front-run because their
   addresses are watched.
3. **Users in high-risk jurisdictions** where a public balance is a personal
   safety issue.

**Pain points, with evidence**
- MEV and front-running cost traders hundreds of millions of dollars a year,
  which is why intent and batch-auction protocols like CoW exist. CoW protects
  *execution*, but the intent is still signed by a public wallet.
- Address-clustering and portfolio trackers make any active wallet a public
  profile.
- **[Add 1–2 numbers you trust: CoW monthly volume, a MEV-loss figure from a
  source you can cite, or user-interview quotes. Reviewers weight real numbers.]**

**Early demand signals**
- Waitlist on papilio.vitalveev.in: **[N signups]**
- Testnet usage after launch: **[N wallets / N intents, fill in before submitting]**

**TAM framing:** Papilio sits on DEX volume (hundreds of billions of dollars a year
across Ethereum DEXs). Even a small privacy-sensitive share is a large flow of
transactions onto Aleo. *(Cite a current source for the volume figure.)*

---

## 4. System Design & Specification

```
user (Aleo wallet)
  │ lock_intent(Token record, tier, pair_hash, receiver, relayer, expiry, salt)
  │   → escrow mapping[commitment]  (public: commitment, tier, relayer, expiry)
  │   → RefundTicket record → user  (private)
  │   → IntentNote record → relayer (private: pair, tier, receiver)
  ▼
relayer: scans blocks, decrypts IntentNote with its view key
  │ checks escrow is open and has ≥ 20 min left
  │ places CoW order (sell tier of WETH, receiver = user's address), valid 15 min
  ▼
CoW Protocol (Sepolia → mainnet): solvers fill in a batch auction
  │ fulfilled → relayer calls claim(commitment) on Aleo
  │ not filled → user calls refund(ticket) after expiry
```

**Components (all built):**
- `aleo/papilio_intent`: Leo program: `mint` (testnet only), `lock_intent`,
  `claim`, `refund`; three public mappings; `@noupgrade`.
- `relayer/`: TypeScript: block scanner, record decryption, CoW SDK order
  placement, settlement wait, claim, JSON evidence logs.
- `app/app`: Next.js dapp using the Provable wallet adapter (Shield/Leo/Puzzle):
  mint, shield & swap, live CoW quote, privacy readout, tracker, refund.

**Security properties already enforced on-chain:** double-spend blocked by
record consumption; duplicate commitment rejected in `final`; refund only after
expiry; claim and refund are mutually exclusive.

**Known v1 limit (the main thing this grant fixes):** the relayer is trusted
not to claim without trading. Milestone 1 removes that.

---

## 5. Funding & Milestones

| # | Milestone | Deliverables | Timeline | Funding |
|---|---|---|---|---|
| 1 | **Trust-minimised claim** | `claim` requires proof that the CoW settlement for that order happened (settlement attestation verified on Aleo); tests for forged/missing proofs; updated design doc | **[6 weeks]** | **[$15,000]** |
| 2 | **Real assets + private fees by default** | Replace the test token with a bridged/stable asset on Aleo testnet (e.g. via existing bridges); private-fee onboarding in the app; second tier set; anonymity-set metrics on the proof page | **[5 weeks]** | **[$12,000]** |
| 3 | **Audit-ready + mainnet plan** | External review of the Leo program, escrow-lifecycle fuzzing, relayer hardening (monitoring, inventory limits), mainnet launch plan with CoW | **[6 weeks]** | **[$13,000]** |

**Budget use:** two developers' time (~70%), security review (~20%),
infrastructure (relayer hosting, RPC, testnet liquidity) (~10%).

**What's already done (no funding requested):** v1 program, relayer, dapp, and
on-chain verification of the full flow and the refund path.
