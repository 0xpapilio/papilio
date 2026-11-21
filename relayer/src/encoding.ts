// Aleo <-> EVM value encoding. An Ethereum address is 160 bits and fits in
// one Aleo field element (~253 bits), so we carry it as a decimal field.

export function receiverToField(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error(`Bad EVM address: ${address}`)
  return `${BigInt(address)}field`
}

export function fieldToReceiver(field: string): string {
  const n = BigInt(field.replace(/field$/, ''))
  if (n >= 1n << 160n) throw new Error(`Field too large for an EVM address: ${field}`)
  return '0x' + n.toString(16).padStart(40, '0')
}

// Parse a decrypted Leo record plaintext like
// "{ owner: aleo1...private, pair_hash: 1field.private, ... }" into key/values.
export function parseRecordPlaintext(plain: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of plain.matchAll(/(\w+):\s*([^,}\s]+)/g)) {
    out[m[1]] = m[2].replace(/\.(private|public)$/, '')
  }
  return out
}
