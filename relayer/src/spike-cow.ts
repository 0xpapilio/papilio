// Day-0 spike: can a relayer-owned CoW order on Sepolia settle with
// `receiver` set to a different address? Kills the whole plan if not.
// Usage: npm run spike:cow [receiver]
import { Wallet, providers } from 'ethers'
import { DENOMINATIONS, PAIRS, env } from './config.js'
import { balanceOf, ensureApproval, placeOrder, waitForSettlement } from './cow.js'

const provider = new providers.JsonRpcProvider(env('SEPOLIA_RPC_URL'))
const wallet = new Wallet(env('SEPOLIA_PRIVATE_KEY'), provider)
const receiver = process.argv[2] ?? env('DEMO_RECEIVER')
const pair = PAIRS['1field']
const amount = DENOMINATIONS.small.sepoliaSellAmount

const before = await balanceOf(provider, pair.buyToken, receiver)
console.log(`selling ${amount} wei ${pair.label}, receiver=${receiver}`)
await ensureApproval(wallet, pair.sellToken, amount)
const placed = await placeOrder(wallet, {
  sellToken: pair.sellToken,
  buyToken: pair.buyToken,
  sellAmount: amount,
  receiver,
})
console.log(`order: https://explorer.cow.fi/sepolia/orders/${placed.orderUid}`)
const settlement = await waitForSettlement(placed.orderUid)
console.log('settlement:', settlement)
if (settlement.status === 'fulfilled') {
  const after = await balanceOf(provider, pair.buyToken, receiver)
  console.log(`receiver ${pair.label.split('->')[1]} balance: ${before} -> ${after}`)
  console.log(after > before ? 'SPIKE PASSED: receiver got the output' : 'SPIKE FAILED: no balance change')
} else {
  console.log('SPIKE INCONCLUSIVE: order did not fill — try the other denomination or check solver liquidity')
}
