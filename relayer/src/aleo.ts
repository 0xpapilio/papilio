import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { env } from './config.js'
import { parseRecordPlaintext } from './encoding.js'

const PROGRAM_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../aleo/papilio_intent',
)

const endpoint = () => env('ALEO_ENDPOINT')
const network = () => env('ALEO_NETWORK', 'testnet')
const program = () => env('ALEO_PROGRAM', 'papilio_intent.aleo')

export async function getTransaction(txId: string): Promise<any> {
  const res = await fetch(`${endpoint()}/${network()}/transaction/${txId}`)
  if (!res.ok) throw new Error(`tx fetch failed: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function getMapping(mapping: string, key: string): Promise<string | null> {
  const res = await fetch(
    `${endpoint()}/${network()}/program/${program()}/mapping/${mapping}/${key}`,
  )
  if (!res.ok) return null
  const v = await res.json()
  return v === null ? null : String(v)
}

// Record ciphertexts from a transaction's transition outputs.
export function recordCiphertexts(tx: any): string[] {
  const out: string[] = []
  for (const t of tx?.execution?.transitions ?? []) {
    for (const o of t.outputs ?? []) {
      if (o.type === 'record' && typeof o.value === 'string') out.push(o.value)
    }
  }
  return out
}

// Decrypt every record in a tx that belongs to this view key.
// Uses the leo CLI, which tracks the live record format (the JS SDK lagged
// behind it); decrypt exits non-zero for records this key doesn't own.
export async function decryptMyRecords(tx: any, viewKeyStr: string) {
  const mine: { plaintext: string; fields: Record<string, string> }[] = []
  for (const ct of recordCiphertexts(tx)) {
    try {
      const out = execFileSync(
        'leo',
        ['account', 'decrypt', '-q', '-n', network(), '-k', viewKeyStr, '-c', ct],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
      const plaintext = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1).replace(/\s+/g, ' ')
      mine.push({ plaintext, fields: parseRecordPlaintext(plaintext) })
    } catch {
      /* not ours */
    }
  }
  return mine
}

// Execute a program transition on testnet via the leo CLI.
// The private key stays in the local environment; it is never logged.
export function leoExecute(transition: string, args: string[], privateKey: string): string {
  const out = execFileSync(
    'leo',
    ['execute', transition, ...args, '--broadcast', '--yes',
     '--network', network(), '--endpoint', endpoint(), '--private-key', privateKey],
    { cwd: PROGRAM_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const m = out.match(/at1[0-9a-z]{58}/)
  if (!m) throw new Error(`could not find tx id in leo output:\n${out}`)
  return m[0]
}

export async function waitForAccepted(txId: string, timeoutMs = 5 * 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    // A rejected execution (finalize failed) is still indexed; check status.
    const res = await fetch(`${endpoint()}/${network()}/transaction/confirmed/${txId}`)
    if (res.ok) {
      const c = await res.json()
      if (c.status === 'accepted') return c.transaction
      throw new Error(`tx ${txId} ${c.status} on-chain`)
    }
    await new Promise((r) => setTimeout(r, 10_000))
  }
  throw new Error(`tx ${txId} not accepted within ${timeoutMs / 1000}s`)
}
