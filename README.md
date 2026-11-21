# Papilio

Private trade intents. Commit to a trade on **Aleo** in zero knowledge; a
relayer settles it on **CoW Protocol**. Your wallet and balance never appear
on either chain.

**v1 is a testnet skeleton** — Aleo testnet + Sepolia, one trusted relayer,
no token, no mainnet. What it proves, what it trusts, and what still leaks:
[`docs/design.md`](docs/design.md).

```
user ──lock(zk)──▶ Aleo escrow ──encrypted intent──▶ relayer ──order──▶ CoW (Sepolia)
  ▲                                                                        │
  └────────────── refund if unfilled ◀──────────── claim after settlement ─┘
```

## Repo map

| Path | What |
|------|------|
| [`docs/design.md`](docs/design.md) | flow, who-learns-what, trust model, leak list |
| [`aleo/papilio_intent/`](aleo/papilio_intent) | Leo program: lock / claim / refund + tests |
| [`relayer/`](relayer) | TS relayer: decrypt intent → CoW order → claim; evidence logs |
| [`docs/grant-aleo.md`](docs/grant-aleo.md), [`docs/grant-cow.md`](docs/grant-cow.md) | grant cover pages |
| [`app/`](app) | landing page (Next.js, [papilio site](https://papilio.network)) |

## Reproduce in five commands

```bash
cd aleo/papilio_intent && leo build && ./tests/test.sh   # 1-2: program + proofs
cd ../../relayer && npm install && npm test              # 3-4: relayer units
cp env.example .env   # fill testnet keys, then:  npm run demo
```

Deployed program ID and a settled order link are recorded in
[`aleo/papilio_intent/DEPLOYMENT.md`](aleo/papilio_intent/DEPLOYMENT.md)
after first deploy.

## Acceptance status

- [ ] Leo proof verifies with sufficient balance, fails without, balance never public — `aleo/papilio_intent/tests/test.sh`
- [ ] Sepolia order settles end-to-end from a verified commitment — `npm run demo`
- [ ] Unfilled intent refunds after expiry — `npm run demo:fail`
- [x] `design.md` lists ≥ 3 leaks at settlement (it lists 7)
- [x] No mainnet code — CI-enforced by `scripts/check-no-mainnet.sh`
- [x] No private key leaves the local machine (keys live only in untracked `.env`)

## Landing page

```bash
npm install && npm run dev   # http://localhost:3000
```

## License

MIT — see [LICENSE](LICENSE).
