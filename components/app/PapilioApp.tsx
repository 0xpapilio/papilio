"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AleoWalletProvider, useWallet } from "@provablehq/aleo-wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton, useWalletModal } from "@provablehq/aleo-wallet-adapter-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adapter-shield";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adapter-leo";
import { PuzzleWalletAdapter } from "@provablehq/aleo-wallet-adapter-puzzle";
import { WalletDecryptPermission } from "@provablehq/aleo-wallet-standard";
import { Network } from "@provablehq/aleo-types";
import "@provablehq/aleo-wallet-adapter-react-ui/dist/styles.css";
import DotArt from "@/components/DotArt";
import Burst from "@/components/Burst";
import { ToastProvider, useToast } from "./Toasts";
import {
  BLOCK_SECONDS, EXPIRY_BLOCKS, MINT_UNITS, PAIR_ID, PROGRAM, RELAYER_ALEO, TIERS, type Tier,
  aleoTx, cowOrder, findCowOrder, fmtUnits, isEvmAddress, latestHeight, lockCommitment, mapping,
  num, quoteCow, randomScalar, receiverToField, sepoliaTx, settlementTx,
} from "@/lib/papilio";

// ---------- types + local persistence ----------

type Rec = { uid?: string; recordView?: { fields: Record<string, string> }; [k: string]: unknown };
type Intent = {
  walletTxId: string;
  onchainId?: string;
  tierId: Tier["id"];
  receiver: string;
  createdAt: number;
  commitment?: string;
  expiry?: number;
};

const STORE = "papilio:intents";
const loadIntents = (): Intent[] => {
  try { return JSON.parse(localStorage.getItem(STORE) ?? "[]"); } catch { return []; }
};
const saveIntents = (v: Intent[]) => {
  try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* private mode: session-only */ }
};

const fields = (r: Rec) => r.recordView?.fields ?? {};
const tierOf = (id: string) => TIERS.find((t) => t.id === id) ?? TIERS[0];
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const mins = (blocks: number) => Math.max(1, Math.round((blocks * BLOCK_SECONDS) / 60));

// ---------- root ----------

export default function PapilioApp() {
  return (
    <ToastProvider>
      <Wallets />
    </ToastProvider>
  );
}

function Wallets() {
  const toast = useToast();
  const wallets = useMemo(
    () => [new ShieldWalletAdapter(), new LeoWalletAdapter({ appName: "Papilio" }), new PuzzleWalletAdapter()],
    [],
  );
  // Without this the library only console.logs wallet failures, so a locked or refusing wallet looks like a dead button.
  const onError = useCallback((e: Error) => toast("error", "Your wallet didn't connect", e.message || e.name || undefined), [toast]);
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={Network.TESTNET}
      autoConnect
      onError={onError}
      decryptPermission={WalletDecryptPermission.UponRequest}
      programs={[PROGRAM, "credits.aleo"]}
    >
      <WalletModalProvider>
        <Shell />
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}

// ---------- page ----------

