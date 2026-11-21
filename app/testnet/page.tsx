import type { Metadata } from "next";
import DotArt from "@/components/DotArt";

export const metadata: Metadata = {
  title: "Papilio — live on testnet",
  description: "Papilio v1 on Aleo testnet + CoW Sepolia: deployed program, a settled private intent, and a refund. Every step links to a block explorer.",
};

const ALEO = "https://testnet.aleoscan.io/transaction?id=";

const RUN = [
  {
    step: "Lock",
    chain: "Aleo testnet",
    text: "The user locks 0.001 WETH-tier tokens in zero knowledge. Only a commitment hash and an expiry go public — no address, no balance.",
    label: "at1mcn4e3…hr4ue",
    href: `${ALEO}at1mcn4e3wfzkplv0mdx572ndqxqagymwpzswl9a3lhs2ty4eeke5zs4hr4ue`,
  },
  {
    step: "Order",
    chain: "CoW · Sepolia",
    text: "The relayer decrypts the intent and places an ordinary CoW order from its own funds. Solvers see a tier and a receiver, never the trader.",
    label: "0x8e48ce9f…81f4",
    href: "https://explorer.cow.fi/sepolia/orders/0x8e48ce9f85493b0277de15a43113bba9f7bb9c7ef166790c6a2d980ef61a6be6160319aa4441838d1284f0ae75b1bbb1016627f76b0181f4",
  },
  {
    step: "Settle",
    chain: "Sepolia",
    text: "Solvers fill the order in a CoW batch. WETH → COW lands at a fresh receiver address.",
    label: "0xe9f7c15b…8632",
    href: "https://sepolia.etherscan.io/tx/0xe9f7c15b30ed10be94f3ed115d993a5ff4d6185e61144e3e59eaa38c48ff8632",
  },
  {
    step: "Claim",
    chain: "Aleo testnet",
    text: "The relayer repays itself from the escrow. The commitment is closed; it can never be claimed or refunded again.",
    label: "at157prt5p…yrjkj5",
    href: `${ALEO}at157prt5psqf4ga8ljjsy63tpnngxg26fk2qze4qaqufll5y0wegpqyrjkj5`,
  },
];

const FAILS = [
  { case: "Balance below the tier", result: "No proof can be generated. Nothing is published." },
  { case: "Refund before expiry", result: "Rejected on-chain by the program." },
  {
    case: "Order never fills",
    result: "User refunds after expiry.",
    label: "at1w4c0gru…uye249",
    href: `${ALEO}at1w4c0grugcedjkjxhndwn443thzuu8xzn3nhwn8xnjh9rzlgtdqpquye249`,
  },
];

const LEAKS = ["Token pair", "Tier amount", "Receiver address", "Timing across chains", "Single relayer owner"];

function TxLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-mono text-xs tracking-wider text-acc underline-offset-4 hover:underline">
      {label} ↗
    </a>
  );
}

export default function Testnet() {
  return (
    <div className="mx-auto max-w-[1100px] px-5">
      <nav className="flex items-center gap-6 border-b border-line py-4">
        <a href="/" className="mr-auto flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <DotArt art="fly" n={48} className="w-8" />
          papilio
        </a>
        <a href="/" className="btn">Join waitlist</a>
      </nav>

      <header className="pt-12 pb-14 md:pt-20">
        <p className="label">
          V1 · testnet
          <span className="ml-2.5 rounded-full border border-acc/40 px-2.5 py-0.5 text-acc">live</span>
        </p>
        <h1 className="mt-3.5 mb-4.5 font-display text-[clamp(36px,6vw,60px)] leading-[1.04] font-bold tracking-tight">
          A private intent, settled. <span className="text-acc">Check every step.</span>
        </h1>
        <p className="max-w-[560px] text-[17px] text-dim">
          Papilio v1 runs on Aleo testnet and CoW Protocol on Sepolia. Below is one real trade end to end — every link opens a public block explorer.
        </p>
        <p className="mt-6 font-mono text-xs tracking-wider text-dim">
          Program{" "}
          <TxLink href="https://testnet.aleoscan.io/program?id=papilio_intent.aleo" label="papilio_intent.aleo" />
        </p>
      </header>

      <section className="border-t border-line py-16">
        <p className="label">One trade</p>
        <h2 className="mt-2.5 mb-8 font-display text-[clamp(28px,4vw,40px)] font-bold tracking-tight">Lock → order → settle → claim.</h2>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {RUN.map((r, i) => (
            <li key={r.step} className="card flex flex-col">
              <p className="font-mono text-xs tracking-wider text-acc">0{i + 1} · {r.chain}</p>
              <h3 className="my-1 font-display text-xl font-bold tracking-tight">{r.step}</h3>
              <p className="mb-4 text-[15px] text-dim">{r.text}</p>
              <div className="mt-auto"><TxLink href={r.href} label={r.label} /></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line py-16">
        <p className="label">When things go wrong</p>
        <h2 className="mt-2.5 mb-8 font-display text-[clamp(28px,4vw,40px)] font-bold tracking-tight">Funds are never stranded.</h2>
        <ul className="card">
          {FAILS.map((f) => (
            <li key={f.case} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-line py-3.5 first:border-t-0 first:pt-0 last:pb-0">
              <span className="font-display font-bold">{f.case}</span>
              <span className="text-[15px] text-dim">
                {f.result} {f.href && <TxLink href={f.href} label={f.label!} />}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line py-16">
        <p className="label">Honest limits</p>
        <h2 className="mt-2.5 mb-4 font-display text-[clamp(28px,4vw,40px)] font-bold tracking-tight">What v1 still reveals.</h2>
        <p className="mb-6 max-w-[620px] text-[15px] text-dim">
          Your wallet and balance stay hidden. These do not — yet. v1 also trusts a single relayer to place the order before it claims; v2 makes the claim require proof of settlement.
        </p>
        <ul className="flex flex-wrap gap-2.5">
          {LEAKS.map((l) => (
            <li key={l} className="rounded-full border border-line px-3.5 py-1.5 font-mono text-xs tracking-wider text-dim">{l}</li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap items-center gap-4 border-t border-line py-7 font-mono text-xs tracking-wider text-dim">
        <DotArt art="fly" n={48} className="w-6" />
        <span className="mr-auto">Testnet only. No token. Papilio never holds your funds.</span>
        <a href="/" className="hover:text-ink">Home</a>
      </footer>
    </div>
  );
}
