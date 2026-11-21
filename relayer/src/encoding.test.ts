import test from 'node:test'
import assert from 'node:assert/strict'
import { fieldToReceiver, parseRecordPlaintext, receiverToField } from './encoding.js'

test('receiver address round-trips through a field', () => {
  const addr = '0x02a9e63b16e4c6c3b1a0b6e4bbf4dbb4d2fbd3e1'
  assert.equal(fieldToReceiver(receiverToField(addr)), addr)
})

test('rejects bad addresses and oversized fields', () => {
  assert.throws(() => receiverToField('0x123'))
  assert.throws(() => fieldToReceiver(`${1n << 200n}field`))
})

test('parses decrypted record plaintext', () => {
  const plain =
    '{ owner: aleo1abc.private, pair_hash: 1field.private, denomination: 10000u64.private, receiver: 15field.private, commitment: 99field.private, _nonce: 123group.public }'
  const f = parseRecordPlaintext(plain)
  assert.equal(f.pair_hash, '1field')
  assert.equal(f.denomination, '10000u64')
  assert.equal(f.commitment, '99field')
})
