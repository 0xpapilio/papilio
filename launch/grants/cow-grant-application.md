# CoW DAO Grants: forum posts

Post in https://forum.cow.fi/c/cow-grants-program/10. Recent applicants first
post a short **scope check**, then the full application. Both are below.

---

## Post 1: Scope check (optional, recommended)

**Title:** Scope Check – Papilio: private trade intents settled as CoW orders

Hi Grants Committee 👋

Before a full application, we'd like a quick read on fit.

**Papilio** lets a user commit to a trade privately on Aleo (zero-knowledge
escrow, no wallet or balance revealed), and a relayer then settles it as an
**ordinary CoW Protocol order**. Solvers see a fixed-size order and a receiver,
never the trader. Unfilled intents refund on Aleo.

It's live on testnet today (Aleo testnet + CoW Sepolia), with real settled
orders: https://papilio.vitalveev.in/testnet

We think it fits "novel applications / cross-chain solutions beyond basic
swaps": it brings privacy-seeking order flow to CoW without any protocol
changes. The grant would fund order indistinguishability (batching, randomized
delays), a multi-relayer setup and a mainnet path.

Is this in scope, and is there anything you'd want us to emphasise or change
before we apply? Thanks!

---

## Post 2: Full application

**Title:** Grant Application – Papilio: private intents for CoW Protocol

### Grant Title
Papilio: private trade intents for CoW Protocol

### Author(s)
Anukul Pandey (engineering). Forum handle: @anuna

### Experiences and qualifications
We built and shipped Papilio v1 end to end: a Leo program on Aleo testnet,
a TypeScript relayer that places and settles real CoW orders via the official
SDK, and a wallet-connected dapp. Evidence:
- Live app: https://papilio.vitalveev.in/app
- Full trade on explorers (lock → [CoW order](https://explorer.cow.fi/sepolia/orders/0x8e48ce9f85493b0277de15a43113bba9f7bb9c7ef166790c6a2d980ef61a6be6160319aa4441838d1284f0ae75b1bbb1016627f76b0181f4) → [settlement](https://sepolia.etherscan.io/tx/0xe9f7c15b30ed10be94f3ed115d993a5ff4d6185e61144e3e59eaa38c48ff8632) → claim): https://papilio.vitalveev.in/testnet
- Code (MIT): https://github.com/0xpapilio/papilio
- Anukul Pandey: B.Tech in Electronics and Instrumentation; won Reef Chain hackathons and received Reef Chain grants, won Avalanche Speedrun (Team1) twice, and won the Gelato global hackathon. Portfolio: https://anukul.notcool.in · LinkedIn: https://linkedin.com/in/anukulpandey

### Grant Description

**Purpose.** CoW protects traders from MEV at *execution* time. But every CoW
order is still signed by a public wallet, so the trader's identity, balance
and history are exposed at *intent* time. Papilio extends CoW's protection to
identity: users commit to trades in zero knowledge on Aleo, and a relayer
submits them to CoW as ordinary orders.

**How it works today.**
1. The user locks a fixed tier (0.001 / 0.01 WETH) in an Aleo escrow with a
   ZK proof. Only a commitment hash is public.
2. The relayer decrypts the private intent note and places a standard CoW order
   from its own inventory, with `receiver` set to the user's address.
3. Solvers fill it in a batch auction. The relayer is repaid from the escrow;
   unfilled orders expire and the user refunds.

The relayer logs the exact signed payload solvers see (`solverVisiblePayload`)
for every run, so the privacy claim is checkable against real settlements.

**Technology.** CoW Protocol order book and SDK (unchanged), Aleo / Leo, the
Provable wallet adapter, Next.js.

**Impact on CoW.**
- **New order flow** from users who won't trade from a doxxed wallet:
  privacy-sensitive retail, DAOs and treasuries whose addresses are watched.
- **Uses CoW exactly as designed:** no protocol changes, standard orders,
  batch auctions and MEV protection are the reason it settles on CoW.
- **A cross-chain intent pattern** (commit on one chain, settle on CoW) that
  other builders can reuse.

**What the grant funds.** v1 has known limits (documented):
- every order comes from one relayer address
- lock-then-order timing links the two chains
This grant tackles both and builds the path to mainnet.

### Type of Grant
Milestone-based

### Milestones

| Milestone | Title | Due date | Funding request |
|---|---|---|---|
| 1 | Order indistinguishability | 6 weeks after approval | 4,000 xDAI |
| 2 | Multi-relayer | 12 weeks after approval | 4,000 xDAI |
| 3 | Mainnet readiness | 16 weeks after approval | 2,000 xDAI + 5,000 COW |

**Milestone 1: Order indistinguishability**
- Batch submission and randomized delay in the relayer to blunt lock→order timing correlation
- Anonymity-set metrics (orders per tier per window), published on the proof page
- Report: what an observer can still correlate, measured on real Sepolia orders

**Milestone 2: Multi-relayer**
- Relayer set with independent inventories, so orders no longer share one owner address
- Relayer selection in the app; refund path unchanged
- Docs for running a relayer

**Milestone 3: Mainnet readiness**
- Inventory limits and monitoring for relayers; failure playbook
- Mainnet deployment plan (CoW mainnet + Aleo mainnet) with a security review
  of the Aleo program (funded separately via Aleo)
- Volume plan: launch partners and target wallets for the first 90 days

### Length
4 months, starting on approval.

### Funding Request
10,000 xDAI + 5,000 COW total.
- xDAI covers engineering time for three milestones (~4 months, part-time)
  and relayer infrastructure (RPC, hosting, testnet inventory).
- COW aligns us long-term with the protocol and is paid only on the mainnet-readiness milestone.

### Gnosis Chain Address
**[0x… your address; confirm with your Steward whether payouts are on Gnosis
or Ethereum mainnet under CIP-82]**

### Other Information
- Design doc with trust model and eight known leaks: https://github.com/0xpapilio/papilio/blob/main/docs/design.md
- Testnet only today; CI blocks mainnet code until reviewed.
- No team member is a US person.

### Terms and Conditions
By submitting this grant application, I acknowledge and agree to be bound by
the CoW DAO Participation Agreement and the CoW Grant Terms and Conditions.
