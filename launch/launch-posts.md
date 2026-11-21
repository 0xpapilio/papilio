# Papilio — launch posts

Copy-paste ready. Attach the named asset from this folder. Replace `@handles`
before posting (left as plain text on purpose so nobody gets tagged by accident).

Links used everywhere:
- App: https://papilio.vitalveev.in/app
- Proof page: https://papilio.vitalveev.in/testnet
- Code: https://github.com/anukulpandey/papilio *(make the repo public first)*

---

## X / Twitter — launch thread

**1/** *(attach `papilio-explainer.mp4` or `launch-post.png`)*
Every swap you make is public forever: your wallet, your balance, your whole history.

We built Papilio: trade without doxxing your wallet.

Live today on Aleo testnet + CoW Protocol (Sepolia) 🦋
papilio.vitalveev.in/app

**2/**
How it works, in three steps:

🐛 Lock: your Aleo wallet proves you hold the amount in zero knowledge. Only a commitment hash goes on-chain.
🫘 Order: a relayer places a normal CoW order from its own funds.
🦋 Settle: solvers fill it; the relayer is repaid from escrow.

**3/** *(attach `how-it-works.png`)*
What stays hidden: your Aleo address and your balance.
What's public: the tier (0.001 or 0.01 WETH), the pair and the receiver.

Fixed tiers mean every Papilio order in a tier looks identical.

**4/**
Never filled? Your funds aren't stuck. After expiry you refund the escrow yourself, no permission needed.

We tested that path on-chain too.

**5/** *(attach `testnet-proof-screenshot.png`)*
Don't trust us. Every step of a real trade is on a public explorer:
lock → CoW order → settlement → claim, plus a refund.

papilio.vitalveev.in/testnet

**6/**
v1 is honest about its limits: one trusted relayer, and timing across chains can still link trades. Next up: claims gated on proof of settlement, batching, and more relayers.

Try it, break it, tell us what leaks 👇
papilio.vitalveev.in/app

*(Optional mentions in reply: Aleo, CoW Protocol / CoW Swap, Provable — use their real handles.)*

---

## X — single post (short)

Trade without doxxing your wallet. 🦋

Papilio locks your swap intent in zero knowledge on Aleo and settles it through CoW Protocol, so solvers see a trade, not a trader.

Live on testnet: papilio.vitalveev.in/app

---

## LinkedIn

**We just launched Papilio on testnet.** 🦋

On public blockchains, every trade exposes your wallet address, your balance and your full history. That's a privacy problem, and also a price problem: visible intent gets front-run.

Papilio separates *who* is trading from *what* is traded:

1. You lock a fixed-size trade intent on Aleo using a zero-knowledge proof. Only a commitment hash becomes public.
2. A relayer turns it into an ordinary order on CoW Protocol, which already protects trades from MEV.
3. Solvers fill it at the batch price. If it's never filled, you refund your escrow yourself.

It's live on Aleo testnet + Ethereum Sepolia, and every step of a real trade is verifiable on public explorers.

Built by a three-person student team: engineering, design + marketing, and legal + compliance.

Try it: https://papilio.vitalveev.in/app
Proof of a full trade: https://papilio.vitalveev.in/testnet

#zeroknowledge #privacy #Aleo #CoWProtocol #web3

*(attach `papilio-demo.mp4` or `how-it-works.png`)*

---

## Discord / Telegram (Aleo + CoW communities)

Hey all 👋 We built **Papilio**: private trade intents on Aleo, settled as normal CoW Protocol orders.

• Lock a fixed tier in ZK on Aleo testnet (only a commitment goes public)
• Relayer places the CoW order on Sepolia from its own funds
• Settles → relayer claims escrow; unfilled → you refund after expiry

App (Shield / Leo / Puzzle wallet): https://papilio.vitalveev.in/app
Full trade on explorers: https://papilio.vitalveev.in/testnet

It's a v1 with one trusted relayer; design doc lists 8 things that still leak. Would love feedback, especially on the trust model and what else leaks.

---

## Video descriptions

**papilio-explainer.mp4** (50s, 1920×1080, no audio)
> Papilio in 50 seconds: why every swap doxxes you, how Papilio locks your intent in zero knowledge on Aleo and settles it on CoW Protocol, and the real testnet transactions that prove it. Try it: papilio.vitalveev.in/app

**papilio-demo.mp4** (46s, 1920×1080, no audio)
> Walkthrough of the live Papilio app on testnet: connect an Aleo wallet, pick a tier, see what stays private, and track a real trade from lock to CoW settlement to escrow claim. Every link opens a public explorer.

Silent by design (autoplay feeds play muted). To add music, drop any royalty-free track in:
`ffmpeg -i papilio-explainer.mp4 -i track.mp3 -shortest -c:v copy -c:a aac out.mp4`
