// Papilio v1 relayer. Given an accepted Aleo lock tx:
//   decrypt IntentNote -> place CoW order on Sepolia -> wait for settlement
//   -> claim the Aleo escrow -> write a JSON evidence log.
// Usage: npm run relayer -- <aleo_lock_tx_id>   (one intent)
//        npm run relayer                        (watch: scan new blocks forever)
import { Wallet, providers } from 'ethers'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DENOMINATIONS, PAIRS, env } from './config.js'
import { fieldToReceiver } from './encoding.js'
import { decryptMyRecords, getMapping, leoExecute, waitForAccepted } from './aleo.js'
import { ensureApproval, placeOrder, waitForSettlement } from './cow.js'

// ~20 min at ~2s blocks; CoW orders live 15 min, so they die before the escrow.
const MIN_BLOCKS_LEFT = 600
const STATE_FILE = '.watch-state.json'

const api = () => `${env('ALEO_ENDPOINT')}/${env('ALEO_NETWORK', 'testnet')}`
const latestHeight = async () => Number(await (await fetch(`${api()}/block/height/latest`)).json())

// Accepted lock_intent txs in [start, end) — the blocks API caps a range at 50.
async function lockTxsIn(start: number, end: number): Promise<string[]> {
  const res = await fetch(`${api()}/blocks?start=${start}&end=${end}`)
  if (!res.ok) throw new Error(`blocks ${start}-${end}: ${res.status}`)
  const ids: string[] = []
  for (const block of await res.json()) {
    for (const c of block.transactions ?? []) {
      const ts = c.transaction?.execution?.transitions ?? []
      if (c.status === 'accepted' && ts.some((t: any) => t.program === env('ALEO_PROGRAM', 'papilio_intent.aleo') && t.function === 'lock_intent')) {
        ids.push(c.transaction.id)
      }
    }
  }
  return ids
}

// Scan forever; relay each lock whose IntentNote decrypts to us.
// ponytail: one intent at a time (each waits on CoW settlement); queue in parallel if volume ever matters.
async function watch() {
  let next = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')).next : await latestHeight()
  console.log(`watching ${env('ALEO_PROGRAM', 'papilio_intent.aleo')} from block ${next}`)
  for (;;) {
    try {
      const tip = await latestHeight()
      while (next <= tip) {
        const end = Math.min(next + 50, tip + 1)
        for (const id of await lockTxsIn(next, end)) {
          console.log(`\nlock seen: ${id}`)
          await relay(id).catch((e) => console.error(`skipped ${id}: ${e.message ?? e}`))
        }
        next = end
        writeFileSync(STATE_FILE, JSON.stringify({ next }))
      }
    } catch (e: any) {
      console.error(`scan error (retrying): ${e.message ?? e}`)
    }
    await new Promise((r) => setTimeout(r, 10_000))
  }
}

export async function relay(lockTxId: string) {
  const log: Record<string, unknown> = { lockTxId, startedAt: new Date().toISOString() }

  // 1. The network already verified the zk proof when it accepted this tx.
  //    We only confirm acceptance and read our encrypted note.
  const tx = await waitForAccepted(lockTxId)
  const records = await decryptMyRecords(tx, env('RELAYER_ALEO_VIEW_KEY'))
  const note = records.map((r) => r.fields).find((f) => f.pair_hash && f.commitment)
  if (!note) throw new Error('no IntentNote for our view key in this tx')

  const { commitment, pair_hash, denomination, receiver } = note
  const escrow = await getMapping('escrow_amount', commitment)
  if (escrow === null) throw new Error(`no open escrow for commitment ${commitment}`)
  const expiry = Number((await getMapping('escrow_expiry', commitment))?.replace(/u32$/, ''))
  if (expiry - (await latestHeight()) < MIN_BLOCKS_LEFT) {
    throw new Error(`escrow expires at ${expiry}, too soon to trade safely; user can refund`)
  }

  const pair = PAIRS[pair_hash]
  if (!pair) throw new Error(`unknown pair id ${pair_hash}`)
  const tier = Object.values(DENOMINATIONS).find(
    (d) => d.aleoUnits === BigInt(denomination.replace(/u64$/, '')),
  )
  if (!tier) throw new Error(`unknown denomination ${denomination}`)
  const receiverAddr = fieldToReceiver(receiver)
  Object.assign(log, { commitment, pair: pair.label, denomination, receiver: receiverAddr })
  console.log(`intent: ${pair.label} tier=${denomination} -> ${receiverAddr}`)

  // 2. Settle on CoW with the relayer's own Sepolia inventory.
  const provider = new providers.JsonRpcProvider(env('SEPOLIA_RPC_URL'))
  const wallet = new Wallet(env('SEPOLIA_PRIVATE_KEY'), provider)
  await ensureApproval(wallet, pair.sellToken, tier.sepoliaSellAmount)
  const placed = await placeOrder(wallet, {
    sellToken: pair.sellToken,
    buyToken: pair.buyToken,
    sellAmount: tier.sepoliaSellAmount,
    receiver: receiverAddr,
  })
  log.orderUid = placed.orderUid
  log.solverVisiblePayload = placed.solverVisiblePayload
  console.log(`order placed: ${placed.orderUid}`)
  console.log(`https://explorer.cow.fi/sepolia/orders/${placed.orderUid}`)

  const settlement = await waitForSettlement(placed.orderUid)
  log.settlement = settlement
  if (settlement.status !== 'fulfilled') {
    writeLog(log)
    throw new Error(`order not fulfilled (${settlement.status}); user can refund after expiry`)
  }
  console.log(`settled: https://sepolia.etherscan.io/tx/${settlement.settlementTx}`)

  // 3. Repay ourselves from the Aleo escrow.
  const claimTx = leoExecute('claim', [commitment, denomination], env('RELAYER_ALEO_PRIVATE_KEY'))
  await waitForAccepted(claimTx)
  log.claimTxId = claimTx
  console.log(`escrow claimed: ${claimTx}`)

  writeLog(log)
  return log
}

function writeLog(log: Record<string, unknown>) {
  mkdirSync('logs', { recursive: true })
  const file = `logs/run-${Date.now()}.json`
  writeFileSync(file, JSON.stringify(log, null, 2))
  console.log(`evidence log: relayer/${file}`)
}

const isMain = process.argv[1]?.endsWith('relayer.ts')
if (isMain) {
  const txId = process.argv[2]
  const run = txId ? relay(txId) : watch()
  run.catch((e) => {
    console.error(e.message ?? e)
    process.exit(1)
  })
}
