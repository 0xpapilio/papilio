// Failure paths: (1) insufficient balance cannot even produce a proof;
// (2) an unfilled intent is refundable after expiry.
import { env, DENOMINATIONS } from './config.js'
import { receiverToField } from './encoding.js'
import { decryptMyRecords, leoExecute, waitForAccepted } from './aleo.js'

const endpoint = env('ALEO_ENDPOINT')
const network = env('ALEO_NETWORK', 'testnet')
const userKey = env('USER_ALEO_PRIVATE_KEY')
const userViewKey = env('USER_ALEO_VIEW_KEY')
const denom = `${DENOMINATIONS.small.aleoUnits}u64`
const height = async () => Number(await (await fetch(`${endpoint}/${network}/latest/height`)).json())
const salt = () =>
  `${Array.from(crypto.getRandomValues(new Uint32Array(7))).reduce((a, n) => a * 4294967296n + BigInt(n), 0n)}scalar`

async function mintToken(amount: string) {
  const tx = leoExecute('mint', [amount], userKey)
  const accepted = await waitForAccepted(tx)
  const rec = (await decryptMyRecords(accepted, userViewKey)).find((r) => r.fields.amount)
  if (!rec) throw new Error('mint record not found')
  return rec
}

console.log('== FAIL CASE 1: insufficient balance ==')
const tiny = await mintToken('1u64')
try {
  leoExecute(
    'lock_intent',
    [tiny.plaintext, denom, '1field', receiverToField(env('DEMO_RECEIVER')),
     env('RELAYER_ALEO_ADDRESS'), `${(await height()) + 1000}u32`, salt()],
    userKey,
  )
  console.log('FAIL: lock with insufficient balance was accepted')
  process.exit(1)
} catch {
  console.log('PASS: proof generation refused — balance < denomination, nothing published')
}

console.log('== FAIL CASE 2: unfilled intent -> refund after expiry ==')
const tok = await mintToken('1000000u64')
const expiry = (await height()) + 8 // expires in ~8 blocks; no relayer will act
const lockTx = leoExecute(
  'lock_intent',
  [tok.plaintext, denom, '1field', receiverToField(env('DEMO_RECEIVER')),
   env('RELAYER_ALEO_ADDRESS'), `${expiry}u32`, salt()],
  userKey,
)
const lock = await waitForAccepted(lockTx)
const ticket = (await decryptMyRecords(lock, userViewKey)).find((r) => r.fields.commitment)
if (!ticket) throw new Error('refund ticket not found')

console.log('refund before expiry must fail...')
let early = false
try { leoExecute('refund', [ticket.plaintext], userKey); early = true } catch { /* expected */ }
if (early) { console.log('FAIL: early refund accepted'); process.exit(1) }
console.log('PASS: early refund rejected')

console.log(`waiting for block ${expiry}...`)
while ((await height()) < expiry) await new Promise((r) => setTimeout(r, 10_000))
const refundTx = leoExecute('refund', [ticket.plaintext], userKey)
await waitForAccepted(refundTx)
console.log(`PASS: refunded after expiry — https://testnet.aleoscan.io/transaction?id=${refundTx}`)
