// End-to-end happy path: mint -> lock_intent -> relayer -> CoW settlement -> claim.
// Prints explorer links at every step. Testnet only.
import { DENOMINATIONS, EXPIRY_BLOCKS, env } from './config.js'
import { receiverToField } from './encoding.js'
import { decryptMyRecords, getTransaction, leoExecute, waitForAccepted } from './aleo.js'
import { relay } from './relayer.js'

const endpoint = env('ALEO_ENDPOINT')
const network = env('ALEO_NETWORK', 'testnet')
const userKey = env('USER_ALEO_PRIVATE_KEY')
const userViewKey = env('USER_ALEO_VIEW_KEY')

async function height(): Promise<number> {
  const res = await fetch(`${endpoint}/${network}/latest/height`)
  return Number(await res.json())
}

const randomSalt = () =>
  `${Array.from(crypto.getRandomValues(new Uint32Array(7))).reduce((a, n) => a * 4294967296n + BigInt(n), 0n)}scalar`

console.log('== 1. mint test tokens to the user ==')
const mintTx = leoExecute('mint', ['1000000u64'], userKey)
console.log(`mint tx: ${mintTx}`)
const mint = await waitForAccepted(mintTx)
const token = (await decryptMyRecords(mint, userViewKey)).find((r) => r.fields.amount)
if (!token) throw new Error('could not decrypt minted token record')

console.log('== 2. lock intent (only the commitment goes public) ==')
const expiry = (await height()) + EXPIRY_BLOCKS
const lockTx = leoExecute(
  'lock_intent',
  [
    token.plaintext,
    `${DENOMINATIONS.small.aleoUnits}u64`,
    '1field', // WETH->COW
    receiverToField(env('DEMO_RECEIVER')),
    env('RELAYER_ALEO_ADDRESS'),
    `${expiry}u32`,
    randomSalt(),
  ],
  userKey,
)
console.log(`lock tx: ${lockTx}`)
console.log(`https://testnet.aleoscan.io/transaction?id=${lockTx}`)
await waitForAccepted(lockTx)

console.log('== 3. relayer: decrypt intent, settle on CoW, claim escrow ==')
const log = await relay(lockTx)

console.log('\n== DONE ==')
console.log(`Aleo lock:   https://testnet.aleoscan.io/transaction?id=${lockTx}`)
console.log(`CoW order:   https://explorer.cow.fi/sepolia/orders/${log.orderUid}`)
console.log(`Settlement:  https://sepolia.etherscan.io/tx/${(log.settlement as any).settlementTx}`)
console.log(`Aleo claim:  https://testnet.aleoscan.io/transaction?id=${log.claimTxId}`)
