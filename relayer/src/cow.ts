import {
  OrderBookApi,
  OrderQuoteSideKindSell,
  OrderSigningUtils,
  SupportedChainId,
  type UnsignedOrder,
} from '@cowprotocol/cow-sdk'
import { BigNumber, Contract, Wallet, type providers } from 'ethers'
import { COW_VAULT_RELAYER, SEPOLIA_CHAIN_ID } from './config.js'

const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
]

export const orderBook = new OrderBookApi({ chainId: SupportedChainId.SEPOLIA })

export async function ensureApproval(wallet: Wallet, token: string, amount: bigint) {
  const erc20 = new Contract(token, ERC20_ABI, wallet)
  const allowance: BigNumber = await erc20.allowance(wallet.address, COW_VAULT_RELAYER)
  if (allowance.toBigInt() >= amount) return
  console.log(`approving ${token} for CoW vault relayer...`)
  const tx = await erc20.approve(COW_VAULT_RELAYER, (amount * 1000n).toString())
  await tx.wait()
}

export interface PlacedOrder {
  orderUid: string
  // Exactly what the solver sees: the full signed order payload.
  solverVisiblePayload: Record<string, unknown>
}

export async function placeOrder(
  wallet: Wallet,
  params: { sellToken: string; buyToken: string; sellAmount: bigint; receiver: string },
): Promise<PlacedOrder> {
  const { quote } = await orderBook.getQuote({
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    from: wallet.address,
    receiver: params.receiver,
    kind: OrderQuoteSideKindSell.SELL,
    sellAmountBeforeFee: params.sellAmount.toString(),
  })

  const order: UnsignedOrder = {
    ...quote,
    sellAmount: params.sellAmount.toString(),
    feeAmount: '0',
    receiver: params.receiver,
    partiallyFillable: false,
    // Must expire well before the Aleo escrow does (relayer.ts MIN_BLOCKS_LEFT),
    // or the user could refund while this order still fills.
    validTo: Math.floor(Date.now() / 1000) + 15 * 60,
  }

  const { signature, signingScheme } = await OrderSigningUtils.signOrder(
    order,
    SEPOLIA_CHAIN_ID,
    wallet,
  )
  const orderUid = await orderBook.sendOrder({
    ...order,
    signature,
    signingScheme: signingScheme as any,
  })
  return {
    orderUid,
    solverVisiblePayload: { ...order, signature, signingScheme, owner: wallet.address },
  }
}

export async function waitForSettlement(orderUid: string, timeoutMs = 20 * 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const order = await orderBook.getOrder(orderUid)
    if (order.status === 'fulfilled') {
      const trades = await orderBook.getTrades({ orderUid })
      return { status: 'fulfilled' as const, settlementTx: trades[0]?.txHash ?? null }
    }
    if (order.status === 'cancelled' || order.status === 'expired') {
      return { status: order.status, settlementTx: null }
    }
    console.log(`order ${orderUid.slice(0, 18)}... status=${order.status}, waiting`)
    await new Promise((r) => setTimeout(r, 15_000))
  }
  return { status: 'timeout' as const, settlementTx: null }
}

export async function balanceOf(
  provider: providers.Provider,
  token: string,
  owner: string,
): Promise<bigint> {
  const bal: BigNumber = await new Contract(token, ERC20_ABI, provider).balanceOf(owner)
  return bal.toBigInt()
}