function Shell() {
  const w = useWallet();
  const toast = useToast();
  const [height, setHeight] = useState<number | null>(null);
  const [records, setRecords] = useState<Rec[]>([]);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [privateFee, setPrivateFee] = useState(true);
  const [busy, setBusy] = useState<"" | "mint" | "lock" | string>("");

  useEffect(() => setIntents(loadIntents()), []);
  const updateIntent = useCallback((walletTxId: string, patch: Partial<Intent>) => {
    setIntents((all) => {
      const next = all.map((i) => (i.walletTxId === walletTxId ? { ...i, ...patch } : i));
      saveIntents(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const tick = () => latestHeight().then(setHeight).catch(() => {});
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  const refreshRecords = useCallback(async () => {
    if (!w.connected) return setRecords([]);
    try {
      setRecords((await w.requestRecords(PROGRAM, true, "unspent")) as Rec[]);
    } catch (e) {
      toast("error", "Couldn't read your private balance", errText(e));
    }
  }, [w]);
  useEffect(() => { refreshRecords(); }, [w.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const tokens = records.filter((r) => fields(r).amount && !fields(r).commitment);
  const tickets = records.filter((r) => fields(r).commitment);
  const balance = tokens.reduce((s, r) => s + num(fields(r).amount), 0);

  async function run(kind: string, fn: () => Promise<void>, done: [string, string]): Promise<boolean> {
    setBusy(kind);
    try {
      await fn();
      toast("success", ...done);
      return true;
    } catch (e) {
      const msg = errText(e);
      if (/reject|denied|cancel|declined/i.test(msg)) toast("info", "Cancelled in your wallet", "Nothing was sent. Try again whenever you're ready.");
      else toast("error", FAILED[kind.split(":")[0]] ?? "That didn't fly", msg);
      return false;
    } finally {
      setBusy("");
    }
  }

  // Say hello when a wallet connects (including auto-reconnect on load).
  const wasConnected = useRef(false);
  useEffect(() => {
    if (w.connected && !wasConnected.current) toast("success", "Wallet connected", "Your private balance loads in a moment.");
    wasConnected.current = w.connected;
  }, [w.connected, toast]);

  const mint = () =>
    run("mint", async () => {
      const res = await w.executeTransaction({ program: PROGRAM, function: "mint", inputs: [`${MINT_UNITS}u64`], privateFee });
      if (!res) throw new Error("Wallet did not return a transaction");
      setTimeout(refreshRecords, 25_000); // record appears once the wallet syncs the block
    }, ["Test tokens on the way", "They show up in about 30 seconds, once your wallet syncs."]);

  const lock = (tier: Tier, receiver: string) =>
    run("lock", async () => {
      const token = tokens.find((r) => num(fields(r).amount) >= tier.units);
      if (!token) throw new Error("No single test-token record covers this tier. Get test tokens first.");
      const h = height ?? (await latestHeight());
      const res = await w.executeTransaction({
        program: PROGRAM,
        function: "lock_intent",
        inputs: [
          token.uid
            ? { type: "record", program: PROGRAM, recordname: "Token", uid: token.uid }
            : { type: "record", program: PROGRAM, recordname: "Token" },
          `${tier.units}u64`,
          PAIR_ID,
          receiverToField(receiver),
          RELAYER_ALEO,
          `${h + EXPIRY_BLOCKS}u32`,
          randomScalar(),
        ],
        privateFee,
      });
      if (!res) throw new Error("Wallet did not return a transaction");
      const intent: Intent = { walletTxId: res.transactionId, tierId: tier.id, receiver, createdAt: Date.now() };
      setIntents((all) => {
        const next = [intent, ...all];
        saveIntents(next);
        return next;
      });
    }, ["Trade shielded", "Locked in zero knowledge. Watch it settle below."]);

  const refund = (ticket: Rec) =>
    run(`refund:${fields(ticket).commitment}`, async () => {
      const res = await w.executeTransaction({
        program: PROGRAM,
        function: "refund",
        inputs: [{ type: "record", program: PROGRAM, recordname: "RefundTicket", ...(ticket.uid ? { uid: ticket.uid } : {}) }],
        privateFee,
      });
      if (!res) throw new Error("Wallet did not return a transaction");
      setTimeout(refreshRecords, 25_000);
    }, ["Refund sent", "Your escrow is on its way back to your wallet."]);

  const ticketFor = (commitment?: string) => tickets.find((t) => fields(t).commitment?.replace(/\.(private|public)$/, "") === commitment);
  const orphanTickets = tickets.filter((t) => !intents.some((i) => i.commitment && fields(t).commitment?.startsWith(i.commitment)));

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 sm:px-5">
      <nav className="flex items-center gap-3 border-b border-line py-4">
        <a href="/" className="mr-auto flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <DotArt art="fly" n={48} className="w-8" />
          papilio
          <span className="ml-1 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] font-normal tracking-wider text-dim uppercase">testnet</span>
        </a>
        <span className="hidden items-center gap-1.5 font-mono text-xs tracking-wider text-dim sm:flex">
          <span className="size-1.5 rounded-full bg-[#13bc80]" />
          Aleo {height ? `#${height.toLocaleString()}` : "…"}
        </span>
        <WalletButton />
      </nav>


      <div className="mx-auto mt-10 w-full max-w-[460px]">
        <SwapCard
          connected={w.connected}
          balance={balance}
          busy={busy}
          privateFee={privateFee}
          setPrivateFee={setPrivateFee}
          onMint={mint}
          onLock={lock}
          onRefresh={refreshRecords}
        />

      </div>

      <section id="intents" aria-label="Your intents" className="mx-auto mt-12 w-full max-w-[680px] min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="label">Your intents</p>
            {w.connected && (
              <button onClick={refreshRecords} className="font-mono text-xs tracking-wider text-dim hover:text-ink">refresh ↻</button>
            )}
          </div>
          {intents.length === 0 && orphanTickets.length === 0 ? (
            <EmptyState connected={w.connected} />
          ) : (
            <ul className="space-y-3">
              {intents.map((i) => (
                <IntentRow
                  key={i.walletTxId}
                  intent={i}
                  height={height}
                  update={updateIntent}
                  ticket={ticketFor(i.commitment)}
                  onRefund={refund}
                  busy={busy}
                />
              ))}
              {orphanTickets.map((t) => (
                <TicketRow key={fields(t).commitment} ticket={t} height={height} onRefund={refund} busy={busy} />
              ))}
            </ul>
          )}
        </section>

      <HowItWorks />
    </div>
  );
}

// ---------- wallet button ----------

// Disconnected, the stock button retries the last-used wallet and swallows any error, so a click can do
// nothing visible. Always open the picker instead; choosing there connects and reports errors via onError.
function WalletButton() {
  const w = useWallet();
  const { setVisible } = useWalletModal();
  if (w.connected) return <WalletMultiButton />;
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        w.selectWallet(null);
        setVisible(true);
      }}
    >
      {w.connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

// ---------- swap card ----------

function SwapCard(p: {
  connected: boolean;
  balance: number;
  busy: string;
  privateFee: boolean;
  setPrivateFee: (v: boolean) => void;
  onMint: () => void;
  onLock: (t: Tier, receiver: string) => Promise<boolean>;
  onRefresh: () => void;
}) {
  const [tier, setTier] = useState<Tier>(TIERS[0]);
  const [receiver, setReceiver] = useState("");
  const [quote, setQuote] = useState<bigint | null>(null);
  const [bursts, setBursts] = useState(0);
  const locking = p.busy === "lock";
  const validReceiver = isEvmAddress(receiver);
  const enough = p.balance >= tier.units;

  useEffect(() => {
    let live = true;
    setQuote(null);
    const get = () => quoteCow(tier, receiver).then((q) => live && setQuote(q)).catch(() => live && setQuote(null));
    get();
    const t = setInterval(get, 30_000);
    return () => { live = false; clearInterval(t); };
  }, [tier]); // eslint-disable-line react-hooks/exhaustive-deps

  // On success, like other swap apps: clear the form, celebrate, and bring the new intent into view.
  const shield = async () => {
    if (!(await p.onLock(tier, receiver))) return;
    setReceiver("");
    setBursts((b) => b + 1);
    setTimeout(() => document.getElementById("intents")?.scrollIntoView({ behavior: "smooth", block: "start" }), 900);
  };
  const loading = (text: string) => (
    <span className="inline-flex items-center justify-center gap-2.5">
      <DotArt art="fly" n={24} flap speed={8} className="w-5" />
      {text}
    </span>
  );
  let cta: { label: React.ReactNode; disabled: boolean; action: () => void } = { label: "Shield & swap", disabled: false, action: shield };
  if (!p.connected) cta = { label: "Connect a wallet to start", disabled: true, action: () => {} };
  else if (!enough) cta = { label: p.busy === "mint" ? loading("Minting test tokens…") : "Get test tokens", disabled: p.busy !== "", action: p.onMint };
  else if (locking) cta = { label: loading("Confirm in your wallet…"), disabled: true, action: () => {} };
  else if (!validReceiver) cta = { label: "Enter a Sepolia receiver", disabled: true, action: () => {} };

  return (
    <section aria-label="Shield and swap" aria-busy={locking} className="card self-start p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold tracking-tight">Shield & swap</h1>
        <span className="font-mono text-[11px] tracking-wider text-dim">Aleo → CoW · Sepolia</span>
      </div>

      <div className="rounded-lg border border-line bg-bg p-3.5">
        <div className="flex items-center justify-between font-mono text-[11px] tracking-wider text-dim uppercase">
          <span>You shield</span>
          <span>
            {p.connected ? (
              <>Private balance {(p.balance / TIERS[0].units * Number(TIERS[0].label)).toFixed(3)}{" "}
                <button onClick={p.onRefresh} className="text-acc hover:underline" aria-label="Refresh balance">↻</button></>
            ) : "—"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div role="radiogroup" aria-label="Amount tier" className="flex gap-2">
            {TIERS.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={tier.id === t.id}
                onClick={() => setTier(t)}
                disabled={locking}
                className={`rounded-lg border px-3 py-1.5 font-display text-2xl font-bold transition ${tier.id === t.id ? "border-acc text-ink" : "border-line text-faint hover:text-dim"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="ml-auto rounded-full border border-line px-3 py-1 text-sm font-medium">WETH</span>
        </div>
        <p className="mt-2 text-xs text-faint">Fixed tiers: every Papilio order in a tier looks the same.</p>
      </div>

      <div className="relative z-10 -my-2.5 flex justify-center" aria-hidden>
        <span className="rounded-md border border-line bg-card px-2 py-0.5 font-mono text-xs text-acc">↓</span>
      </div>

      <div className="rounded-lg border border-line bg-bg p-3.5">
        <div className="font-mono text-[11px] tracking-wider text-dim uppercase">You receive (est.)</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-2xl font-bold">{quote === null ? "…" : `≈ ${fmtUnits(quote, 18, 3)}`}</span>
          <span className="ml-auto rounded-full border border-line px-3 py-1 text-sm font-medium">COW</span>
        </div>
        <p className="mt-2 text-xs text-faint">Live CoW quote. Solvers compete; you get the batch price.</p>
      </div>

      <label className="mt-4 block">
        <span className="font-mono text-[11px] tracking-wider text-dim uppercase">Receiver on Sepolia</span>
        <input
          value={receiver}
          onChange={(e) => setReceiver(e.target.value.trim())}
          disabled={locking}
          placeholder="0x… (use a fresh address)"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={receiver !== "" && !validReceiver}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 font-mono text-sm outline-none placeholder:text-faint focus:border-acc aria-[invalid=true]:border-[#fe514e]"
        />
      </label>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-dim">
        <input type="checkbox" checked={p.privateFee} onChange={(e) => p.setPrivateFee(e.target.checked)} className="mt-1 accent-[#00aaff]" />
        <span>
          Pay the Aleo fee privately <span className="text-faint">(needs private credits; a public fee reveals your address)</span>
        </span>
      </label>

      <PrivacyReadout privateFee={p.privateFee} />

      <div className="relative">
        {bursts > 0 && <Burst key={bursts} />}
      </div>
      <button onClick={cta.action} disabled={cta.disabled} className={`btn mt-4 w-full py-3 text-base disabled:cursor-not-allowed ${locking || p.busy === "mint" ? "disabled:opacity-80" : "disabled:opacity-50"}`}>
        {cta.label}
      </button>
      <p className="mt-2.5 text-center text-xs text-faint">
        Unfilled after ~{mins(EXPIRY_BLOCKS)} min? You can refund the escrow yourself.
      </p>
    </section>
  );
}

function PrivacyReadout({ privateFee }: { privateFee: boolean }) {
  const rows: [string, boolean][] = [
    ["Your Aleo address", privateFee],
    ["Your balance", true],
    ["Tier, pair, receiver", false],
  ];
  return (
    <ul className="mt-4 rounded-lg border border-line" aria-label="What this trade reveals">
      {rows.map(([what, hidden]) => (
        <li key={what} className="flex justify-between border-t border-line px-3 py-2 font-mono text-xs tracking-wider first:border-t-0">
          <span className="text-dim">{what}</span>
          <span className={hidden ? "text-acc" : "text-faint"}>{hidden ? "HIDDEN" : "PUBLIC"}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------- intent tracker ----------

const FAILED: Record<string, string> = {
  mint: "Couldn't get test tokens",
  lock: "Couldn't shield your trade",
  refund: "The refund didn't go through",
};
// Toast for each stage an intent reaches while you watch. A missing text falls back to the trade ("0.001 WETH → COW").
const ANNOUNCE: Record<Phase, ["success" | "error" | "info", string, string?]> = {
  proving: ["info", "Proving in your wallet"],
  locked: ["info", "Locked on Aleo", "Your intent is shielded on-chain."],
  ordered: ["info", "CoW order placed", "Solvers are competing for your trade."],
  settled: ["success", "Settled on Sepolia", "Your COW has landed at the receiver."],
  claimed: ["success", "Trade complete", "Every step is on a public explorer."],
  expired: ["info", "Intent expired", "You can refund the escrow now."],
  refunded: ["success", "Refunded", "Your escrow is back in your wallet."],
  failed: ["error", "Your intent failed"],
};

type Phase = "proving" | "locked" | "ordered" | "settled" | "claimed" | "expired" | "refunded" | "failed";
const STEPS: { key: Phase; label: string }[] = [
  { key: "proving", label: "Proved in wallet" },
  { key: "locked", label: "Locked on Aleo" },
  { key: "ordered", label: "CoW order placed" },
  { key: "settled", label: "Settled on Sepolia" },
  { key: "claimed", label: "Escrow claimed" },
];

function IntentRow({ intent, height, update, ticket, onRefund, busy }: {
  intent: Intent;
  height: number | null;
  update: (id: string, patch: Partial<Intent>) => void;
  ticket?: Rec;
  onRefund: (t: Rec) => void;
  busy: string;
}) {
  const w = useWallet();
  const tier = tierOf(intent.tierId);
  const [phase, setPhase] = useState<Phase>(intent.commitment ? "locked" : "proving");
  const [order, setOrder] = useState<{ uid: string; status: string } | null>(null);
  const [settleTx, setSettleTx] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const terminal = phase === "claimed" || phase === "refunded" || phase === "failed";
  const toast = useToast();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const caughtUp = useRef(false); // the first poll only catches up on old progress; announce changes after that

  useEffect(() => {
    if (terminal) return;
    let live = true;
    const go = (next: Phase) => {
      if (caughtUp.current && next !== phaseRef.current) {
        const [kind, title, text] = ANNOUNCE[next];
        toast(kind, title, text ?? `${tier.label} WETH → COW`);
      }
      setPhase(next);
    };
    async function poll() {
      try {
        // 1. wallet tx -> on-chain id -> commitment
        let onchainId = intent.onchainId;
        if (!onchainId && intent.walletTxId.startsWith("at1")) onchainId = intent.walletTxId;
        if (!onchainId && w.connected) {
          // Wallets hand back their own request id until the tx is broadcast.
          const s = await Promise.resolve().then(() => w.transactionStatus(intent.walletTxId)).catch(() => null);
          if (s && /fail|reject|abort/i.test(s.status)) { go("failed"); setNote(s.status); return; }
          onchainId = s?.transactionId?.startsWith("at1") ? s.transactionId : undefined;
        }
        if (onchainId && !intent.onchainId) update(intent.walletTxId, { onchainId });
        let { commitment, expiry } = intent;
        if (onchainId && !commitment) {
          const c = await lockCommitment(onchainId).catch((e) => { if (/rejected|aborted/.test(errText(e))) throw e; return null; });
          if (c) { ({ commitment, expiry } = c); update(intent.walletTxId, c); }
        }
        if (!commitment) return;

        // 2. CoW side
        const o = await findCowOrder(intent.receiver, tier, intent.createdAt).catch(() => null);
        if (o) setOrder({ uid: o.uid, status: o.status });
        if (o?.status === "fulfilled" && !settleTx) setSettleTx(await settlementTx(o.uid).catch(() => null));

        // 3. Escrow state on Aleo
        const escrow = await mapping("escrow_amount", commitment);
        if (!live) return;
        if (escrow === null) go(o?.status === "fulfilled" ? "claimed" : "refunded");
        else if (o?.status === "fulfilled") go("settled");
        else if (expiry && height && height >= expiry) go("expired");
        else go(o ? "ordered" : "locked");
      } catch (e) {
        if (live) { go("failed"); setNote(errText(e)); }
      } finally {
        caughtUp.current = true;
      }
    }
    poll();
    const t = setInterval(poll, 8_000);
    return () => { live = false; clearInterval(t); };
  }, [intent, height, terminal]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepIndex = STEPS.findIndex((s) => s.key === phase);
  const blocksLeft = intent.expiry && height ? intent.expiry - height : null;

  return (
    <li className="card intent-enter p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold tracking-tight">
          {tier.label} WETH → COW
        </p>
        <StatusPill phase={phase} />
      </div>
      <p className="mt-0.5 truncate font-mono text-xs tracking-wider text-dim" title={intent.receiver}>
        to {intent.receiver.slice(0, 8)}…{intent.receiver.slice(-6)} · {new Date(intent.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>

      {phase !== "failed" && phase !== "refunded" && phase !== "expired" && (
        <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = i < stepIndex || phase === "claimed";
            const active = i === stepIndex && phase !== "claimed";
            return (
              <li key={s.key} className="min-w-0">
                <div className={`h-1 rounded-full ${done ? "bg-acc" : active ? "animate-pulse bg-acc/50" : "bg-line"}`} />
                <p className={`mt-1.5 text-[11px] leading-tight ${done || active ? "text-ink" : "text-faint"}`}>{s.label}</p>
              </li>
            );
          })}
        </ol>
      )}

      {phase === "expired" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3 py-2.5 text-sm">
          <span className="text-dim">Not filled before expiry. Your escrow is refundable.</span>
          {ticket ? (
            <button className="btn" disabled={busy !== ""} onClick={() => onRefund(ticket)}>
              {busy.startsWith("refund") ? "Confirm in wallet…" : "Refund"}
            </button>
          ) : (
            <span className="text-xs text-faint">Refund ticket not found in this wallet yet. Refresh.</span>
          )}
        </div>
      )}
      {phase === "failed" && <p className="mt-3 text-sm text-[#fe514e]">Transaction failed{note ? `: ${note}` : ""}. Nothing was locked.</p>}
      {phase === "refunded" && <p className="mt-3 text-sm text-dim">Escrow refunded to your wallet.</p>}
      {(phase === "locked" || phase === "ordered") && blocksLeft !== null && blocksLeft > 0 && (
        <p className="mt-3 text-xs text-faint">Refund unlocks in ~{mins(blocksLeft)} min if the relayer doesn&apos;t fill it.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {intent.onchainId && <ExtLink href={aleoTx(intent.onchainId)}>Aleo lock</ExtLink>}
        {order && <ExtLink href={cowOrder(order.uid)}>CoW order</ExtLink>}
        {settleTx && <ExtLink href={sepoliaTx(settleTx)}>Settlement</ExtLink>}
      </div>
    </li>
  );
}

// A RefundTicket in the wallet with no local history (e.g. another device).
function TicketRow({ ticket, height, onRefund, busy }: { ticket: Rec; height: number | null; onRefund: (t: Rec) => void; busy: string }) {
  const f = fields(ticket);
  const commitment = f.commitment.replace(/\.(private|public)$/, "");
  const expiry = num(f.expiry);
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => { mapping("escrow_amount", commitment).then((v) => setOpen(v !== null)); }, [commitment, height]);
  if (open === false) return null; // claimed or refunded: nothing to do
  const canRefund = open && height !== null && height >= expiry;
  return (
    <li className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="font-display font-bold">Open escrow · {num(f.amount) / TIERS[0].units * Number(TIERS[0].label)} WETH tier</p>
        <p className="font-mono text-xs tracking-wider text-dim">
          {canRefund ? "expired, refundable" : height ? `refundable in ~${mins(expiry - height)} min` : "…"}
        </p>
      </div>
      <button className="btn" disabled={!canRefund || busy !== ""} onClick={() => onRefund(ticket)}>Refund</button>
    </li>
  );
}

function StatusPill({ phase }: { phase: Phase }) {
  const map: Record<Phase, [string, string]> = {
    proving: ["Proving", "text-dim"],
    locked: ["Waiting for relayer", "text-dim"],
    ordered: ["Solvers competing", "text-acc"],
    settled: ["Settled", "text-acc"],
    claimed: ["Complete", "text-[#13bc80]"],
    expired: ["Refundable", "text-[#faad2b]"],
    refunded: ["Refunded", "text-dim"],
    failed: ["Failed", "text-[#fe514e]"],
  };
  const [label, tone] = map[phase];
  return <span className={`rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] tracking-wider uppercase ${tone}`}>{label}</span>;
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-mono text-xs tracking-wider text-acc underline-offset-4 hover:underline">
      {children} ↗
    </a>
  );
}

function EmptyState({ connected }: { connected: boolean }) {
  const steps = connected
    ? ["Get test tokens (one click, free)", "Pick a tier and a fresh Sepolia receiver", "Shield & swap, then watch it settle here"]
    : ["Connect Shield, Leo or Puzzle wallet (Aleo testnet)", "Have a few testnet credits for fees", "Shield a trade and watch it settle here"];
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <DotArt art="chr" n={64} className="w-28" />
      <p className="mt-4 font-display text-lg font-bold">No intents yet</p>
      <ol className="mt-3 space-y-1.5 text-sm text-dim">
        {steps.map((s, i) => (
          <li key={s}><span className="mr-2 font-mono text-xs text-acc">0{i + 1}</span>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="mt-12 grid gap-4 border-t border-line pt-8 md:grid-cols-3">
      {[
        ["01 · Aleo", "Lock in zero knowledge", "Your wallet proves you hold the tier. Only a commitment hash and expiry go on-chain."],
        ["02 · Relayer", "Order on CoW", "The relayer decrypts your note and places a standard CoW order from its own funds."],
        ["03 · Sepolia", "Settle, then claim", "Solvers fill it in a batch. The relayer is repaid from your escrow; unfilled means you refund."],
      ].map(([k, t, d]) => (
        <div key={k}>
          <p className="font-mono text-xs tracking-wider text-acc">{k}</p>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight">{t}</h2>
          <p className="mt-1 text-sm text-dim">{d}</p>
        </div>
      ))}
      <p className="font-mono text-xs leading-relaxed tracking-wider text-faint md:col-span-3">
        Testnet only · v1 trusts a single relayer to trade before it claims ·{" "}
        <a href="/testnet" className="text-dim hover:text-ink">verified runs</a>
      </p>
    </section>
  );
}
