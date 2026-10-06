import test from 'node:test'
import assert from 'node:assert/strict'
import { interpretarBuscaPedido } from '../src/lib/buscaPedido.js'

test('CPF pontuado e sem máscara produzem a mesma consulta', () => {
  assert.deepEqual(interpretarBuscaPedido('123.456.789-00'), interpretarBuscaPedido('12345678900'))
  assert.equal(interpretarBuscaPedido('12345678900').tipo, 'cpf')
})
test('identifica número e UUID de pedido, sem confundir nome com CPF', () => {
  assert.deepEqual(interpretarBuscaPedido('#123'), { tipo: 'id_incompleto', valor: '123' })
  assert.equal(interpretarBuscaPedido('#12345678-abcd-1234-abcd-123456789000').tipo, 'id')
  assert.equal(interpretarBuscaPedido('12345678-abcd-1234-abcd-123456789000').tipo, 'id')
  assert.equal(interpretarBuscaPedido('Cliente 12345678900').tipo, 'nome')
})
