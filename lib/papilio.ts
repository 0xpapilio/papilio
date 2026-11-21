// Papilio v1 constants + public-API reads used by the /app page.
// Everything here is public on-chain data; nothing needs a backend of ours.

export const PROGRAM = "papilio_intent.aleo";
export const ALEO_API = "https://api.explorer.provable.com/v1/testnet";
export const COW_API = "https://api.cow.fi/sepolia/api/v1";

// The v1 relayer (public addresses; mirror relayer/.env).
export const RELAYER_ALEO = "aleo14hmmhxfdfg26kfnajeqle58whvumgu5emekzyvtqz6c4ayx7xqgq66lzvt";
export const RELAYER_SEPOLIA = "0x160319aa4441838d1284F0ae75b1BBb1016627F7";

export const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
export const COW = "0x0625aFB445C3B6B7B929342a04A22599fd5dBB59";
export const PAIR_ID = "1field"; // WETH -> COW, see relayer/src/config.ts PAIRS

// Mirrors relayer/src/config.ts DENOMINATIONS.
export const TIERS = [
  { id: "small", label: "0.001", units: 10_000, wei: BigInt(1e15) },
  { id: "large", label: "0.01", units: 100_000, wei: BigInt(1e16) },
] as const;
export type Tier = (typeof TIERS)[number];

export const EXPIRY_BLOCKS = 1_000; // ~35 min at ~2s blocks
export const BLOCK_SECONDS = 2;
export const MINT_UNITS = 1_000_000;

export const aleoTx = (id: string) => `https://testnet.aleoscan.io/transaction?id=${id}`;
export const cowOrder = (uid: string) => `https://explorer.cow.fi/sepolia/orders/${uid}`;
export const sepoliaTx = (h: string) => `https://sepolia.etherscan.io/tx/${h}`;

export const isEvmAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);
export const receiverToField = (a: string) => `${BigInt(a)}field`;

// 31 random bytes < 2^248, safely below the scalar field modulus.
export const randomScalar = () =>
  `${BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(31)), (b) => b.toString(16).padStart(2, "0")).join(""))}scalar`;

export const num = (v: string | undefined) => Number(String(v ?? "").replace(/(u\d+|field)(\.(private|public))?$/, ""));

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

export const latestHeight = async () => Number(await json(`${ALEO_API}/block/height/latest`));

export async function mapping(name: string, key: string): Promise<string | null> {
  const r = await fetch(`${ALEO_API}/program/${PROGRAM}/mapping/${name}/${key}`);
  if (!r.ok) return null;
  const v = await r.json();
  return v === null ? null : String(v);
}

// Commitment of an accepted lock tx, read from its public finalize arguments
// (the compiler orders them freely, so match by type, not position).
export async function lockCommitment(txId: string): Promise<{ commitment: string; expiry: number } | null> {
  const r = await fetch(`${ALEO_API}/transaction/confirmed/${txId}`);
  if (!r.ok) return null;
  const c = await r.json();
  if (c.status !== "accepted") throw new Error(`lock ${c.status} on-chain`);
  const fut = c.transaction.execution.transitions
    .flatMap((t: { outputs: { type: string; value: string }[] }) => t.outputs)
    .find((o: { type: string }) => o.type === "future")?.value as string | undefined;
  const commitment = fut?.match(/(\d+)field/)?.[1];
  const expiry = fut?.match(/(\d+)u32/)?.[1];
  return commitment && expiry ? { commitment: `${commitment}field`, expiry: Number(expiry) } : null;
}

// What the relayer would get for this tier right now (indicative).
export async function quoteCow(tier: Tier, receiver: string): Promise<bigint> {
  const q = await json(`${COW_API}/quote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sellToken: WETH,
      buyToken: COW,
      from: RELAYER_SEPOLIA,
      receiver: isEvmAddress(receiver) ? receiver : RELAYER_SEPOLIA,
      kind: "sell",
      sellAmountBeforeFee: tier.wei.toString(),
    }),
  });
  return BigInt(q.quote.buyAmount);
}

export type CowOrder = { uid: string; status: string; receiver: string; creationDate: string; sellAmount: string };

// The relayer's order for this receiver + tier, placed after the lock.
export async function findCowOrder(receiver: string, tier: Tier, after: number): Promise<CowOrder | null> {
  const orders: CowOrder[] = await json(`${COW_API}/account/${RELAYER_SEPOLIA}/orders?limit=50`);
  return (
    orders.find(
      (o) =>
        o.receiver?.toLowerCase() === receiver.toLowerCase() &&
        o.sellAmount === tier.wei.toString() &&
        Date.parse(o.creationDate) >= after - 60_000,
    ) ?? null
  );
}

export async function settlementTx(uid: string): Promise<string | null> {
  const trades: { txHash?: string }[] = await json(`${COW_API}/trades?orderUid=${uid}`);
  return trades[0]?.txHash ?? null;
}

export const fmtUnits = (v: bigint, decimals = 18, dp = 4) => {
  const s = v.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).slice(0, dp).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
};
