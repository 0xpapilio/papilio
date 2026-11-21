# Deployment record

- **Program ID:** `papilio_intent.aleo`
- **Network:** Aleo testnet
- **Deploy tx:** [`at15ll5sp4hg2ej7vam6f4sq9uehk07khwmpdy23j2kfr9ctqhh5ypsqvjvje`](https://testnet.aleoscan.io/transaction?id=at15ll5sp4hg2ej7vam6f4sq9uehk07khwmpdy23j2kfr9ctqhh5ypsqvjvje) (fee 8.26 credits)
- **Explorer:** https://testnet.aleoscan.io/program?id=papilio_intent.aleo

## Happy path — `npm run demo`

| Step | Link |
|------|------|
| Aleo lock (only commitment public) | [`at1mcn4e3…hr4ue`](https://testnet.aleoscan.io/transaction?id=at1mcn4e3wfzkplv0mdx572ndqxqagymwpzswl9a3lhs2ty4eeke5zs4hr4ue) |
| CoW order (Sepolia) | [`0x8e48ce9f…81f4`](https://explorer.cow.fi/sepolia/orders/0x8e48ce9f85493b0277de15a43113bba9f7bb9c7ef166790c6a2d980ef61a6be6160319aa4441838d1284f0ae75b1bbb1016627f76b0181f4) |
| Settlement tx (Sepolia) | [`0xe9f7c15b…8632`](https://sepolia.etherscan.io/tx/0xe9f7c15b30ed10be94f3ed115d993a5ff4d6185e61144e3e59eaa38c48ff8632) |
| Aleo claim | [`at157prt5p…yrjkj5`](https://testnet.aleoscan.io/transaction?id=at157prt5psqf4ga8ljjsy63tpnngxg26fk2qze4qaqufll5y0wegpqyrjkj5) |

Solver-visible payload and full run record: [`docs/evidence/happy-path-run.json`](../../docs/evidence/happy-path-run.json).

## Failure path — `npm run demo:fail`

- Insufficient balance: proof generation refused, nothing published.
- Early refund (before expiry): rejected.
- Refund after expiry: [`at1w4c0gru…uye249`](https://testnet.aleoscan.io/transaction?id=at1w4c0grugcedjkjxhndwn443thzuu8xzn3nhwn8xnjh9rzlgtdqpquye249)
