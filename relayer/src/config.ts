import 'dotenv/config'

export const env = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback
  if (v === undefined) throw new Error(`Missing env var ${name} (see env.example)`)
  return v
}

export const SEPOLIA_CHAIN_ID = 11155111
// Same address on all CoW-supported chains, Sepolia included.
export const COW_VAULT_RELAYER = '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110'

// Sepolia test tokens CoW solvers actually fill.
export const TOKENS = {
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  COW: '0x0625aFB445C3B6B7B929342a04A22599fd5dBB59',
} as const

// Fixed denominations (base units of the sell token). A user reveals only
// the tier, never a bespoke amount. Values are Aleo-side u64 token units;
// sepoliaSellAmount is what the relayer actually sells (WETH wei).
export const DENOMINATIONS: Record<string, { aleoUnits: bigint; sepoliaSellAmount: bigint }> = {
  small: { aleoUnits: 10_000n, sepoliaSellAmount: 10n ** 15n },      // 0.001 WETH
  large: { aleoUnits: 100_000n, sepoliaSellAmount: 10n ** 16n },     // 0.01 WETH
}

// pair id (the `pair_hash` field on Aleo) -> Sepolia token pair.
export const PAIRS: Record<string, { sellToken: string; buyToken: string; label: string }> = {
  '1field': { sellToken: TOKENS.WETH, buyToken: TOKENS.COW, label: 'WETH->COW' },
}

export const EXPIRY_BLOCKS = 1_000 // ~ hours on Aleo testnet; refundable after
